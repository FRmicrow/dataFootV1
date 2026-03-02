import sqlite3
import os
import time

# Resolve the database path relative to the script location
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'data', 'database.sqlite'))

def parse_pct(text):
    """Parses a percentage string like '55%' into an integer."""
    if not text or text.strip() == '':
        return None
    try:
        return int(text.replace('%', '').strip())
    except ValueError:
        return None

def backfill_possession_pct():
    print("🚀 Starting Possession Data Cleaning Backfill...")
    start_time = time.time()
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Pass 1: Direct Parsing
    print("   📊 Pass 1: Parsing existing ball_possession text to integers...")
    cursor.execute("""
        SELECT fixture_stats_id, ball_possession
        FROM V3_Fixture_Stats
        WHERE ball_possession IS NOT NULL 
          AND ball_possession != 'N/A'
          AND ball_possession_pct IS NULL
    """)
    rows = cursor.fetchall()
    
    updates = []
    failed_parses = 0
    
    for stat_id, text_val in rows:
        pct = parse_pct(text_val)
        if pct is not None and 0 <= pct <= 100:
            updates.append((pct, stat_id))
        else:
            failed_parses += 1

    if updates:
        cursor.executemany("""
            UPDATE V3_Fixture_Stats
            SET ball_possession_pct = ?
            WHERE fixture_stats_id = ?
        """, updates)
        conn.commit()
    
    print(f"      ✅ Parsed and updated {len(updates)} rows.")
    if failed_parses > 0:
        print(f"      ⚠️ Failed to parse {failed_parses} rows.")

    # Pass 2: Infer Missing (100 - Opponent)
    print("   🔍 Pass 2: Inferring missing possession from opponents...")
    # Find records where team A has a valid pct, but team B (same fixture, same half) is NULL
    cursor.execute("""
        SELECT t1.fixture_stats_id, t2.ball_possession_pct
        FROM V3_Fixture_Stats t1
        JOIN V3_Fixture_Stats t2 
          ON t1.fixture_id = t2.fixture_id 
         AND t1.half = t2.half 
         AND t1.team_id != t2.team_id
        WHERE t1.ball_possession_pct IS NULL
          AND t2.ball_possession_pct IS NOT NULL
    """)
    inferences = cursor.fetchall()
    
    inf_updates = []
    for stat_id, opp_pct in inferences:
        inferred = 100 - opp_pct
        if 0 <= inferred <= 100:
            inf_updates.append((inferred, stat_id))

    if inf_updates:
        cursor.executemany("""
            UPDATE V3_Fixture_Stats
            SET ball_possession_pct = ?
            WHERE fixture_stats_id = ?
        """, inf_updates)
        conn.commit()
        
    print(f"      ✅ Inferred and updated {len(inf_updates)} missing rows.")

    # Validation check
    cursor.execute("SELECT COUNT(*) FROM V3_Fixture_Stats WHERE ball_possession_pct < 0 OR ball_possession_pct > 100")
    invalid_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM V3_Fixture_Stats WHERE ball_possession IS NOT NULL AND ball_possession != 'N/A' AND ball_possession_pct IS NULL")
    remaining_nulls = cursor.fetchone()[0]

    conn.close()
    
    elapsed = time.time() - start_time
    print(f"🎉 Backfill complete in {round(elapsed, 2)} seconds!")
    
    if invalid_count > 0:
        print(f"   ❌ CRITICAL WARNING: Found {invalid_count} rows with out-of-bounds possession values.")
    else:
        print("   ✅ Validation pass: All possession values are between 0 and 100.")
        
    print(f"   ℹ️ Remaining unparseable/null possession rows where source was populated: {remaining_nulls}")

if __name__ == "__main__":
    backfill_possession_pct()
