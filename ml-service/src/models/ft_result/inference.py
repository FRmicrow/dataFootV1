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
    return (np.exp(-mu) * (mu**k)) / math.factorial(k)

def load_models():
    """Loads and caches the CatBoost Full-Time models."""
    global _MODELS
    if _MODELS is None:
        home_path = os.path.join(BASE_DIR, 'models', 'ft_result', 'catboost_baseline_v0_home.cbm')
        away_path = os.path.join(BASE_DIR, 'models', 'ft_result', 'catboost_baseline_v0_away.cbm')
        joblib_path = os.path.join(BASE_DIR, 'model_1x2.joblib')
        
        if os.path.exists(home_path) and os.path.exists(away_path):
            home_model = CatBoostRegressor()
            home_model.load_model(home_path)
            away_model = CatBoostRegressor()
            away_model.load_model(away_path)
            _MODELS = {"type": "poisson", "home": home_model, "away": away_model}
        elif os.path.exists(joblib_path):
            import joblib
            model = joblib.load(joblib_path)
            _MODELS = {"type": "joblib", "model": model}
        else:
            _MODELS = {"type": "none"}
            
    return _MODELS

def fetch_features_for_inference(fixture_id, mode="poisson"):
    """
    Fetches features for a fixture.
    mode="poisson" -> returns 9 columns (diff_elo, etc)
    mode="joblib" -> returns full TemporalFeatureFactory vector
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
    
    if mode == "poisson":
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
                'away_b_lineup_strength_v1': vector['lqi_a']
            }
        conn.close()
        cols_v0 = ['league_id', 'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength', 'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1']
        return pd.DataFrame([features], columns=cols_v0)
    else:
        # mode == "joblib"
        from time_travel import TemporalFeatureFactory
        factory = TemporalFeatureFactory()
        vector = factory.get_vector(fixture_id, conn=conn)
        conn.close()
        return pd.DataFrame([vector], columns=factory.feature_columns)

def predict_ft_result(fixture_id):
    """
    Predicts the Full-Time result for a given fixture.
    Supports Poisson (.cbm) and Joblib (.joblib) fallbacks.
    """
    model_data = load_models()
    
    if model_data["type"] == "poisson":
        df = fetch_features_for_inference(fixture_id, mode="poisson")
        home_model, away_model = model_data["home"], model_data["away"]
        h_mu = max(0.01, home_model.predict(df)[0])
        a_mu = max(0.01, away_model.predict(df)[0])
        
        p_1, p_n, p_2 = 0.0, 0.0, 0.0
        exact_scores = {}
        max_goals = 8
        for h in range(max_goals + 1):
            for a in range(max_goals + 1):
                prob = poisson_prob(h_mu, h) * poisson_prob(a_mu, a)
                exact_scores[f"{h}-{a}"] = float(prob)
                if h > a: p_1 += prob
                elif h == a: p_n += prob
                else: p_2 += prob
        total = max(0.0001, p_1 + p_n + p_2)
        return {
            "fixture_id": fixture_id, "model_version": "v0_poisson",
            "expected_goals_ft": {"home": float(h_mu), "away": float(a_mu)},
            "probabilities_1n2": {"1": p_1 / total, "N": p_n / total, "2": p_2 / total},
            "exact_score_probabilities": {k: v / total for k, v in sorted(exact_scores.items(), key=lambda item: item[1], reverse=True)[:15]}
        }
        
    elif model_data["type"] == "joblib":
        df = fetch_features_for_inference(fixture_id, mode="joblib")
        model = model_data["model"]
        probs = model.predict_proba(df)[0] # [Draw/0, Home/1, Away/2] based on train_forge logic
        # MultiClass 0=N, 1=H, 2=A
        return {
            "fixture_id": fixture_id, "model_version": "v8_forge_joblib",
            "expected_goals_ft": {"home": 1.5, "away": 1.2}, # Dummy for joblib
            "probabilities_1n2": {"1": float(probs[1]), "N": float(probs[0]), "2": float(probs[2])},
            "exact_score_probabilities": {"1-0": float(probs[1]*0.4), "0-0": float(probs[0]*0.5), "0-1": float(probs[2]*0.4)}
        }
    else:
        # Heuristic Fallback
        return {
            "fixture_id": fixture_id, "model_version": "heuristic_v0",
            "expected_goals_ft": {"home": 1.45, "away": 1.25},
            "probabilities_1n2": {"1": 0.45, "N": 0.25, "2": 0.30},
            "exact_score_probabilities": {"1-0": 0.12, "1-1": 0.11, "0-1": 0.10}
        }

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        f_id = int(sys.argv[1])
        res = predict_ft_result(f_id)
        print(json.dumps(res, indent=2))
