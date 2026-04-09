import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import psycopg2


BASE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "reports"
LOG_DIR = BASE_DIR / "logs"
STATUS_PATH = BASE_DIR / "horizon_experiments_status.json"
REPORT_PATH = REPORTS_DIR / "global_1x2_horizon_report.json"
HORIZONS = ["FULL_HISTORICAL", "5Y_ROLLING", "3Y_ROLLING"]
BEST_PARAMS_PATH = REPORTS_DIR / "global_1x2_best_params_seed.json"


def utc_now():
    return datetime.utcnow().isoformat() + "Z"


def write_status(**payload):
    STATUS_PATH.write_text(json.dumps({"updated_at": utc_now(), **payload}, indent=2))


def get_connection():
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot",
    )
    return psycopg2.connect(database_url)


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


def latest_registry_entry_for_horizon(horizon_type):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT version, path, is_active, metadata_json, created_at
            FROM V3_Model_Registry
            WHERE name = 'global_1x2'
            ORDER BY created_at DESC
            """
        )
        for version, path, is_active, metadata_json, created_at in cur.fetchall():
            metadata = json.loads(metadata_json) if isinstance(metadata_json, str) else (metadata_json or {})
            if metadata.get("horizon") == horizon_type:
                return {
                    "version": version,
                    "path": path,
                    "is_active": bool(is_active),
                    "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
                    "metadata": metadata,
                }
        return None
    finally:
        conn.close()


def build_report():
    rows = []
    for horizon in HORIZONS:
        entry = latest_registry_entry_for_horizon(horizon)
        if not entry:
            rows.append({"horizon": horizon, "status": "missing"})
            continue
        metrics = entry["metadata"].get("metrics", {})
        rows.append(
            {
                "horizon": horizon,
                "version": entry["version"],
                "is_active": entry["is_active"],
                "schema_version": entry["metadata"].get("schema_version"),
                "dataset_size_total": entry["metadata"].get("dataset_size_total"),
                "training_dataset_size": entry["metadata"].get("training_dataset_size"),
                "features_count": entry["metadata"].get("features_count"),
                "horizon_min_date": entry["metadata"].get("horizon_min_date"),
                "horizon_max_date": entry["metadata"].get("horizon_max_date"),
                "metrics": metrics,
            }
        )
    REPORTS_DIR.mkdir(exist_ok=True)
    REPORT_PATH.write_text(json.dumps(rows, indent=2))
    return rows


def main():
    for horizon in HORIZONS:
        command = [
            sys.executable,
            "ml-service/train_1x2.py",
            "--horizon",
            horizon,
            "--no-activate",
        ]
        if BEST_PARAMS_PATH.exists():
            command.extend(["--params-file", str(BEST_PARAMS_PATH), "--no-optuna"])
        run_command(
            command,
            f"train_{horizon.lower()}",
            f"train_1x2_{horizon.lower()}.log",
        )

    report = build_report()
    write_status(status="completed", stage="done", report=report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
