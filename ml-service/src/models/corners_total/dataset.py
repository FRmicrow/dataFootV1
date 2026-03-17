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

def fetch_corners_dataset():
    """
    Fetches the dataset for CORNERS_TOTAL modeling.
    Since corner stats are relatively recent (12k matches), we join both BASELINE_V1 and PROCESS_V1.
    """
    conn = get_db_connection()
    
    # Base query for matches and targets.
    # We join V3_Fixtures with V3_Fixture_Stats to get corners.
    query = """
        SELECT 
            f.fixture_id,
            f.league_id,
            f.season_year,
            f.date as match_date,
            f.home_team_id,
            f.away_team_id,
            fs_home.corner_kicks as home_corners,
            fs_away.corner_kicks as away_corners
        FROM V3_Fixtures f
        JOIN V3_Fixture_Stats fs_home ON f.fixture_id = fs_home.fixture_id AND f.home_team_id = fs_home.team_id AND fs_home.half = 'FT'
        JOIN V3_Fixture_Stats fs_away ON f.fixture_id = fs_away.fixture_id AND f.away_team_id = fs_away.team_id AND fs_away.half = 'FT'
        WHERE f.status_short = 'FT'
          AND fs_home.corner_kicks IS NOT NULL
          AND fs_away.corner_kicks IS NOT NULL
        ORDER BY f.date ASC
    """
    
    print("Fetching matches and corner targets...")
    matches_df = pd.read_sql_query(query, conn)
    matches_df['match_date'] = pd.to_datetime(matches_df['match_date'], utc=True)
    
    matches_df['target_home_corners'] = matches_df['home_corners'].astype(int)
    matches_df['target_away_corners'] = matches_df['away_corners'].astype(int)
    
    # Load BASELINE_V1
    print("Loading BASELINE_V1...")
    baseline_query = """
        SELECT fixture_id, team_id, features_json
        FROM V3_Team_Features_PreMatch
        WHERE feature_set_id = 'BASELINE_V1' AND horizon_type = 'FULL_HISTORICAL'
    """
    baseline_df = pd.read_sql_query(baseline_query, conn)
    
    print("Parsing BASELINE_V1 JSON...")
    baseline_parsed = pd.json_normalize(baseline_df['features_json'].apply(json.loads))
    for col in baseline_parsed.columns:
        baseline_df[col] = baseline_parsed[col]
    baseline_df = baseline_df.drop(columns=['features_json'])
    
    print("Merging Home BASELINE_V1...")
    matches_df = pd.merge(
        matches_df, 
        baseline_df.add_prefix('home_b_'), 
        left_on=['fixture_id', 'home_team_id'], 
        right_on=['home_b_fixture_id', 'home_b_team_id'], 
        how='left'
    )
    
    print("Merging Away BASELINE_V1...")
    matches_df = pd.merge(
        matches_df, 
        baseline_df.add_prefix('away_b_'), 
        left_on=['fixture_id', 'away_team_id'], 
        right_on=['away_b_fixture_id', 'away_b_team_id'], 
        how='left'
    )
    
    cols_to_drop = ['home_b_fixture_id', 'home_b_team_id', 'away_b_fixture_id', 'away_b_team_id']
    matches_df = matches_df.drop(columns=[col for col in cols_to_drop if col in matches_df.columns])
    
    # Calculate BASELINE Differentials
    matches_df['diff_elo'] = matches_df['home_b_elo'] - matches_df['away_b_elo']
    matches_df['diff_points'] = matches_df['home_b_points'] - matches_df['away_b_points']
    matches_df['diff_rank'] = matches_df['away_b_rank'] - matches_df['home_b_rank'] # Lower rank is better
    matches_df['diff_lineup_strength'] = matches_df['home_b_lineup_strength_v1'] - matches_df['away_b_lineup_strength_v1']
    
    # Load PROCESS_V1 features
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
        how='inner' 
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
    
    # Clean NaN drops
    initial_len = len(matches_df)
    matches_df = matches_df.dropna(subset=['home_b_elo', 'away_b_elo', 'home_p_possession_avg_5', 'away_p_possession_avg_5'])
    print(f"Dropped {initial_len - len(matches_df)} matches due to missing features.")

    # Differentials for PROCESS (corners, shots, possession are critical here!)
    matches_df['diff_possession_l5'] = matches_df['home_p_possession_avg_5'] - matches_df['away_p_possession_avg_5']
    matches_df['diff_control_l5'] = matches_df['home_p_control_index_5'] - matches_df['away_p_control_index_5']
    matches_df['diff_shots_l5'] = matches_df['home_p_shots_per_match_5'] - matches_df['away_p_shots_per_match_5']
    matches_df['diff_sot_l5'] = matches_df['home_p_sot_per_match_5'] - matches_df['away_p_sot_per_match_5']
    matches_df['diff_corners_l5'] = matches_df['home_p_corners_per_match_5'] - matches_df['away_p_corners_per_match_5']
    
    conn.close()
    
    print(f"Final dataset shape: {matches_df.shape}")
    return matches_df


def fetch_corners_dataset_v2():
    """
    Fetches the corners dataset from the enriched feature store v2.
    """
    conn = get_db_connection()
    try:
        query = """
            SELECT
                f.fixture_id,
                f.league_id,
                f.date AS match_date,
                fs_home.corner_kicks AS home_corners,
                fs_away.corner_kicks AS away_corners,
                feature_store.feature_vector
            FROM V3_Fixtures f
            JOIN V3_Fixture_Stats fs_home
              ON f.fixture_id = fs_home.fixture_id
             AND f.home_team_id = fs_home.team_id
             AND fs_home.half = 'FT'
            JOIN V3_Fixture_Stats fs_away
              ON f.fixture_id = fs_away.fixture_id
             AND f.away_team_id = fs_away.team_id
             AND fs_away.half = 'FT'
            JOIN V3_ML_Feature_Store feature_store
              ON f.fixture_id = feature_store.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND fs_home.corner_kicks IS NOT NULL
              AND fs_away.corner_kicks IS NOT NULL
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
        df['target_home_corners'] = pd.to_numeric(df['home_corners'], errors='coerce').astype(int)
        df['target_away_corners'] = pd.to_numeric(df['away_corners'], errors='coerce').astype(int)
        return df
    finally:
        conn.close()

if __name__ == "__main__":
    df = fetch_corners_dataset()
    print(f"✅ Corners Dataset ready: {df.shape[0]} matches")
