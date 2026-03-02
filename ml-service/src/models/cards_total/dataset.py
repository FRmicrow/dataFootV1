import sqlite3
import pandas as pd
import json
import os

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'backend', 'data', 'database.sqlite'))

def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database not found at {DB_PATH}")
    return sqlite3.connect(DB_PATH)

def fetch_cards_dataset():
    """
    Fetches the dataset for CARDS_TOTAL modeling.
    We join both BASELINE_V1 and PROCESS_V1 and calculate total cards (yellow + red).
    """
    conn = get_db_connection()
    
    # Base query for matches and targets.
    # Note: If a red card is worth more than 1, we could multiply it here. 
    # For predicting absolute raw number of cards, we just sum them.
    query = """
        SELECT 
            f.fixture_id,
            f.league_id,
            f.season_year,
            f.date as match_date,
            f.home_team_id,
            f.away_team_id,
            IFNULL(fs_home.yellow_cards, 0) + IFNULL(fs_home.red_cards, 0) as home_cards,
            IFNULL(fs_away.yellow_cards, 0) + IFNULL(fs_away.red_cards, 0) as away_cards
        FROM V3_Fixtures f
        JOIN V3_Fixture_Stats fs_home ON f.fixture_id = fs_home.fixture_id AND f.home_team_id = fs_home.team_id AND fs_home.half = 'FT'
        JOIN V3_Fixture_Stats fs_away ON f.fixture_id = fs_away.fixture_id AND f.away_team_id = fs_away.team_id AND fs_away.half = 'FT'
        WHERE f.status_short = 'FT'
          AND fs_home.yellow_cards IS NOT NULL
          AND fs_away.yellow_cards IS NOT NULL
        ORDER BY f.date ASC
    """
    
    print("Fetching matches and card targets...")
    matches_df = pd.read_sql_query(query, conn)
    matches_df['match_date'] = pd.to_datetime(matches_df['match_date'], utc=True)
    
    matches_df['target_home_cards'] = matches_df['home_cards'].astype(int)
    matches_df['target_away_cards'] = matches_df['away_cards'].astype(int)
    
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

    # Differentials for PROCESS (Possession and fouls might influence cards)
    matches_df['diff_possession_l5'] = matches_df['home_p_possession_avg_5'] - matches_df['away_p_possession_avg_5']
    matches_df['diff_control_l5'] = matches_df['home_p_control_index_5'] - matches_df['away_p_control_index_5']
    matches_df['diff_fouls_l5'] = matches_df['home_p_fouls_per_match_5'] - matches_df['away_p_fouls_per_match_5']
    matches_df['diff_yellow_l5'] = matches_df['home_p_yellow_per_match_5'] - matches_df['away_p_yellow_per_match_5']
    matches_df['diff_red_l5'] = matches_df['home_p_red_per_match_5'] - matches_df['away_p_red_per_match_5']
    
    conn.close()
    
    print(f"Final dataset shape: {matches_df.shape}")
    return matches_df

if __name__ == "__main__":
    df = fetch_cards_dataset()
    print(f"✅ Cards Dataset ready: {df.shape[0]} matches")
