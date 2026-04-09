import pandas as pd
import numpy as np
import os
import argparse
import json
import sys
from datetime import datetime
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import mean_squared_error, mean_poisson_deviance, log_loss

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, GLOBAL_1X2_FEATURE_SCHEMA_VERSION
from horizon_utils import filter_dataframe_by_horizon, normalize_horizon_type
from model_paths import get_ht_poisson_paths, with_horizon_suffix
from src.models.model_utils import get_valid_cat_features, poisson_prob

# Import dataset loader
from dataset import fetch_ht_dataset, fetch_ht_dataset_v2

def train_poisson_model(X_train, y_train, X_test, y_test, cat_features, label):
    """
    Train a single CatBoost Poisson Regressor.
    """
    valid_cat_features = get_valid_cat_features(X_train.columns, cat_features)
    model = CatBoostRegressor(
        loss_function='Poisson',
        iterations=1000,
        learning_rate=0.03,
        depth=6,
        eval_metric='Poisson',
        random_seed=42,
        od_type='Iter',
        od_wait=50,
        verbose=100
    )
    
    train_pool = Pool(X_train, y_train, cat_features=valid_cat_features)
    test_pool = Pool(X_test, y_test, cat_features=valid_cat_features)
    
    print(f"\nTraining {label} model...")
    model.fit(train_pool, eval_set=test_pool, use_best_model=True)
    
    # Evaluate
    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    deviance = mean_poisson_deviance(y_test, preds)
    print(f"{label} Performance - RMSE: {rmse:.4f} | Poisson Deviance: {deviance:.4f}")
    
    return model, preds

def calculate_1n2_probs(home_mu, away_mu, max_goals=5):
    """
    Calculate 1, N, 2 probabilities from Expected Goals using Poisson distribution.
    """
    p_1, p_n, p_2 = 0.0, 0.0, 0.0
    
    for h in range(max_goals + 1):
        for a in range(max_goals + 1):
            prob = poisson_prob(home_mu, h) * poisson_prob(away_mu, a)
            if h > a:
                p_1 += prob
            elif h == a:
                p_n += prob
            else:
                p_2 += prob
                
    # Normalize to 1 (to account for truncation at max_goals)
    total = p_1 + p_n + p_2
    return p_1 / total, p_n / total, p_2 / total

