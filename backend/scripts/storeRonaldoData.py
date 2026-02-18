#!/usr/bin/env python3
"""
Store Cristiano Ronaldo's pre-2010 career data from Flashscore
Data extracted from screenshot analysis
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import database module
import sqlite3
import json

# Cristiano Ronaldo's pre-2010 career data (from Flashscore screenshot)
# League tab data
RONALDO_LEAGUE_DATA = [
    {"season": "2009/2010", "team": "Real Madrid", "competition": "Primera Division", "matches": 29, "goals": 26, "assists": 5},
    {"season": "2008/2009", "team": "Manchester Utd", "competition": "Premier League", "matches": 33, "goals": 18, "assists": 6},
    {"season": "2007/2008", "team": "Manchester Utd", "competition": "Premier League", "matches": 34, "goals": 31, "assists": 5},
    {"season": "2006/2007", "team": "Manchester Utd", "competition": "Premier League", "matches": 34, "goals": 17, "assists": 2},
    {"season": "2005/2006", "team": "Manchester Utd", "competition": "Premier League", "matches": 33, "goals": 9, "assists": 8},
    {"season": "2004/2005", "team": "Manchester Utd", "competition": "Premier League", "matches": 32, "goals": 5, "assists": 8},
    {"season": "2003/2004", "team": "Manchester Utd", "competition": "Premier League", "matches": 29, "goals": 4, "assists": 4},
]

def get_db_connection():
    """Connect to the SQLite database"""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'database.sqlite')
    return sqlite3.connect(db_path)

def store_ronaldo_data():
    """
    Store Cristiano Ronaldo's pre-2010 data in the database
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print("🔍 Checking for Cristiano Ronaldo in database...")
        
        # Find or create Cristiano Ronaldo
        cursor.execute("""
            SELECT id FROM players 
            WHERE LOWER(first_name || ' ' || last_name) LIKE '%cristiano%ronaldo%'
            LIMIT 1
        """)
        
        player = cursor.fetchone()
        
        if not player:
            print("  ⚠️ Cristiano Ronaldo not found in database")
            print("  💡 Creating player record...")
            
            cursor.execute("""
                INSERT INTO players (first_name, last_name, age, nationality, photo_url)
                VALUES (?, ?, ?, ?, ?)
            """, ("Cristiano", "Ronaldo", 39, "Portugal", None))
            
            player_id = cursor.lastrowid
            print(f"  ✓ Created player with ID: {player_id}")
        else:
            player_id = player[0]
            print(f"  ✓ Found player with ID: {player_id}")
        
        # Process league data
        print(f"\n📊 Storing {len(RONALDO_LEAGUE_DATA)} season records...")
        
        stored_count = 0
        skipped_count = 0
        
        for stat in RONALDO_LEAGUE_DATA:
            try:
                # Get or create season
                cursor.execute("SELECT id FROM seasons WHERE label = ?", (stat['season'],))
                season = cursor.fetchone()
                
                if not season:
                    year = int(stat['season'].split('/')[0])
                    cursor.execute("INSERT INTO seasons (label, year) VALUES (?, ?)", 
                                 (stat['season'], year))
                    season_id = cursor.lastrowid
                else:
                    season_id = season[0]
                
                # Get or create club
                cursor.execute("SELECT id FROM clubs WHERE name = ?", (stat['team'],))
                club = cursor.fetchone()
                
                if not club:
                    # Get country for club
                    country_map = {
                        "Manchester Utd": "England",
                        "Real Madrid": "Spain"
                    }
                    country_name = country_map.get(stat['team'], "Unknown")
                    
                    cursor.execute("SELECT id FROM countries WHERE name = ?", (country_name,))
                    country = cursor.fetchone()
                    
                    if country:
                        # Generate synthetic API ID
                        api_team_id = -(abs(hash(stat['team'])) % 1000000)
                        cursor.execute("""
                            INSERT INTO clubs (api_team_id, name, logo_url, country_id)
                            VALUES (?, ?, ?, ?)
                        """, (api_team_id, stat['team'], None, country[0]))
                        club_id = cursor.lastrowid
                    else:
                        print(f"    ⚠️ Country not found for {stat['team']}, skipping...")
                        skipped_count += 1
                        continue
                else:
                    club_id = club[0]
                
                # Get or create competition (championship)
                comp_map = {
                    "Premier League": "Premier League",
                    "Primera Division": "La Liga"
                }
                comp_name = comp_map.get(stat['competition'], stat['competition'])
                
                cursor.execute("""
                    SELECT id FROM championships WHERE name LIKE ?
                """, (f"%{comp_name}%",))
                competition = cursor.fetchone()
                
                if not competition:
                    print(f"    ⚠️ Competition '{comp_name}' not found, skipping...")
                    skipped_count += 1
                    continue
                
                competition_id = competition[0]
                
                # Check if stat already exists
                cursor.execute("""
                    SELECT id FROM player_club_stats
                    WHERE player_id = ? AND club_id = ? AND season_id = ? AND competition_id = ?
                """, (player_id, club_id, season_id, competition_id))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing
                    cursor.execute("""
                        UPDATE player_club_stats
                        SET matches = ?, goals = ?, assists = ?
                        WHERE id = ?
                    """, (stat['matches'], stat['goals'], stat['assists'], existing[0]))
                    print(f"  ✓ Updated: {stat['season']} {stat['team']} - {stat['matches']}M {stat['goals']}G {stat['assists']}A")
                else:
                    # Insert new
                    cursor.execute("""
                        INSERT INTO player_club_stats
                        (player_id, club_id, competition_id, competition_type, season_id, matches, goals, assists)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (player_id, club_id, competition_id, 'championship', season_id,
                          stat['matches'], stat['goals'], stat['assists']))
                    print(f"  ✓ Inserted: {stat['season']} {stat['team']} - {stat['matches']}M {stat['goals']}G {stat['assists']}A")
                
                stored_count += 1
                
            except Exception as e:
                print(f"  ❌ Error storing {stat['season']} {stat['team']}: {str(e)}")
                skipped_count += 1
        
        conn.commit()
        conn.close()
        
        print(f"\n✅ Complete!")
        print(f"  📥 Stored: {stored_count} seasons")
        print(f"  ⏭️  Skipped: {skipped_count} seasons")
        
        return {
            "success": True,
            "player_id": player_id,
            "stored": stored_count,
            "skipped": skipped_count
        }
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    result = store_ronaldo_data()
    print("\n" + json.dumps(result, indent=2))
