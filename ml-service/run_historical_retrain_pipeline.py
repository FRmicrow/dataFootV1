import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import psycopg2
from feature_schema import GLOBAL_1X2_FEATURE_SCHEMA_VERSION


BASE_DIR = Path(__file__).resolve().parent
LOG_DIR = BASE_DIR / "logs"
STATUS_PATH = BASE_DIR / "historical_retrain_pipeline_status.json"
FEATURE_PROGRESS_PATH = BASE_DIR / "feature_pipeline_progress.json"


def utc_now():
    return datetime.utcnow().isoformat() + "Z"


def write_status(**payload):
    status = {"updated_at": utc_now(), **payload}
    STATUS_PATH.write_text(json.dumps(status, indent=2))
    LOG_DIR.mkdir(exist_ok=True)
    with (LOG_DIR / "historical_retrain_pipeline.log").open("a") as handle:
        handle.write(json.dumps(status) + "\n")


def read_json(path: Path):
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {"status": "invalid_json", "path": str(path)}


def get_connection():
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot",
    )
    return psycopg2.connect(database_url)


def find_running_process(pattern: str):
    result = subprocess.run(
        ["pgrep", "-f", pattern],
        cwd=str(BASE_DIR.parent),
        capture_output=True,
        text=True,
        check=False,
    )
    return [int(pid) for pid in result.stdout.split() if pid.isdigit()]


def wait_for_pattern(pattern: str, stage: str):
    while True:
        pids = find_running_process(pattern)
        if not pids:
            return
        write_status(status="waiting", stage=stage, pids=pids, feature_progress=read_json(FEATURE_PROGRESS_PATH))
        time.sleep(30)


def run_command(command, stage_name: str, log_name: str):
    LOG_DIR.mkdir(exist_ok=True)
    log_path = LOG_DIR / log_name
    with log_path.open("a") as log_handle:
        log_handle.write(f"\n[{utc_now()}] START {' '.join(command)}\n")
        log_handle.flush()
        process = subprocess.Popen(
            command,
            cwd=str(BASE_DIR.parent),
            stdout=log_handle,
            stderr=subprocess.STDOUT,
        )
        try:
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
                    log_handle.write(f"[{utc_now()}] END code={return_code}\n")
                    log_handle.flush()
                    return return_code
                time.sleep(30)
        except KeyboardInterrupt:
            os.kill(process.pid, signal.SIGTERM)
            raise


def feature_store_ready():
    progress = read_json(FEATURE_PROGRESS_PATH)
    return (
        progress.get("status") == "completed"
        and progress.get("schema_version") == GLOBAL_1X2_FEATURE_SCHEMA_VERSION
    )


def wait_for_feature_store():
    while True:
        if feature_store_ready():
            write_status(status="completed", stage="features_ready", feature_progress=read_json(FEATURE_PROGRESS_PATH))
            return
        wait_for_pattern("ml-service/features.py", "features_wait")
        progress = read_json(FEATURE_PROGRESS_PATH)
        if (
            progress.get("status") == "completed"
            and progress.get("schema_version") == GLOBAL_1X2_FEATURE_SCHEMA_VERSION
        ):
            return
        write_status(status="blocked", stage="features_wait", feature_progress=progress)
        time.sleep(30)


def registry_has_model(name: str):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT version, created_at
                FROM V3_Model_Registry
                WHERE name = %s AND is_active = 1
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (name,),
            )
            row = cur.fetchone()
            if not row:
                return None
            return {"version": row[0], "created_at": row[1].isoformat()}
    finally:
        conn.close()


def ensure_stage(command, stage_name, log_name, model_name=None):
    return_code = run_command(command, stage_name, log_name)
    if return_code != 0:
        raise RuntimeError(f"{stage_name} failed with code {return_code}")
    if model_name:
        model = registry_has_model(model_name)
        if not model:
            raise RuntimeError(f"{stage_name} finished without active registry entry for {model_name}")
        write_status(status="completed", stage=stage_name, model_name=model_name, model=model)


def main():
    write_status(status="starting", stage="bootstrap")
    wait_for_feature_store()

    ensure_stage([sys.executable, "ml-service/train_1x2.py"], "train_1x2_ft", "train_1x2_retrain.log", "global_1x2")
    ensure_stage([sys.executable, "ml-service/src/models/ht_result/train.py", "--version", "v2"], "train_ht_v2", "train_ht_v2_retrain.log", "global_ht_1x2")
    ensure_stage([sys.executable, "ml-service/src/models/goals_total/train.py"], "train_goals_ou", "train_goals_retrain.log", "global_goals_ou")
    ensure_stage([sys.executable, "ml-service/src/models/corners_total/train.py", "--version", "v2"], "train_corners_v2", "train_corners_v2_retrain.log", "global_corners_ou")
    ensure_stage([sys.executable, "ml-service/src/models/cards_total/train.py", "--version", "v2"], "train_cards_v2", "train_cards_v2_retrain.log", "global_cards_ou")

    write_status(status="completed", stage="done")


if __name__ == "__main__":
    main()
