import sqlite3
import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime

# Path to the database - adjusting to be relative to the script location
# The script is in /statFootV3/ml-service/features.py
# The DB is in /statFootV3/database.sqlite
DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'database.sqlite'))

def get_db_connection():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database not found at {DB_PATH}")
        sys.exit(1)
    conn = sqlite3.connect(DB_PATH)
    return conn

def compute_advanced_features(conn):
    """
    Computes team-level and match-level features.
    """
    # 1. Load All Fixtures (including upcoming)
    query = """
        SELECT fixture_id, date, league_id, home_team_id, away_team_id, goals_home, goals_away, status_short, round
        FROM V3_Fixtures 
        ORDER BY date ASC
    """
    fixtures_df = pd.read_sql_query(query, conn)
    fixtures_df['date'] = pd.to_datetime(fixtures_df['date'])
    
    # 2. Create long-format for team performance
    # For finished games, we have goals. For NS, they are null.
    # We set goals to 0 for NS matches to avoid NaN issues, 
    # but the rolling shift() will ensure they don't affect THEIR OWN momentum.
    fixtures_df['goals_home'] = fixtures_df['goals_home'].fillna(0)
    fixtures_df['goals_away'] = fixtures_df['goals_away'].fillna(0)
    
    # Create long-format for team performance
    home = fixtures_df[['fixture_id', 'date', 'league_id', 'home_team_id', 'goals_home', 'goals_away']].copy()
    home.columns = ['fixture_id', 'date', 'league_id', 'team_id', 'gf', 'ga']
    home['is_home'] = 1
    
    away = fixtures_df[['fixture_id', 'date', 'league_id', 'away_team_id', 'goals_away', 'goals_home']].copy()
    away.columns = ['fixture_id', 'date', 'league_id', 'team_id', 'gf', 'ga']
    away['is_home'] = 0
    
    team_games = pd.concat([home, away]).sort_values(['team_id', 'date'])
    team_games['gd'] = team_games['gf'] - team_games['ga']
    team_games['points'] = team_games.apply(lambda r: 3 if r.gf > r.ga else (1 if r.gf == r.ga else 0), axis=1)

    # Momentum Features
    for w in [5, 10]:
        team_games[f'momentum_gd_{w}'] = team_games.groupby('team_id')['gd'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).mean()
        )
        team_games[f'momentum_pts_{w}'] = team_games.groupby('team_id')['points'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).mean()
        )

    # Defensive Resilience (Proxy: average goals against in last 10)
    team_games['def_resilience'] = team_games.groupby('team_id')['ga'].transform(
        lambda x: x.shift().rolling(10, min_periods=1).mean()
    )

    # Home/Away Differential
    # (Average points at home vs average points away over last 20 games)
    team_games['avg_pts_home'] = team_games[team_games['is_home'] == 1].groupby('team_id')['points'].transform(
        lambda x: x.shift().rolling(10, min_periods=1).mean()
    )
    team_games['avg_pts_away'] = team_games[team_games['is_home'] == 0].groupby('team_id')['points'].transform(
        lambda x: x.shift().rolling(10, min_periods=1).mean()
    )
    # Forward fill to ensure every row has the latest home/away avg
    team_games['avg_pts_home'] = team_games.groupby('team_id')['avg_pts_home'].ffill()
    team_games['avg_pts_away'] = team_games.groupby('team_id')['avg_pts_away'].ffill()
    team_games['venue_diff'] = team_games['avg_pts_home'] - team_games['avg_pts_away']

    # Merge back to fixture level
    f_features = team_games[team_games['is_home'] == 1].merge(
        team_games[team_games['is_home'] == 0],
        on='fixture_id',
        suffixes=('_h', '_a')
    )

    return f_features

