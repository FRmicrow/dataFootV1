import os
import sys
import sqlite3
import time

# Ensure we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.orchestrator.predictor import generate_master_prediction

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'data', 'database.sqlite'))

def run_backfill():
    conn = sqlite3.connect(DB_PATH)
    
    # Find all completed fixtures that have PROCESS_V1 features for both teams
    print("Querying for eligible historical fixtures...")
    query = """
        SELECT DISTINCT f.fixture_id
        FROM V3_Fixtures f
        JOIN V3_Team_Features_PreMatch p_home ON f.fixture_id = p_home.fixture_id AND f.home_team_id = p_home.team_id AND p_home.feature_set_id = 'PROCESS_V1' AND p_home.horizon_type = 'FULL_HISTORICAL'
        JOIN V3_Team_Features_PreMatch p_away ON f.fixture_id = p_away.fixture_id AND f.away_team_id = p_away.team_id AND p_away.feature_set_id = 'PROCESS_V1' AND p_away.horizon_type = 'FULL_HISTORICAL'
        WHERE f.status_short = 'FT'
        AND f.score_fulltime_home IS NOT NULL
        ORDER BY f.date ASC
    """
    
    fixtures = [row[0] for row in conn.execute(query).fetchall()]
    conn.close()
    
    total = len(fixtures)
    print(f"Found {total} eligible matches. Starting backfill...")
    
    start_time = time.time()
    success_count = 0
    fail_count = 0
    
    for i, fixture_id in enumerate(fixtures):
        try:
            res = generate_master_prediction(fixture_id)
            if res["success"]:
                success_count += 1
            else:
                fail_count += 1
                
        except Exception as e:
            fail_count += 1
            
        if (i + 1) % 500 == 0 or (i + 1) == total:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed
            print(f"Progress: {i + 1}/{total} ({(i + 1)/total*100:.1f}%) | Success: {success_count} | Fails: {fail_count} | Rate: {rate:.1f} req/s")
            
    total_time = time.time() - start_time
    print(f"\n✅ Backfill complete in {total_time:.1f}s.")
    print(f"Successfully processed {success_count} matches.")
    print(f"Failed to process {fail_count} matches.")

if __name__ == "__main__":
    run_backfill()
