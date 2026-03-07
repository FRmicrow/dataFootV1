import psycopg2
from db_config import get_connection
import pandas as pd
import numpy as np
import json
import os
import sys
import joblib
import optuna
from datetime import datetime
from catboost import CatBoostClassifier, Pool
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import log_loss, accuracy_score, f1_score, brier_score_loss

# Path setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.abspath(os.path.join(BASE_DIR, 'model_1x2.joblib'))

def get_db_connection():
    return get_connection()

def objective(trial, X, y):
    # Hyperparameter search space for CatBoost
    params = {
        "iterations": trial.suggest_int("iterations", 100, 1000),
        "learning_rate": trial.suggest_float("learning_rate", 1e-3, 0.1, log=True),
        "depth": trial.suggest_int("depth", 4, 10),
        "l2_leaf_reg": trial.suggest_float("l2_leaf_reg", 1e-2, 10.0, log=True),
        "bootstrap_type": trial.suggest_categorical("bootstrap_type", ["Bayesian", "Bernoulli", "MVS"]),
        "random_strength": trial.suggest_float("random_strength", 1e-9, 10, log=True),
        "od_type": "Iter",
        "od_wait": 50,
        "verbose": False,
        "random_seed": 42
    }
    
    if params["bootstrap_type"] == "Bernoulli":
        params["subsample"] = trial.suggest_float("subsample", 0.1, 1.0)

    tscv = TimeSeriesSplit(n_splits=3)
    scores = []
    
    for train_index, val_index in tscv.split(X):
        X_train, X_val = X.iloc[train_index], X.iloc[val_index]
        y_train, y_val = y.iloc[train_index], y.iloc[val_index]
        
        model = CatBoostClassifier(**params)
        model.fit(X_train, y_train, eval_set=(X_val, y_val), use_best_model=True)
        
        preds_proba = model.predict_proba(X_val)
        loss = log_loss(y_val, preds_proba)
        scores.append(loss)
        
    return np.mean(scores)

def train_model(use_optuna=True):
    print("🧠 [US_164] Starting Optimized 1X2 Model Training (CatBoost)...")
    conn = get_db_connection()
    
    # 1. Load Data
    query = """
        SELECT f.fixture_id, f.goals_home, f.goals_away, fs.feature_vector
        FROM V3_Fixtures f
        JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
        WHERE f.status_short IN ('FT', 'AET', 'PEN')
        ORDER BY f.date ASC
    """
    df = pd.read_sql_query(query, conn)
    
    if df.empty:
        print("❌ No features found in Feature Store. Run features.py first.")
        return

    # 2. Parse Features
    print(f"   📊 Processing {len(df)} matches for training...")
    features_list = df['feature_vector'].apply(json.loads).tolist()
    X = pd.DataFrame(features_list)
    
    # 3. Create Labels (0: Draw, 1: Home, 2: Away) - Standardizing: Home=1, Draw=0, Away=2
    def get_outcome(row):
        if row['goals_home'] > row['goals_away']: return 1 # Home
        if row['goals_home'] == row['goals_away']: return 0 # Draw
        return 2 # Away
    
    y = df.apply(get_outcome, axis=1)

    # 4. Hyperparameter Tuning
    best_params = {
        "iterations": 500,
        "learning_rate": 0.03,
        "depth": 6,
        "l2_leaf_reg": 3,
        "verbose": False,
        "random_seed": 42
    }
    
    if use_optuna and len(X) > 100:
        print("   🧪 Optimizing hyperparameters with Optuna...")
        study = optuna.create_study(direction="minimize")
        study.optimize(lambda trial: objective(trial, X, y), n_trials=20)
        best_params.update(study.best_params)
        print(f"   ✅ Best parameters found: {json.dumps(best_params)}")

    # 5. Final Train/Test Split (Chronological)
    split_idx = int(len(X) * 0.85)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"   🏗️ Training final CatBoost model ({len(X_train)} train / {len(X_test)} test)...")
    model = CatBoostClassifier(**best_params)
    model.fit(X_train, y_train, eval_set=(X_test, y_test), use_best_model=True)

    # 6. Comprehensive Evaluation
    probs = model.predict_proba(X_test)
    preds = model.predict(X_test)
    
    loss = log_loss(y_test, probs)
    acc = accuracy_score(y_test, preds)
    f1 = f1_score(y_test, preds, average='weighted')
    
    # Brier Score (multi-class mean)
    y_one_hot = pd.get_dummies(y_test).reindex(columns=[0, 1, 2], fill_value=0).values
    brier = np.mean(np.sum((probs - y_one_hot)**2, axis=1))
    
    print(f"   ✅ Training Complete.")
    print(f"   📈 Metrics: Accuracy={acc:.2%} | F1-Score={f1:.4f} | Log-Loss={loss:.4f} | Brier={brier:.4f}")

    # 7. Save Model & Importance
    joblib.dump(model, MODEL_PATH)
    print(f"   💾 Model saved to {MODEL_PATH}")
    
    importance = pd.DataFrame({
        'feature': X.columns,
        'importance': model.get_feature_importance()
    }).sort_values('importance', ascending=False)
    
    importance_path = MODEL_PATH.replace('.joblib', '_importance.json')
    with open(importance_path, 'w') as f:
        json.dump(importance.to_dict('records'), f)

    # 8. Register in V3_Model_Registry
    version_tag = f"catboost_v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    # Deactivate previous global models
    conn.execute("UPDATE V3_Model_Registry SET is_active = 0 WHERE league_id IS NULL AND horizon_type = 'FULL_HISTORICAL'")
    
    conn.execute("""
        INSERT INTO V3_Model_Registry (
            league_id, horizon_type, version_tag, 
            hyperparameters_json, features_list_json,
            training_dataset_size, features_count,
            accuracy, log_loss, brier_score,
            model_path, is_active
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
    """, (
        None, 'FULL_HISTORICAL', version_tag,
        json.dumps(best_params), json.dumps(list(X.columns)),
        len(X_train), len(X.columns),
        float(acc), float(loss), float(brier),
        MODEL_PATH
    ))
    
    conn.commit()
    conn.close()
    print(f"   📋 Registered as '{version_tag}' in V3_Model_Registry")

if __name__ == "__main__":
    train_model(use_optuna=True)
