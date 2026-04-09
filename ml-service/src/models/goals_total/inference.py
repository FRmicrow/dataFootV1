import json
import math
import os
import sys

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from league_adjustments import clamp, get_market_adjustment_factor
from league_model_policy import get_market_decision, get_market_policy_for_league
from model_paths import get_goals_poisson_paths
from src.models.model_utils import get_logger, poisson_prob

logger = get_logger(__name__)


_MODELS = None
_LEAGUE_MODELS = {}
_REGISTRY_CACHE = {}


def get_db_connection():
    return get_connection()




def get_fixture_context(fixture_id):
    conn = get_db_connection()
    try:
        query = """
            SELECT league_id, home_team_id, away_team_id
            FROM V3_Fixtures
            WHERE fixture_id = %s
        """
        row = pd.read_sql_query(query, conn, params=(fixture_id,))
        if row.empty:
            raise ValueError(f"Fixture {fixture_id} not found.")
        row = row.iloc[0]
        return {
            "league_id": int(row["league_id"]),
            "home_team_id": int(row["home_team_id"]),
            "away_team_id": int(row["away_team_id"]),
        }
    finally:
        conn.close()


def load_models():
    global _MODELS
    if _MODELS is None:
        model_paths = get_goals_poisson_paths()
        if os.path.exists(model_paths["home"]) and os.path.exists(model_paths["away"]):
            home_model = CatBoostRegressor()
            home_model.load_model(model_paths["home"])
            away_model = CatBoostRegressor()
            away_model.load_model(model_paths["away"])
            _MODELS = {"type": "poisson", "home": home_model, "away": away_model}
        else:
            _MODELS = {"type": "heuristic"}
    return _MODELS


def load_registry_entry(model_name):
    if model_name in _REGISTRY_CACHE:
        return _REGISTRY_CACHE[model_name]

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT version, path, metadata_json
            FROM v3_model_registry
            WHERE name = %s AND is_active = 1
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (model_name,),
        )
        row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        _REGISTRY_CACHE[model_name] = None
        return None

    version, path, metadata_json = row
    metadata = json.loads(metadata_json) if isinstance(metadata_json, str) else metadata_json
    entry = {"version": version, "path": path, "metadata": metadata}
    _REGISTRY_CACHE[model_name] = entry
    return entry


def load_league_models(league_id):
    if league_id in _LEAGUE_MODELS:
        return _LEAGUE_MODELS[league_id]

    entry = load_registry_entry(f"league_goals_ou_{league_id}")
    if not entry:
        _LEAGUE_MODELS[league_id] = (None, None)
        return _LEAGUE_MODELS[league_id]

    model_paths = entry["metadata"].get("model_paths") or {}
    home_path = model_paths.get("home")
    away_path = model_paths.get("away")
    if not home_path or not away_path or not os.path.exists(home_path) or not os.path.exists(away_path):
        _LEAGUE_MODELS[league_id] = (None, entry)
        return _LEAGUE_MODELS[league_id]

    home_model = CatBoostRegressor()
    home_model.load_model(home_path)
    away_model = CatBoostRegressor()
    away_model.load_model(away_path)
    _LEAGUE_MODELS[league_id] = ({"type": "poisson", "home": home_model, "away": away_model}, entry)
    return _LEAGUE_MODELS[league_id]


def fetch_features_for_inference(fixture_id):
    conn = get_db_connection()
    try:
        feature_query = "SELECT feature_vector FROM V3_ML_Feature_Store WHERE fixture_id = %s"
        feature_row = pd.read_sql_query(feature_query, conn, params=(fixture_id,))
        if feature_row.empty:
            raise ValueError(f"Goals feature vector not found for fixture {fixture_id}.")
        vector = normalize_feature_vector(json.loads(feature_row.iloc[0]["feature_vector"]))
        return pd.DataFrame([vector], columns=GLOBAL_1X2_FEATURE_COLUMNS)
    finally:
        conn.close()


def build_prediction(fixture_id, h_mu, a_mu, model_version, model_scope, is_shadow=False):
    total_mu = h_mu + a_mu
    probabilities = {}
    total_prob = 0.0
    for k in range(11):
        prob = poisson_prob(total_mu, k)
        probabilities[k] = prob
        total_prob += prob
    for k in probabilities:
        probabilities[k] /= max(0.0001, total_prob)

    lines = [1.5, 2.5, 3.5, 4.5]
    over_under = {}
    for line in lines:
        prob_under = sum(p for k, p in probabilities.items() if k < line)
        over_under[f"Over {line}"] = float(1.0 - prob_under)
        over_under[f"Under {line}"] = float(prob_under)

    return {
        "fixture_id": fixture_id,
        "model_version": model_version,
        "model_scope": model_scope,
        "prediction_status": "success_model",
        "is_fallback": False,
        "is_shadow": is_shadow,
        "expected_goals": {"home": float(h_mu), "away": float(a_mu), "total": float(total_mu)},
        "over_under_probabilities": over_under,
    }


