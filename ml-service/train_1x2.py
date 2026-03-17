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
import traceback
from catboost import CatBoostClassifier, Pool
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import log_loss, accuracy_score, f1_score, brier_score_loss
from model_paths import get_global_1x2_horizon_model_path, get_global_1x2_model_dir, get_global_1x2_model_path
from feature_schema import (
    GLOBAL_1X2_FEATURE_COLUMNS,
    GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
    inspect_feature_vector,
    normalize_feature_vector,
)
from horizon_utils import filter_dataframe_by_horizon, normalize_horizon_type

# Path setup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TRAIN_PROGRESS_PATH = os.path.join(BASE_DIR, 'train_1x2_progress.json')

def get_db_connection():
    return get_connection()


def write_train_progress(**payload):
    progress = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
        **payload,
    }
    with open(TRAIN_PROGRESS_PATH, 'w') as handle:
        json.dump(progress, handle, indent=2)

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

def horizon_slug(horizon_type: str) -> str:
    return normalize_horizon_type(horizon_type).lower()


def load_best_params(params_json=None, params_file=None):
    if params_json:
        return json.loads(params_json)
    if params_file:
        with open(params_file, "r") as handle:
            return json.load(handle)
    return None


def train_model(use_optuna=True, horizon_type="FULL_HISTORICAL", activate=True, preset_params=None):
    horizon_type = normalize_horizon_type(horizon_type)
    model_dir = get_global_1x2_model_dir()
    os.makedirs(model_dir, exist_ok=True)
    model_path = get_global_1x2_horizon_model_path(horizon_slug(horizon_type))
    print("🧠 Starting Optimized 1X2 Model Training (CatBoost)...")
    conn = get_db_connection()
    try:
        write_train_progress(status="running", stage="loading_data", horizon=horizon_type, activate=activate)
        # 1. Load Data
        query = """
            SELECT f.fixture_id, f.date AS match_date, f.goals_home, f.goals_away, fs.feature_vector
            FROM V3_Fixtures f
            JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            ORDER BY f.date ASC
        """
        df = pd.read_sql_query(query, conn)
        df, horizon_window = filter_dataframe_by_horizon(df, "match_date", horizon_type)

        if df.empty:
            print("❌ No features found in Feature Store. Run features.py first.")
            write_train_progress(status="failed", stage="loading_data", error="No features found in Feature Store")
            return

        # 2. Parse Features
        print(f"   📊 Processing {len(df)} matches for training...")
        raw_features = df['feature_vector'].apply(json.loads).tolist()
        schema_issues = [inspect_feature_vector(vector) for vector in raw_features]
        if any(issue["missing"] or issue["extra"] for issue in schema_issues):
            first_issue = next(issue for issue in schema_issues if issue["missing"] or issue["extra"])
            raise ValueError(
                "Feature schema mismatch detected in V3_ML_Feature_Store "
                f"for {GLOBAL_1X2_FEATURE_SCHEMA_VERSION}: "
                f"missing={first_issue['missing'][:5]} extra={first_issue['extra'][:5]}"
            )
        X = pd.DataFrame(
            [normalize_feature_vector(vector) for vector in raw_features],
            columns=GLOBAL_1X2_FEATURE_COLUMNS
        )
        write_train_progress(
            status="running",
            stage="features_loaded",
            dataset_size=int(len(X)),
            feature_count=int(len(X.columns)),
            schema_version=GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
            horizon=horizon_type,
            horizon_min_date=horizon_window.min_date_included.isoformat() if horizon_window.min_date_included is not None else None,
            horizon_max_date=horizon_window.max_date.isoformat() if str(horizon_window.max_date) != "NaT" else None,
        )

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
        if preset_params:
            best_params.update(preset_params)
            best_params["verbose"] = False
            best_params["random_seed"] = 42

        if use_optuna and len(X) > 100 and not preset_params:
            print("   🧪 Optimizing hyperparameters with Optuna...")
            study = optuna.create_study(direction="minimize")
            def on_trial_complete(study, trial):
                write_train_progress(
                    status="running",
                    stage="optuna",
                    dataset_size=int(len(X)),
                    feature_count=int(len(X.columns)),
                    completed_trials=int(trial.number + 1),
                    best_value=float(study.best_value) if study.best_trials else None,
                    horizon=horizon_type,
                )
            study.optimize(lambda trial: objective(trial, X, y), n_trials=20, callbacks=[on_trial_complete])
            best_params.update(study.best_params)
            print(f"   ✅ Best parameters found: {json.dumps(best_params)}")

        # 5. Final Train/Test Split (Chronological)
        split_idx = int(len(X) * 0.85)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        write_train_progress(
            status="running",
            stage="final_training",
            train_size=int(len(X_train)),
            test_size=int(len(X_test)),
            best_params=best_params,
            horizon=horizon_type,
        )

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
        joblib.dump(model, model_path)
        print(f"   💾 Model saved to {model_path}")

        importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.get_feature_importance()
        }).sort_values('importance', ascending=False)

        importance_path = model_path.replace('.joblib', '_importance.json')
        with open(importance_path, 'w') as f:
            json.dump(importance.to_dict('records'), f)
        write_train_progress(
            status="running",
            stage="model_saved",
            model_path=model_path,
            importance_path=importance_path,
            metrics={
                "accuracy": float(acc),
                "log_loss": float(loss),
                "brier_score": float(brier),
                "f1_weighted": float(f1),
            }
        )

        if activate and horizon_type == "FULL_HISTORICAL":
            canonical_model_path = get_global_1x2_model_path()
            if canonical_model_path != model_path:
                joblib.dump(model, canonical_model_path)

        # 8. Register in V3_Model_Registry using the active registry schema
        version_tag = f"catboost_{horizon_slug(horizon_type)}_v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        model_name = "global_1x2"
        registry_metadata = {
            "scope": "global",
            "market": "1N2_FT",
            "horizon": horizon_type,
            "schema_version": GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
            "hyperparameters": best_params,
            "features_list": list(X.columns),
            "training_dataset_size": int(len(X_train)),
            "dataset_size_total": int(len(X)),
            "features_count": int(len(X.columns)),
            "activate": bool(activate),
            "model_path": model_path,
            "importance_path": importance_path,
            "horizon_min_date": horizon_window.min_date_included.isoformat() if horizon_window.min_date_included is not None else None,
            "horizon_max_date": horizon_window.max_date.isoformat() if str(horizon_window.max_date) != "NaT" else None,
            "metrics": {
                "accuracy": float(acc),
                "log_loss": float(loss),
                "brier_score": float(brier),
                "f1_weighted": float(f1),
            },
        }

        with conn.cursor() as cur:
            if activate:
                cur.execute(
                    """
                    UPDATE V3_Model_Registry
                    SET is_active = 0
                    WHERE name = %s AND type = %s
                    """,
                    (model_name, 'METAMODEL')
                )

            cur.execute(
                """
                INSERT INTO V3_Model_Registry (
                    name, version, type, path, is_active, metadata_json
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    model_name,
                    version_tag,
                    'METAMODEL',
                    model_path,
                    1 if activate else 0,
                    json.dumps(registry_metadata),
                )
            )

        conn.commit()
        print(f"   📋 Registered as '{version_tag}' in V3_Model_Registry")
        write_train_progress(
            status="completed",
            stage="registered",
            model_path=model_path,
            importance_path=importance_path,
            version=version_tag,
            horizon=horizon_type,
            metrics={
                "accuracy": float(acc),
                "log_loss": float(loss),
                "brier_score": float(brier),
                "f1_weighted": float(f1),
            }
        )
    except Exception as exc:
        write_train_progress(
            status="failed",
            stage="error",
            error=str(exc),
            traceback=traceback.format_exc()
        )
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--horizon", default="FULL_HISTORICAL", choices=["FULL_HISTORICAL", "5Y_ROLLING", "3Y_ROLLING"])
    parser.add_argument("--no-activate", action="store_true")
    parser.add_argument("--no-optuna", action="store_true")
    parser.add_argument("--params-json", default=None)
    parser.add_argument("--params-file", default=None)
    args = parser.parse_args()

    train_model(
        use_optuna=not args.no_optuna,
        horizon_type=args.horizon,
        activate=not args.no_activate,
        preset_params=load_best_params(args.params_json, args.params_file),
    )
