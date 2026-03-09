"""
Retrain Forge — Adaptive Model Refinement from Simulation Results (V8)
Uses simulation error signals (predictions vs reality) to correct model weights.

ML Strategy:
  1. Load the simulation results (tape): predictions vs actual outcomes
  2. Compute sample weights: higher weight for misclassified matches
  3. Re-train the model with the original features + sample weights
  4. Compare old vs new accuracy — only accept if improvement ≥ 0.5%
  5. Register the updated model in V3_Model_Registry with version bump
"""
import psycopg2
from db_config import get_connection
import pandas as pd
import numpy as np
import json
import os
import sys
import joblib
from datetime import datetime
from catboost import CatBoostClassifier, Pool
from sklearn.metrics import log_loss, accuracy_score
from time_travel import TemporalFeatureFactory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_registry_and_model(conn, model_id):
    """Load model registry info and the model file itself."""
    reg = conn.execute("""
        SELECT id, league_id, horizon_type, model_path, accuracy, training_dataset_size
        FROM V3_Model_Registry WHERE id = %s
    """, (model_id,)).fetchone()
    
    if not reg:
        return None, f"Model {model_id} not found in registry."
    
    reg_data = {
        "id": reg[0], "league_id": reg[1], "horizon_type": reg[2],
        "model_path": reg[3], "old_accuracy": reg[4] or 0.0, "old_dataset_size": reg[5]
    }
    
    if not reg_data["model_path"] or not os.path.exists(reg_data["model_path"]):
        return None, f"Model file not found at {reg_data['model_path']}"
    
    try:
        model = joblib.load(reg_data["model_path"])
        return (reg_data, model), None
    except Exception as e:
        return None, f"Failed to load model: {str(e)}"

def _prepare_training_data(conn, simulation_id, reg_data, factory):
    """Load simulation and original data, generate features and weights."""
    sim_results = pd.read_sql_query("""
        SELECT r.fixture_id, r.prob_home, r.prob_draw, r.prob_away, 
               r.actual_winner, r.is_correct
        FROM V3_Forge_Results r
        WHERE r.simulation_id = %s
    """, conn, params=(simulation_id,))
    
    if len(sim_results) < 20:
        raise ValueError(f"Not enough simulation data ({len(sim_results)} matches).")
    
    X_list, y_list, weights = [], [], []
    sim_fixture_ids = set()

    # 1. Process Simulation Data
    for _, row in sim_results.iterrows():
        fid = int(row['fixture_id'])
        sim_fixture_ids.add(fid)
        try:
            vector = factory.get_vector(fid, conn=conn)
            X_list.append([vector[col] for col in factory.feature_columns])
            y_list.append(int(row['actual_winner']))
            
            # Weighting: misclassified → higher weight
            w = (2.0 + max(row['prob_home'], row['prob_draw'], row['prob_away'])) if row['is_correct'] == 0 else 1.0
            weights.append(w)
        except Exception: 
            continue
    
    # 2. Add ORIGINAL training data
    from train_forge import get_horizon_cutoff
    earliest = get_horizon_cutoff(reg_data["horizon_type"])
    
    orig_query = "SELECT fixture_id, goals_home, goals_away FROM V3_Fixtures WHERE status_short IN ('FT', 'AET', 'PEN') AND goals_home IS NOT NULL AND goals_away IS NOT NULL AND date >= ?"
    orig_params = [earliest]
    if reg_data["league_id"]:
        orig_query += " AND league_id = ?"
        orig_params.append(reg_data["league_id"])
    
    orig_df = pd.read_sql_query(orig_query, conn, params=orig_params)
    for _, row in orig_df.iterrows():
        fid = int(row['fixture_id'])
        if fid in sim_fixture_ids: continue
        try:
            vector = factory.get_vector(fid, conn=conn)
            X_list.append([vector[col] for col in factory.feature_columns])
            gh, ga = int(row['goals_home']), int(row['goals_away'])
            y_list.append(1 if gh > ga else (2 if ga > gh else 0))
            weights.append(1.0)
        except Exception: 
            continue
            
    return pd.DataFrame(X_list, columns=factory.feature_columns), np.array(y_list), np.array(weights)

