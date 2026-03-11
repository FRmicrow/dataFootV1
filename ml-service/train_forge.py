"""
Train Forge — League-Scoped Multi-Horizon Model Training (V8)
Supports FULL_HISTORICAL, 5Y_ROLLING, 3Y_ROLLING horizons per league.
NO ODDS. Accuracy-only evaluation.
"""
import psycopg2
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
from db_config import get_connection

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_db_connection():
    return get_connection()

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
                cutoff_date: str = None, season_year: int = None, target_market: str = '1X2') -> str:
    """
    Trains a model for a specific league, horizon, and target market.
    Markets: '1X2', 'CORNERS', 'CARDS'
    """
    label = f"League {league_id}" if league_id else "Global"
    print(f"🧠 [Forge] Training {label} model ({horizon_type}) for {target_market}...")
    
    conn = get_db_connection()
    factory = TemporalFeatureFactory()
    
    try:
        # 1. Determine training data window
        earliest = get_horizon_cutoff(horizon_type, season_year)
        
        # Need to join with V3_Fixture_Stats for Corners/Cards targets
        if target_market == '1X2':
            query = """
                SELECT f.fixture_id, f.goals_home, f.goals_away, f.date
                FROM V3_Fixtures f
                WHERE f.status_short IN ('FT', 'AET', 'PEN')
                  AND f.goals_home IS NOT NULL
                  AND f.goals_away IS NOT NULL
                  AND f.date >= %s
            """
        else:
            query = """
                SELECT f.fixture_id, f.goals_home, f.goals_away, f.date,
                       SUM(fs.corner_kicks) as total_corners,
                       SUM(fs.yellow_cards + fs.red_cards) as total_cards
                FROM V3_Fixtures f
                JOIN V3_Fixture_Stats fs ON f.fixture_id = fs.fixture_id
                WHERE f.status_short IN ('FT', 'AET', 'PEN')
                  AND fs.half = 'FT'
                  AND f.date >= %s
                GROUP BY f.fixture_id, f.goals_home, f.goals_away, f.date
            """
        
        params = [earliest]
        if league_id:
            query += " AND f.league_id = %s"
            params.append(league_id)
        if cutoff_date:
            query += " AND f.date < %s"
            params.append(cutoff_date)
        
        query += " ORDER BY f.date ASC"
        df = pd.read_sql_query(query, conn, params=params)
        
        if len(df) < 30:
            print(f"   ⚠️ Insufficient data ({len(df)} matches). Skipping.")
            conn.close(); return None
        
        # 2. Generate feature vectors
        X_list, y_list = [], []
        skipped = 0
        for idx, row in df.iterrows():
            try:
                vector = factory.get_vector(int(row['fixture_id']), conn=conn)
                X_list.append([vector[col] for col in factory.feature_columns])
                
                if target_market == '1X2':
                    gh, ga = int(row['goals_home']), int(row['goals_away'])
                    y_list.append(1 if gh > ga else (2 if ga > gh else 0))
                elif target_market == 'CORNERS':
                    # Threshold: 9.5 corners (Over=1, Under=0)
                    y_list.append(1 if float(row['total_corners']) > 9.5 else 0)
                elif target_market == 'CARDS':
                    # Threshold: 3.5 cards (Over=1, Under=0)
                    y_list.append(1 if float(row['total_cards']) > 3.5 else 0)
            except:
                skipped += 1; continue
        
        if len(X_list) < 30: conn.close(); return None
        X, y = pd.DataFrame(X_list, columns=factory.feature_columns), np.array(y_list)
        
        # 3. Split & Train
        split_idx = int(len(X) * 0.8)
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        
        model = CatBoostClassifier(iterations=500, learning_rate=0.03, depth=6, verbose=False, random_seed=42,
                                   loss_function='MultiClass' if target_market == '1X2' else 'Logloss')
        model.fit(X_train, y_train, eval_set=(X_test, y_test), early_stopping_rounds=50, use_best_model=True)
        
        # 5. Evaluate
        preds, probs = model.predict(X_test), model.predict_proba(X_test)
        acc = accuracy_score(y_test, preds)
        loss = log_loss(y_test, probs) if len(np.unique(y_test)) > 1 and len(np.unique(y_train)) > 1 else 0.0
        
        # 6. Save
        market_suffix = target_market.lower()
        model_filename = f"model_{market_suffix}_league_{league_id}.joblib" if league_id else f"model_{market_suffix}.joblib"
        model_path = os.path.join(BASE_DIR, model_filename)
        joblib.dump(model, model_path)
        
        importance = pd.DataFrame({'feature': factory.feature_columns, 'importance': model.get_feature_importance()}).sort_values('importance', ascending=False)
        with open(model_path.replace('.joblib', '_importance.json'), 'w') as f: json.dump(importance.to_dict('records'), f)
        
        # 7. Register
        cur = conn.cursor()
        cur.execute("UPDATE V3_Model_Registry SET is_active = 0 WHERE league_id IS NOT DISTINCT FROM %s AND horizon_type = %s AND market_type = %s", (league_id, horizon_type, target_market))
        cur.execute("""
            INSERT INTO V3_Model_Registry (league_id, horizon_type, market_type, version_tag, training_dataset_size, features_count, accuracy, log_loss, model_path, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
        """, (league_id, horizon_type, target_market, f"cb_{target_market}_{datetime.now().strftime('%Y%m%d')}", len(X_train), len(factory.feature_columns), float(acc), float(loss), model_path))
        conn.commit(); conn.close()
        return model_path
    except Exception as e:
        print(f"   ❌ Failed: {e}"); conn.close(); return None

def train_all_horizons(league_id: int, season_year: int = None, targets: list = ['1X2']):
    """Trains all specified target models across all horizons."""
    print(f"\n🔥 FULL MODEL BUILD — League {league_id} for {targets}")
    results = {}
    for target in targets:
        for horizon in ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING']:
            path = train_model(league_id=league_id, horizon_type=horizon, season_year=season_year, target_market=target)
            results[f"{target}_{horizon}"] = path
    return results

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--league', type=int, required=True)
    parser.add_argument('--horizon', type=str, default='ALL')
    parser.add_argument('--targets', type=str, default='1X2')
    args = parser.parse_args()
    
    target_list = ['1X2', 'CORNERS', 'CARDS'] if args.targets == 'ALL' else args.targets.split(',')
    if args.horizon == 'ALL':
        train_all_horizons(args.league, targets=target_list)
    else:
        for t in target_list: train_model(league_id=args.league, horizon_type=args.horizon, target_market=t)
