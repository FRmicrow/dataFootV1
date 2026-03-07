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
    """Loads and caches the CatBoost Full-Time models."""
    global _MODELS
    if _MODELS is None:
        home_path = os.path.join(BASE_DIR, 'models', 'ft_result', 'catboost_baseline_v0_home.cbm')
        away_path = os.path.join(BASE_DIR, 'models', 'ft_result', 'catboost_baseline_v0_away.cbm')
        
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
    Fetches BASELINE_V1 features for a fixture.
    Returns a formatted pandas DataFrame ready for CatBoost `predict()`.
    """
    conn = get_db_connection()
    
    fixture_query = "SELECT league_id, home_team_id, away_team_id FROM V3_Fixtures WHERE fixture_id = ?"
    fixture_df = pd.read_sql_query(fixture_query, conn, params=(fixture_id,))
    
    if len(fixture_df) == 0:
        conn.close()
        raise ValueError(f"Fixture {fixture_id} not found.")
        
    league_id = fixture_df.iloc[0]['league_id']
    h_tid = fixture_df.iloc[0]['home_team_id']
    a_tid = fixture_df.iloc[0]['away_team_id']
    
    baseline_query = "SELECT team_id, features_json FROM V3_Team_Features_PreMatch WHERE fixture_id = ? AND feature_set_id = 'BASELINE_V1'"
    b_df = pd.read_sql_query(baseline_query, conn, params=(fixture_id,))
    
    if len(b_df) < 2:
        conn.close()
        raise ValueError(f"Missing BASELINE_V1 features for fixture {fixture_id}")
        
    home_b = json.loads(b_df[b_df['team_id'] == h_tid].iloc[0]['features_json'])
    away_b = json.loads(b_df[b_df['team_id'] == a_tid].iloc[0]['features_json'])
    
    conn.close()
    
    features = {
        'league_id': league_id,
        'diff_elo': (home_b.get('elo') or 1500) - (away_b.get('elo') or 1500),
        'diff_points': (home_b.get('points') or 0) - (away_b.get('points') or 0),
        'diff_rank': (away_b.get('rank') or 0) - (home_b.get('rank') or 0), # lower is better
        'diff_lineup_strength': (home_b.get('lineup_strength_v1') or 0) - (away_b.get('lineup_strength_v1') or 0),
        'home_b_elo': home_b.get('elo') or 1500,
        'away_b_elo': away_b.get('elo') or 1500,
        'home_b_lineup_strength_v1': home_b.get('lineup_strength_v1') or 0,
        'away_b_lineup_strength_v1': away_b.get('lineup_strength_v1') or 0
    }
    
    cols_v0 = ['league_id', 'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength', 'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1']
    
    return pd.DataFrame([features], columns=cols_v0)

def predict_ft_result(fixture_id):
    """
    Predicts the Full-Time result for a given fixture.
    Returns expected goals, Exact Scores list, and probability matrix for 1N2.
    """
    home_model, away_model = load_models()
    
    df = fetch_features_for_inference(fixture_id)
    
    h_mu = max(0.01, home_model.predict(df)[0])
    a_mu = max(0.01, away_model.predict(df)[0])
    
    p_1, p_n, p_2 = 0.0, 0.0, 0.0
    exact_scores = {}
    
    max_goals = 8
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            prob = poisson_prob(h_mu, h) * poisson_prob(a_mu, a)
            exact_scores[f"{h}-{a}"] = float(prob)
            
            if h > a:
                p_1 += prob
            elif h == a:
                p_n += prob
            else:
                p_2 += prob
                
    total = p_1 + p_n + p_2
    
    return {
        "fixture_id": fixture_id,
        "model_version": "v0",
        "expected_goals_ft": {
            "home": float(h_mu),
            "away": float(a_mu)
        },
        "probabilities_1n2": {
            "1": p_1 / total,
            "N": p_n / total,
            "2": p_2 / total
        },
        "exact_score_probabilities": {k: v / total for k, v in sorted(exact_scores.items(), key=lambda item: item[1], reverse=True)[:15]} # Top 15 scores
    }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        res = predict_ft_result(f_id)
        print(json.dumps(res, indent=2))
