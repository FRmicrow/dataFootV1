import json
import os
from datetime import datetime, timezone

from db_config import get_connection
from league_model_policy import REPORT_PATH, save_policy


def load_latest_registry_entry(model_name: str):
    conn = get_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT version, metadata_json
            FROM V3_Model_Registry
            WHERE name = %s AND is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (model_name,),
        )
        row = cur.fetchone()
        if not row:
            return None
        version, metadata_json = row
        metadata = json.loads(metadata_json) if isinstance(metadata_json, str) else metadata_json
        return {"version": version, **metadata}
    finally:
        conn.close()


def main():
    if not os.path.exists(REPORT_PATH):
        raise FileNotFoundError(f"Eligibility report not found: {REPORT_PATH}")

    with open(REPORT_PATH, "r") as handle:
        report = json.load(handle)

    shadow = []
    rejected = []
    active = []
    decisions = []

    for row in report.get("priority_leagues", []):
        league_id = row["league_id"]
        league_name = row["league_name"]
        ft_acc = row.get("ft_accuracy")
        ft_loss = row.get("ft_log_loss")
        ft_brier = row.get("ft_brier")

        trained_candidate = row.get("trained_league_model") or load_latest_registry_entry(f"league_1x2_ft_{league_id}")
        if not trained_candidate:
            continue

        candidate_metrics = trained_candidate["metrics"]
        beats_global = (
            candidate_metrics["accuracy"] > ft_acc
            and candidate_metrics["log_loss"] < ft_loss
            and candidate_metrics["brier_score"] < ft_brier
        )

        decision = {
            "league_id": league_id,
            "league_name": league_name,
            "beats_global": beats_global,
            "global_metrics": {
                "accuracy": ft_acc,
                "log_loss": ft_loss,
                "brier_score": ft_brier,
            },
            "league_metrics": candidate_metrics,
            "mode": "shadow" if beats_global else "rejected",
        }
        decisions.append(decision)

        if beats_global:
            shadow.append(league_id)
        else:
            rejected.append(league_id)

    policy = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "ft_1x2": {
            "active": active,
            "shadow": shadow,
            "rejected": rejected,
            "decisions": decisions,
        },
        "goals_ou": {
            "active": [],
            "shadow": [],
            "rejected": [],
            "decisions": [],
        },
        "corners_ou": {
            "active": [],
            "shadow": [],
            "rejected": [],
            "decisions": [],
        },
        "cards_ou": {
            "active": [],
            "shadow": [],
            "rejected": [],
            "decisions": [],
        },
        "ht_1x2": {
            "active": [],
            "shadow": [],
            "rejected": [],
            "decisions": [],
        },
    }

    ht_rejected = []
    ht_decisions = []
    for row in report.get("priority_leagues", []):
        league_id = row["league_id"]
        global_acc = row.get("ht_accuracy")
        global_loss = row.get("ht_log_loss")
        if global_acc is None or global_loss is None:
            continue
        trained_candidate = load_latest_registry_entry(f"league_ht_1x2_{league_id}")
        if not trained_candidate:
            continue
        candidate_metrics = trained_candidate["metrics"]
        beats_global = (
            candidate_metrics["accuracy"] > global_acc
            and candidate_metrics["log_loss"] < global_loss
        )
        ht_decisions.append({
            "league_id": league_id,
            "league_name": row["league_name"],
            "beats_global": beats_global,
            "global_metrics": {
                "accuracy": global_acc,
                "log_loss": global_loss,
            },
            "league_metrics": {
                "accuracy": candidate_metrics["accuracy"],
                "log_loss": candidate_metrics["log_loss"],
            },
            "mode": "shadow" if beats_global else "rejected",
        })
        if not beats_global:
            ht_rejected.append(league_id)

    policy["ht_1x2"]["rejected"] = ht_rejected
    policy["ht_1x2"]["decisions"] = ht_decisions

    goals_shadow = []
    goals_rejected = []
    goals_decisions = []
    for row in report.get("priority_leagues", []):
        league_id = row["league_id"]
        global_rmse = row.get("goals_rmse")
        global_over_accuracy = row.get("goals_over_accuracy")
        if global_rmse is None or global_over_accuracy is None:
            continue
        trained_candidate = load_latest_registry_entry(f"league_goals_ou_{league_id}")
        if not trained_candidate:
            continue
        candidate_metrics = trained_candidate
        beats_global = (
            candidate_metrics["total_rmse"] < global_rmse
            and candidate_metrics["over_2_5_accuracy"] > global_over_accuracy
        )
        goals_decisions.append({
            "league_id": league_id,
            "league_name": row["league_name"],
            "beats_global": beats_global,
            "global_metrics": {
                "total_rmse": global_rmse,
                "over_2_5_accuracy": global_over_accuracy,
            },
            "league_metrics": {
                "total_rmse": candidate_metrics["total_rmse"],
                "over_2_5_accuracy": candidate_metrics["over_2_5_accuracy"],
            },
            "mode": "shadow" if beats_global else "rejected",
        })
        if beats_global:
            goals_shadow.append(league_id)
        else:
            goals_rejected.append(league_id)

    policy["goals_ou"]["shadow"] = goals_shadow
    policy["goals_ou"]["rejected"] = goals_rejected
    policy["goals_ou"]["decisions"] = goals_decisions

    corners_shadow = []
    corners_rejected = []
    corners_decisions = []
    for row in report.get("priority_leagues", []):
        league_id = row["league_id"]
        global_rmse = row.get("corners_rmse")
        global_over_accuracy = row.get("corners_over_accuracy")
        if global_rmse is None or global_over_accuracy is None:
            continue
        trained_candidate = load_latest_registry_entry(f"league_corners_ou_{league_id}")
        if not trained_candidate:
            continue
        beats_global = (
            trained_candidate["total_rmse"] < global_rmse
            and trained_candidate["over_9_5_accuracy"] > global_over_accuracy
        )
        corners_decisions.append({
            "league_id": league_id,
            "league_name": row["league_name"],
            "beats_global": beats_global,
            "global_metrics": {
                "total_rmse": global_rmse,
                "over_9_5_accuracy": global_over_accuracy,
            },
            "league_metrics": {
                "total_rmse": trained_candidate["total_rmse"],
                "over_9_5_accuracy": trained_candidate["over_9_5_accuracy"],
            },
            "mode": "shadow" if beats_global else "rejected",
        })
        if beats_global:
            corners_shadow.append(league_id)
        else:
            corners_rejected.append(league_id)

    policy["corners_ou"]["shadow"] = corners_shadow
    policy["corners_ou"]["rejected"] = corners_rejected
    policy["corners_ou"]["decisions"] = corners_decisions

    cards_shadow = []
    cards_rejected = []
    cards_decisions = []
    for row in report.get("priority_leagues", []):
        league_id = row["league_id"]
        global_rmse = row.get("cards_rmse")
        global_over_accuracy = row.get("cards_over_accuracy")
        if global_rmse is None or global_over_accuracy is None:
            continue
        trained_candidate = load_latest_registry_entry(f"league_cards_ou_{league_id}")
        if not trained_candidate:
            continue
        beats_global = (
            trained_candidate["total_rmse"] < global_rmse
            and trained_candidate["over_4_5_accuracy"] > global_over_accuracy
        )
        cards_decisions.append({
            "league_id": league_id,
            "league_name": row["league_name"],
            "beats_global": beats_global,
            "global_metrics": {
                "total_rmse": global_rmse,
                "over_4_5_accuracy": global_over_accuracy,
            },
            "league_metrics": {
                "total_rmse": trained_candidate["total_rmse"],
                "over_4_5_accuracy": trained_candidate["over_4_5_accuracy"],
            },
            "mode": "shadow" if beats_global else "rejected",
        })
        if beats_global:
            cards_shadow.append(league_id)
        else:
            cards_rejected.append(league_id)

    policy["cards_ou"]["shadow"] = cards_shadow
    policy["cards_ou"]["rejected"] = cards_rejected
    policy["cards_ou"]["decisions"] = cards_decisions

    save_policy(policy)
    print(json.dumps(policy, indent=2))


if __name__ == "__main__":
    main()
