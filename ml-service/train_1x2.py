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

# Path setup
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite'))
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'model_1x2.joblib'))

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def train_model():
    print("🧠 [US_151] Starting 1X2 Model Training...")
    conn = get_db_connection()
    
    # 1. Load Data
    query = """
        SELECT f.fixture_id, f.goals_home, f.goals_away, fs.feature_vector
        FROM V3_Fixtures f
        JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
        WHERE f.status_short IN ('FT', 'AET', 'PEN')
    """
    df = pd.read_sql_query(query, conn)
    
    if df.empty:
        print("❌ No features found in Feature Store. Run features.py first.")
        return

    # 2. Parse Features
    print(f"   📊 Processing {len(df)} matches for training...")
    features_list = df['feature_vector'].apply(json.loads).tolist()
    X = pd.DataFrame(features_list)
    
    # 3. Create Labels (0: Home, 1: Draw, 2: Away)
    def get_outcome(row):
        if row['goals_home'] > row['goals_away']: return 0
        if row['goals_home'] == row['goals_away']: return 1
        return 2
    
    y = df.apply(get_outcome, axis=1)

    # 4. Split and Train
    # Using Chronological split would be better, but for V1 let's do a fast split
    X_train, X_test, y_train, y_test = train_test_split_fast(X, y)
    
    print("   🏗️ Training Random Forest Classifier...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    # 5. Evaluate
    probs = model.predict_proba(X_test)
    preds = model.predict(X_test)
    
    loss = log_loss(y_test, probs)
    acc = accuracy_score(y_test, preds)
    
    print(f"   ✅ Training Complete.")
    print(f"   📈 Metrics: Log-Loss={loss:.4f}, Accuracy={acc:.2%}")

    # 6. Save Model
    joblib.dump(model, MODEL_PATH)
    print(f"   💾 Model saved to {MODEL_PATH}")
    
    # Save Feature Importance report
    save_importance(model, X.columns)
    
    conn.close()

def train_test_split_fast(X, y):
    # Simple split index for chronological data (assumed already sorted by date in DB query)
    split_idx = int(len(X) * 0.8)
    return X.iloc[:split_idx], X.iloc[split_idx:], y.iloc[:split_idx], y.iloc[split_idx:]

def save_importance(model, features):
    importance = pd.DataFrame({
        'feature': features,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n🔥 Feature Importance (Top 10):")
    print(importance.head(10))
    
    # Save to JSON for UI usage
    report_path = MODEL_PATH.replace('.joblib', '_importance.json')
    with open(report_path, 'w') as f:
        json.dump(importance.to_dict('records'), f)

if __name__ == "__main__":
    train_model()
