import pandas as pd
import numpy as np
import os
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import mean_squared_error, mean_poisson_deviance

# Import dataset loader
from dataset import fetch_corners_dataset

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'models', 'corners_total'))

def train_poisson_model(X_train, y_train, X_test, y_test, cat_features, label):
    """
    Train a single CatBoost Poisson Regressor for Corners.
    """
    model = CatBoostRegressor(
        loss_function='Poisson',
        iterations=1000,
        learning_rate=0.03,
        depth=5,
        eval_metric='Poisson',
        random_seed=42,
        od_type='Iter',
        od_wait=50,
        verbose=100
    )
    
    train_pool = Pool(X_train, y_train, cat_features=cat_features)
    test_pool = Pool(X_test, y_test, cat_features=cat_features)
    
    print(f"\nTraining {label} model...")
    model.fit(train_pool, eval_set=test_pool, use_best_model=True)
    
    # Evaluate
    preds = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    deviance = mean_poisson_deviance(y_test, preds)
    print(f"{label} Performance - RMSE: {rmse:.4f} Corners | Poisson Deviance: {deviance:.4f}")
    
    return model, preds

def run_training():
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # 1. Load Data
    df = fetch_corners_dataset()
    
    # 2. Define Features
    features = [
        'league_id', 
        'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength',
        'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1',
        'diff_possession_l5', 'diff_control_l5', 'diff_shots_l5', 'diff_sot_l5', 'diff_corners_l5',
        'home_p_possession_avg_5', 'away_p_possession_avg_5',
        'home_p_control_index_5', 'away_p_control_index_5',
        'home_p_corners_per_match_5', 'away_p_corners_per_match_5',
        'home_p_shots_per_match_5', 'away_p_shots_per_match_5'
    ]
    
    cat_features = ['league_id']
    target_home = 'target_home_corners'
    target_away = 'target_away_corners'
    
    # 3. Time-based Split (Keep last 20% chronologically for testing)
    df = df.sort_values('match_date')
    split_idx = int(len(df) * 0.8)
    
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train, y_train_h, y_train_a = train_df[features], train_df[target_home], train_df[target_away]
    X_test, y_test_h, y_test_a = test_df[features], test_df[target_home], test_df[target_away]
    
    print(f"\nFeatures used: {features}")
    print(f"Train size: {len(train_df)} | Test size: {len(test_df)}")
    
    avg_home_corners = np.mean(y_test_h)
    avg_away_corners = np.mean(y_test_a)
    print(f"Test Set Average Corners: Home {avg_home_corners:.2f}, Away {avg_away_corners:.2f}")
    
    # 4. Train Models
    home_model, preds_home = train_poisson_model(X_train, y_train_h, X_test, y_test_h, cat_features, "Home Corners")
    away_model, preds_away = train_poisson_model(X_train, y_train_a, X_test, y_test_a, cat_features, "Away Corners")
    
    # Evaluate Total Corners Error
    actual_totals = y_test_h + y_test_a
    predicted_totals = preds_home + preds_away
    total_rmse = np.sqrt(mean_squared_error(actual_totals, predicted_totals))
    print(f"\nTotal Corners Prediction - Overall RMSE: {total_rmse:.4f} Corners")
    
    # Feature Importance
    print("\nTop 5 Feature Importance (Home Corners Model):")
    feature_importances = home_model.get_feature_importance()
    for score, name in sorted(zip(feature_importances, features), reverse=True)[:5]:
        print(f"  {name}: {score:.2f}")
        
    print("\nTop 5 Feature Importance (Away Corners Model):")
    feature_importances = away_model.get_feature_importance()
    for score, name in sorted(zip(feature_importances, features), reverse=True)[:5]:
        print(f"  {name}: {score:.2f}")
        
    # 5. Save Models
    home_path = os.path.join(MODEL_DIR, f'catboost_corners_v1_home.cbm')
    away_path = os.path.join(MODEL_DIR, f'catboost_corners_v1_away.cbm')
    home_model.save_model(home_path)
    away_model.save_model(away_path)
    
    print(f"\nModels saved to {MODEL_DIR}")

if __name__ == "__main__":
    run_training()
