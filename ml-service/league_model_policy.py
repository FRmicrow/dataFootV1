import json
import os
from pathlib import Path


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORT_PATH = os.path.join(BASE_DIR, "reports", "league_specific_eligibility.json")
POLICY_PATH = os.path.join(BASE_DIR, "reports", "league_model_policy.json")


def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r") as handle:
        return json.load(handle)


def load_policy():
    return load_json(POLICY_PATH) or {
        "generated_at": None,
        "ft_1x2": {
            "active": [],
            "shadow": [],
            "rejected": [],
        },
    }


def get_ft_policy_for_league(league_id: int):
    policy = load_policy()
    ft_policy = policy.get("ft_1x2", {})
    if league_id in ft_policy.get("active", []):
        return "active"
    if league_id in ft_policy.get("shadow", []):
        return "shadow"
    return "global"


def get_market_policy_for_league(market_key: str, league_id: int):
    policy = load_policy()
    market_policy = policy.get(market_key, {})
    if league_id in market_policy.get("active", []):
        return "active"
    if league_id in market_policy.get("shadow", []):
        return "shadow"
    return "global"


def get_market_decision(market_key: str, league_id: int):
    policy = load_policy()
    market_policy = policy.get(market_key, {})
    for decision in market_policy.get("decisions", []):
        if decision.get("league_id") == league_id:
            return decision
    return None


def save_policy(policy):
    Path(os.path.dirname(POLICY_PATH)).mkdir(parents=True, exist_ok=True)
    with open(POLICY_PATH, "w") as handle:
        json.dump(policy, handle, indent=2)
