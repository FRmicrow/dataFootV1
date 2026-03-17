import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"
REPORT_PATH = BASE_DIR / "reports" / "shadow_league_horizon_report.json"
STATUS_PATH = BASE_DIR / "shadow_league_horizon_status.json"

PLAN = {
    "ft_1x2": {
        "league_ids": [2, 30, 34],
        "script": "ml-service/train_1x2_league_batch.py",
        "args": ["--trials", "6", "--no-optuna", "--no-activate"],
    },
    "goals_ou": {
        "league_ids": [30, 32],
        "script": "ml-service/train_goals_league_batch.py",
        "args": ["--no-activate"],
    },
    "cards_ou": {
        "league_ids": [11, 1],
        "script": "ml-service/train_cards_league_batch.py",
        "args": ["--no-activate"],
    },
}
HORIZONS = ["5Y_ROLLING", "3Y_ROLLING"]


def write_status(status: str, stage: str, **extra):
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "stage": stage,
    }
    payload.update(extra)
    STATUS_PATH.write_text(json.dumps(payload, indent=2))


def run_cmd(cmd: list[str], log_name: str):
    log_path = LOG_DIR / log_name
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    with log_path.open("a") as handle:
        handle.write(f"\n[{datetime.now(timezone.utc).isoformat()}] START {' '.join(cmd)}\n")
        handle.flush()
        result = subprocess.run(cmd, cwd=BASE_DIR.parent, stdout=handle, stderr=subprocess.STDOUT)
        handle.write(f"\n[{datetime.now(timezone.utc).isoformat()}] END exit={result.returncode}\n")
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")


def load_latest_for(conn, name: str, horizon: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT version, metadata_json, created_at
            FROM v3_model_registry
            WHERE name = %s
            ORDER BY created_at DESC
            """,
            (name,),
        )
        rows = cur.fetchall()
    for version, metadata_json, created_at in rows:
        metadata = metadata_json if isinstance(metadata_json, dict) else json.loads(metadata_json)
        if metadata.get("horizon") == horizon:
            return {
                "version": version,
                "metadata": metadata,
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
            }
    return None


def main():
    import psycopg2
    import os

    results = {}
    try:
        for market, cfg in PLAN.items():
            results[market] = {}
            for horizon in HORIZONS:
                stage = f"{market.lower()}_{horizon.lower()}"
                write_status("running", stage, market=market, horizon=horizon, league_ids=cfg["league_ids"])
                cmd = [
                    sys.executable,
                    cfg["script"],
                    "--league-ids",
                    *[str(x) for x in cfg["league_ids"]],
                    "--horizon",
                    horizon,
                    *cfg["args"],
                ]
                run_cmd(cmd, f"{stage}.log")
                conn = psycopg2.connect(os.getenv("DATABASE_URL", "postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot"))
                try:
                    horizon_rows = {}
                    for league_id in cfg["league_ids"]:
                        if market == "ft_1x2":
                            name = f"league_1x2_ft_{league_id}"
                        elif market == "goals_ou":
                            name = f"league_goals_ou_{league_id}"
                        else:
                            name = f"league_cards_ou_{league_id}"
                        horizon_rows[str(league_id)] = load_latest_for(conn, name, horizon)
                    results[market][horizon] = horizon_rows
                finally:
                    conn.close()
        REPORT_PATH.write_text(json.dumps(results, indent=2))
        write_status("completed", "done", report_path=str(REPORT_PATH))
    except Exception as exc:
        write_status("failed", "error", error=str(exc))
        raise


if __name__ == "__main__":
    main()
