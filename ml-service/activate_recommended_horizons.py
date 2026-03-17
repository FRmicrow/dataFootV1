import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path

from db_config import get_connection
from model_paths import (
    get_cards_poisson_paths,
    get_goals_poisson_paths,
    get_ht_poisson_paths,
    get_corners_poisson_paths,
    with_horizon_suffix,
)


BASE_DIR = Path(__file__).resolve().parent
REPORTS_DIR = BASE_DIR / "reports"
OUTPUT_PATH = REPORTS_DIR / "activated_horizon_plan.json"


ACTIVATION_PLAN = {
    "global_ht_1x2": {
        "horizon": "FULL_HISTORICAL",
        "base_paths": get_ht_poisson_paths("v2"),
        "metadata_filename": "catboost_baseline_v2_metadata.json",
        "importance_filename": None,
    },
    "global_goals_ou": {
        "horizon": "5Y_ROLLING",
        "base_paths": get_goals_poisson_paths(),
        "metadata_filename": "catboost_goals_v1_metadata.json",
        "importance_filename": "catboost_goals_v1_importance.json",
    },
    "global_corners_ou": {
        "horizon": "3Y_ROLLING",
        "base_paths": get_corners_poisson_paths("v2"),
        "metadata_filename": "catboost_corners_v2_metadata.json",
        "importance_filename": "catboost_corners_v2_importance.json",
    },
    "global_cards_ou": {
        "horizon": "5Y_ROLLING",
        "base_paths": get_cards_poisson_paths("v2"),
        "metadata_filename": "catboost_cards_v2_metadata.json",
        "importance_filename": "catboost_cards_v2_importance.json",
    },
}


def horizon_slug(horizon_type: str) -> str:
    return horizon_type.lower()


def load_registry_entry(conn, model_name: str, horizon: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, version, path, metadata_json, created_at
            FROM v3_model_registry
            WHERE name = %s
            ORDER BY created_at DESC
            """,
            (model_name,),
        )
        rows = cur.fetchall()
    for row in rows:
        metadata = row[3]
        if isinstance(metadata, str):
            metadata = json.loads(metadata)
        if metadata.get("horizon") == horizon:
            return {
                "id": row[0],
                "version": row[1],
                "path": row[2],
                "metadata": metadata,
                "created_at": row[4],
            }
    raise RuntimeError(f"No registry entry found for {model_name} horizon={horizon}")


def promote_files(plan_entry: dict):
    slug = horizon_slug(plan_entry["horizon"])
    target = plan_entry["base_paths"]
    source = with_horizon_suffix(target, slug)

    shutil.copy2(source["home"], target["home"])
    shutil.copy2(source["away"], target["away"])

    model_dir = Path(target["dir"])
    metadata_src = model_dir / plan_entry["metadata_filename"].replace("_metadata.json", f"_{slug}_metadata.json")
    metadata_dst = model_dir / plan_entry["metadata_filename"]
    if metadata_src.exists():
        shutil.copy2(metadata_src, metadata_dst)

    importance_name = plan_entry["importance_filename"]
    if importance_name:
        importance_src = model_dir / importance_name.replace("_importance.json", f"_{slug}_importance.json")
        importance_dst = model_dir / importance_name
        if importance_src.exists():
            shutil.copy2(importance_src, importance_dst)

    return {
        "source_home": source["home"],
        "source_away": source["away"],
        "target_home": target["home"],
        "target_away": target["away"],
        "metadata_target": str(metadata_dst) if metadata_src.exists() else None,
        "importance_target": str(importance_dst) if importance_name and importance_src.exists() else None,
    }


def activate_registry_entry(conn, model_name: str, registry_entry: dict, promotion_details: dict):
    metadata = dict(registry_entry["metadata"])
    metadata["activated_via"] = "activate_recommended_horizons.py"
    metadata["activated_at"] = datetime.now(timezone.utc).isoformat()
    metadata["promotion_details"] = promotion_details

    new_version = f"{registry_entry['version']}_active"

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE v3_model_registry
            SET is_active = 0
            WHERE name = %s
            """,
            (model_name,),
        )
        cur.execute(
            """
            INSERT INTO v3_model_registry (name, version, type, path, is_active, metadata_json)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (
                model_name,
                new_version,
                "METAMODEL",
                registry_entry["path"],
                1,
                json.dumps(metadata),
            ),
        )


def main():
    conn = get_connection()
    try:
        summary = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "activated_models": [],
            "kept_unchanged": ["global_1x2"],
        }
        for model_name, plan_entry in ACTIVATION_PLAN.items():
            entry = load_registry_entry(conn, model_name, plan_entry["horizon"])
            promoted = promote_files(plan_entry)
            activate_registry_entry(conn, model_name, entry, promoted)
            summary["activated_models"].append(
                {
                    "name": model_name,
                    "horizon": plan_entry["horizon"],
                    "source_version": entry["version"],
                    "activated_version": f"{entry['version']}_active",
                    "promoted_files": promoted,
                }
            )
        conn.commit()
        OUTPUT_PATH.write_text(json.dumps(summary, indent=2))
        print(json.dumps(summary, indent=2))
    finally:
        conn.close()


if __name__ == "__main__":
    main()