def _evaluate_model_performance(conn, league_id, factory, old_model, new_model):
    """Strictly evaluate improvement using the 3-season validation gate."""
    latest_seasons_query = "SELECT DISTINCT season_year FROM V3_Fixtures WHERE league_id = ? AND status_short IN ('FT', 'AET', 'PEN') ORDER BY season_year DESC LIMIT 3"
    val_seasons = [r[0] for r in conn.execute(latest_seasons_query, (league_id,)).fetchall()]
    
    total_val_matches = 0
    total_old_correct = 0
    total_new_correct = 0
    
    for s_year in val_seasons:
        s_data = pd.read_sql_query("SELECT fixture_id, goals_home, goals_away FROM V3_Fixtures WHERE league_id = ? AND season_year = ? AND status_short IN ('FT', 'AET', 'PEN')", conn, params=(league_id, s_year))
        for _, row in s_data.iterrows():
            try:
                v = factory.get_vector(int(row['fixture_id']), conn=conn)
                s_X = pd.DataFrame([[v[col] for col in factory.feature_columns]], columns=factory.feature_columns)
                gh, ga = int(row['goals_home']), int(row['goals_away'])
                actual = 1 if gh > ga else (2 if ga > gh else 0)
                total_val_matches += 1
                if old_model.predict(s_X)[0][0] == actual: total_old_correct += 1
                if new_model.predict(s_X)[0][0] == actual: total_new_correct += 1
            except Exception: 
                continue
    
    avg_old_acc = total_old_correct / total_val_matches if total_val_matches > 0 else 0
    avg_new_acc = total_new_correct / total_val_matches if total_val_matches > 0 else 0
    return avg_new_acc - avg_old_acc

def retrain_from_simulation(model_id: int, simulation_id: int) -> dict:
    """
    Re-train a model using error signals from a completed simulation using CatBoost.
    """
    conn = get_connection()
    factory = TemporalFeatureFactory(DB_PATH)
    
    try:
        # 1. Load context
        res, error_msg = _load_registry_and_model(conn, model_id)
        if error_msg: return {"status": "error", "message": error_msg}
        reg_data, old_model = res
        
        print(f"🔬 [Retrain] Starting adaptive refinement for Model #{model_id}")
        
        # 2. Prepare Data
        X, y, sample_weights = _prepare_training_data(conn, simulation_id, reg_data, factory)
        
        # 3. Re-train CatBoost
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        new_model = CatBoostClassifier(iterations=500, learning_rate=0.03, depth=6, l2_leaf_reg=3, verbose=False, random_seed=42, loss_function='MultiClass')
        new_model.fit(X_train, y_train, sample_weight=sample_weights[:split_idx], eval_set=(X_test, y_test), early_stopping_rounds=50, use_best_model=True)
        
        # 4. Global Validation
        improvement = _evaluate_model_performance(conn, reg_data["league_id"], factory, old_model, new_model)
        if improvement < 0.005:
            return {"status": "rejected", "improvement": float(improvement)}
        
        # 5. Commit Updates
        version_tag = f"catboost_v{datetime.now().strftime('%Y%m%d_%H%M%S')}_retrain"
        joblib.dump(new_model, reg_data["model_path"])
        
        conn.execute("UPDATE V3_Model_Registry SET is_active = 0 WHERE league_id IS ? AND horizon_type = ?", (reg_data["league_id"], reg_data["horizon_type"]))
        conn.execute("INSERT INTO V3_Model_Registry (league_id, horizon_type, version_tag, training_dataset_size, features_count, accuracy, model_path, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)", 
                     (reg_data["league_id"], reg_data["horizon_type"], version_tag, len(X_train), len(X.columns), float(accuracy_score(y_test, new_model.predict(X_test))), reg_data["model_path"]))
        conn.commit()
        
        return {"status": "accepted", "improvement": float(improvement)}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-id', type=int, required=True)
    parser.add_argument('--sim-id', type=int, required=True)
    args = parser.parse_args()
    print(json.dumps(retrain_from_simulation(args.model_id, args.sim_id)))
