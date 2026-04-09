from db_config import get_connection
import pandas as pd
import json
import os


def get_db_connection():
    return get_connection()

def fetch_ft_dataset():
    """
    Fetches the dataset for FT_RESULT modeling.
    Uses BASELINE_V1 to maximize historical volume (~380k matches).
    """
    conn = get_db_connection()
    
    # 1. Fetch Matches and Target (FT Scores)
    print("Fetching matches and targets...")
    query = """
        SELECT 
            fixture_id,
            league_id,
            season_year,
            date as match_date,
            home_team_id,
            away_team_id,
            score_fulltime_home as target_ft_home_goals,
            score_fulltime_away as target_ft_away_goals
        FROM V3_Fixtures
        WHERE status_short = 'FT'
          AND score_fulltime_home IS NOT NULL
          AND score_fulltime_away IS NOT NULL
        ORDER BY date ASC
    """
    matches_df = pd.read_sql_query(query, conn)
    matches_df['match_date'] = pd.to_datetime(matches_df['match_date'], utc=True)
    matches_df['target_ft_home_goals'] = matches_df['target_ft_home_goals'].astype(int)
    matches_df['target_ft_away_goals'] = matches_df['target_ft_away_goals'].astype(int)
    
    # 2. Extract BASELINE_V1 capabilities
    print("Loading BASELINE_V1 for Home teams...")
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
    
    # 3. Merge Home Features
    print("Merging Home BASELINE_V1...")
    matches_df = pd.merge(
        matches_df, 
        baseline_df.add_prefix('home_b_'), 
        left_on=['fixture_id', 'home_team_id'], 
        right_on=['home_b_fixture_id', 'home_b_team_id'], 
        how='left'
    )
    
    # 4. Merge Away Features
    print("Merging Away BASELINE_V1...")
    matches_df = pd.merge(
        matches_df, 
        baseline_df.add_prefix('away_b_'), 
        left_on=['fixture_id', 'away_team_id'], 
        right_on=['away_b_fixture_id', 'away_b_team_id'], 
        how='left'
    )
    
    conn.close()
    
    # Clean up redundant columns
    cols_to_drop = ['home_b_fixture_id', 'home_b_team_id', 'away_b_fixture_id', 'away_b_team_id']
    matches_df = matches_df.drop(columns=[col for col in cols_to_drop if col in matches_df.columns])
    
    # Drop rows without matching baseline info
    initial_len = len(matches_df)
    matches_df = matches_df.dropna(subset=['home_b_elo', 'away_b_elo'])
    print(f"Dropped {initial_len - len(matches_df)} matches due to missing BASELINE_V1 data.")
    
    # 5. Calculate Differentials
    matches_df['diff_elo'] = matches_df['home_b_elo'] - matches_df['away_b_elo']
    matches_df['diff_points'] = matches_df['home_b_points'] - matches_df['away_b_points']
    matches_df['diff_rank'] = matches_df['away_b_rank'] - matches_df['home_b_rank'] # Lower rank is better
    matches_df['diff_lineup_strength'] = matches_df['home_b_lineup_strength_v1'] - matches_df['away_b_lineup_strength_v1']
    
    print(f"Final dataset shape: {matches_df.shape}")
    return matches_df

if __name__ == "__main__":
    df = fetch_ft_dataset()
    print(f"✅ V0 FT Dataset ready (BASELINE only): {df.shape[0]} matches")
