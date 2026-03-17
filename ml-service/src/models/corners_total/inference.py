import json
import os
import sys

import pandas as pd
from catboost import CatBoostRegressor

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from league_adjustments import get_market_adjustment_factor
from model_paths import get_corners_poisson_paths
from src.models.model_utils import get_logger, poisson_prob

logger = get_logger(__name__)

_MODELS = {}
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


def load_models(version="v2"):
    global _MODELS
    if version not in _MODELS:
        paths = get_corners_poisson_paths(version)
        if os.path.exists(paths["home"]) and os.path.exists(paths["away"]):
            home_model = CatBoostRegressor()
            home_model.load_model(paths["home"])
            away_model = CatBoostRegressor()
            away_model.load_model(paths["away"])
            _MODELS[version] = {"type": "poisson", "home": home_model, "away": away_model}
        else:
            _MODELS[version] = {"type": "heuristic"}
    return _MODELS[version]


def fetch_features_for_inference_v2(fixture_id):
    conn = get_db_connection()
    try:
        query = """
            SELECT feature_vector
            FROM V3_ML_Feature_Store
            WHERE fixture_id = %s
            LIMIT 1
        """
        row = pd.read_sql_query(query, conn, params=(fixture_id,))
        if row.empty:
            raise ValueError(f"Feature vector for fixture {fixture_id} not found.")
        vector = json.loads(row.iloc[0]["feature_vector"])
        normalized = normalize_feature_vector(vector)
        return pd.DataFrame([normalized], columns=GLOBAL_1X2_FEATURE_COLUMNS)
    finally:
        conn.close()


