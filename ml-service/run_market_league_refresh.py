import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"
REPORTS_DIR = BASE_DIR / "reports"
STATUS_PATH = BASE_DIR / "market_league_refresh_status.json"

LEAGUE_IDS = [2, 11, 15, 19, 1, 30, 32, 34]


def write_status(status: str, stage: str, **extra):
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "stage": stage,
        "league_ids": LEAGUE_IDS,
    }
    payload.update(extra)
    STATUS_PATH.write_text(json.dumps(payload, indent=2))


def run_stage(cmd: list[str], stage: str, log_name: str):
    log_path = LOG_DIR / log_name
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    write_status("running", stage, command=cmd, log_path=str(log_path))
    with log_path.open("a") as handle:
        handle.write(f"\n[{datetime.now(timezone.utc).isoformat()}] START {' '.join(cmd)}\n")
        handle.flush()
        result = subprocess.run(cmd, cwd=BASE_DIR.parent, stdout=handle, stderr=subprocess.STDOUT)
        handle.write(f"\n[{datetime.now(timezone.utc).isoformat()}] END exit={result.returncode}\n")
    if result.returncode != 0:
        write_status("failed", stage, command=cmd, log_path=str(log_path), exit_code=result.returncode)
        raise SystemExit(result.returncode)


def main():
    league_args = [str(x) for x in LEAGUE_IDS]
    run_stage([sys.executable, "ml-service/evaluate_league_eligibility.py"], "evaluate_eligibility", "market_league_refresh_eligibility.log")
    run_stage([sys.executable, "ml-service/train_goals_league_batch.py", "--league-ids", *league_args], "train_goals_leagues", "market_league_refresh_goals.log")
    run_stage([sys.executable, "ml-service/train_corners_league_batch.py", "--league-ids", *league_args], "train_corners_leagues", "market_league_refresh_corners.log")
    run_stage([sys.executable, "ml-service/train_cards_league_batch.py", "--league-ids", *league_args], "train_cards_leagues", "market_league_refresh_cards.log")
    run_stage([sys.executable, "ml-service/build_league_model_policy.py"], "build_policy", "market_league_refresh_policy.log")
    write_status(
        "completed",
        "done",
        report_path=str(REPORTS_DIR / "league_model_policy.json"),
    )


if __name__ == "__main__":
    main()
