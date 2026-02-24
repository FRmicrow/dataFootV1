import sqlite3
import pandas as pd
import json
import os
import sys
import time
import concurrent.futures
from time_travel import TemporalFeatureFactory

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite'))

# Global worker state for multiprocessing
_worker_conn = None
_worker_factory = None

def _init_worker(db_path):
    global _worker_conn, _worker_factory
    _worker_conn = sqlite3.connect(db_path)
    _worker_factory = TemporalFeatureFactory(db_path)

def _process_fixture(payload):
    fid, lid = payload
    try:
        vector = _worker_factory.get_vector(fid, conn=_worker_conn)
        return True, fid, lid, json.dumps(vector)
    except Exception as e:
        return False, fid, lid, str(e)

import argparse

def run_forge_backfill(league_id=None, limit=50000):
    """
    Step 1.4: Forge-Certified Feature Backfill.
    """
    print(f"🚀 Starting Forge Feature Backfill (League: {league_id if league_id else 'All'}, Limit: {limit})...")
    conn = sqlite3.connect(DB_PATH)
    factory = TemporalFeatureFactory(DB_PATH)
    
    # Fetch fixtures that need features
    query = """
        SELECT f.fixture_id, f.league_id, f.date, l.name as league_name
        FROM V3_Fixtures f
        JOIN V3_Leagues l ON f.league_id = l.league_id
        LEFT JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
        WHERE f.status_short IN ('FT', 'AET', 'PEN')
    """
    params = []

    if league_id:
        query += " AND f.league_id = ?"
        params.append(league_id)
    else:
        query += " AND fs.fixture_id IS NULL"

    query += " ORDER BY f.date ASC LIMIT ?"
    params.append(limit)

    fixtures = pd.read_sql_query(query, conn, params=params)
    
    if fixtures.empty:
        print("✅ No fixtures requiring backfill for this criteria.")
        return

    print(f"📦 Processing {len(fixtures)} fixtures...")
    
    batch = []
    start_time = time.time()
    
    payloads = [(int(row['fixture_id']), int(row['league_id'])) for _, row in fixtures.iterrows()]
    total_fixtures = len(payloads)
    
    processed = 0
    with concurrent.futures.ProcessPoolExecutor(max_workers=6, initializer=_init_worker, initargs=(DB_PATH,)) as executor:
        for is_success, fid, lid, result_data in executor.map(_process_fixture, payloads, chunksize=50):
            processed += 1
            
            if is_success:
                batch.append((fid, lid, result_data))
            else:
                print(f"   ❌ Error on fixture {fid}: {result_data}")
                sys.stdout.flush()
                
            # Progress update every 50 for smoother SSE logs
            if processed % 50 == 0:
                print(f"   ⏱️ Generated {processed}/{total_fixtures} feature vectors...")
                sys.stdout.flush()

            if len(batch) >= 200:
                conn.executemany("REPLACE INTO V3_ML_Feature_Store (fixture_id, league_id, feature_vector) VALUES (?, ?, ?)", batch)
                conn.commit()
                elapsed = time.time() - start_time
                print(f"   ✅ Saved {processed} features... ({int(processed/elapsed)} feat/sec)")
                sys.stdout.flush()
                batch = []

    if batch:
        conn.executemany("REPLACE INTO V3_ML_Feature_Store (fixture_id, league_id, feature_vector) VALUES (?, ?, ?)", batch)
        conn.commit()

    conn.close()
    elapsed_total = time.time() - start_time
    print(f"✅ Forge Backfill iteration complete. Total runtime: {round(elapsed_total, 2)}s ({int(total_fixtures/max(0.1, elapsed_total))} feat/sec)")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--league", type=int, help="League ID to backfill")
    parser.add_argument("--limit", type=int, default=50000, help="Max fixtures to process")
    args = parser.parse_args()

    run_forge_backfill(league_id=args.league, limit=args.limit)
