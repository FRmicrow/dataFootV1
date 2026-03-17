import csv
import json
import sys
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT_DIR.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from db_config import get_connection


CSV_DIR = REPO_ROOT / "Database-DetailedData"
PROGRESS_PATH = ROOT_DIR / "repair_ml_matches_away_yc_2h_progress.json"

LEAGUES = {
    "England Premier League": "Premier League",
    "France Ligue 1": "Ligue 1",
    "Germany Bundesliga": "Bundesliga",
    "Italy Serie A": "Serie A",
    "Spain LaLiga": "La Liga",
}


def write_progress(payload):
    PROGRESS_PATH.write_text(json.dumps(payload, indent=2, default=str))


def load_csv_rows():
    rows = []
    for token, source_league in LEAGUES.items():
        for suffix in ("LS.csv", "CS.csv", "LS (1).csv", "CS (1).csv"):
            path = CSV_DIR / f"Database - Corners  Cards - {token} - {suffix}"
            if not path.exists():
                continue
            with path.open("r", encoding="utf-8-sig", newline="") as handle:
                reader = csv.DictReader(handle)
                for row in reader:
                    rows.append((row["id"], source_league, int(row["AYC2H"]) if row["AYC2H"] != "" else None))
    return rows


def main():
    print("🚀 Repairing ml_matches.a_yc_2h from historical CSVs...")
    csv_rows = load_csv_rows()
    write_progress({
        "status": "loaded",
        "csv_rows": len(csv_rows),
        "updated_at": datetime.utcnow().isoformat() + "Z",
    })

    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.executemany(
            """
            UPDATE ml_matches
            SET a_yc_2h = %s,
                imported_at = CURRENT_TIMESTAMP
            WHERE source_id = %s
              AND source_league = %s
            """,
            [(value, source_id, league) for source_id, league, value in csv_rows],
        )
        updated = cur.rowcount
        conn.commit()
        cur.close()

        payload = {
            "status": "completed",
            "csv_rows": len(csv_rows),
            "updated_rows": updated,
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        write_progress(payload)
        print(f"✅ Repaired {updated} ml_matches rows")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
