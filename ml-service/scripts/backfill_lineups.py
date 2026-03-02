import sqlite3
import json
import os
import time

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'data', 'database.sqlite'))

def backfill_lineups():
    print("🚀 Starting Lineups Normalization Backfill...")
    start_time = time.time()
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Pass 1: Parse JSON lineups
    print("   📋 Pass 1: Parsing starting_xi and substitutes JSON...")
    cursor.execute("""
        SELECT fixture_id, team_id, starting_xi, substitutes
        FROM V3_Fixture_Lineups
    """)
    lineup_rows = cursor.fetchall()
    
    insert_data = []
    
    for fixture_id, team_id, starting_xi_str, substitutes_str in lineup_rows:
        if starting_xi_str:
            try:
                starters = json.loads(starting_xi_str)
                for item in starters:
                    player_data = item.get('player', item)
                    p_id = player_data.get('id')
                    if not p_id:
                        continue
                    insert_data.append((
                        fixture_id, team_id, p_id, 1,
                        player_data.get('number'), player_data.get('name'), 
                        player_data.get('pos'), player_data.get('grid')
                    ))
            except json.JSONDecodeError:
                pass
                
        if substitutes_str:
            try:
                subs = json.loads(substitutes_str)
                for item in subs:
                    player_data = item.get('player', item)
                    p_id = player_data.get('id')
                    if not p_id:
                        continue
                    insert_data.append((
                        fixture_id, team_id, p_id, 0,
                        player_data.get('number'), player_data.get('name'), 
                        player_data.get('pos'), player_data.get('grid')
                    ))
            except json.JSONDecodeError:
                pass

    if insert_data:
        cursor.executemany("""
            INSERT INTO V3_Fixture_Lineup_Players (
                fixture_id, team_id, player_id, is_starting, 
                shirt_number, player_name, position, grid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(fixture_id, team_id, player_id) DO UPDATE SET
                is_starting=excluded.is_starting,
                shirt_number=COALESCE(excluded.shirt_number, V3_Fixture_Lineup_Players.shirt_number),
                player_name=COALESCE(excluded.player_name, V3_Fixture_Lineup_Players.player_name),
                position=COALESCE(excluded.position, V3_Fixture_Lineup_Players.position),
                grid=COALESCE(excluded.grid, V3_Fixture_Lineup_Players.grid)
        """, insert_data)
        conn.commit()
        
    print(f"      ✅ Parsed and inserted {len(insert_data)} player lineup records.")

    # Pass 2: Enrich with Substitution Minutes
    print("   ⏱️ Pass 2: Enriching with Substitution Minutes...")
    cursor.execute("""
        SELECT fixture_id, team_id, player_id, assist_id, time_elapsed
        FROM V3_Fixture_Events
        WHERE LOWER(type) = 'subst'
    """)
    sub_events = cursor.fetchall()
    
    sub_out_updates = []
    sub_in_updates = []
    
    for fixture_id, team_id, player_out_id, player_in_id, minute in sub_events:
        if player_out_id:
            sub_out_updates.append((minute, fixture_id, team_id, player_out_id))
        if player_in_id:
            sub_in_updates.append((minute, fixture_id, team_id, player_in_id))
            
    if sub_out_updates:
        cursor.executemany("""
            UPDATE V3_Fixture_Lineup_Players
            SET sub_out_minute = COALESCE(sub_out_minute, ?)
            WHERE fixture_id = ? AND team_id = ? AND player_id = ?
        """, sub_out_updates)
        
    if sub_in_updates:
        cursor.executemany("""
            UPDATE V3_Fixture_Lineup_Players
            SET sub_in_minute = COALESCE(sub_in_minute, ?)
            WHERE fixture_id = ? AND team_id = ? AND player_id = ?
        """, sub_in_updates)
        
    conn.commit()
    print(f"      ✅ Processed {len(sub_out_updates)} SUB-OUTs and {len(sub_in_updates)} SUB-INs.")
    
    cursor.execute("SELECT COUNT(*) FROM V3_Fixture_Lineup_Players")
    total_count = cursor.fetchone()[0]
    
    conn.close()
    
    elapsed = time.time() - start_time
    print(f"🎉 Lineups Normalization Backfill complete in {round(elapsed, 2)} seconds!")
    print(f"   ℹ️ Total Lineup Players stored in DB: {total_count}")

if __name__ == "__main__":
    backfill_lineups()
