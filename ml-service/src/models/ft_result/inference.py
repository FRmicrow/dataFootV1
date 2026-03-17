import json
import math
import os
import sys

import joblib
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from league_model_policy import get_ft_policy_for_league
from model_paths import get_ft_poisson_paths, get_global_1x2_model_path
from src.models.model_utils import get_logger, poisson_prob

logger = get_logger(__name__)


_MODEL_CACHE = {}
_REGISTRY_CACHE = {}


def get_db_connection():
    return get_connection()




def get_fixture_context(fixture_id):
    conn = get_db_connection()
    try:
        fixture_query = """
            SELECT league_id, home_team_id, away_team_id, round
            FROM V3_Fixtures
            WHERE fixture_id = %s
        """
        fixture_row = pd.read_sql_query(fixture_query, conn, params=(fixture_id,))
        if fixture_row.empty:
            raise ValueError(f"Fixture {fixture_id} not found.")
        row = fixture_row.iloc[0]
        return {
            "league_id": int(row["league_id"]),
            "home_team_id": int(row["home_team_id"]),
            "away_team_id": int(row["away_team_id"]),
            "round": row.get("round") or "",
        }
    finally:
        conn.close()


def fetch_legacy_poisson_features(fixture_id, context):
    conn = get_db_connection()
    try:
        baseline_query = """
            SELECT team_id, features_json
            FROM V3_Team_Features_PreMatch
            WHERE fixture_id = %s AND feature_set_id = 'BASELINE_V1'
        """
        b_df = pd.read_sql_query(baseline_query, conn, params=(fixture_id,))
        h_tid = context["home_team_id"]
        a_tid = context["away_team_id"]
        league_id = context["league_id"]

        if len(b_df) >= 2:
            home_b = json.loads(b_df[b_df["team_id"] == h_tid].iloc[0]["features_json"])
            away_b = json.loads(b_df[b_df["team_id"] == a_tid].iloc[0]["features_json"])
            features = {
                "league_id": league_id,
                "diff_elo": (home_b.get("elo", 1500)) - (away_b.get("elo", 1500)),
                "diff_points": (home_b.get("points", 0)) - (away_b.get("points", 0)),
                "diff_rank": (away_b.get("rank", 0)) - (home_b.get("rank", 0)),
                "diff_lineup_strength": (home_b.get("lineup_strength_v1", 0)) - (away_b.get("lineup_strength_v1", 0)),
                "home_b_elo": home_b.get("elo", 1500),
                "away_b_elo": away_b.get("elo", 1500),
                "home_b_lineup_strength_v1": home_b.get("lineup_strength_v1", 0),
                "away_b_lineup_strength_v1": away_b.get("lineup_strength_v1", 0),
            }
        else:
            from time_travel import TemporalFeatureFactory

            factory = TemporalFeatureFactory()
            vector = factory.get_vector(fixture_id, conn=conn)
            features = {
                "league_id": league_id,
                "diff_elo": vector["elo_h"] - vector["elo_a"],
                "diff_points": vector["mom_pts_h10"] - vector["mom_pts_a10"],
                "diff_rank": 0,
                "diff_lineup_strength": vector["lqi_h"] - vector["lqi_a"],
                "home_b_elo": vector["elo_h"],
                "away_b_elo": vector["elo_a"],
                "home_b_lineup_strength_v1": vector["lqi_h"],
                "away_b_lineup_strength_v1": vector["lqi_a"],
            }
        cols = [
            "league_id", "diff_elo", "diff_points", "diff_rank", "diff_lineup_strength",
            "home_b_elo", "away_b_elo", "home_b_lineup_strength_v1", "away_b_lineup_strength_v1",
        ]
        return pd.DataFrame([features], columns=cols)
    finally:
        conn.close()


def fetch_feature_vector_v2(fixture_id):
    conn = get_db_connection()
    try:
        feature_query = "SELECT feature_vector FROM V3_ML_Feature_Store WHERE fixture_id = %s"
        feature_row = pd.read_sql_query(feature_query, conn, params=(fixture_id,))
        if feature_row.empty:
            raise ValueError(f"Global 1X2 feature vector not found for fixture {fixture_id}.")
        vector = normalize_feature_vector(json.loads(feature_row.iloc[0]["feature_vector"]))
        return pd.DataFrame([vector], columns=GLOBAL_1X2_FEATURE_COLUMNS)
    finally:
        conn.close()


def load_registry_entry(model_name):
    if model_name in _REGISTRY_CACHE:
        return _REGISTRY_CACHE[model_name]

    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT version, path, metadata_json
            FROM V3_Model_Registry
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


def load_global_classifier():
    cache_key = "global_classifier"
    if cache_key not in _MODEL_CACHE:
        path = get_global_1x2_model_path()
        _MODEL_CACHE[cache_key] = joblib.load(path) if os.path.exists(path) else None
    return _MODEL_CACHE[cache_key]


def load_league_classifier(league_id):
    entry = load_registry_entry(f"league_1x2_ft_{league_id}")
    if not entry:
        return None, None
    cache_key = f"league_classifier_{league_id}"
    if cache_key not in _MODEL_CACHE:
        model_path = entry["path"]
        if os.path.exists(model_path):
            _MODEL_CACHE[cache_key] = joblib.load(model_path)
        else:
            _MODEL_CACHE[cache_key] = None
    return _MODEL_CACHE[cache_key], entry


