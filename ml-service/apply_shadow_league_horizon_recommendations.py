import json
import os
from datetime import datetime, timezone
from pathlib import Path

from db_config import get_connection
from league_model_policy import load_policy, save_policy


BASE_DIR = Path(__file__).resolve().parent
REPORT_PATH = BASE_DIR / "reports" / "shadow_league_horizon_report.json"
OUTPUT_PATH = BASE_DIR / "reports" / "shadow_league_horizon_recommendations.json"


RECOMMENDATIONS = {
    "ft_1x2": {
        2: "FULL_HISTORICAL",
        30: "FULL_HISTORICAL",
        34: "FULL_HISTORICAL",
    },
    "goals_ou": {
        30: "FULL_HISTORICAL",
        32: "3Y_ROLLING",
    },
    "cards_ou": {
        11: "5Y_ROLLING",
        1: "FULL_HISTORICAL",
    },
}


def registry_name(market: str, league_id: int) -> str:
    if market == "ft_1x2":
        return f"league_1x2_ft_{league_id}"
    if market == "goals_ou":
        return f"league_goals_ou_{league_id}"
    if market == "cards_ou":
        return f"league_cards_ou_{league_id}"
    raise ValueError(f"Unsupported market={market}")


def load_entries_by_horizon(conn, name: str):
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT version, path, metadata_json, created_at
            FROM v3_model_registry
            WHERE name = %s
            ORDER BY created_at DESC
            """,
            (name,),
        )
        rows = cur.fetchall()
    by_horizon = {}
    for version, path, metadata_json, created_at in rows:
        metadata = metadata_json if isinstance(metadata_json, dict) else json.loads(metadata_json)
        horizon = metadata.get("horizon", "FULL_HISTORICAL")
        if horizon not in by_horizon:
            by_horizon[horizon] = {
                "version": version,
                "path": path,
                "metadata": metadata,
                "created_at": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at),
            }
    return by_horizon


def activate_recommended_entry(conn, name: str, horizon: str):
    entries = load_entries_by_horizon(conn, name)
    chosen = entries.get(horizon)
    if not chosen:
        raise RuntimeError(f"No registry entry found for {name} horizon={horizon}")

    metadata = dict(chosen["metadata"])
    metadata["horizon"] = horizon
    metadata["recommended_horizon"] = horizon
    metadata["activated_via"] = "apply_shadow_league_horizon_recommendations.py"
    metadata["activated_at"] = datetime.now(timezone.utc).isoformat()

    activated_version = f"{chosen['version']}_recommended_active"
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE v3_model_registry
            SET is_active = 0
            WHERE name = %s
            """,
            (name,),
        )
        cur.execute(
            """
            INSERT INTO v3_model_registry (name, version, type, path, is_active, metadata_json)
            VALUES (%s, %s, %s, %s, 1, %s)
            """,
            (name, activated_version, "METAMODEL", chosen["path"], json.dumps(metadata)),
        )
    return {
        "name": name,
        "recommended_horizon": horizon,
        "source_version": chosen["version"],
        "activated_version": activated_version,
    }


def update_policy(policy):
    for market, recommendations in RECOMMENDATIONS.items():
        decisions = policy.get(market, {}).get("decisions", [])
        for decision in decisions:
            league_id = decision["league_id"]
            if league_id in recommendations:
                decision["recommended_horizon"] = recommendations[league_id]
    policy["shadow_horizon_generated_at"] = datetime.now(timezone.utc).isoformat()
    return policy


def main():
    if not REPORT_PATH.exists():
        raise FileNotFoundError(f"Missing horizon report: {REPORT_PATH}")

    conn = get_connection()
    try:
        applied = []
        for market, recommendations in RECOMMENDATIONS.items():
            for league_id, horizon in recommendations.items():
                applied.append(activate_recommended_entry(conn, registry_name(market, league_id), horizon))
        conn.commit()
    finally:
        conn.close()

    policy = load_policy()
    policy = update_policy(policy)
    save_policy(policy)

    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "applied": applied,
        "policy_path": str(BASE_DIR / "reports" / "league_model_policy.json"),
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2))
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
