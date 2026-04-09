import json
import os
from pathlib import Path

import psycopg2


BASE_DIR = Path(__file__).resolve().parent
FEATURE_PROGRESS_PATH = BASE_DIR / "feature_pipeline_progress.json"
TRAIN_PROGRESS_PATH = BASE_DIR / "train_1x2_progress.json"
PIPELINE_STATUS_PATH = BASE_DIR / "overnight_pipeline_status.json"
MODEL_PATH = BASE_DIR / "model_1x2.joblib"
IMPORTANCE_PATH = BASE_DIR / "model_1x2_importance.json"


def read_json(path: Path):
    if not path.exists():
        return None
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


def print_section(title, payload):
    print(f"{title}:")
    if payload is None:
        print("  missing")
        return
    if isinstance(payload, dict):
        for key, value in payload.items():
            print(f"  {key}: {value}")
        return
    print(f"  {payload}")


def main():
    feature_progress = read_json(FEATURE_PROGRESS_PATH)
    train_progress = read_json(TRAIN_PROGRESS_PATH)
    pipeline_status = read_json(PIPELINE_STATUS_PATH)

    print_section("feature_progress", feature_progress)
    print()
    print_section("train_progress", train_progress)
    print()
    print_section("overnight_pipeline", pipeline_status)
    print()
    print("artifacts:")
    print(f"  model_exists: {MODEL_PATH.exists()}")
    print(f"  importance_exists: {IMPORTANCE_PATH.exists()}")
    if MODEL_PATH.exists():
        print(f"  model_mtime: {MODEL_PATH.stat().st_mtime}")
    if IMPORTANCE_PATH.exists():
        print(f"  importance_mtime: {IMPORTANCE_PATH.stat().st_mtime}")
    print()
    print("database:")
    print(f"  feature_store_count: {get_feature_store_count()}")


if __name__ == "__main__":
    main()
