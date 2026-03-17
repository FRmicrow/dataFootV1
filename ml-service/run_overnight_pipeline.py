import json
import os
import signal
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import psycopg2
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, GLOBAL_1X2_FEATURE_SCHEMA_VERSION, inspect_feature_vector

BASE_DIR = Path(__file__).resolve().parent
FEATURE_PROGRESS_PATH = BASE_DIR / "feature_pipeline_progress.json"
TRAIN_PROGRESS_PATH = BASE_DIR / "train_1x2_progress.json"
PIPELINE_STATUS_PATH = BASE_DIR / "overnight_pipeline_status.json"
MODEL_PATH = BASE_DIR / "model_1x2.joblib"
IMPORTANCE_PATH = BASE_DIR / "model_1x2_importance.json"
LOG_DIR = BASE_DIR / "logs"
FEATURE_LOG_PATH = LOG_DIR / "feature_pipeline.log"
TRAIN_LOG_PATH = LOG_DIR / "train_1x2.log"
RUNNER_LOG_PATH = LOG_DIR / "overnight_pipeline.log"


def utc_now():
    return datetime.utcnow().isoformat() + "Z"


def write_pipeline_status(**payload):
    status = {
        "updated_at": utc_now(),
        **payload,
    }
    PIPELINE_STATUS_PATH.write_text(json.dumps(status, indent=2))
    LOG_DIR.mkdir(exist_ok=True)
    with RUNNER_LOG_PATH.open("a") as handle:
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


def get_feature_store_count():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM V3_ML_Feature_Store")
            return int(cur.fetchone()[0])
    finally:
        conn.close()


def feature_store_matches_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT feature_vector
                FROM V3_ML_Feature_Store
                ORDER BY calculated_at DESC NULLS LAST, fixture_id DESC
                LIMIT 1
                """
            )
            row = cur.fetchone()
            if not row:
                return False
            payload = json.loads(row[0])
            issues = inspect_feature_vector(payload, GLOBAL_1X2_FEATURE_COLUMNS)
            return not issues["missing"] and not issues["extra"]
    finally:
        conn.close()


def active_model_matches_schema():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT metadata_json
                FROM V3_Model_Registry
                WHERE name = %s AND type = %s AND is_active = 1
                ORDER BY created_at DESC
                LIMIT 1
                """,
                ("global_1x2", "METAMODEL"),
            )
            row = cur.fetchone()
            if not row or not row[0]:
                return False
            metadata = row[0]
            if isinstance(metadata, str):
                metadata = json.loads(metadata)
            return metadata.get("schema_version") == GLOBAL_1X2_FEATURE_SCHEMA_VERSION
    finally:
        conn.close()


def model_artifacts_ready():
    return MODEL_PATH.exists() and IMPORTANCE_PATH.exists()

def run_command(command, progress_path: Path, stage_name: str, log_path: Path):
    LOG_DIR.mkdir(exist_ok=True)
    with log_path.open("a") as log_handle:
        log_handle.write(f"\n[{utc_now()}] START {' '.join(command)}\n")
        log_handle.flush()
        write_pipeline_status(status="running", stage=stage_name, command=command, log_path=str(log_path))
        process = subprocess.Popen(
            command,
            cwd=str(BASE_DIR.parent),
            stdout=log_handle,
            stderr=subprocess.STDOUT,
        )
        try:
            while True:
                return_code = process.poll()
                progress = read_json(progress_path)
                write_pipeline_status(
                    status="running" if return_code is None else ("completed" if return_code == 0 else "failed"),
                    stage=stage_name,
                    pid=process.pid,
                    progress=progress,
                    return_code=return_code,
                )
                if return_code is not None:
                    log_handle.write(f"[{utc_now()}] END code={return_code}\n")
                    log_handle.flush()
                    return return_code
                time.sleep(30)
        except KeyboardInterrupt:
            os.kill(process.pid, signal.SIGTERM)
            raise


def find_running_process(pattern: str):
    result = subprocess.run(
        ["pgrep", "-f", pattern],
        cwd=str(BASE_DIR.parent),
        capture_output=True,
        text=True,
        check=False,
    )
    pids = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    return [int(pid) for pid in pids if pid.isdigit()]


def wait_for_existing_process(pattern: str, progress_path: Path, stage_name: str):
    while True:
        pids = find_running_process(pattern)
        if not pids:
            return
        write_pipeline_status(
            status="running",
            stage=stage_name,
            waiting_for_existing_process=True,
            pids=pids,
            progress=read_json(progress_path),
        )
        time.sleep(30)


def feature_step():
    feature_progress = read_json(FEATURE_PROGRESS_PATH)
    feature_count = get_feature_store_count()
    schema_ready = feature_store_matches_schema() if feature_count > 0 else False
    if feature_progress.get("status") == "completed" and feature_count > 0 and schema_ready:
        write_pipeline_status(
            status="completed",
            stage="features",
            skipped=True,
            progress=feature_progress,
            feature_store_count=feature_count,
            schema_version=GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
        )
        return

    wait_for_existing_process("ml-service/features.py", FEATURE_PROGRESS_PATH, "features")
    command = [sys.executable, "-W", "ignore", "ml-service/features.py", "--reset"]
    return_code = run_command(command, FEATURE_PROGRESS_PATH, "features", FEATURE_LOG_PATH)
    if return_code != 0:
        raise RuntimeError(f"Feature pipeline failed with code {return_code}")
    feature_progress = read_json(FEATURE_PROGRESS_PATH)
    feature_count = get_feature_store_count()
    if feature_progress.get("status") != "completed" or feature_count <= 0 or not feature_store_matches_schema():
        raise RuntimeError("Feature pipeline finished without a valid completed status or persisted rows")


def train_step():
    wait_for_existing_process("ml-service/train_1x2.py", TRAIN_PROGRESS_PATH, "training")
    train_progress = read_json(TRAIN_PROGRESS_PATH)
    model_ready = model_artifacts_ready()
    if train_progress.get("status") == "completed" and model_ready and active_model_matches_schema():
        write_pipeline_status(
            status="completed",
            stage="training",
            skipped=True,
            progress=train_progress,
            model_path=str(MODEL_PATH),
            importance_path=str(IMPORTANCE_PATH),
            schema_version=GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
        )
        return

    command = [sys.executable, "ml-service/train_1x2.py"]
    return_code = run_command(command, TRAIN_PROGRESS_PATH, "training", TRAIN_LOG_PATH)
    if return_code != 0:
        raise RuntimeError(f"Training pipeline failed with code {return_code}")
    train_progress = read_json(TRAIN_PROGRESS_PATH)
    if train_progress.get("status") != "completed" or not model_artifacts_ready() or not active_model_matches_schema():
        raise RuntimeError("Training pipeline finished without a valid completed status or model artifacts")


def main():
    write_pipeline_status(status="starting", stage="bootstrap")
    feature_step()
    train_step()
    write_pipeline_status(
        status="completed",
        stage="done",
        feature_progress=read_json(FEATURE_PROGRESS_PATH),
        training_progress=read_json(TRAIN_PROGRESS_PATH),
    )


if __name__ == "__main__":
    main()