def run_training(version='v0', horizon_type="FULL_HISTORICAL", activate=True):
    horizon_type = normalize_horizon_type(horizon_type)
    horizon_slug = horizon_type.lower()
    model_paths = with_horizon_suffix(get_ht_poisson_paths(version), horizon_slug)
    os.makedirs(model_paths["dir"], exist_ok=True)
    
    # 1. Load Data
    include_process = (version == 'v1')
    if version == 'v2':
        df = fetch_ht_dataset_v2()
    else:
        df = fetch_ht_dataset(include_process_features=include_process)
    df, horizon_window = filter_dataframe_by_horizon(df, "match_date", horizon_type)
    
    # 2. Define Features
    features = [
        'league_id', 
        'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength',
        'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1'
    ]
    
    if include_process:
        features.extend([
            'diff_possession_l5', 'diff_control_l5',
            'home_p_possession_avg_5', 'away_p_possession_avg_5',
            'home_p_control_index_5', 'away_p_control_index_5'
        ])
    elif version == 'v2':
        features = list(GLOBAL_1X2_FEATURE_COLUMNS)
        
    cat_features = ['league_id'] if 'league_id' in features else []
    target_home = 'target_ht_home_goals'
    target_away = 'target_ht_away_goals'
    
    # 3. Time-based Split (Keep last 20% chronologically for testing)
    df = df.sort_values('match_date')
    split_idx = int(len(df) * 0.8)
    
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train, y_train_h, y_train_a = train_df[features], train_df[target_home], train_df[target_away]
    X_test, y_test_h, y_test_a = test_df[features], test_df[target_home], test_df[target_away]
    
    print(f"\nFeatures used: {features}")
    print(f"Train size: {len(train_df)} | Test size: {len(test_df)}")
    
    # 4. Train Models
    home_model, preds_home = train_poisson_model(X_train, y_train_h, X_test, y_test_h, cat_features, "Home HT Goals")
    away_model, preds_away = train_poisson_model(X_train, y_train_a, X_test, y_test_a, cat_features, "Away HT Goals")
    
    # 5. Evaluate Overall 1N2
    print("\nEvaluating 1N2 Probabilities...")
    y_true_1n2 = []
    for h, a in zip(y_test_h, y_test_a):
        if h > a: y_true_1n2.append(0)    # 1
        elif h == a: y_true_1n2.append(1) # N
        else: y_true_1n2.append(2)        # 2
        
    y_pred_probs = []
    for h_mu, a_mu in zip(preds_home, preds_away):
        p1, pn, p2 = calculate_1n2_probs(h_mu, a_mu)
        y_pred_probs.append([p1, pn, p2])
        
    ll = log_loss(y_true_1n2, y_pred_probs)
    preds_classes = np.argmax(y_pred_probs, axis=1)
    acc = np.mean(preds_classes == y_true_1n2)
    
    print(f"\nFinal Test Set Evaluation (Version: {version.upper()}):")
    print(f"Accuracy (1N2): {acc:.4f}")
    print(f"LogLoss (1N2):  {ll:.4f}")
    
    # Feature Importance
    print("\nTop 5 Feature Importance (Home Model):")
    feature_importances = home_model.get_feature_importance()
    for score, name in sorted(zip(feature_importances, features), reverse=True)[:5]:
        print(f"  {name}: {score:.2f}")
        
    # 6. Save Models
    home_model.save_model(model_paths["home"])
    away_model.save_model(model_paths["away"])

    if version == 'v2':
        metadata = {
            "market": "1N2_HT",
            "scope": "global",
            "horizon": horizon_type,
            "schema_version": GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
            "dataset_size": int(len(df)),
            "train_size": int(len(train_df)),
            "test_size": int(len(test_df)),
            "accuracy": float(acc),
            "log_loss": float(ll),
            "features_count": len(features),
            "model_paths": {
                "home": model_paths["home"],
                "away": model_paths["away"],
            },
            "features_list": features,
        }
        metadata_path = os.path.join(model_paths["dir"], f"catboost_baseline_v2_{horizon_slug}_metadata.json")
        with open(metadata_path, "w") as handle:
            json.dump(metadata, handle, indent=2)

        conn = get_connection()
        try:
            version_tag = f"catboost_ht_{horizon_slug}_v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            with conn.cursor() as cur:
                if activate:
                    cur.execute(
                        """
                        UPDATE V3_Model_Registry
                        SET is_active = 0
                        WHERE name = %s AND type = %s
                        """,
                        ("global_ht_1x2", "METAMODEL"),
                    )
                cur.execute(
                    """
                    INSERT INTO V3_Model_Registry (
                        name, version, type, path, is_active, metadata_json
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        "global_ht_1x2",
                        version_tag,
                        "METAMODEL",
                        model_paths["dir"],
                        1 if activate else 0,
                        json.dumps({
                            **metadata,
                            "activate": bool(activate),
                            "horizon_min_date": horizon_window.min_date_included.isoformat() if horizon_window.min_date_included is not None else None,
                            "horizon_max_date": horizon_window.max_date.isoformat() if str(horizon_window.max_date) != "NaT" else None,
                        }),
                    ),
                )
            conn.commit()
            print(f"Registered HT 1X2 model as {version_tag}")
        finally:
            conn.close()
    
    print(f"\nModels saved to {model_paths['dir']}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', type=str, default='v0', choices=['v0', 'v1', 'v2'])
    parser.add_argument("--horizon", default="FULL_HISTORICAL", choices=["FULL_HISTORICAL", "5Y_ROLLING", "3Y_ROLLING"])
    parser.add_argument("--no-activate", action="store_true")
    args = parser.parse_args()
    run_training(args.version, horizon_type=args.horizon, activate=not args.no_activate)
