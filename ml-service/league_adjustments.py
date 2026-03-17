import json
import os
from functools import lru_cache


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FACTORS_PATH = os.path.join(BASE_DIR, "reports", "league_adjustment_factors.json")


def _load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r") as handle:
        return json.load(handle)


@lru_cache(maxsize=1)
def load_adjustment_factors():
    return _load_json(FACTORS_PATH) or {"generated_at": None, "markets": {}}


def get_market_adjustment_factor(market_key: str, league_id: int):
    factors = load_adjustment_factors()
    market_factors = factors.get("markets", {}).get(market_key, {})
    return market_factors.get(str(league_id))


def clamp(value, low, high):
    return max(low, min(high, value))

