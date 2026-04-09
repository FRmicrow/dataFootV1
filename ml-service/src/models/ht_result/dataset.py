import pandas as pd
import json
import os
import sys


MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
ML_SERVICE_ROOT = os.path.abspath(os.path.join(MODEL_DIR, "..", "..", ".."))
if ML_SERVICE_ROOT not in sys.path:
    sys.path.insert(0, ML_SERVICE_ROOT)

from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_COLUMNS, normalize_feature_vector


def get_db_connection():
    return get_connection()

def fetch_ht_dataset(include_process_features=False):
    """
    Fetches the dataset for HT_RESULT modeling.
    If include_process_features is True, returns dataset_v1 (Baseline + Process).
    If False, returns dataset_v0 (Baseline only, much larger history).
    """
    conn = get_db_connection()
    
    # Base query for matches and targets
    query = """
        SELECT 
            f.fixture_id,
            f.league_id,
            f.season_year,
            f.date as match_date,
            f.home_team_id,
            f.away_team_id,
            f.score_halftime_home,
            f.score_halftime_away
        FROM V3_Fixtures f
        WHERE f.status_short = 'FT'
          AND f.score_halftime_home IS NOT NULL
          AND f.score_halftime_away IS NOT NULL
        ORDER BY f.date ASC
    """
    
    print("Fetching matches and targets...")
    matches_df = pd.read_sql_query(query, conn)
    matches_df['match_date'] = pd.to_datetime(matches_df['match_date'], utc=True)
    
    # Add target variables
    matches_df['target_ht_home_goals'] = matches_df['score_halftime_home'].astype(int)
    matches_df['target_ht_away_goals'] = matches_df['score_halftime_away'].astype(int)
    
    # Load BASELINE_V1 Home
    print("Loading BASELINE_V1 for Home teams...")
    home_baseline = pd.read_sql_query("""
        SELECT fixture_id, features_json as home_baseline_json
        FROM V3_Team_Features_PreMatch
        WHERE feature_set_id = 'BASELINE_V1' AND horizon_type = 'FULL_HISTORICAL'
    """, conn)
    
    # Optimization: Filter to only the fixtures we need before parsing JSON
    home_baseline = home_baseline[home_baseline['fixture_id'].isin(matches_df['fixture_id'])]
    
    # We need to distinguish home vs away baseline. We can join on fixture_id AND team_id.
    # Actually, V3_Team_Features_PreMatch has team_id. Let's pull that.
    
    baseline_query = """
        SELECT fixture_id, team_id, features_json
        FROM V3_Team_Features_PreMatch
        WHERE feature_set_id = 'BASELINE_V1' AND horizon_type = 'FULL_HISTORICAL'
    """
    baseline_df = pd.read_sql_query(baseline_query, conn)
    
    # Parse JSON
    print("Parsing BASELINE_V1 JSON...")
    baseline_parsed = pd.json_normalize(baseline_df['features_json'].apply(json.loads))
    for col in baseline_parsed.columns:
        baseline_df[col] = baseline_parsed[col]
    baseline_df = baseline_df.drop(columns=['features_json'])
    
    # Merge Home
    print("Merging Home BASELINE_V1...")
    matches_df = pd.merge(
        matches_df, 
        baseline_df.add_prefix('home_b_'), 
        left_on=['fixture_id', 'home_team_id'], 
        right_on=['home_b_fixture_id', 'home_b_team_id'], 
        how='left'
    )
    
    # Merge Away
    print("Merging Away BASELINE_V1...")
    matches_df = pd.merge(
        matches_df, 
        baseline_df.add_prefix('away_b_'), 
        left_on=['fixture_id', 'away_team_id'], 
        right_on=['away_b_fixture_id', 'away_b_team_id'], 
        how='left'
    )
    
    # Drop redundant join keys
    cols_to_drop = ['home_b_fixture_id', 'home_b_team_id', 'away_b_fixture_id', 'away_b_team_id']
    matches_df = matches_df.drop(columns=[col for col in cols_to_drop if col in matches_df.columns])
    
    # Drop rows missing baseline data (mostly early history where elo might be weird, but we backfilled 100%)
    initial_len = len(matches_df)
    matches_df = matches_df.dropna(subset=['home_b_elo', 'away_b_elo'])
    print(f"Dropped {initial_len - len(matches_df)} matches due to missing BASELINE_V1 data.")

    # Calculate Differentials
    matches_df['diff_elo'] = matches_df['home_b_elo'] - matches_df['away_b_elo']
    matches_df['diff_points'] = matches_df['home_b_points'] - matches_df['away_b_points']
    matches_df['diff_rank'] = matches_df['away_b_rank'] - matches_df['home_b_rank'] # Lower rank is better
    matches_df['diff_lineup_strength'] = matches_df['home_b_lineup_strength_v1'] - matches_df['away_b_lineup_strength_v1']
    
    if include_process_features:
        print("Loading PROCESS_V1 features...")
        process_query = """
            SELECT fixture_id, team_id, features_json
            FROM V3_Team_Features_PreMatch
            WHERE feature_set_id = 'PROCESS_V1' AND horizon_type = 'FULL_HISTORICAL'
        """
        process_df = pd.read_sql_query(process_query, conn)
        
        print("Parsing PROCESS_V1 JSON...")
        process_parsed = pd.json_normalize(process_df['features_json'].apply(json.loads))
        for col in process_parsed.columns:
            process_df[col] = process_parsed[col]
        process_df = process_df.drop(columns=['features_json'])
        
        print("Merging Home PROCESS_V1...")
        matches_df = pd.merge(
            matches_df, 
            process_df.add_prefix('home_p_'), 
            left_on=['fixture_id', 'home_team_id'], 
            right_on=['home_p_fixture_id', 'home_p_team_id'], 
            how='inner' # Inner join because PROCESS_V1 restricts our history
        )
        
        print("Merging Away PROCESS_V1...")
        matches_df = pd.merge(
            matches_df, 
            process_df.add_prefix('away_p_'), 
            left_on=['fixture_id', 'away_team_id'], 
            right_on=['away_p_fixture_id', 'away_p_team_id'], 
            how='inner'
        )
        
        cols_to_drop_p = ['home_p_fixture_id', 'home_p_team_id', 'away_p_fixture_id', 'away_p_team_id']
        matches_df = matches_df.drop(columns=[col for col in cols_to_drop_p if col in matches_df.columns])
        
        # Differentials for process
        matches_df['diff_possession_l5'] = matches_df['home_p_possession_avg_5'] - matches_df['away_p_possession_avg_5']
        matches_df['diff_control_l5'] = matches_df['home_p_control_index_5'] - matches_df['away_p_control_index_5']
    
    conn.close()
    
    print(f"Final dataset shape: {matches_df.shape}")
    return matches_df


