import os
import json
import math
from db_config import get_connection
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

MODEL_DIR = os.path.dirname(__file__)
BASE_DIR = os.path.abspath(os.path.join(MODEL_DIR, '..', '..', '..'))

# Global cache for loaded models
_MODELS = {}

def get_db_connection():
    return get_connection()

def load_models(version='v0'):
    """Loads and caches the CatBoost models for a given version."""
    if version not in _MODELS:
        home_path = os.path.join(BASE_DIR, 'models', 'ht_result', f'catboost_baseline_{version}_home.cbm')
        away_path = os.path.join(BASE_DIR, 'models', 'ht_result', f'catboost_baseline_{version}_away.cbm')
        
        if os.path.exists(home_path) and os.path.exists(away_path):
            home_model = CatBoostRegressor()
            home_model.load_model(home_path)
            away_model = CatBoostRegressor()
            away_model.load_model(away_path)
            _MODELS[version] = {"type": "poisson", "home": home_model, "away": away_model}
        else:
            _MODELS[version] = {"type": "heuristic"}
            
    return _MODELS[version]

def poisson_prob(mu, k):
    """Calculates the Poisson probability of k events given expected value mu."""
    return (np.exp(-mu) * (mu**k)) / math.factorial(k)

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
    round_name = fixture_row.iloc[0]['round'] or ""
    
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

def predict_ht_result(fixture_id, version='v0'):
    """
    Predicts the half-time result for a given fixture.
    Supports Poisson (.cbm) and heuristic fallbacks.
    """
    model_data = load_models(version)
    
    if model_data["type"] == "poisson":
        df = fetch_features_for_inference(fixture_id, include_process=(version=='v1'))
        home_model, away_model = model_data["home"], model_data["away"]
        h_mu = max(0.01, home_model.predict(df)[0])
        a_mu = max(0.01, away_model.predict(df)[0])
        res_version = version
    else:
        # Heuristic: 1.1 total HT goals baseline
        h_mu, a_mu = 0.6, 0.5
        res_version = f"heuristic_{version}"
    
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
        "expected_goals_ht": {"home": float(h_mu), "away": float(a_mu)},
        "probabilities_1n2": {"1": p_1 / total, "N": p_n / total, "2": p_2 / total},
        "exact_score_probabilities": {k: v / total for k, v in exact_scores.items()}
    }

if __name__ == "__main__":
    import sys
    # For testing: pass a fixture_id via CLI
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        res = predict_ht_result(f_id, version='v0')
        print(json.dumps(res, indent=2))
