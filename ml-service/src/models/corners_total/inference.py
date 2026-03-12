import os
import json
import math
from db_config import get_connection
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Global cache for loaded models
_MODELS = None

def get_db_connection():
    return get_connection()

def poisson_prob(mu, k):
    """Calculates the Poisson probability of k events given expected value mu."""
    if mu <= 0: return 1.0 if k == 0 else 0.0
    return (np.exp(-mu) * (mu**k)) / math.factorial(k)

def load_models():
    """Loads and caches the CatBoost corners models."""
    global _MODELS
    if _MODELS is None:
        home_path = os.path.join(BASE_DIR, 'models', 'corners_total', 'catboost_corners_v1_home.cbm')
        away_path = os.path.join(BASE_DIR, 'models', 'corners_total', 'catboost_corners_v1_away.cbm')
        
        if os.path.exists(home_path) and os.path.exists(away_path):
            home_model = CatBoostRegressor()
            home_model.load_model(home_path)
            away_model = CatBoostRegressor()
            away_model.load_model(away_path)
            _MODELS = {"type": "poisson", "home": home_model, "away": away_model}
        else:
            _MODELS = {"type": "heuristic"}
            
    return _MODELS

def fetch_features_for_inference(fixture_id):
    """
    Fetches BASELINE_V1 and PROCESS_V1 features for a fixture.
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
        
        process_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = %s AND feature_set_id = 'PROCESS_V1' AND horizon_type = 'FULL_HISTORICAL'"
        p_df = pd.read_sql_query(process_query, conn, params=(fixture_id,))
        if len(p_df) == 2:
            home_p = json.loads(p_df[p_df['team_id'] == h_tid].iloc[0]['features_json'])
            away_p = json.loads(p_df[p_df['team_id'] == a_tid].iloc[0]['features_json'])
            features.update({
                'diff_possession_l5': (home_p.get('possession_avg_5') or 50) - (away_p.get('possession_avg_5') or 50),
                'diff_control_l5': (home_p.get('control_index_5') or 0) - (away_p.get('control_index_5') or 0),
                'diff_shots_l5': (home_p.get('shots_per_match_5') or 10) - (away_p.get('shots_per_match_5') or 10),
                'diff_sot_l5': (home_p.get('sot_per_match_5') or 3) - (away_p.get('sot_per_match_5') or 3),
                'diff_corners_l5': (home_p.get('corners_per_match_5') or 5) - (away_p.get('corners_per_match_5') or 5),
                'home_p_possession_avg_5': home_p.get('possession_avg_5') or 50,
                'away_p_possession_avg_5': away_p.get('possession_avg_5') or 50,
                'home_p_control_index_5': home_p.get('control_index_5') or 0,
                'away_p_control_index_5': away_p.get('control_index_5') or 0,
                'home_p_corners_per_match_5': home_p.get('corners_per_match_5') or 5,
                'away_p_corners_per_match_5': away_p.get('corners_per_match_5') or 5,
                'home_p_shots_per_match_5': home_p.get('shots_per_match_5') or 10,
                'away_p_shots_per_match_5': away_p.get('shots_per_match_5') or 10
            })
        else:
            features.update({
                'diff_possession_l5': 0, 'diff_control_l5': 0, 'diff_shots_l5': 0, 'diff_sot_l5': 0, 'diff_corners_l5': 0,
                'home_p_possession_avg_5': 50, 'away_p_possession_avg_5': 50,
                'home_p_control_index_5': 0, 'away_p_control_index_5': 0,
                'home_p_corners_per_match_5': 5, 'away_p_corners_per_match_5': 5,
                'home_p_shots_per_match_5': 10, 'away_p_shots_per_match_5': 10
            })
    else:
        # Fallback: TemporalFeatureFactory
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
            'away_b_lineup_strength_v1': vector['lqi_a'],
            'diff_possession_l5': 0, 'diff_control_l5': 0, 'diff_shots_l5': 0, 'diff_sot_l5': 0,
            'diff_corners_l5': vector['mom_corners_f_h5'] - vector['mom_corners_f_a5'],
            'home_p_possession_avg_5': 50, 'away_p_possession_avg_5': 50,
            'home_p_control_index_5': 0, 'away_p_control_index_5': 0,
            'home_p_corners_per_match_5': vector['mom_corners_f_h5'],
            'away_p_corners_per_match_5': vector['mom_corners_f_a5'],
            'home_p_shots_per_match_5': 10, 'away_p_shots_per_match_5': 10
        }
            
    conn.close()
    cols = [
        'league_id', 'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength',
        'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1',
        'diff_possession_l5', 'diff_control_l5', 'diff_shots_l5', 'diff_sot_l5', 'diff_corners_l5',
        'home_p_possession_avg_5', 'away_p_possession_avg_5',
        'home_p_control_index_5', 'away_p_control_index_5',
        'home_p_corners_per_match_5', 'away_p_corners_per_match_5',
        'home_p_shots_per_match_5', 'away_p_shots_per_match_5'
    ]
    return pd.DataFrame([features], columns=cols)

def predict_total_corners(fixture_id):
    """
    Predicts the total corners for a fixture.
    Supports Poisson (.cbm) and heuristic fallbacks.
    """
    model_data = load_models()
    
    if model_data["type"] == "poisson":
        df = fetch_features_for_inference(fixture_id)
        home_model, away_model = model_data["home"], model_data["away"]
        h_mu = max(0.1, home_model.predict(df)[0])
        a_mu = max(0.1, away_model.predict(df)[0])
        version = "v1_poisson"
    else:
        # Heuristic: 9.5 total corners baseline
        h_mu, a_mu = 5.2, 4.3
        version = "heuristic_v1"
    
    total_mu = h_mu + a_mu
    
    probabilities = {}
    total_prob = 0
    for k in range(31):
        prob = poisson_prob(total_mu, k)
        probabilities[k] = prob
        total_prob += prob

    for k in probabilities: probabilities[k] /= max(0.0001, total_prob)
        
    lines = [7.5, 8.5, 9.5, 10.5, 11.5]
    over_under = {}
    for line in lines:
        prob_under = sum(p for k, p in probabilities.items() if k < line)
        prob_over = 1.0 - prob_under
        over_under[f"Over {line}"] = float(prob_over)
        over_under[f"Under {line}"] = float(prob_under)
        
    return {
        "fixture_id": fixture_id, "model_version": version,
        "expected_corners": {"home": float(h_mu), "away": float(a_mu), "total": float(total_mu)},
        "over_under_probabilities": over_under
    }

if __name__ == "__main__":
    import sys
    # For testing: pass a fixture_id via CLI
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        res = predict_total_corners(f_id)
        print(json.dumps(res, indent=2))
