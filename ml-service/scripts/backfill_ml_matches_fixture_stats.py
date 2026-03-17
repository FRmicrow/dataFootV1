import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path

from psycopg2.extras import execute_values

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from db_config import get_connection


PROGRESS_PATH = ROOT_DIR / "backfill_ml_matches_fixture_stats_progress.json"
HALVES = ("FT", "1H", "2H")


def write_progress(payload):
    PROGRESS_PATH.write_text(json.dumps(payload, indent=2, default=str))


def fetch_source_rows(conn, cutoff_date):
    sql = """
        SELECT
            m.v3_fixture_id AS fixture_id,
            f.home_team_id,
            f.away_team_id,
            m.match_date,
            m.h_bp_ft, m.a_bp_ft, m.h_bp_1h, m.a_bp_1h, m.h_bp_2h, m.a_bp_2h,
            m.h_ts_ft, m.a_ts_ft, m.h_ts_1h, m.a_ts_1h, m.h_ts_2h, m.a_ts_2h,
            m.h_son_ft, m.a_son_ft, m.h_son_1h, m.a_son_1h, m.h_son_2h, m.a_son_2h,
            m.h_soff_ft, m.a_soff_ft, m.h_soff_1h, m.a_soff_1h, m.h_soff_2h, m.a_soff_2h,
            m.h_corners_ft, m.a_corners_ft, m.h_corners_1h, m.a_corners_1h, m.h_corners_2h, m.a_corners_2h,
            m.h_yc_ft, m.a_yc_ft, m.h_yc_1h, m.a_yc_1h, m.h_yc_2h, m.a_yc_2h
        FROM ml_matches m
        JOIN v3_fixtures f ON f.fixture_id = m.v3_fixture_id
        WHERE m.match_date < %s
        ORDER BY m.match_date ASC, m.v3_fixture_id ASC
    """
    cur = conn.cursor()
    cur.execute(sql, (cutoff_date,))
    rows = cur.fetchall()
    cur.close()
    return rows


def to_percent_text(value):
    if value is None:
        return None
    return f"{int(value)}%"


def build_upsert_rows(source_rows):
    records = []
    for row in source_rows:
        (
            fixture_id,
            home_team_id,
            away_team_id,
            match_date,
            h_bp_ft, a_bp_ft, h_bp_1h, a_bp_1h, h_bp_2h, a_bp_2h,
            h_ts_ft, a_ts_ft, h_ts_1h, a_ts_1h, h_ts_2h, a_ts_2h,
            h_son_ft, a_son_ft, h_son_1h, a_son_1h, h_son_2h, a_son_2h,
            h_soff_ft, a_soff_ft, h_soff_1h, a_soff_1h, h_soff_2h, a_soff_2h,
            h_corners_ft, a_corners_ft, h_corners_1h, a_corners_1h, h_corners_2h, a_corners_2h,
            h_yc_ft, a_yc_ft, h_yc_1h, a_yc_1h, h_yc_2h, a_yc_2h,
        ) = row

        stats = {
            "FT": {
                "home": (h_bp_ft, h_ts_ft, h_son_ft, h_soff_ft, h_corners_ft, h_yc_ft),
                "away": (a_bp_ft, a_ts_ft, a_son_ft, a_soff_ft, a_corners_ft, a_yc_ft),
            },
            "1H": {
                "home": (h_bp_1h, h_ts_1h, h_son_1h, h_soff_1h, h_corners_1h, h_yc_1h),
                "away": (a_bp_1h, a_ts_1h, a_son_1h, a_soff_1h, a_corners_1h, a_yc_1h),
            },
            "2H": {
                "home": (h_bp_2h, h_ts_2h, h_son_2h, h_soff_2h, h_corners_2h, h_yc_2h),
                "away": (a_bp_2h, a_ts_2h, a_son_2h, a_soff_2h, a_corners_2h, a_yc_2h),
            },
        }

        for half in HALVES:
            for side, team_id in (("home", home_team_id), ("away", away_team_id)):
                bp, shots, sot, soff, corners, yellow = stats[half][side]
                if all(v is None for v in (bp, shots, sot, soff, corners, yellow)):
                    continue
                records.append((
                    fixture_id,
                    team_id,
                    half,
                    sot,
                    soff,
                    shots,
                    corners,
                    to_percent_text(bp),
                    yellow,
                    bp,
                ))
    return records


