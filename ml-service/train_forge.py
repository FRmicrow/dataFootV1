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

# Path setup
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite'))
MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), 'model_1x2.joblib'))

def get_db_connection():
    return sqlite3.connect(DB_PATH)

def train_forge_model(cutoff_date: str = None):
    """
    Forge-ready training script.
    Generates 22-feature vectors for historical data and trains the baseline model.
    """
    print(f"🧠 [Forge] Starting Model Training (Cutoff: {cutoff_date or 'ALL'})...")
    conn = get_db_connection()
    factory = TemporalFeatureFactory(DB_PATH)
    
    # 1. Fetch training matches
    query = """
        SELECT fixture_id, goals_home, goals_away 
        FROM V3_Fixtures 
        WHERE status_short IN ('FT', 'AET', 'PEN')
          AND goals_home IS NOT NULL 
          AND goals_away IS NOT NULL
    """
    params = []
    if cutoff_date:
        query += " AND date < ?"
        params.append(cutoff_date)
        
    # Limit for semi-fast training in this environment
    query += " ORDER BY date DESC LIMIT 200"
    
    df = pd.read_sql_query(query, conn, params=params)
    
    if df.empty:
        print("❌ No matches found for training.")
        return

    # 2. Generate Features (This uses the Time-Travel Engine)
    print(f"   📊 Generating 22 features for {len(df)} matches...")
    X_list = []
    y_list = []
    
    for idx, row in df.iterrows():
        fid = int(row['fixture_id'])
        vector = factory.get_vector(fid, conn=conn)
        X_list.append([vector[col] for col in factory.feature_columns])
        
        # Outcome: 1=Home, 0=Draw, 2=Away
        gh, ga = int(row['goals_home']), int(row['goals_away'])
        outcome = 1 if gh > ga else (2 if ga > gh else 0)
        y_list.append(outcome)
        
        if (idx + 1) % 1000 == 0:
            print(f"      {idx+1} matches processed...")

    X = pd.DataFrame(X_list, columns=factory.feature_columns)
    y = np.array(y_list)

    # 3. Train
    print("   🏗️ Training Random Forest Classifier (Forge Baseline)...")
    model = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X, y)

    # 4. Save
    joblib.dump(model, MODEL_PATH)
    print(f"   💾 Model saved to {MODEL_PATH}")
    
    # Save Feature Importance
    importance = pd.DataFrame({
        'feature': factory.feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    report_path = MODEL_PATH.replace('.joblib', '_importance.json')
    with open(report_path, 'w') as f:
        json.dump(importance.to_dict('records'), f)
        
    conn.close()
    print("✅ Forge Model Ready.")

if __name__ == "__main__":
    train_forge_model()
