"""
Train Forge — League-Scoped Multi-Horizon Model Training (V8)
Supports FULL_HISTORICAL, 5Y_ROLLING, 3Y_ROLLING horizons per league.
NO ODDS. Accuracy-only evaluation.
"""
import sqlite3
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
DB_PATH = os.path.abspath(os.path.join(BASE_DIR, '..', 'backend', 'database.sqlite'))

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def get_horizon_cutoff(horizon_type: str, season_year: int = None) -> str:
    """Returns the earliest date to include training data for a given horizon."""
    current_year = season_year or datetime.now().year
    if horizon_type == '5Y_ROLLING':
        return f"{current_year - 5}-01-01"
    elif horizon_type == '3Y_ROLLING':
        return f"{current_year - 3}-01-01"
    else:  # FULL_HISTORICAL
        return "2000-01-01"

def train_model(league_id: int = None, horizon_type: str = 'FULL_HISTORICAL',
                cutoff_date: str = None, season_year: int = None) -> str:
    """
    Trains a model for a specific league and horizon using CatBoost.
    Returns the model file path, or None on failure.
    """
    label = f"League {league_id}" if league_id else "Global"
    print(f"🧠 [Forge] Training {label} model ({horizon_type})...")
    
    conn = get_db_connection()
    factory = TemporalFeatureFactory(DB_PATH)
    
    try:
        # 1. Determine training data window
        earliest = get_horizon_cutoff(horizon_type, season_year)
        
        query = """
            SELECT f.fixture_id, f.goals_home, f.goals_away, f.date
            FROM V3_Fixtures f
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.goals_home IS NOT NULL
              AND f.goals_away IS NOT NULL
              AND f.date >= ?
        """
        params = [earliest]
        
        if league_id:
            query += " AND f.league_id = ?"
            params.append(league_id)
        
        if cutoff_date:
            query += " AND f.date < ?"
            params.append(cutoff_date)
        
        query += " ORDER BY f.date ASC"
        
        df = pd.read_sql_query(query, conn, params=params)
        
        if len(df) < 30:
            print(f"   ⚠️ Insufficient data ({len(df)} matches). Need at least 30. Skipping.")
            conn.close()
            return None
        
        # 2. Generate feature vectors
        print(f"   📊 Generating features for {len(df)} matches...")
        X_list = []
        y_list = []
        skipped = 0
        
        for idx, row in df.iterrows():
            fid = int(row['fixture_id'])
            try:
                vector = factory.get_vector(fid, conn=conn)
                X_list.append([vector[col] for col in factory.feature_columns])
                
                gh, ga = int(row['goals_home']), int(row['goals_away'])
                # outcome label: 0=Draw, 1=Home, 2=Away (matching train_1x2.py)
                outcome = 1 if gh > ga else (2 if ga > gh else 0)
                y_list.append(outcome)
            except Exception as e:
                skipped += 1
                continue
            
            if (idx + 1) % 500 == 0:
                print(f"      {len(X_list)} features generated ({skipped} skipped)...")
                sys.stdout.flush()
        
        if len(X_list) < 30:
            print(f"   ⚠️ Only {len(X_list)} valid feature vectors. Not enough to train.")
            conn.close()
            return None
        
        X = pd.DataFrame(X_list, columns=factory.feature_columns)
        y = np.array(y_list)
        
        # 3. Chronological Train/Test split (80/20)
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        # 4. Train CatBoost
        print(f"   🏗️ Training CatBoost ({len(X_train)} train / {len(X_test)} test)...")
        # For small datasets common in league models, we use more conservative params
        model = CatBoostClassifier(
            iterations=500,
            learning_rate=0.03,
            depth=6,
            l2_leaf_reg=3,
            verbose=False,
            random_seed=42,
            loss_function='MultiClass'
        )
        
        model.fit(
            X_train, y_train,
            eval_set=(X_test, y_test),
            early_stopping_rounds=50,
            use_best_model=True
        )
        
        # 5. Evaluate
        preds = model.predict(X_test)
        probs = model.predict_proba(X_test)
        
        acc = accuracy_score(y_test, preds)
        loss = log_loss(y_test, probs) if len(np.unique(y_test)) > 1 else 0.0
        
        # Brier Score
        y_one_hot = np.zeros((len(y_test), 3))
        # Handle cases where some classes might be missing in small test sets
        for i, val in enumerate(y_test):
            y_one_hot[i, int(val)] = 1
        brier = float(np.mean(np.sum((probs - y_one_hot)**2, axis=1)))
        
        print(f"   ✅ Training Complete.")
        print(f"   📈 Accuracy={acc:.2%} | Log-Loss={loss:.4f} | Brier={brier:.4f}")
        
        # 6. Save model file
        model_filename = f"model_1x2_league_{league_id}.joblib" if league_id else "model_1x2.joblib"
        model_path = os.path.join(BASE_DIR, model_filename)
        joblib.dump(model, model_path)
        print(f"   💾 Saved: {model_path}")
        
        # Save importance
        importance = pd.DataFrame({
            'feature': factory.feature_columns,
            'importance': model.get_feature_importance()
        }).sort_values('importance', ascending=False)
        
        importance_path = model_path.replace('.joblib', '_importance.json')
        with open(importance_path, 'w') as f:
            json.dump(importance.to_dict('records'), f)
        
        # 7. Register in DB
        version_tag = f"catboost_v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Deactivate previous models for same scope
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
            float(acc), float(loss), float(brier),
            model_path, 
        ))
        
        conn.commit()
        conn.close()
        
        print(f"   📋 Registered as '{version_tag}' in V3_Model_Registry")
        return model_path
        
    except Exception as e:
        print(f"   ❌ Training failed: {e}")
        import traceback
        traceback.print_exc()
        conn.close()
        return None


def train_all_horizons(league_id: int, season_year: int = None):
    """Trains all 3 horizon models for a given league."""
    print(f"\n{'='*60}")
    print(f"🔥 FULL MODEL BUILD — League {league_id}")
    print(f"{'='*60}\n")
    
    results = {}
    for horizon in ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING']:
        path = train_model(
            league_id=league_id, 
            horizon_type=horizon,
            season_year=season_year
        )
        results[horizon] = path
        print()
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 BUILD SUMMARY — League {league_id}")
    print(f"{'='*60}")
    for h, p in results.items():
        status = "✅" if p else "❌"
        print(f"   {status} {h}: {p or 'FAILED'}")
    print()
    
    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Forge Model Training')
    parser.add_argument('--league', type=int, required=True, help='League ID')
    parser.add_argument('--horizon', type=str, default='ALL',
                        choices=['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING', 'ALL'])
    parser.add_argument('--season', type=int, default=None, help='Reference season year')
    
    args = parser.parse_args()
    
    if args.horizon == 'ALL':
        train_all_horizons(args.league, args.season)
    else:
        train_model(league_id=args.league, horizon_type=args.horizon, season_year=args.season)