def execute_backfill(conn, rows, batch_size):
    sql = """
        INSERT INTO v3_fixture_stats (
            fixture_id,
            team_id,
            half,
            shots_on_goal,
            shots_off_goal,
            shots_total,
            corner_kicks,
            ball_possession,
            yellow_cards,
            ball_possession_pct,
            updated_at
        ) VALUES %s
        ON CONFLICT (fixture_id, team_id, half) DO UPDATE SET
            shots_on_goal = CASE
                WHEN v3_fixture_stats.shots_on_goal IS NULL OR v3_fixture_stats.shots_on_goal = 0
                THEN EXCLUDED.shots_on_goal ELSE v3_fixture_stats.shots_on_goal END,
            shots_off_goal = CASE
                WHEN v3_fixture_stats.shots_off_goal IS NULL OR v3_fixture_stats.shots_off_goal = 0
                THEN EXCLUDED.shots_off_goal ELSE v3_fixture_stats.shots_off_goal END,
            shots_total = CASE
                WHEN v3_fixture_stats.shots_total IS NULL OR v3_fixture_stats.shots_total = 0
                THEN EXCLUDED.shots_total ELSE v3_fixture_stats.shots_total END,
            corner_kicks = CASE
                WHEN v3_fixture_stats.corner_kicks IS NULL OR v3_fixture_stats.corner_kicks = 0
                THEN EXCLUDED.corner_kicks ELSE v3_fixture_stats.corner_kicks END,
            ball_possession = CASE
                WHEN v3_fixture_stats.ball_possession IS NULL OR v3_fixture_stats.ball_possession IN ('', 'N/A')
                THEN EXCLUDED.ball_possession ELSE v3_fixture_stats.ball_possession END,
            yellow_cards = CASE
                WHEN v3_fixture_stats.yellow_cards IS NULL OR v3_fixture_stats.yellow_cards = 0
                THEN EXCLUDED.yellow_cards ELSE v3_fixture_stats.yellow_cards END,
            ball_possession_pct = CASE
                WHEN v3_fixture_stats.ball_possession_pct IS NULL OR v3_fixture_stats.ball_possession_pct = 0
                THEN EXCLUDED.ball_possession_pct ELSE v3_fixture_stats.ball_possession_pct END,
            updated_at = CURRENT_TIMESTAMP
    """
    total = len(rows)
    for start in range(0, total, batch_size):
        chunk = rows[start:start + batch_size]
        cur = conn.cursor()
        execute_values(
            cur,
            sql,
            chunk,
            template="(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,CURRENT_TIMESTAMP)",
            page_size=batch_size,
        )
        conn.commit()
        cur.close()
        payload = {
            "status": "running",
            "processed_rows": min(start + batch_size, total),
            "total_rows": total,
            "remaining_rows": max(total - (start + batch_size), 0),
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        write_progress(payload)
        print(
            f"   Stored {payload['processed_rows']}/{total} fixture_stat rows "
            f"({round(payload['processed_rows'] / total * 100, 2)}%)"
        )


def validate_backfill(conn, cutoff_date):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            COUNT(*) FILTER (WHERE fs.half = 'FT') AS ft,
            COUNT(*) FILTER (WHERE fs.half = '1H') AS h1,
            COUNT(*) FILTER (WHERE fs.half = '2H') AS h2
        FROM v3_fixture_stats fs
        JOIN v3_fixtures f ON f.fixture_id = fs.fixture_id
        WHERE f.date < %s
        """,
        (cutoff_date,),
    )
    counts = cur.fetchone()
    cur.close()
    return {"ft": counts[0], "1h": counts[1], "2h": counts[2]}


def main():
    parser = argparse.ArgumentParser(description="Backfill historical stats from ml_matches into V3_Fixture_Stats.")
    parser.add_argument("--cutoff-date", default="2024-01-01", help="Only backfill matches before this UTC date.")
    parser.add_argument("--batch-size", type=int, default=5000, help="Bulk upsert batch size.")
    args = parser.parse_args()

    start = time.time()
    write_progress({
        "status": "starting",
        "cutoff_date": args.cutoff_date,
        "updated_at": datetime.utcnow().isoformat() + "Z",
    })

    conn = get_connection()
    try:
        print(f"🚀 Starting ml_matches -> V3_Fixture_Stats backfill (cutoff={args.cutoff_date})")
        source_rows = fetch_source_rows(conn, args.cutoff_date)
        print(f"   Loaded {len(source_rows)} ml_matches rows")
        upsert_rows = build_upsert_rows(source_rows)
        print(f"   Prepared {len(upsert_rows)} fixture_stat rows across FT/1H/2H")

        write_progress({
            "status": "prepared",
            "cutoff_date": args.cutoff_date,
            "source_rows": len(source_rows),
            "total_rows": len(upsert_rows),
            "updated_at": datetime.utcnow().isoformat() + "Z",
        })

        execute_backfill(conn, upsert_rows, args.batch_size)
        coverage = validate_backfill(conn, args.cutoff_date)

        elapsed = round(time.time() - start, 2)
        payload = {
            "status": "completed",
            "cutoff_date": args.cutoff_date,
            "source_rows": len(source_rows),
            "persisted_rows": len(upsert_rows),
            "coverage": coverage,
            "elapsed_seconds": elapsed,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        write_progress(payload)
        print(f"✅ Backfill complete in {elapsed}s")
        print(f"   Coverage: FT={coverage['ft']} | 1H={coverage['1h']} | 2H={coverage['2h']}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
