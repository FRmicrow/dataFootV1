import os
import sys
import psycopg2
from db_config import get_connection
import time

# Ensure we can import src
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from src.risk.engine import extract_and_save_fair_odds


def run_risk_backfill():
    conn = get_connection()
    
    print("Querying for fixtures with calculated ML probabilities...")
    query = "SELECT DISTINCT fixture_id FROM V3_Submodel_Outputs ORDER BY fixture_id ASC"
    fixtures = [row[0] for row in conn.execute(query).fetchall()]
    conn.close()
    
    total = len(fixtures)
    print(f"Found {total} fixtures to process for Risk Analysis. Starting backfill...")
    
    start_time = time.time()
    
    for i, fixture_id in enumerate(fixtures):
        extract_and_save_fair_odds(fixture_id)
            
        if (i + 1) % 1000 == 0 or (i + 1) == total:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed
            print(f"Progress: {i + 1}/{total} ({(i + 1)/total*100:.1f}%) | Rate: {rate:.1f} req/s")
            
    total_time = time.time() - start_time
    print(f"\n✅ Risk Analysis backfill complete in {total_time:.1f}s.")

if __name__ == "__main__":
    run_risk_backfill()