def compute_lineup_quality(conn):
    """
    Computes LQI based on seasonal ratings of starting XI.
    """
    print("   📊 Computing Lineup Quality Index (LQI)...")
    
    # 1. Get average seasonal rating for all players
    stats_query = "SELECT player_id, games_rating FROM V3_Player_Stats"
    stats_df = pd.read_sql_query(stats_query, conn)
    stats_df['games_rating'] = pd.to_numeric(stats_df['games_rating'], errors='coerce')
    player_ratings = stats_df.groupby('player_id')['games_rating'].mean().to_dict()

    # 2. Get all lineups
    lineups_query = "SELECT fixture_id, team_id, starting_xi FROM V3_Fixture_Lineups"
    lineups = conn.execute(lineups_query).fetchall()
    
    lqi_results = {} # (fixture_id, team_id) -> lqi
    
    for row in lineups:
        fid, tid, xi_json = row
        try:
            xi_data = json.loads(xi_json)
            # xi_data is usually an array of objects with player.id
            total_rating = 0
            count = 0
            for p in xi_data:
                pid = p.get('player', {}).get('id')
                rating = player_ratings.get(pid, 6.5) # Default/Average
                total_rating += rating
                count += 1
            
            lqi = total_rating / count if count > 0 else 6.5
            lqi_results[(fid, tid)] = round(lqi, 3)
        except:
            continue
            
    return lqi_results

# Narrative Context Data (Approximate coordinates for major cities)
CITY_COORDS = {
    "London": (51.5074, -0.1278), "Madrid": (40.4168, -3.7038), "Barcelona": (41.3851, 2.1734),
    "Paris": (48.8566, 2.3522), "Marseille": (43.2965, 5.3698), "Manchester": (53.4808, -2.2426),
    "Liverpool": (53.4084, -2.9916), "Milan": (45.4642, 9.1900), "Turin": (45.0703, 7.6869),
    "Munich": (48.1351, 11.5820), "Dortmund": (51.5136, 7.4653), "Glasgow": (55.8642, -4.2518),
    "Lisbon": (38.7223, -9.1393), "Porto": (41.1579, -8.6291), "Amsterdam": (52.3676, 4.9041),
    "Istanbul": (41.0082, 28.9784), "Rome": (41.9028, 12.4964)
}

# Major Global Rivalries (Hardcoded mapping for AC 4)
MAJOR_RIVALRIES = [
    {541, 529}, # Real Madrid vs Barcelona
    {40, 33},   # Liverpool vs Man Utd
    {85, 81},   # PSG vs Marseille
    {80, 1063}, # Lyon vs Saint-Etienne
    {505, 489}, # Inter vs Milan
    {505, 496}, # Inter vs Juventus
    {42, 47},   # Arsenal vs Tottenham
    {247, 257}, # Celtic vs Rangers
    {487, 497}, # Lazio vs Roma
    {211, 212}, # Benfica vs Porto
    {211, 228}, # Benfica vs Sporting CP
    {194, 209}, # Ajax vs Feyenoord
    {50, 33},   # Man City vs Man Utd
    {157, 165}, # Bayern vs Dortmund
]

def haversine(c1, c2):
    if not c1 or not c2: return 0
    R = 6371 # km
    lat1, lon1 = np.radians(c1)
    lat2, lon2 = np.radians(c2)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return round(R * c)

