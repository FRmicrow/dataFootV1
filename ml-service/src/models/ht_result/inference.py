import os
import json
import math
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor
import sys

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector
from model_paths import get_ht_poisson_paths
from src.models.model_utils import get_logger, poisson_prob

logger = get_logger(__name__)

# Global cache for loaded models
_MODELS = {}

def get_db_connection():
    return get_connection()

def load_models(version='v0'):
    """Loads and caches the CatBoost models for a given version."""
    if version not in _MODELS:
        poisson_paths = get_ht_poisson_paths(version)
        
        if os.path.exists(poisson_paths["home"]) and os.path.exists(poisson_paths["away"]):
            home_model = CatBoostRegressor()
            home_model.load_model(poisson_paths["home"])
            away_model = CatBoostRegressor()
            away_model.load_model(poisson_paths["away"])
            _MODELS[version] = {"type": "poisson", "home": home_model, "away": away_model}
        else:
            _MODELS[version] = {"type": "heuristic"}
            
    return _MODELS[version]


def fetch_features_for_inference(fixture_id, include_process=False):
    """
    Fetches BASELINE_V1 (and optionally PROCESS_V1) features for a single fixture from DB.
    Fallback: Generates features on-the-fly using TemporalFeatureFactory if missing.
    """
    conn = get_db_connection()
    
    fixture_query = "SELECT league_id, home_team_id, away_team_id, round FROM V3_Fixtures WHERE fixture_id = %s"
    fixture_row = pd.read_sql_query(fixture_query, conn, params=(fixture_id,))
    
    if len(fixture_row) == 0:
        conn.close()
        raise ValueError(f"Fixture {fixture_id} not found.")
        
    league_id = int(fixture_row.iloc[0]['league_id'])
    h_tid = int(fixture_row.iloc[0]['home_team_id'])
    a_tid = int(fixture_row.iloc[0]['away_team_id'])
    
    baseline_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = %s AND feature_set_id = 'BASELINE_V1'"
    b_df = pd.read_sql_query(baseline_query, conn, params=(fixture_id,))
    
    features = {}
    if len(b_df) >= 2:
        home_b = json.loads(b_df[b_df['team_id'] == h_tid].iloc[0]['features_json'])
        away_b = json.loads(b_df[b_df['team_id'] == a_tid].iloc[0]['features_json'])
        
        features = {
            'league_id': league_id,
            'diff_elo': (home_b.get('elo', 1500)) - (away_b.get('elo', 1500)),
            'diff_points': (home_b.get('points', 0)) - (away_b.get('points', 0)),
            'diff_rank': (away_b.get('rank', 0)) - (home_b.get('rank', 0)),
            'diff_lineup_strength': (home_b.get('lineup_strength_v1', 0)) - (away_b.get('lineup_strength_v1', 0)),
            'home_b_elo': home_b.get('elo', 1500),
            'away_b_elo': away_b.get('elo', 1500),
            'home_b_lineup_strength_v1': home_b.get('lineup_strength_v1', 0),
            'away_b_lineup_strength_v1': away_b.get('lineup_strength_v1', 0)
        }
        
        if include_process:
            process_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = %s AND feature_set_id = 'PROCESS_V1' AND horizon_type = 'FULL_HISTORICAL'"
            p_df = pd.read_sql_query(process_query, conn, params=(fixture_id,))
            if len(p_df) == 2:
                home_p = json.loads(p_df[p_df['team_id'] == h_tid].iloc[0]['features_json'])
                away_p = json.loads(p_df[p_df['team_id'] == a_tid].iloc[0]['features_json'])
                features.update({
                    'diff_possession_l5': home_p.get('possession_avg_5', 50) - away_p.get('possession_avg_5', 50),
                    'diff_control_l5': home_p.get('control_index_5', 0) - away_p.get('control_index_5', 0),
                    'home_p_possession_avg_5': home_p.get('possession_avg_5', 50),
                    'away_p_possession_avg_5': away_p.get('possession_avg_5', 50),
                    'home_p_control_index_5': home_p.get('control_index_5', 0),
                    'away_p_control_index_5': away_p.get('control_index_5', 0)
                })
            else:
                features.update({
                    'diff_possession_l5': 0, 'diff_control_l5': 0,
                    'home_p_possession_avg_5': 50, 'away_p_possession_avg_5': 50,
                    'home_p_control_index_5': 0, 'away_p_control_index_5': 0
                })
    else:
        # Fallback: TemporalFeatureFactory
        try:
            from time_travel import TemporalFeatureFactory
            factory = TemporalFeatureFactory()
            vector = factory.get_vector(fixture_id, conn=conn)
            
            features = {
                'league_id': league_id,
                'diff_elo': vector['elo_h'] - vector['elo_a'],
                'diff_points': vector['mom_pts_h10'] - vector['mom_pts_a10'],
                'diff_rank': 0,
                'diff_lineup_strength': vector['lqi_h'] - vector['lqi_a'],
                'home_b_elo': vector['elo_h'],
                'away_b_elo': vector['elo_a'],
                'home_b_lineup_strength_v1': vector['lqi_h'],
                'away_b_lineup_strength_v1': vector['lqi_a']
            }
            if include_process:
                # We don't have exact process v1 in factory yet, use defaults or proxies if needed
                features.update({
                    'diff_possession_l5': 0, 'diff_control_l5': 0,
                    'home_p_possession_avg_5': 50, 'away_p_possession_avg_5': 50,
                    'home_p_control_index_5': 0, 'away_p_control_index_5': 0
                })
        except Exception as e:
            conn.close()
            raise ValueError(f"Feature generation failed for {fixture_id}: {e}")
            
    conn.close()
    cols_v0 = ['league_id', 'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength', 'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1']
    cols_v1 = cols_v0 + ['diff_possession_l5', 'diff_control_l5', 'home_p_possession_avg_5', 'away_p_possession_avg_5', 'home_p_control_index_5', 'away_p_control_index_5']
    return pd.DataFrame([features], columns=cols_v1 if include_process else cols_v0)


