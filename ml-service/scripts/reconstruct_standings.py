import sqlite3
import pandas as pd
import numpy as np
import os
import time
from datetime import datetime

# Database path
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'data', 'database.sqlite'))

def get_db_connection():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return None
    return sqlite3.connect(DB_PATH, timeout=60)

def reconstruct_all_standings(update_db=False):
    """
    Replays all historical match results to reconstruct standings snapshots
    match-by-match for all leagues and seasons.
    """
    print("🚀 Starting Standings Reconstruction Utility...")
    start_time = time.time()
    
    conn = get_db_connection()
    if not conn: return

    # 1. Load Fixtures (Results)
    print("   📋 Loading finished fixtures...")
    results_df = pd.read_sql_query("""
        SELECT league_id, season_year, date, home_team_id, away_team_id, 
               score_fulltime_home, score_fulltime_away
        FROM V3_Fixtures
        WHERE status_short = 'FT' AND score_fulltime_home IS NOT NULL
        ORDER BY date ASC
    """, conn)
    results_df['date'] = pd.to_datetime(results_df['date'], utc=True)
    
    history_records = []
    
    # 2. Reconstruct Standings
    print(f"   📊 Processing {len(results_df)} match results...")
    
    # Group by league and season to simulate the competition
    league_seasons = results_df.groupby(['league_id', 'season_year'])
    total_groups = len(league_seasons)
    current_group = 0

    for (lid, season), group in league_seasons:
        current_group += 1
        if current_group % 100 == 0:
            print(f"      Processing league/season group {current_group}/{total_groups}...")
            
        running = {} # team_id -> {points, gf, ga, played}
        
        for _, row in group.iterrows():
            h_tid, a_tid = row['home_team_id'], row['away_team_id']
            h_g = 0 if pd.isna(row['score_fulltime_home']) else int(row['score_fulltime_home'])
            a_g = 0 if pd.isna(row['score_fulltime_away']) else int(row['score_fulltime_away'])
            
            # Ensure teams exist in running dict
            for tid in [h_tid, a_tid]:
                if tid not in running:
                    running[tid] = {'points': 0, 'gf': 0, 'ga': 0, 'played': 0}
            
            # Capture state AFTER this match
            as_of = row['date'] + pd.Timedelta(minutes=1)
            
            # Update running stats
            if h_g > a_g: running[h_tid]['points'] += 3
            elif h_g < a_g: running[a_tid]['points'] += 3
            else:
                running[h_tid]['points'] += 1
                running[a_tid]['points'] += 1
            
            running[h_tid]['gf'] += h_g
            running[h_tid]['ga'] += a_g
            running[h_tid]['played'] += 1
            
            running[a_tid]['gf'] += a_g
            running[a_tid]['ga'] += h_g
            running[a_tid]['played'] += 1
            
            # Calculate ranks at this point in time
            # Tie-breakers: Points > Goal Difference > Goals For
            sorted_teams = sorted(running.keys(), key=lambda t: (
                running[t]['points'], 
                (running[t]['gf'] - running[t]['ga']), 
                running[t]['gf']
            ), reverse=True)
            ranks = {tid: r+1 for r, tid in enumerate(sorted_teams)}
            
            for tid in [h_tid, a_tid]:
                history_records.append((
                    int(tid),
                    int(lid),
                    int(season),
                    ranks[tid],
                    int(running[tid]['points']),
                    int(running[tid]['played']),
                    int(running[tid]['gf'] - running[tid]['ga']),
                    as_of.isoformat()
                ))
                
    print(f"   ✅ Reconstruction complete. Generated {len(history_records)} snapshots.")

    # 3. Optional: Update V3_ML_Standings
    if update_db and history_records:
        print("   💾 Updating V3_ML_Standings table (this may take a while)...")
        
        sql = """
            INSERT INTO V3_ML_Standings (
                team_id, league_id, season_year, rank, points, played, goals_diff, update_date, unique_key
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(unique_key) DO UPDATE SET
                rank = excluded.rank,
                points = excluded.points,
                played = excluded.played,
                goals_diff = excluded.goals_diff
        """
        
        # Prepare data with unique_key
        final_history = []
        for r in history_records:
            # tid, lid, season, rank, pts, played, gd, date
            ukey = f"{r[1]}-{r[2]}-{r[0]}-{r[7]}"
            final_history.append(r + (ukey,))

        CHUNK_SIZE = 50000
        for i in range(0, len(final_history), CHUNK_SIZE):
            chunk = final_history[i:i+CHUNK_SIZE]
            conn.executemany(sql, chunk)
            conn.commit()
            print(f"      Inserted {min(i+CHUNK_SIZE, len(final_history))}/{len(final_history)} records...")

    conn.close()
    elapsed = time.time() - start_time
    print(f"🏁 DONE. Processed in {round(elapsed, 2)} seconds.")
    return pd.DataFrame(history_records, columns=['team_id', 'league_id', 'season_year', 'rank', 'points', 'played', 'goals_diff', 'update_date'])

if __name__ == "__main__":
    # By default, we just run it without updating the main DB table to be safe
    # Run with reconstruct_all_standings(update_db=True) to actually fill V3_ML_Standings
    reconstruct_all_standings(update_db=True)