def _extract_baseline_features(h_tid, a_tid, b_df, league_id):
    home_b = json.loads(b_df[b_df["team_id"] == h_tid].iloc[0]["features_json"])
    away_b = json.loads(b_df[b_df["team_id"] == a_tid].iloc[0]["features_json"])
    return {
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

def _extract_process_features(h_tid, a_tid, p_df):
    if len(p_df) != 2:
        return {
            "diff_possession_l5": 0, "diff_control_l5": 0, "diff_shots_l5": 0, "diff_sot_l5": 0, "diff_corners_l5": 0,
            "home_p_possession_avg_5": 50, "away_p_possession_avg_5": 50,
            "home_p_control_index_5": 0, "away_p_control_index_5": 0,
            "home_p_corners_per_match_5": 5, "away_p_corners_per_match_5": 5,
            "home_p_shots_per_match_5": 10, "away_p_shots_per_match_5": 10,
        }
    home_p = json.loads(p_df[p_df["team_id"] == h_tid].iloc[0]["features_json"])
    away_p = json.loads(p_df[p_df["team_id"] == a_tid].iloc[0]["features_json"])
    return {
        "diff_possession_l5": (home_p.get("possession_avg_5") or 50) - (away_p.get("possession_avg_5") or 50),
        "diff_control_l5": (home_p.get("control_index_5") or 0) - (away_p.get("control_index_5") or 0),
        "diff_shots_l5": (home_p.get("shots_per_match_5") or 10) - (away_p.get("shots_per_match_5") or 10),
        "diff_sot_l5": (home_p.get("sot_per_match_5") or 3) - (away_p.get("sot_per_match_5") or 3),
        "diff_corners_l5": (home_p.get("corners_per_match_5") or 5) - (away_p.get("corners_per_match_5") or 5),
        "home_p_possession_avg_5": home_p.get("possession_avg_5") or 50,
        "away_p_possession_avg_5": away_p.get("possession_avg_5") or 50,
        "home_p_control_index_5": home_p.get("control_index_5") or 0,
        "away_p_control_index_5": away_p.get("control_index_5") or 0,
        "home_p_corners_per_match_5": home_p.get("corners_per_match_5") or 5,
        "away_p_corners_per_match_5": away_p.get("corners_per_match_5") or 5,
        "home_p_shots_per_match_5": home_p.get("shots_per_match_5") or 10,
        "away_p_shots_per_match_5": away_p.get("shots_per_match_5") or 10,
    }

def fetch_features_for_inference_v1(fixture_id):
    conn = get_db_connection()
    try:
        fixture_query = "SELECT league_id, home_team_id, away_team_id FROM V3_Fixtures WHERE fixture_id = %s"
        fixture_row = pd.read_sql_query(fixture_query, conn, params=(fixture_id,))
        if fixture_row.empty:
            raise ValueError(f"Fixture {fixture_id} not found.")

        league_id, h_tid, a_tid = int(fixture_row.iloc[0]["league_id"]), int(fixture_row.iloc[0]["home_team_id"]), int(fixture_row.iloc[0]["away_team_id"])

        baseline_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = %s AND feature_set_id = 'BASELINE_V1'"
        b_df = pd.read_sql_query(baseline_query, conn, params=(fixture_id,))
        if len(b_df) < 2:
            raise ValueError(f"Legacy features for fixture {fixture_id} not found.")
            
        features = _extract_baseline_features(h_tid, a_tid, b_df, league_id)
        process_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = %s AND feature_set_id = 'PROCESS_V1' AND horizon_type = 'FULL_HISTORICAL'"
        p_df = pd.read_sql_query(process_query, conn, params=(fixture_id,))
        features.update(_extract_process_features(h_tid, a_tid, p_df))

        cols = [
            "league_id", "diff_elo", "diff_points", "diff_rank", "diff_lineup_strength",
            "home_b_elo", "away_b_elo", "home_b_lineup_strength_v1", "away_b_lineup_strength_v1",
            "diff_possession_l5", "diff_control_l5", "diff_shots_l5", "diff_sot_l5", "diff_corners_l5",
            "home_p_possession_avg_5", "away_p_possession_avg_5",
            "home_p_control_index_5", "away_p_control_index_5",
            "home_p_corners_per_match_5", "away_p_corners_per_match_5",
            "home_p_shots_per_match_5", "away_p_shots_per_match_5",
        ]
        return pd.DataFrame([features], columns=cols)
    finally:
        conn.close()


def _build_corners_result(fixture_id, h_mu, a_mu, model_version, prediction_status, is_fallback):
    total_mu = h_mu + a_mu
    probabilities = {k: poisson_prob(total_mu, k) for k in range(31)}
    total_prob = sum(probabilities.values()) or 1.0
    probabilities = {k: p / total_prob for k, p in probabilities.items()}

    lines = [7.5, 8.5, 9.5, 10.5, 11.5]
    over_under = {}
    for line in lines:
        prob_under = sum(p for k, p in probabilities.items() if k < line)
        over_under[f"Over {line}"] = float(1.0 - prob_under)
        over_under[f"Under {line}"] = float(prob_under)

    return {
        "fixture_id": fixture_id,
        "model_version": model_version,
        "prediction_status": prediction_status,
        "is_fallback": is_fallback,
        "expected_corners": {"home": float(h_mu), "away": float(a_mu), "total": float(total_mu)},
        "over_under_probabilities": over_under,
    }

def predict_total_corners(fixture_id, version="v2"):
    context = get_fixture_context(fixture_id)
    model_data = load_models(version)
    df = fetch_features_for_inference_v2(fixture_id) if version == "v2" else fetch_features_for_inference_v1(fixture_id)
    heuristic_home = float(df.iloc[0]["home_p_corners_per_match_5"] or 5.2)
    heuristic_away = float(df.iloc[0]["away_p_corners_per_match_5"] or 4.3)

    if model_data["type"] == "poisson":
        h_mu = max(0.1, float(model_data["home"].predict(df)[0]))
        a_mu = max(0.1, float(model_data["away"].predict(df)[0]))
        global_entry = load_registry_entry("global_corners_ou")
        model_version = global_entry["version"] if global_entry else f"{version}_poisson"
        prediction_status, is_fallback = "success_model", False
    else:
        h_mu, a_mu = heuristic_home, heuristic_away
        model_version, prediction_status, is_fallback = f"dynamic_heuristic_{version}", "success_fallback", True

    result = _build_corners_result(fixture_id, h_mu, a_mu, model_version, prediction_status, is_fallback)
    adjustment_factor = get_market_adjustment_factor("corners_ou", context["league_id"])
    if adjustment_factor:
        result = apply_corners_adjustment(result, adjustment_factor)
    return result

if __name__ == "__main__":
    import sys as _sys

    if len(_sys.argv) > 1:
        print(json.dumps(predict_total_corners(int(_sys.argv[1])), indent=2))