def fetch_features_for_inference_v2(fixture_id):
    conn = get_db_connection()
    try:
        feature_query = "SELECT feature_vector FROM V3_ML_Feature_Store WHERE fixture_id = %s"
        feature_row = pd.read_sql_query(feature_query, conn, params=(fixture_id,))
        if len(feature_row) == 0:
            raise ValueError(f"HT feature vector not found for fixture {fixture_id}.")
        vector = normalize_feature_vector(json.loads(feature_row.iloc[0]["feature_vector"]))
        return pd.DataFrame([vector], columns=GLOBAL_1X2_FEATURE_COLUMNS)
    finally:
        conn.close()

def _get_ht_heuristic_mu(fixture_id, version):
    try:
        from time_travel import TemporalFeatureFactory
        factory = TemporalFeatureFactory()
        vector = factory.get_vector(fixture_id)
        h_mu = float(vector.get('mom_gf_h10', 1.3)) * 0.4
        a_mu = float(vector.get('mom_gf_a10', 1.2)) * 0.4
        return max(0.1, h_mu), max(0.1, a_mu)
    except Exception:
        return 0.5, 0.4

def predict_ht_result(fixture_id, version='v0'):
    """
    Predicts the half-time result for a given fixture.
    Supports Poisson (.cbm) and heuristic fallbacks.
    """
    model_data = load_models(version)
    
    if model_data["type"] == "poisson":
        if version == 'v2':
            df = fetch_features_for_inference_v2(fixture_id)
        else:
            df = fetch_features_for_inference(fixture_id, include_process=(version=='v1'))
        h_mu = max(0.01, model_data["home"].predict(df)[0])
        a_mu = max(0.01, model_data["away"].predict(df)[0])
        res_version = version
    else:
        h_mu, a_mu = _get_ht_heuristic_mu(fixture_id, version)
        res_version = f"dynamic_heuristic_{version}"
    
    p_1, p_n, p_2 = 0.0, 0.0, 0.0
    exact_scores = {}
    max_goals = 5
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            prob = poisson_prob(h_mu, h) * poisson_prob(a_mu, a)
            exact_scores[f"{h}-{a}"] = float(prob)
            if h > a: p_1 += prob
            elif h == a: p_n += prob
            else: p_2 += prob
                
    total = max(0.0001, p_1 + p_n + p_2)
    
    return {
        "fixture_id": fixture_id, "model_version": res_version,
        "prediction_status": "success_model" if model_data["type"] == "poisson" else "success_fallback",
        "is_fallback": model_data["type"] != "poisson",
        "expected_goals_ht": {"home": float(h_mu), "away": float(a_mu)},
        "probabilities_1n2": {"1": float(p_1 / total), "N": float(p_n / total), "2": float(p_2 / total)},
        "exact_score_probabilities": {k: float(v / total) for k, v in exact_scores.items()}
    }

if __name__ == "__main__":
    import sys
    # For testing: pass a fixture_id via CLI
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        res = predict_ht_result(f_id, version='v0')
        print(json.dumps(res, indent=2))
