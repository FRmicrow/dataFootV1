import json
import os
from pathlib import Path

import psycopg2


BASE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "reports"
PRE_V3_PATH = REPORTS_DIR / "pre_v3_active_model_metrics.json"
OUTPUT_PATH = REPORTS_DIR / "v3_active_model_metric_comparison.json"


def get_connection():
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://statfoot_user:statfoot_password@localhost:5432/statfoot",
    )
    return psycopg2.connect(database_url)


def load_active_models():
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT name, version, metadata_json
            FROM V3_Model_Registry
            WHERE is_active = 1
              AND name IN ('global_1x2', 'global_ht_1x2', 'global_goals_ou', 'global_corners_ou', 'global_cards_ou')
            ORDER BY name
            """
        )
        rows = []
        for name, version, metadata_json in cur.fetchall():
            meta = json.loads(metadata_json) if isinstance(metadata_json, str) else (metadata_json or {})
            rows.append(
                {
                    "name": name,
                    "version": version,
                    "schema_version": meta.get("schema_version"),
                    "metrics": meta.get("metrics"),
                    "metadata": meta,
                }
            )
        return rows
    finally:
        conn.close()


def metric_delta(before, after):
    if before is None or after is None:
        return None
    return after - before


def main():
    previous = {}
    if PRE_V3_PATH.exists():
        previous = {row["name"]: row for row in json.loads(PRE_V3_PATH.read_text())}

    current_rows = load_active_models()
    comparisons = []
    for row in current_rows:
        before = previous.get(row["name"], {})
        before_metrics = before.get("metrics") or {}
        after_metrics = row.get("metrics") or row.get("metadata") or {}
        comparisons.append(
            {
                "name": row["name"],
                "before_version": before.get("version"),
                "after_version": row["version"],
                "before_schema_version": before.get("schema_version"),
                "after_schema_version": row.get("schema_version"),
                "before_metrics": before_metrics,
                "after_metrics": after_metrics,
                "delta": {
                    "accuracy": metric_delta(before_metrics.get("accuracy"), after_metrics.get("accuracy")),
                    "log_loss": metric_delta(before_metrics.get("log_loss"), after_metrics.get("log_loss")),
                    "brier_score": metric_delta(before_metrics.get("brier_score"), after_metrics.get("brier_score")),
                    "f1_weighted": metric_delta(before_metrics.get("f1_weighted"), after_metrics.get("f1_weighted")),
                    "total_rmse": metric_delta(before_metrics.get("total_rmse"), after_metrics.get("total_rmse")),
                    "over_2_5_accuracy": metric_delta(before_metrics.get("over_2_5_accuracy"), after_metrics.get("over_2_5_accuracy")),
                    "over_9_5_accuracy": metric_delta(before_metrics.get("over_9_5_accuracy"), after_metrics.get("over_9_5_accuracy")),
                    "over_4_5_accuracy": metric_delta(before_metrics.get("over_4_5_accuracy"), after_metrics.get("over_4_5_accuracy")),
                },
            }
        )

    REPORTS_DIR.mkdir(exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(comparisons, indent=2))
    print(json.dumps(comparisons, indent=2))


if __name__ == "__main__":
    main()