def apply_goals_adjustment(prediction, factor):
    if not factor:
        return None

    base_total = float(prediction["expected_goals"]["total"])
    base_home = float(prediction["expected_goals"]["home"])
    base_away = float(prediction["expected_goals"]["away"])
    total_delta = float(factor.get("recommended_total_goals_delta", 0.0))
    cap = float(factor.get("recommended_adjustment_cap", 0.03))

    if base_total <= 0:
        return None

    base_over_2_5 = float(prediction["over_under_probabilities"].get("Over 2.5", 0.0))
    home_share = base_home / base_total if base_total > 0 else 0.5
    away_share = base_away / base_total if base_total > 0 else 0.5

    adjusted = None
    applied_total_delta = 0.0
    adjusted_over_2_5 = base_over_2_5
    for scale in (1.0, 0.85, 0.7, 0.55, 0.4, 0.25, 0.1):
        candidate_total = max(0.2, base_total + total_delta * scale)
        candidate_home = max(0.05, candidate_total * home_share)
        candidate_away = max(0.05, candidate_total * away_share)
        candidate = build_prediction(
            prediction["fixture_id"],
            candidate_home,
            candidate_away,
            prediction["model_version"],
            "league_adjusted_shadow",
            is_shadow=True,
        )
        candidate_over_2_5 = float(candidate["over_under_probabilities"].get("Over 2.5", 0.0))
        if abs(candidate_over_2_5 - base_over_2_5) <= cap + 1e-9:
            adjusted = candidate
            applied_total_delta = candidate_total - base_total
            adjusted_over_2_5 = candidate_over_2_5
            break

    if adjusted is None:
        adjusted = build_prediction(
            prediction["fixture_id"],
            base_home,
            base_away,
            prediction["model_version"],
            "league_adjusted_shadow",
            is_shadow=True,
        )

    adjusted["adjustment_context"] = {
        "market": "goals_ou",
        "league_id": factor["league_id"],
        "league_name": factor["league_name"],
        "window": factor.get("window"),
        "style_metrics": factor.get("style_metrics", {}),
        "indices": factor.get("indices", {}),
        "recommended_total_goals_delta": total_delta,
        "recommended_over_2_5_delta": float(factor.get("recommended_over_2_5_delta", 0.0)),
        "recommended_adjustment_cap": cap,
        "applied_total_goals_delta": applied_total_delta,
        "applied_over_2_5_delta": adjusted_over_2_5 - base_over_2_5,
    }
    return adjusted


def _get_goals_poisson_mu(df, model_data):
    h_mu = max(0.05, float(model_data["home"].predict(df)[0]))
    a_mu = max(0.05, float(model_data["away"].predict(df)[0]))
    return h_mu, a_mu

def _get_goals_heuristic_mu(df):
    h_mu = max(0.2, float(df.iloc[0].get("mom_xg_f_h5", 1.2)))
    a_mu = max(0.2, float(df.iloc[0].get("mom_xg_f_a5", 1.0)))
    return h_mu, a_mu

def predict_total_goals(fixture_id):
    context = get_fixture_context(fixture_id)
    df = fetch_features_for_inference(fixture_id)
    model_data = load_models()

    if model_data["type"] == "poisson":
        h_mu, a_mu = _get_goals_poisson_mu(df, model_data)
        global_entry = load_registry_entry("global_goals_ou")
        global_prediction = build_prediction(
            fixture_id,
            h_mu,
            a_mu,
            global_entry["version"] if global_entry else "global_goals_poisson",
            "global",
        )
    else:
        h_mu, a_mu = _get_goals_heuristic_mu(df)
        fallback = build_prediction(fixture_id, h_mu, a_mu, "dynamic_heuristic_v1", "fallback")
        fallback["prediction_status"] = "success_fallback"
        fallback["is_fallback"] = True
        return fallback

    policy_mode = get_market_policy_for_league("goals_ou", context["league_id"])
    adjustment_factor = get_market_adjustment_factor("goals_ou", context["league_id"])
    adjusted_global_prediction = apply_goals_adjustment(global_prediction, adjustment_factor)
    
    league_model_data, league_entry = load_league_models(context["league_id"])
    league_prediction = None
    if league_model_data is not None:
        lh_mu, la_mu = _get_goals_poisson_mu(df, league_model_data)
        league_prediction = build_prediction(
            fixture_id,
            lh_mu,
            la_mu,
            league_entry["version"],
            "league_specific",
            is_shadow=(policy_mode == "shadow"),
        )
        league_prediction["league_id"] = context["league_id"]
        decision = get_market_decision("goals_ou", context["league_id"])
        if decision and decision.get("recommended_horizon"):
            league_prediction["recommended_horizon"] = decision["recommended_horizon"]

    result = dict(global_prediction)
    if policy_mode == "active" and league_prediction is not None:
        result = dict(league_prediction)
        result["shadow_evaluation"] = {"global_baseline": global_prediction}
    elif policy_mode == "shadow" and league_prediction is not None:
        result["shadow_evaluation"] = {"league_specific_candidate": league_prediction}

    if adjusted_global_prediction is not None:
        eval_key = "adjustment_evaluation"
        result[eval_key] = {
            "without_adjustment": global_prediction,
            "with_league_adjustment": adjusted_global_prediction,
        }
    
    return result

    if adjusted_global_prediction is not None:
        result = dict(global_prediction)
        result["adjustment_evaluation"] = {
            "without_adjustment": global_prediction,
            "with_league_adjustment": adjusted_global_prediction,
        }
        return result

    return global_prediction


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        fixture = int(sys.argv[1])
        print(json.dumps(predict_total_goals(fixture), indent=2))
