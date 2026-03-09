import pandas as pd
import numpy as np
import os
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import mean_squared_error, mean_poisson_deviance, log_loss

# Import dataset loader
from dataset import fetch_ft_dataset

MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'models', 'ft_result'))

def train_poisson_model(X_train, y_train, X_test, y_test, cat_features, label):
    """
    Train a single CatBoost Poisson Regressor for Full-Time Outcomes.
    Using heavier parameters since dataset is huge (380k).
    """
    model = CatBoostRegressor(
        loss_function='Poisson',
        iterations=1500,
        learning_rate=0.03,
        depth=6,
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
    print(f"{label} Performance - RMSE: {rmse:.4f} Goals | Poisson Deviance: {deviance:.4f}")
    
    return model, preds

def poisson_prob(mu, k):
    return (np.exp(-mu) * (mu**k)) / np.math.factorial(k)

def calculate_1n2_probs(home_mu, away_mu, max_goals=8):
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
                
    total = p_1 + p_n + p_2
    return p_1 / total, p_n / total, p_2 / total

def run_training():
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # 1. Load Data
    df = fetch_ft_dataset()
    
    # 2. Define Features (V0 only, as decided)
    features = [
        'league_id', 
        'diff_elo', 'diff_points', 'diff_rank', 'diff_lineup_strength',
        'home_b_elo', 'away_b_elo', 'home_b_lineup_strength_v1', 'away_b_lineup_strength_v1'
    ]
    
    cat_features = ['league_id']
    target_home = 'target_ft_home_goals'
    target_away = 'target_ft_away_goals'
    
    # 3. Time-based Split
    df = df.sort_values('match_date')
    split_idx = int(len(df) * 0.8)
    
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]
    
    X_train, y_train_h, y_train_a = train_df[features], train_df[target_home], train_df[target_away]
    X_test, y_test_h, y_test_a = test_df[features], test_df[target_home], test_df[target_away]
    
    print(f"\nFeatures used: {features}")
    print(f"Train size: {len(train_df)} | Test size: {len(test_df)}")
    
    # 4. Train Models
    home_model, preds_home = train_poisson_model(X_train, y_train_h, X_test, y_test_h, cat_features, "Home FT Goals")
    away_model, preds_away = train_poisson_model(X_train, y_train_a, X_test, y_test_a, cat_features, "Away FT Goals")
    
    # 5. Evaluate Overall 1N2 Output
    print("\nEvaluating 1N2 Probabilities...")
    y_true_1n2 = []
    for h, a in zip(y_test_h.to_numpy(), y_test_a.to_numpy()):
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
    
    print(f"\nFinal Test Set Evaluation (FT_RESULT):")
    print(f"Accuracy (1N2): {acc:.4f}")
    print(f"LogLoss (1N2):  {ll:.4f}")
    
    # Feature Importance
    print("\nTop 5 Feature Importance (Home Model):")
    feature_importances = home_model.get_feature_importance()
    for score, name in sorted(zip(feature_importances, features), reverse=True)[:5]:
        print(f"  {name}: {score:.2f}")
        
    # 6. Save Models
    home_path = os.path.join(MODEL_DIR, f'catboost_baseline_v0_home.cbm')
    away_path = os.path.join(MODEL_DIR, f'catboost_baseline_v0_away.cbm')
    home_model.save_model(home_path)
    away_model.save_model(away_path)
    
    print(f"\nModels saved to {MODEL_DIR}")

if __name__ == "__main__":
    run_training()
