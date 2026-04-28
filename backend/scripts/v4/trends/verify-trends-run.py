#!/usr/bin/env python3
"""
V47 Phase 1 — État DB des trends X.com (read-only).

Émet un rapport humain-lisible sur stdout à propos de `v4.x_trends` :
  - Nombre de lignes capturées dans la fenêtre (default 7 jours)
  - Date du dernier run (max captured_at)
  - Top 5 trends actuels par rank_position
  - Trends sans match identifié dans v4.matches/people/clubs
  - Nombre de jours distincts couverts dans la fenêtre

Utilisé par `run-trends-scraper.py` avant et après chaque run pour produire
un delta visible. Fonctionne aussi en standalone : `python3 verify-trends-run.py`.

Usage:
    python3 verify-trends-run.py [--window-hours=N] [--strict] [--json]

Exit codes:
    0  OK (rapport produit)
    1  --strict actif et anomalie détectée :
       (last run > window_hours OU 0 ligne dans la fenêtre)
    2  bad CLI args
    3  DB connection error
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import sys
from pathlib import Path

# psycopg2 is imported lazily inside main() so that --help works
# even before the venv has been set up.

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_WINDOW_HOURS = 24 * 7   # 7 days (matches the weekly cadence)
DEFAULT_TOP_N = 5

# Try to load a .env file from common locations so the standalone usage
# works without the user having to source it manually.
def _load_dotenv() -> None:
    candidates = [
        SCRIPT_DIR.parent.parent.parent / ".env",     # backend/.env
        SCRIPT_DIR.parent.parent.parent.parent / ".env",  # repo root .env
    ]
    for env_path in candidates:
        if not env_path.exists():
            continue
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            # Only set if not already in env — env wins over .env
            os.environ.setdefault(key, value)
        return


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read-only state report on v4.x_trends."
    )
    parser.add_argument("--window-hours", type=int, default=DEFAULT_WINDOW_HOURS,
                        help=f"Look-back window in hours (default: {DEFAULT_WINDOW_HOURS})")
    parser.add_argument("--top", type=int, default=DEFAULT_TOP_N,
                        help=f"How many top trends to show (default: {DEFAULT_TOP_N})")
    parser.add_argument("--strict", action="store_true",
                        help="Exit 1 if last run is older than --window-hours OR no rows in window")
    parser.add_argument("--json", action="store_true",
                        help="Emit a JSON report on stdout instead of human-readable text")
    return parser.parse_args(argv)


def fetch_report(conn, *, window_hours: int, top_n: int) -> dict:
    """Run all DB queries and return a structured report dict."""
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """
            SELECT COUNT(*)::int                                      AS rows_in_window,
                   COUNT(DISTINCT (captured_at AT TIME ZONE 'UTC')::date)::int AS days_covered,
                   MAX(captured_at)                                   AS last_run,
                   MIN(captured_at)                                   AS first_run
              FROM v4.x_trends
             WHERE captured_at >= NOW() - (%s || ' hours')::interval
            """,
            (str(window_hours),),
        )
        summary = cur.fetchone() or {
            "rows_in_window": 0, "days_covered": 0,
            "last_run": None, "first_run": None,
        }

        # Top trends in the most recent run (defined as captured_at::date == last_run::date)
        cur.execute(
            """
            WITH last_day AS (
                SELECT (MAX(captured_at) AT TIME ZONE 'UTC')::date AS d
                  FROM v4.x_trends
            )
            SELECT rank_position, trend_label, trend_type, post_count, captured_at
              FROM v4.x_trends, last_day
             WHERE (captured_at AT TIME ZONE 'UTC')::date = last_day.d
             ORDER BY rank_position ASC
             LIMIT %s
            """,
            (top_n,),
        )
        top_trends = [dict(r) for r in cur.fetchall()]

        # Distribution by trend_type in the window
        cur.execute(
            """
            SELECT trend_type, COUNT(*)::int AS n
              FROM v4.x_trends
             WHERE captured_at >= NOW() - (%s || ' hours')::interval
             GROUP BY trend_type
             ORDER BY n DESC
            """,
            (str(window_hours),),
        )
        type_distribution = {r["trend_type"]: r["n"] for r in cur.fetchall()}

        # Trends without a clear DB match (heuristic: no LIKE match on people/clubs/matches names)
        # This is a coarse signal — Phase 3 (resolver) will own the precise matching.
        cur.execute(
            """
            WITH window_trends AS (
                SELECT id, trend_label
                  FROM v4.x_trends
                 WHERE captured_at >= NOW() - (%s || ' hours')::interval
            )
            SELECT COUNT(*)::int AS unmatched
              FROM window_trends t
             WHERE NOT EXISTS (
                       SELECT 1 FROM v4.people  p
                        WHERE LOWER(p.first_name || ' ' || p.last_name) ILIKE '%' || LOWER(t.trend_label) || '%'
                          OR LOWER(t.trend_label) ILIKE '%' || LOWER(p.last_name) || '%'
                   )
               AND NOT EXISTS (
                       SELECT 1 FROM v4.clubs c
                        WHERE LOWER(c.name) ILIKE '%' || LOWER(t.trend_label) || '%'
                          OR LOWER(t.trend_label) ILIKE '%' || LOWER(c.name) || '%'
                   )
            """,
            (str(window_hours),),
        )
        unmatched = (cur.fetchone() or {}).get("unmatched", 0)

    return {
        "window_hours": window_hours,
        "rows_in_window": summary["rows_in_window"],
        "days_covered": summary["days_covered"],
        "last_run": summary["last_run"].isoformat() if summary["last_run"] else None,
        "first_run": summary["first_run"].isoformat() if summary["first_run"] else None,
        "top_trends": [
            {
                "rank_position": t["rank_position"],
                "trend_label":   t["trend_label"],
                "trend_type":    t["trend_type"],
                "post_count":    t["post_count"],
                "captured_at":   t["captured_at"].isoformat() if t["captured_at"] else None,
            }
            for t in top_trends
        ],
        "type_distribution": type_distribution,
        "unmatched_in_db": unmatched,
        "generated_at": datetime.datetime.now(datetime.timezone.utc)
                         .replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }


def render_human(report: dict) -> str:
    lines = []
    lines.append("─── v4.x_trends — State Report ───")
    lines.append(f"  Window           : last {report['window_hours']} hours")
    lines.append(f"  Rows captured    : {report['rows_in_window']}")
    lines.append(f"  Days covered     : {report['days_covered']}")
    if report["last_run"]:
        lines.append(f"  Last run         : {report['last_run']}")
    else:
        lines.append("  Last run         : (no data in window)")
    if report["first_run"]:
        lines.append(f"  First in window  : {report['first_run']}")

    if report["type_distribution"]:
        dist = ", ".join(f"{k}={v}" for k, v in report["type_distribution"].items())
        lines.append(f"  Type breakdown   : {dist}")

    lines.append(f"  Unmatched in DB  : {report['unmatched_in_db']} / {report['rows_in_window']}"
                 + " (no candidate in v4.people / v4.clubs)")

    if report["top_trends"]:
        lines.append("")
        lines.append("  Top trends (most recent run):")
        for t in report["top_trends"]:
            label = t["trend_label"]
            ptype = t["trend_type"]
            posts = f"{t['post_count']:,} posts" if t["post_count"] is not None else "no count"
            lines.append(f"    #{t['rank_position']:>2}  [{ptype:<7}] {label}  ({posts})")
    lines.append("")
    return "\n".join(lines)


def is_anomaly(report: dict, *, window_hours: int) -> tuple[bool, str | None]:
    """In --strict mode, decide if we should fail."""
    if report["rows_in_window"] == 0:
        return True, "no rows in window"
    if not report["last_run"]:
        return True, "last_run unknown"
    last_run = datetime.datetime.fromisoformat(report["last_run"])
    if last_run.tzinfo is None:
        last_run = last_run.replace(tzinfo=datetime.timezone.utc)
    age_h = (datetime.datetime.now(datetime.timezone.utc) - last_run).total_seconds() / 3600
    if age_h > window_hours:
        return True, f"last_run is {age_h:.1f}h old (> {window_hours}h)"
    return False, None


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    _load_dotenv()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("[verify] ERROR: DATABASE_URL not set", file=sys.stderr)
        return 3

    # Lazy import so argparse / --help work without the venv
    try:
        import psycopg2  # noqa: F401
        import psycopg2.extras  # noqa: F401
    except ImportError:
        print(
            "[verify] ERROR: psycopg2 not installed.\n"
            "        cd backend/scripts/v4/trends\n"
            "        source .venv/bin/activate\n"
            "        pip install -r requirements.txt",
            file=sys.stderr,
        )
        return 3
    globals()["psycopg2"] = psycopg2

    try:
        conn = psycopg2.connect(db_url)
    except psycopg2.Error as e:
        print(f"[verify] ERROR: cannot connect to DB: {e}", file=sys.stderr)
        return 3

    try:
        report = fetch_report(conn, window_hours=args.window_hours, top_n=args.top)
    finally:
        conn.close()

    if args.json:
        sys.stdout.write(json.dumps(report, ensure_ascii=False) + "\n")
    else:
        sys.stdout.write(render_human(report))

    if args.strict:
        anomaly, reason = is_anomaly(report, window_hours=args.window_hours)
        if anomaly:
            print(f"[verify] STRICT MODE — anomaly: {reason}", file=sys.stderr)
            return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