def load_legacy_poisson_models():
    cache_key = "legacy_poisson"
    if cache_key not in _MODEL_CACHE:
        paths = get_ft_poisson_paths()
        if os.path.exists(paths["home"]) and os.path.exists(paths["away"]):
            home_model = CatBoostRegressor()
            home_model.load_model(paths["home"])
            away_model = CatBoostRegressor()
            away_model.load_model(paths["away"])
            _MODEL_CACHE[cache_key] = {"home": home_model, "away": away_model}
        else:
            _MODEL_CACHE[cache_key] = None
    return _MODEL_CACHE[cache_key]


def build_joblib_prediction(fixture_id, probs, model_version, model_scope, is_shadow=False):
    return {
        "fixture_id": fixture_id,
        "model_version": model_version,
        "model_scope": model_scope,
        "prediction_status": "success_model",
        "is_fallback": False,
        "is_shadow": is_shadow,
        "expected_goals_ft": {"home": 1.5, "away": 1.2},
        "probabilities_1n2": {
            "1": float(probs[1]),
            "N": float(probs[0]),
            "2": float(probs[2]),
        },
        "exact_score_probabilities": {
            "1-0": float(probs[1] * 0.4),
            "0-0": float(probs[0] * 0.5),
            "0-1": float(probs[2] * 0.4),
        },
    }


def build_poisson_prediction(fixture_id, h_mu, a_mu, model_version, model_scope):
    p_1 = p_n = p_2 = 0.0
    exact_scores = {}
    for h in range(9):
        for a in range(9):
            prob = poisson_prob(h_mu, h) * poisson_prob(a_mu, a)
            exact_scores[f"{h}-{a}"] = float(prob)
            if h > a:
                p_1 += prob
            elif h == a:
                p_n += prob
            else:
                p_2 += prob
    total = max(0.0001, p_1 + p_n + p_2)
    return {
        "fixture_id": fixture_id,
        "model_version": model_version,
        "model_scope": model_scope,
        "prediction_status": "success_model",
        "is_fallback": False,
        "expected_goals_ft": {"home": float(h_mu), "away": float(a_mu)},
        "probabilities_1n2": {"1": p_1 / total, "N": p_n / total, "2": p_2 / total},
        "exact_score_probabilities": {k: v / total for k, v in sorted(exact_scores.items(), key=lambda item: item[1], reverse=True)[:15]},
    }


def predict_ft_result(fixture_id):
    context = get_fixture_context(fixture_id)
    feature_df = fetch_feature_vector_v2(fixture_id)

    global_model = load_global_classifier()
    global_prediction = None
    if global_model is not None:
        global_probs = global_model.predict_proba(feature_df)[0]
        global_entry = load_registry_entry("global_1x2")
        global_prediction = build_joblib_prediction(
            fixture_id,
            global_probs,
            global_entry["version"] if global_entry else "global_joblib",
            "global",
        )

    policy_mode = get_ft_policy_for_league(context["league_id"])
    league_model, league_entry = load_league_classifier(context["league_id"])
    league_prediction = None
    if league_model is not None:
        league_probs = league_model.predict_proba(feature_df)[0]
        league_prediction = build_joblib_prediction(
            fixture_id,
            league_probs,
            league_entry["version"],
            "league_specific",
            is_shadow=(policy_mode == "shadow"),
        )
        league_prediction["league_id"] = context["league_id"]

    if policy_mode == "active" and league_prediction is not None:
        result = dict(league_prediction)
        if global_prediction is not None:
            result["shadow_evaluation"] = {"global_baseline": global_prediction}
        return result

    if policy_mode == "shadow" and global_prediction is not None:
        result = dict(global_prediction)
        if league_prediction is not None:
            result["shadow_evaluation"] = {"league_specific_candidate": league_prediction}
        return result

    if global_prediction is not None:
        return global_prediction

    legacy_poisson = load_legacy_poisson_models()
    if legacy_poisson is not None:
        legacy_df = fetch_legacy_poisson_features(fixture_id, context)
        h_mu = max(0.01, legacy_poisson["home"].predict(legacy_df)[0])
        a_mu = max(0.01, legacy_poisson["away"].predict(legacy_df)[0])
        return build_poisson_prediction(fixture_id, h_mu, a_mu, "v0_poisson", "legacy_global")

    from time_travel import TemporalFeatureFactory

    factory = TemporalFeatureFactory()
    vector = factory.get_vector(fixture_id)
    h_mu = float(vector.get("mom_gf_h10", 1.45))
    a_mu = float(vector.get("mom_gf_a10", 1.25))
    fallback = build_poisson_prediction(fixture_id, h_mu, a_mu, "dynamic_heuristic_v0", "fallback")
    fallback["prediction_status"] = "success_fallback"
    fallback["is_fallback"] = True
    return fallback


if __name__ == "__main__":
    import sys as _sys

    if len(_sys.argv) > 1:
        print(json.dumps(predict_ft_result(int(_sys.argv[1])), indent=2))