def compute_narrative_context(conn, fixtures_df):
    """
    Computes soft features like Derby status, Travel distance, and Stakes.
    """
    print("   🎭 Encoding Narrative Context (Derbies, Travel, Stakes)...")
    
    # Get team cities for distance and same-city derbies
    teams_query = """
        SELECT t.api_id, v.city 
        FROM V3_Teams t 
        LEFT JOIN V3_Venues v ON t.venue_id = v.api_id
    """
    teams_data = pd.read_sql_query(teams_query, conn).set_index('api_id')['city'].to_dict()

    narrative_results = {} # fixture_id -> {is_derby, travel_km, is_high_stakes}
    
    for _, row in fixtures_df.iterrows():
        fid = int(row['fixture_id'])
        h_id = int(row['team_id_h'])
        a_id = int(row['team_id_a'])
        
        # 1. Derby Detection
        h_city = teams_data.get(h_id)
        a_city = teams_data.get(a_id)
        is_same_city = 1 if (h_city and a_city and h_city == a_city) else 0
        is_hardcoded_derby = 1 if {h_id, a_id} in MAJOR_RIVALRIES else 0
        
        # 2. Travel Distance
        h_coords = CITY_COORDS.get(h_city)
        a_coords = CITY_COORDS.get(a_city)
        travel_km = haversine(h_coords, a_coords)
        
        # 3. Stakes (Simplified: use round name)
        round_name = str(row.get('round', '')).lower()
        is_high_stakes = 1 if any(x in round_name for x in ['final', 'relegation', 'play-off']) else 0
        
        narrative_results[fid] = {
            "is_derby": max(is_same_city, is_hardcoded_derby),
            "travel_km": travel_km,
            "is_high_stakes": is_high_stakes
        }
        
    return narrative_results

def run_feature_pipeline():
    print(f"🚀 [US_153] Starting Feature Engineering Pipeline...")
    conn = get_db_connection()
    
    # 1. Team-level performance features
    f_features = compute_advanced_features(conn)
    
    # 2. Lineup Quality Index
    lqi_map = compute_lineup_quality(conn)

    # 3. Narrative Context
    narrative_map = compute_narrative_context(conn, f_features)
    
    # 4. Consolidate into Feature Vectors
    print("   💾 Saving features to V3_ML_Feature_Store...")
    
    upsert_data = []
    processed_count = 0
    
    for _, row in f_features.iterrows():
        fid = int(row['fixture_id'])
        lid = int(row['league_id_h'])
        
        lqi_h = lqi_map.get((fid, row['team_id_h']), 6.5)
        lqi_a = lqi_map.get((fid, row['team_id_a']), 6.5)
        
        narrative = narrative_map.get(fid, {"is_derby": 0, "travel_km": 0, "is_high_stakes": 0})
        
        vector = {
            "mom_gd_h5": row['momentum_gd_5_h'],
            "mom_gd_h10": row['momentum_gd_10_h'],
            "mom_pts_h10": row['momentum_pts_10_h'],
            "mom_gd_a5": row['momentum_gd_5_a'],
            "mom_gd_a10": row['momentum_gd_10_a'],
            "mom_pts_a10": row['momentum_pts_10_a'],
            "venue_diff_h": row['venue_diff_h'],
            "venue_diff_a": row['venue_diff_a'],
            "lqi_h": lqi_h,
            "lqi_a": lqi_a,
            "def_res_h": row['def_resilience_h'],
            "def_res_a": row['def_resilience_a'],
            "is_derby": narrative['is_derby'],
            "travel_km": narrative['travel_km'],
            "high_stakes": narrative['is_high_stakes']
        }
        
        # Clean numeric values
        vector = {k: float(0 if pd.isna(v) or np.isinf(v) else v) for k, v in vector.items()}
        
        upsert_data.append((fid, lid, json.dumps(vector)))
        processed_count += 1

    # Bulk Insert
    sql = """
        INSERT INTO V3_ML_Feature_Store (fixture_id, league_id, feature_vector)
        VALUES (?, ?, ?)
        ON CONFLICT(fixture_id) DO UPDATE SET 
            feature_vector = excluded.feature_vector,
            calculated_at = CURRENT_TIMESTAMP
    """
    
    # Process in chunks of 5000
    CHUNK_SIZE = 5000
    for i in range(0, len(upsert_data), CHUNK_SIZE):
        chunk = upsert_data[i:i+CHUNK_SIZE]
        conn.executemany(sql, chunk)
        print(f"      Stored {min(i+CHUNK_SIZE, len(upsert_data))}/{len(upsert_data)} features...")
    
    conn.commit()
    conn.close()
    print(f"✅ [US_153] Pipeline Finished. {processed_count} features stored.")

if __name__ == "__main__":
    run_feature_pipeline()
