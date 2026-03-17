import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "reports"
LOG_DIR = BASE_DIR / "logs"
STATUS_PATH = BASE_DIR / "v3_post_global_pipeline_status.json"
GLOBAL_PIPELINE_STATUS_PATH = BASE_DIR / "historical_retrain_pipeline_status.json"
ELIGIBILITY_REPORT_PATH = REPORTS_DIR / "league_specific_eligibility.json"

DEFAULT_LEAGUE_IDS = [2, 11, 19, 15, 1, 34, 30, 32]


def utc_now():
    return datetime.utcnow().isoformat() + "Z"


def write_status(**payload):
    STATUS_PATH.write_text(json.dumps({"updated_at": utc_now(), **payload}, indent=2))


def read_json(path: Path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}


def wait_for_global_pipeline():
    while True:
        payload = read_json(GLOBAL_PIPELINE_STATUS_PATH)
        if payload.get("status") == "completed" and payload.get("stage") == "done":
            return
        write_status(status="waiting", stage="global_pipeline", dependency=payload)
        time.sleep(60)


def run_command(command, stage_name, log_name):
    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / log_name
    with log_path.open("a") as handle:
        handle.write(f"\n[{utc_now()}] START {' '.join(command)}\n")
        handle.flush()
        process = subprocess.Popen(
            command,
            cwd=str(BASE_DIR.parent),
            stdout=handle,
            stderr=subprocess.STDOUT,
        )
        while True:
            return_code = process.poll()
            write_status(
                status="running" if return_code is None else ("completed" if return_code == 0 else "failed"),
                stage=stage_name,
                pid=process.pid,
                return_code=return_code,
                log_path=str(log_path),
            )
            if return_code is not None:
                handle.write(f"[{utc_now()}] END code={return_code}\n")
                handle.flush()
                if return_code != 0:
                    raise RuntimeError(f"{stage_name} failed with code {return_code}")
                return
            time.sleep(30)


def pick_leagues():
    report = read_json(ELIGIBILITY_REPORT_PATH)
    league_ids = []
    for row in report.get("priority_leagues", []):
        if row.get("league_id") in DEFAULT_LEAGUE_IDS:
            league_ids.append(int(row["league_id"]))
    return league_ids or DEFAULT_LEAGUE_IDS


def main():
    wait_for_global_pipeline()

    run_command([sys.executable, "ml-service/evaluate_league_eligibility.py"], "eligibility_report", "v3_eligibility.log")
    run_command([sys.executable, "ml-service/compare_active_model_metrics.py"], "compare_metrics", "v3_compare_metrics.log")

    league_ids = [str(league_id) for league_id in pick_leagues()]

    run_command([sys.executable, "ml-service/train_1x2_league_batch.py", "--league-ids", *league_ids], "ft_league_batch", "v3_ft_league_batch.log")
    run_command([sys.executable, "ml-service/train_ht_league_batch.py", "--league-ids", *league_ids], "ht_league_batch", "v3_ht_league_batch.log")
    run_command([sys.executable, "ml-service/train_goals_league_batch.py", "--league-ids", *league_ids], "goals_league_batch", "v3_goals_league_batch.log")
    run_command([sys.executable, "ml-service/train_corners_league_batch.py", "--league-ids", *league_ids], "corners_league_batch", "v3_corners_league_batch.log")
    run_command([sys.executable, "ml-service/train_cards_league_batch.py", "--league-ids", *league_ids], "cards_league_batch", "v3_cards_league_batch.log")
    run_command([sys.executable, "ml-service/build_league_model_policy.py"], "build_policy", "v3_build_policy.log")

    write_status(status="completed", stage="done", league_ids=[int(league_id) for league_id in league_ids])


if __name__ == "__main__":
    main()
