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
import sqlite3
import pandas as pd
import numpy as np
import json
import os
import sys
import joblib
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import log_loss, accuracy_score
from time_travel import TemporalFeatureFactory

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'backend', 'database.sqlite'))


def retrain_from_simulation(model_id: int, simulation_id: int) -> dict:
    """
    Re-train a model using error signals from a completed simulation.
    
    Strategy:
      - Load the original model and training data
      - Load simulation results to identify error patterns
      - Apply sample weighting: misclassified matches get 3x weight
      - Retrain with same hyperparams but weighted samples
      - Only accept if accuracy improves by >= 0.5%
    
    Returns: dict with status, old_accuracy, new_accuracy, model_path
    """
    conn = sqlite3.connect(DB_PATH)
    factory = TemporalFeatureFactory(DB_PATH)
    
    try:
        # 1. Load the model registry entry
        reg = conn.execute("""
            SELECT id, league_id, horizon_type, model_path, accuracy, training_dataset_size
            FROM V3_Model_Registry WHERE id = ?
        """, (model_id,)).fetchone()
        
        if not reg:
            return {"status": "error", "message": f"Model {model_id} not found in registry."}
        
        reg_id, league_id, horizon_type, model_path, old_accuracy, old_dataset_size = reg
        old_accuracy = old_accuracy or 0.0
        
        print(f"🔬 [Retrain] Starting adaptive refinement for Model #{model_id}")
        print(f"   League: {league_id} | Horizon: {horizon_type} | Baseline Accuracy: {old_accuracy:.2%}")
        
        # Verify model file exists
        if not model_path or not os.path.exists(model_path):
            return {"status": "error", "message": f"Model file not found at {model_path}"}
        
        old_model = joblib.load(model_path)
        
        # 2. Load simulation results (predictions vs reality)
        sim_results = pd.read_sql_query("""
            SELECT r.fixture_id, r.prob_home, r.prob_draw, r.prob_away, 
                   r.actual_winner, r.is_correct,
                   f.goals_home, f.goals_away, f.date, f.round
            FROM V3_Forge_Results r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            WHERE r.simulation_id = ?
            ORDER BY f.date ASC
        """, conn, params=(simulation_id,))
        
        if len(sim_results) < 20:
            return {"status": "error", "message": f"Not enough simulation data ({len(sim_results)} matches). Need 20+"}
        
        print(f"   📊 Loaded {len(sim_results)} simulation results")
        
        # 3. Analyze error patterns
        total = len(sim_results)
        correct = sim_results['is_correct'].sum()
        sim_accuracy = correct / total
        
        # Error distribution by outcome class
        errors = sim_results[sim_results['is_correct'] == 0]
        error_by_class = errors['actual_winner'].value_counts().to_dict()
        
        print(f"   📉 Simulation Accuracy: {sim_accuracy:.2%}")
        print(f"   ❌ Error Distribution: Home={error_by_class.get(1, 0)} Draw={error_by_class.get(0, 0)} Away={error_by_class.get(2, 0)}")
        
        # 4. Generate feature vectors for all simulation fixtures
        print(f"   🧮 Generating feature vectors for re-training...")
        X_list = []
        y_list = []
        weights = []
        skipped = 0
        
        for _, row in sim_results.iterrows():
            fid = int(row['fixture_id'])
            try:
                vector = factory.get_vector(fid, conn=conn)
                X_list.append([vector[col] for col in factory.feature_columns])
                
                # Actual outcome label
                actual = int(row['actual_winner'])
                y_list.append(actual)
                
                # Sample weight: misclassified → 3x, correct → 1x
                # This emphasizes error correction during re-training
                if row['is_correct'] == 0:
                    # Higher weight for confident wrong predictions
                    max_prob = max(row['prob_home'], row['prob_draw'], row['prob_away'])
                    weight = 2.0 + max_prob  # Range: 2.0 - 3.0
                    weights.append(weight)
                else:
                    weights.append(1.0)
                    
            except Exception as e:
                skipped += 1
                continue
        
        if len(X_list) < 20:
            return {"status": "error", "message": f"Only {len(X_list)} valid features. Need 20+"}
        
        # 5. Also load the ORIGINAL training data to combine
        # This prevents catastrophic forgetting — we keep old knowledge + error correction
        print(f"   📚 Loading original training data for combined re-train...")
        
        from train_forge import get_horizon_cutoff
        earliest = get_horizon_cutoff(horizon_type)
        
        orig_query = """
            SELECT f.fixture_id, f.goals_home, f.goals_away
            FROM V3_Fixtures f
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.goals_home IS NOT NULL
              AND f.goals_away IS NOT NULL
              AND f.date >= ?
        """
        orig_params = [earliest]
        if league_id:
            orig_query += " AND f.league_id = ?"
            orig_params.append(league_id)
        orig_query += " ORDER BY f.date ASC"
        
        orig_df = pd.read_sql_query(orig_query, conn, params=orig_params)
        
        # Get simulation fixture IDs to avoid duplicates
        sim_fixture_ids = set(sim_results['fixture_id'].tolist())
        
        orig_added = 0
        for _, row in orig_df.iterrows():
            fid = int(row['fixture_id'])
            if fid in sim_fixture_ids:
                continue  # Already weighted in simulation data
            try:
                vector = factory.get_vector(fid, conn=conn)
                X_list.append([vector[col] for col in factory.feature_columns])
                gh, ga = int(row['goals_home']), int(row['goals_away'])
                outcome = 1 if gh > ga else (2 if ga > gh else 0)
                y_list.append(outcome)
                weights.append(1.0)  # Normal weight for non-simulation data
                orig_added += 1
            except:
                continue
            
            if orig_added % 500 == 0:
                print(f"      Added {orig_added} original training samples...")
        
        print(f"   📊 Combined dataset: {len(X_list)} samples ({len(sim_results)} simulation + {orig_added} original)")
        
        X = pd.DataFrame(X_list, columns=factory.feature_columns)
        y = np.array(y_list)
        sample_weights = np.array(weights)
        
        # 6. Chronological split — last 20% for evaluation
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        w_train = sample_weights[:split_idx]
        
        # 7. Re-train with sample weights
        print(f"   🏗️ Re-training with error-weighted samples ({len(X_train)} train / {len(X_test)} test)...")
        
        # Use same hyperparams as original but with sample weights
        new_model = RandomForestClassifier(
            n_estimators=150, max_depth=12, min_samples_leaf=5,
            random_state=42, n_jobs=-1
        )
        new_model.fit(X_train, y_train, sample_weight=w_train)
        
        # 8. Evaluate new model
        new_preds = new_model.predict(X_test)
        new_probs = new_model.predict_proba(X_test)
        
        new_accuracy = accuracy_score(y_test, new_preds)
        new_loss = log_loss(y_test, new_probs) if len(np.unique(y_test)) > 1 else 0.0
        
        # Brier Score
        y_one_hot = np.zeros((len(y_test), 3))
        y_one_hot[np.arange(len(y_test)), y_test] = 1
        new_brier = float(np.mean(np.sum((new_probs - y_one_hot)**2, axis=1)))
        
        # Compare old model on same test set
        old_preds_test = old_model.predict(X_test)
        old_accuracy_test = accuracy_score(y_test, old_preds_test)
        
        improvement = new_accuracy - old_accuracy_test
        
        print(f"   📊 Comparison:")
        print(f"      Old Model Test Accuracy: {old_accuracy_test:.2%}")
        print(f"      New Model Test Accuracy: {new_accuracy:.2%}")
        print(f"      Improvement: {improvement:+.2%}")
        print(f"      New Brier: {new_brier:.4f} | New Log-Loss: {new_loss:.4f}")
        
        # 9. Multi-Season Validation Gate (US_221)
        # Validate against the 3 latest completed seasons to ensure robustness
        print(f"   🛡️ Starting 3-Season Multi-Validation Gate (US_221)...")
        
        # Get 3 latest seasons excluding the one we just used for training if it was the absolute latest
        latest_seasons_query = """
            SELECT DISTINCT season_year FROM V3_Fixtures 
            WHERE league_id = ? AND status_short IN ('FT', 'AET', 'PEN')
            ORDER BY season_year DESC LIMIT 4
        """
        val_seasons = [r[0] for r in conn.execute(latest_seasons_query, (league_id,)).fetchall()]
        # If we have enough seasons, pick 3. 
        if len(val_seasons) > 1:
            val_seasons = val_seasons[:3]
        
        print(f"      Validating across: {val_seasons}")
        
        total_val_matches = 0
        total_old_correct = 0
        total_new_correct = 0
        
        for s_year in val_seasons:
            s_data = pd.read_sql_query("""
                SELECT fixture_id, goals_home, goals_away 
                FROM V3_Fixtures 
                WHERE league_id = ? AND season_year = ? AND status_short IN ('FT', 'AET', 'PEN')
            """, conn, params=(league_id, s_year))
            
            s_X = []
            s_y = []
            for _, row in s_data.iterrows():
                try:
                    v = factory.get_vector(int(row['fixture_id']), conn=conn)
                    s_X.append([v[col] for col in factory.feature_columns])
                    gh, ga = int(row['goals_home']), int(row['goals_away'])
                    s_y.append(1 if gh > ga else (2 if ga > gh else 0))
                except: continue
                
            if not s_X: continue
            
            s_X_df = pd.DataFrame(s_X, columns=factory.feature_columns)
            s_y_arr = np.array(s_y)
            
            old_s_preds = old_model.predict(s_X_df)
            new_s_preds = new_model.predict(s_X_df)
            
            total_val_matches += len(s_y_arr)
            total_old_correct += accuracy_score(s_y_arr, old_s_preds, normalize=False)
            total_new_correct += accuracy_score(s_y_arr, new_s_preds, normalize=False)
        
        avg_old_acc = total_old_correct / total_val_matches if total_val_matches > 0 else 0
        avg_new_acc = total_new_correct / total_val_matches if total_val_matches > 0 else 0
        aggregate_improvement = avg_new_acc - avg_old_acc
        
        print(f"      Aggregate Performance (3-Season Gate):")
        print(f"         Baseline: {avg_old_acc:.2%}")
        print(f"         Recalibrated: {avg_new_acc:.2%}")
        print(f"         Net Gain: {aggregate_improvement:+.2%}")
        
        MIN_GATE_IMPROVEMENT = 0.005 # 0.5% threshold per US_221
        
        if aggregate_improvement < MIN_GATE_IMPROVEMENT:
            print(f"   ❌ Rejected: Aggregate improvement ({aggregate_improvement:+.2%}) below gate threshold ({MIN_GATE_IMPROVEMENT:.1%}).")
            return {
                "status": "rejected",
                "message": f"Multi-validation gate failed. Net gain {aggregate_improvement:+.2%} < {MIN_GATE_IMPROVEMENT:.1%}.",
                "old_accuracy": float(avg_old_acc),
                "new_accuracy": float(avg_new_acc),
                "improvement": float(aggregate_improvement),
                "threshold": MIN_GATE_IMPROVEMENT
            }
        
        # 10. Accept: Save new model
        print(f"   ✅ Improvement accepted! Saving new model...")
        
        # Version bump
        version_tag = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}_retrain"
        
        # Save model file (overwrite in place)
        joblib.dump(new_model, model_path)
        
        # Save updated importance
        importance = pd.DataFrame({
            'feature': factory.feature_columns,
            'importance': new_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        importance_path = model_path.replace('.joblib', '_importance.json')
        with open(importance_path, 'w') as f:
            json.dump(importance.to_dict('records'), f)
        
        # 11. Register in DB — deactivate old, insert new
        conn.execute("""
            UPDATE V3_Model_Registry SET is_active = 0 
            WHERE league_id IS ? AND horizon_type = ?
        """, (league_id, horizon_type))
        
        conn.execute("""
            INSERT INTO V3_Model_Registry (
                league_id, horizon_type, version_tag,
                training_dataset_size, features_count,
                accuracy, log_loss, brier_score,
                model_path, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            league_id, horizon_type, version_tag,
            len(X_train), len(factory.feature_columns),
            float(new_accuracy), float(new_loss), float(new_brier),
            model_path,
        ))
        
        conn.commit()
        
        print(f"   📋 New model registered as '{version_tag}'")
        print(f"   🏆 Retrain complete: {old_accuracy_test:.2%} → {new_accuracy:.2%} ({improvement:+.2%})")
        
        return {
            "status": "accepted",
            "message": f"Model improved from {old_accuracy_test:.2%} to {new_accuracy:.2%}",
            "old_accuracy": float(old_accuracy_test),
            "new_accuracy": float(new_accuracy),
            "improvement": float(improvement),
            "version_tag": version_tag,
            "training_samples": len(X_train),
            "brier_score": new_brier,
            "log_loss": float(new_loss)
        }
        
    except Exception as e:
        print(f"   ❌ Retrain failed: {e}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": str(e)}
    finally:
        conn.close()


def get_eligible_horizons(league_id: int, season_year: int) -> list:
    """
    Returns which horizon models can be used for a given season year.
    
    Rules:
    - FULL_HISTORICAL: Always eligible (uses all data before the season)
    - 5Y_ROLLING: Season must be within 5 years of the latest available data
    - 3Y_ROLLING: Season must be within 3 years of the latest available data
    
    A model is useful if the season falls within the model's training window.
    """
    conn = sqlite3.connect(DB_PATH)
    
    # Get the latest season available for this league
    row = conn.execute("""
        SELECT MAX(season_year) FROM V3_Fixtures 
        WHERE league_id = ? AND status_short IN ('FT', 'AET', 'PEN')
    """, (league_id,)).fetchone()
    
    max_year = row[0] if row else datetime.now().year
    conn.close()
    
    eligible = ['FULL_HISTORICAL']  # Always eligible
    
    # 5Y check: the season must have at least 5 years of prior data in the window
    # OR the model's window (max_year - 5) must encompass a useful training period
    if season_year >= max_year - 5:
        eligible.append('5Y_ROLLING')
    
    # 3Y check
    if season_year >= max_year - 3:
        eligible.append('3Y_ROLLING')
    
    return eligible


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Forge Model Retraining')
    parser.add_argument('--model-id', type=int, required=True, help='Model Registry ID')
    parser.add_argument('--sim-id', type=int, required=True, help='Simulation ID')
    
    args = parser.parse_args()
    result = retrain_from_simulation(args.model_id, args.sim_id)
    print(json.dumps(result, indent=2))
