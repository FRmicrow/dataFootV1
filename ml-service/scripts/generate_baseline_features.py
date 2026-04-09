import psycopg2
from db_config import get_connection
import pandas as pd
import numpy as np
import json
import os
import time
from datetime import datetime

# Database path

def get_db_connection():
    return get_connection()

def run_baseline_features_optimized():
    print("🚀 Starting Optimized BASELINE_V1 Feature Generation...")
    start_time = time.time()
    
    conn = get_db_connection()
    if not conn: return

    # 1. Load Fixtures
    print("   📋 Loading Fixtures...")
    fixtures_df = pd.read_sql_query("""
        SELECT fixture_id, date, league_id, season_year, home_team_id, away_team_id 
        FROM V3_Fixtures 
        ORDER BY date ASC
    """, conn)
    fixtures_df['date'] = pd.to_datetime(fixtures_df['date'])

    # 2. Pre-calculate Player Performance Scores (Rolling 20)
    print("   📊 Pre-calculating Player Performance Scores (Rolling 20)...")
    # Join stats with fixtures to get dates for proper ordering
    player_stats_raw = pd.read_sql_query("""
        SELECT fps.player_id, fps.fixture_id, f.date,
               (2.0 * COALESCE(fps.goals_total, 0)) + 
               (1.5 * COALESCE(fps.goals_assists, 0)) + 
               (0.05 * COALESCE(fps.passes_key, 0)) + 
               (0.03 * COALESCE(fps.duels_won, 0)) + 
               (0.04 * COALESCE(fps.shots_on, 0)) + 
               (0.02 * COALESCE(fps.tackles_total, 0)) - 
               (0.5 * COALESCE(fps.cards_yellow, 0)) - 
               (2.0 * COALESCE(fps.cards_red, 0)) as perf_score
        FROM V3_Fixture_Player_Stats fps
        JOIN V3_Fixtures f ON fps.fixture_id = f.fixture_id
        ORDER BY fps.player_id, f.date ASC
    """, conn)
    
    # Calculate rolling average using pandas (faster than complex SQL for this volume)
    player_stats_raw['rolling_perf_avg'] = player_stats_raw.groupby('player_id')['perf_score'].transform(
        lambda x: x.shift().rolling(20, min_periods=1).mean()
    )
    
    # Keep only the result we need for merging
    player_perf_lookup = player_stats_raw[['player_id', 'fixture_id', 'rolling_perf_avg']]

    # 3. Pre-calculate Seasonal Player Scores (Fallback)
    print("   📑 Pre-calculating Seasonal Player Scores...")
    seasonal_stats = pd.read_sql_query("""
        SELECT player_id, season_year,
               ((2.0 * COALESCE(goals_total, 0)) + 
                (1.5 * COALESCE(goals_assists, 0)) + 
                (0.05 * COALESCE(passes_key, 0)) + 
                (0.03 * COALESCE(duels_won, 0)) + 
                (0.04 * COALESCE(shots_on, 0)) + 
                (0.02 * COALESCE(tackles_total, 0)) - 
                (0.5 * COALESCE(cards_yellow, 0)) - 
                (2.0 * COALESCE(cards_red, 0))) / GREATEST(1, COALESCE(games_appearences, 1)) as seasonal_avg_score
        FROM V3_Player_Stats
    """, conn)
    
    # 4. Load Starters and Merge with Scores
    print("   🏃 Loading Starters and Merging Scores...")
    starters_df = pd.read_sql_query("""
        SELECT fixture_id, team_id, player_id
        FROM V3_Fixture_Lineup_Players
        WHERE is_starting = 1
    """, conn)
    
    # Merge with per-match rolling average
    starters_with_scores = starters_df.merge(player_perf_lookup, on=['fixture_id', 'player_id'], how='left')
    
    # Merge with fixtures to get season for fallback
    starters_with_scores = starters_with_scores.merge(fixtures_df[['fixture_id', 'season_year']], on='fixture_id', how='left')
    
    # Merge with seasonal stats (from previous season)
    seasonal_stats['prev_season'] = seasonal_stats['season_year'] + 1
    starters_with_scores = starters_with_scores.merge(
        seasonal_stats[['player_id', 'prev_season', 'seasonal_avg_score']], 
        left_on=['player_id', 'season_year'], 
        right_on=['player_id', 'prev_season'], 
        how='left'
    )
    
    # Choose rolling avg first, then seasonal fallback
    starters_with_scores['final_player_score'] = starters_with_scores['rolling_perf_avg'].fillna(starters_with_scores['seasonal_avg_score'])
    
    # Calculate Lineup Strength per team/fixture
    lineup_strength = starters_with_scores.groupby(['fixture_id', 'team_id']).agg(
        lineup_strength_v1=('final_player_score', 'mean'),
        starters_count=('player_id', 'count'),
        missing_stats_count=('final_player_score', lambda x: x.isna().sum())
    ).reset_index()
    lineup_strength['lineup_strength_v1'] = lineup_strength['lineup_strength_v1'].fillna(0)

    # 4b. Load Reconstructed Standings from V3_ML_Standings
    print("   📊 Loading Reconstructed Standings from V3_ML_Standings...")
    standings_df = pd.read_sql_query("""
        SELECT team_id, league_id, season_year, rank, points, goals_diff, played, update_date
        FROM V3_ML_Standings
        ORDER BY update_date ASC
    """, conn)
    standings_df['update_date'] = pd.to_datetime(standings_df['update_date'], utc=True)

    # 5. Load Elo
    print("   📊 Loading Elo data...")
    elo_df = pd.read_sql_query("SELECT team_id, league_id, date, elo_score FROM V3_Team_Ratings ORDER BY date ASC", conn)

    # 6. Final Integration
    print("   🏗️ Assembling Final Features Table...")
    
    # Create Home and Away entries
    home_fixtures = fixtures_df.copy()
    home_fixtures['team_id'] = home_fixtures['home_team_id']
    home_fixtures['is_home'] = 1
    
    away_fixtures = fixtures_df.copy()
    away_fixtures['team_id'] = away_fixtures['away_team_id']
    away_fixtures['is_home'] = 0
    
    all_team_fixtures = pd.concat([home_fixtures, away_fixtures]).sort_values(['team_id', 'league_id', 'date']).reset_index(drop=True)
    all_team_fixtures['date'] = pd.to_datetime(all_team_fixtures['date'], utc=True)
    all_team_fixtures = all_team_fixtures.dropna(subset=['team_id', 'league_id', 'date'])
    
    # For Elo, we need the "as of" merge
    elo_df['date'] = pd.to_datetime(elo_df['date'], utc=True)
    elo_df = elo_df.dropna(subset=['team_id', 'league_id', 'date']).sort_values(['team_id', 'league_id', 'date']).reset_index(drop=True)
    
    # Check monotonicity
    def check_monotonic(df, group_cols, time_col):
        groups = df.groupby(group_cols)
        for name, group in groups:
            if not group[time_col].is_monotonic_increasing:
                print(f"      ⚠️ Non-monotonic group found: {name}")
                return False
        return True

    print(f"   🔎 Checking all_team_fixtures monotonicity...")
    check_monotonic(all_team_fixtures, ['team_id', 'league_id'], 'date')

    # Standardize types
    for df in [all_team_fixtures, elo_df, standings_df]:
        for col in ['team_id', 'league_id']:
            if col in df.columns:
                df[col] = df[col].astype('int64')
    all_team_fixtures['season_year'] = all_team_fixtures['season_year'].astype('int64')
    standings_df['season_year'] = standings_df['season_year'].astype('int64')

    # Use a loop-based merge if standard merge_asof fails
    try:
        all_team_fixtures = pd.merge_asof(
            all_team_fixtures, 
            elo_df, 
            by=['team_id', 'league_id'], 
            on='date', 
            direction='backward'
        )
    except Exception as e:
        print(f"   ⚠️ merge_asof (Elo) failed: {e}. Falling back to group-wise merge.")
        results = []
        for (tid, lid), group in all_team_fixtures.groupby(['team_id', 'league_id']):
            target_elo = elo_df[(elo_df['team_id'] == tid) & (elo_df['league_id'] == lid)].drop(columns=['team_id', 'league_id'])
            if target_elo.empty:
                group['elo_score'] = 1500.0
                results.append(group)
            else:
                merged = pd.merge_asof(group, target_elo, on='date', direction='backward')
                results.append(merged)
        all_team_fixtures = pd.concat(results).sort_values(['team_id', 'league_id', 'date'])

    all_team_fixtures['elo_score'] = all_team_fixtures['elo_score'].fillna(1500.0)
    
    # For Standings, we need the "as of" merge
    standings_df['update_date'] = pd.to_datetime(standings_df['update_date'], utc=True)
    standings_df = standings_df.dropna(subset=['team_id', 'league_id', 'season_year', 'update_date']).sort_values(['team_id', 'league_id', 'season_year', 'update_date']).reset_index(drop=True)
    
    try:
        all_team_fixtures = pd.merge_asof(
            all_team_fixtures, 
            standings_df, 
            by=['team_id', 'league_id', 'season_year'], 
            left_on='date',
            right_on='update_date',
            direction='backward'
        )
    except Exception as e:
        print(f"   ⚠️ merge_asof (Standings) failed: {e}. Falling back to group-wise merge.")
        results = []
        for (tid, lid, season), group in all_team_fixtures.groupby(['team_id', 'league_id', 'season_year']):
            target_st = standings_df[(standings_df['team_id'] == tid) & (standings_df['league_id'] == lid) & (standings_df['season_year'] == season)].drop(columns=['team_id', 'league_id', 'season_year'])
            if target_st.empty:
                for col in ['rank', 'points', 'goals_diff', 'played']:
                    group[col] = np.nan
                results.append(group)
            else:
                merged = pd.merge_asof(group, target_st, left_on='date', right_on='update_date', direction='backward')
                results.append(merged)
        all_team_fixtures = pd.concat(results).sort_values(['team_id', 'league_id', 'date'])
    
    # Merge with Lineup Strength
    all_team_fixtures = all_team_fixtures.merge(lineup_strength, on=['fixture_id', 'team_id'], how='left')
    
    # 7. Bulk Save
    print("   💾 Saving Optimized Features to DB...")
    
    upsert_data = []
    horizons = ['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING']
    
    for _, row in all_team_fixtures.iterrows():
        vector = {
            "elo": row['elo_score'],
            "rank": row['rank'] if not pd.isna(row['rank']) else None,
            "points": int(row['points']) if not pd.isna(row['points']) else 0,
            "goals_diff": int(row['goals_diff']) if not pd.isna(row['goals_diff']) else 0,
            "played": int(row['played']) if not pd.isna(row['played']) else 0,
            "lineup_strength_v1": round(float(row['lineup_strength_v1']), 3),
            "missing_starters_count": int(row['missing_stats_count']) if not pd.isna(row['missing_stats_count']) else 11
        }
        
        for h in horizons:
            upsert_data.append((
                int(row['fixture_id']),
                int(row['team_id']),
                int(row['league_id']),
                int(row['season_year']),
                'BASELINE_V1',
                h,
                row['date'].isoformat(),
                json.dumps(vector)
            ))

    sql = """
        INSERT INTO V3_Team_Features_PreMatch (
            fixture_id, team_id, league_id, season_year,
            feature_set_id, horizon_type, as_of, features_json
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT(fixture_id, team_id, feature_set_id, horizon_type) DO UPDATE SET
            features_json = excluded.features_json,
            as_of = excluded.as_of,
            calculated_at = CURRENT_TIMESTAMP
    """
    
    CHUNK_SIZE = 50000
    for i in range(0, len(upsert_data), CHUNK_SIZE):
        chunk = upsert_data[i:i+CHUNK_SIZE]
        cur = conn.cursor()
        cur.executemany(sql, chunk)
        cur.close()
        print(f"      Stored {min(i+CHUNK_SIZE, len(upsert_data))}/{len(upsert_data)} BASELINE_V1 feature records...")
        conn.commit()

    conn.close()
    elapsed = time.time() - start_time
    print(f"✅ Optimized BASELINE_V1 Pipeline Complete. Processed {len(all_team_fixtures)*3} records in {round(elapsed, 2)} seconds.")

if __name__ == "__main__":
    run_baseline_features_optimized()