def fetch_ht_dataset_v2():
    """
    Fetches the HT dataset from the enriched feature store v2.
    """
    conn = get_db_connection()
    try:
        query = """
            SELECT
                f.fixture_id,
                f.league_id,
                f.date AS match_date,
                f.score_halftime_home,
                f.score_halftime_away,
                fs.feature_vector
            FROM V3_Fixtures f
            JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.score_halftime_home IS NOT NULL
              AND f.score_halftime_away IS NOT NULL
            ORDER BY f.date ASC
        """
        df = pd.read_sql_query(query, conn)
        df['match_date'] = pd.to_datetime(df['match_date'], utc=True)
        raw_features = df['feature_vector'].apply(json.loads).tolist()
        feature_frame = pd.DataFrame(
            [normalize_feature_vector(vector) for vector in raw_features],
            columns=GLOBAL_1X2_FEATURE_COLUMNS
        )
        df = pd.concat([df.drop(columns=['feature_vector']), feature_frame], axis=1)
        df['target_ht_home_goals'] = df['score_halftime_home'].astype(int)
        df['target_ht_away_goals'] = df['score_halftime_away'].astype(int)
        return df
    finally:
        conn.close()

if __name__ == "__main__":
    df_v0 = fetch_ht_dataset(include_process_features=False)
    print(f"✅ V0 Dataset ready (BASELINE only): {df_v0.shape[0]} matches")
    
    df_v1 = fetch_ht_dataset(include_process_features=True)
    print(f"✅ V1 Dataset ready (BASELINE + PROCESS): {df_v1.shape[0]} matches")
