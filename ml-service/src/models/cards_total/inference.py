import os
import json
from db_config import get_connection
import numpy as np
import pandas as pd
from catboost import CatBoostRegressor

MODEL_DIR = os.path.dirname(__file__)
BASE_DIR = os.path.abspath(os.path.join(MODEL_DIR, '..', '..', '..'))

_MODELS = None

def get_db_connection():
    return get_connection()

def load_models():
    """Loads and caches the CatBoost cards models."""
    global _MODELS
    if _MODELS is None:
        home_path = os.path.join(BASE_DIR, 'models', 'cards_total', 'catboost_cards_v1_home.cbm')
        away_path = os.path.join(BASE_DIR, 'models', 'cards_total', 'catboost_cards_v1_away.cbm')
        
        home_model = CatBoostRegressor()
        home_model.load_model(home_path)
        
        away_model = CatBoostRegressor()
        away_model.load_model(away_path)
        
        _MODELS = (home_model, away_model)
        
    return _MODELS

def poisson_prob(mu, k):
    """Calculates the Poisson probability of k events given expected value mu."""
    return (np.exp(-mu) * (mu**k)) / np.math.factorial(k)

def fetch_features_for_inference(fixture_id):
    """
    Fetches BASELINE_V1 and PROCESS_V1 features for a fixture.
    Returns a formatted pandas DataFrame ready for CatBoost.
    """
    conn = get_db_connection()
    
    # 1. Base Fixture info
    fixture_query = "SELECT league_id, home_team_id, away_team_id FROM V3_Fixtures WHERE fixture_id = ?"
    fixture_df = pd.read_sql_query(fixture_query, conn, params=(fixture_id,))
    
    if len(fixture_df) == 0:
        conn.close()
        raise ValueError(f"Fixture {fixture_id} not found.")
        
    league_id = fixture_df.iloc[0]['league_id']
    h_tid = fixture_df.iloc[0]['home_team_id']
    a_tid = fixture_df.iloc[0]['away_team_id']
    
    # 2. Fetch BASELINE_V1
    baseline_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = ? AND feature_set_id = 'BASELINE_V1'"
    b_df = pd.read_sql_query(baseline_query, conn, params=(fixture_id,))
    
    if len(b_df) < 2:
        conn.close()
        raise ValueError(f"Missing BASELINE_V1 features for fixture {fixture_id}")
        
    home_b = json.loads(b_df[b_df['team_id'] == h_tid].iloc[0]['features_json'])
    away_b = json.loads(b_df[b_df['team_id'] == a_tid].iloc[0]['features_json'])
    
    # 3. Fetch PROCESS_V1
    process_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = ? AND feature_set_id = 'PROCESS_V1' AND horizon_type = 'FULL_HISTORICAL'"
    p_df = pd.read_sql_query(process_query, conn, params=(fixture_id,))
    
    home_p, away_p = {}, {}
    if len(p_df) == 2:
        home_p = json.loads(p_df[p_df['team_id'] == h_tid].iloc[0]['features_json'])
        away_p = json.loads(p_df[p_df['team_id'] == a_tid].iloc[0]['features_json'])
        
    conn.close()
    
    features = {
        'league_id': league_id,
        'diff_elo': (home_b.get('elo') or 1500) - (away_b.get('elo') or 1500),
        'diff_points': (home_b.get('points') or 0) - (away_b.get('points') or 0),
        'diff_rank': (away_b.get('rank') or 0) - (home_b.get('rank') or 0),
        'diff_lineup_strength': (home_b.get('lineup_strength_v1') or 0) - (away_b.get('lineup_strength_v1') or 0),
        'home_b_elo': home_b.get('elo') or 1500,
        'away_b_elo': away_b.get('elo') or 1500,
        'home_b_lineup_strength_v1': home_b.get('lineup_strength_v1') or 0,
        'away_b_lineup_strength_v1': away_b.get('lineup_strength_v1') or 0,
        
        'diff_possession_l5': (home_p.get('possession_avg_5') or 50) - (away_p.get('possession_avg_5') or 50),
        'diff_control_l5': (home_p.get('control_index_5') or 0) - (away_p.get('control_index_5') or 0),
        'diff_fouls_l5': (home_p.get('fouls_per_match_5') or 10) - (away_p.get('fouls_per_match_5') or 10),
        'diff_yellow_l5': (home_p.get('yellow_per_match_5') or 1) - (away_p.get('yellow_per_match_5') or 1),
        'diff_red_l5': (home_p.get('red_per_match_5') or 0.1) - (away_p.get('red_per_match_5') or 0.1),
        
        'home_p_possession_avg_5': home_p.get('possession_avg_5') or 50,
        'away_p_possession_avg_5': away_p.get('possession_avg_5') or 50,
        'home_p_control_index_5': home_p.get('control_index_5') or 0,
        'away_p_control_index_5': away_p.get('control_index_5') or 0,
        
        'home_p_fouls_per_match_5': home_p.get('fouls_per_match_5') or 10,
        'away_p_fouls_per_match_5': away_p.get('fouls_per_match_5') or 10,
        'home_p_yellow_per_match_5': home_p.get('yellow_per_match_5') or 1,
        'away_p_yellow_per_match_5': away_p.get('yellow_per_match_5') or 1,
        'home_p_red_per_match_5': home_p.get('red_per_match_5') or 0.1,
        'away_p_red_per_match_5': away_p.get('red_per_match_5') or 0.1
    }
    
    # Exact ordering as trained
    cols = [
        'league_id', 'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength',
        'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1',
        'diff_possession_l5', 'diff_control_l5', 'diff_fouls_l5', 'diff_yellow_l5', 'diff_red_l5',
        'home_p_possession_avg_5', 'away_p_possession_avg_5',
        'home_p_control_index_5', 'away_p_control_index_5',
        'home_p_fouls_per_match_5', 'away_p_fouls_per_match_5',
        'home_p_yellow_per_match_5', 'away_p_yellow_per_match_5',
        'home_p_red_per_match_5', 'away_p_red_per_match_5'
    ]
    
    return pd.DataFrame([features], columns=cols)

def predict_total_cards(fixture_id):
    """
    Predicts the total cards (Yellow + Red) for a fixture.
    Returns expected cards and Over/Under probabilities.
    """
    home_model, away_model = load_models()
    
    df = fetch_features_for_inference(fixture_id)
    
    h_mu = max(0.1, home_model.predict(df)[0])
    a_mu = max(0.1, away_model.predict(df)[0])
    
    total_mu = h_mu + a_mu
    
    # Calculate probabilities for total cards (0 to 20)
    probabilities = {}
    total_prob = 0
    for k in range(21):
        prob = poisson_prob(total_mu, k)
        probabilities[k] = prob
        total_prob += prob

    # Normalize
    for k in probabilities:
        probabilities[k] /= total_prob
        
    # Calculate standard Over/Under betting lines
    lines = [2.5, 3.5, 4.5, 5.5, 6.5]
    over_under = {}
    
    for line in lines:
        prob_under = sum(p for k, p in probabilities.items() if k < line)
        prob_over = 1.0 - prob_under
        over_under[f"Over {line}"] = prob_over
        over_under[f"Under {line}"] = prob_under
        
    return {
        "fixture_id": fixture_id,
        "expected_cards": {
            "home": float(h_mu),
            "away": float(a_mu),
            "total": float(total_mu)
        },
        "over_under_probabilities": over_under
    }

if __name__ == "__main__":
    import sys
    # For testing: pass a fixture_id via CLI
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        res = predict_total_cards(f_id)
        print(json.dumps(res, indent=2))
