import psycopg2
import pandas as pd
import numpy as np
import json
import os
import sys
import argparse
from datetime import datetime
from db_config import get_connection
from feature_schema import GLOBAL_1X2_FEATURE_SCHEMA_VERSION, normalize_feature_vector

PROGRESS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'feature_pipeline_progress.json')


def safe_num(value, default=0.0):
    try:
        numeric = float(value)
        if pd.isna(numeric) or np.isinf(numeric):
            return default
        return numeric
    except (TypeError, ValueError):
        return default


def safe_div(numerator, denominator, default=0.0):
    num = safe_num(numerator, default)
    den = safe_num(denominator, 0.0)
    if den == 0:
        return default
    return num / den

def get_db_connection():
    return get_connection()


def write_progress(**payload):
    progress = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "schema_version": GLOBAL_1X2_FEATURE_SCHEMA_VERSION,
        **payload,
    }
    with open(PROGRESS_PATH, 'w') as handle:
        json.dump(progress, handle, indent=2)


def reset_feature_store(conn):
    cur = conn.cursor()
    cur.execute("DELETE FROM V3_ML_Feature_Store")
    conn.commit()
    cur.close()


def get_completed_fixture_ids(conn):
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT fixture_id FROM V3_ML_Feature_Store")
    fixture_ids = {row[0] for row in cur.fetchall()}
    cur.close()
    return fixture_ids

def compute_advanced_features(conn):
    """
    Computes team-level and match-level features.
    """
    # 1. Load All Fixtures (including upcoming)
    query = """
        SELECT
            f.fixture_id,
            f.date,
            f.league_id,
            f.home_team_id,
            f.away_team_id,
            f.goals_home,
            f.goals_away,
            f.xg_home,
            f.xg_away,
            f.status_short,
            f.round,
            l.type AS league_type,
            l.importance_rank AS league_importance,
            c.name AS country_name,
            c.importance_rank AS country_importance
        FROM V3_Fixtures f
        LEFT JOIN V3_Leagues l ON f.league_id = l.league_id
        LEFT JOIN V3_Countries c ON l.country_id = c.country_id
        ORDER BY f.date ASC
    """
    fixtures_df = pd.read_sql_query(query, conn)
    fixtures_df['date'] = pd.to_datetime(fixtures_df['date'])
    
    # 2. Create long-format for team performance
    # For finished games, we have goals. For NS, they are null.
    # We set goals to 0 for NS matches to avoid NaN issues, 
    # but the rolling shift() will ensure they don't affect THEIR OWN momentum.
    fixtures_df['goals_home'] = fixtures_df['goals_home'].fillna(0)
    fixtures_df['goals_away'] = fixtures_df['goals_away'].fillna(0)
    fixtures_df['xg_home'] = pd.to_numeric(fixtures_df['xg_home'], errors='coerce')
    fixtures_df['xg_away'] = pd.to_numeric(fixtures_df['xg_away'], errors='coerce')
    
    # Create long-format for team performance
    home = fixtures_df[['fixture_id', 'date', 'league_id', 'home_team_id', 'goals_home', 'goals_away', 'xg_home', 'xg_away']].copy()
    home.columns = ['fixture_id', 'date', 'league_id', 'team_id', 'gf', 'ga', 'xg_f', 'xg_a']
    home['is_home'] = 1
    
    away = fixtures_df[['fixture_id', 'date', 'league_id', 'away_team_id', 'goals_away', 'goals_home', 'xg_away', 'xg_home']].copy()
    away.columns = ['fixture_id', 'date', 'league_id', 'team_id', 'gf', 'ga', 'xg_f', 'xg_a']
    away['is_home'] = 0
    
    team_games = pd.concat([home, away]).sort_values(['team_id', 'date'])
    team_games['gd'] = team_games['gf'] - team_games['ga']
    team_games['points'] = team_games.apply(lambda r: 3 if r.gf > r.ga else (1 if r.gf == r.ga else 0), axis=1)
    team_games['xg_f'] = team_games['xg_f'].fillna(team_games['gf'])
    team_games['xg_a'] = team_games['xg_a'].fillna(team_games['ga'])

    # Momentum Features
    for w in [3, 5, 10, 20]:
        # Goal Difference Momentum
        team_games[f'momentum_gd_{w}'] = team_games.groupby('team_id')['gd'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).mean()
        )
        # Points Momentum (form)
        team_games[f'momentum_pts_{w}'] = team_games.groupby('team_id')['points'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).mean()
        )
        # Win Rate
        team_games[f'win_rate_{w}'] = team_games.groupby('team_id')['points'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).apply(lambda s: (s == 3).sum() / len(s) if len(s) > 0 else 0)
        )
        # Clean Sheet Rate
        team_games[f'cs_rate_{w}'] = team_games.groupby('team_id')['ga'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).apply(lambda s: (s == 0).sum() / len(s) if len(s) > 0 else 0)
        )
        team_games[f'xg_f_{w}'] = team_games.groupby('team_id')['xg_f'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).mean()
        )
        team_games[f'xg_a_{w}'] = team_games.groupby('team_id')['xg_a'].transform(
            lambda x: x.shift().rolling(w, min_periods=1).mean()
        )

    # Fatigue Feature: Rest Days
    # Difference in days between current game and previous game
    team_games['rest_days'] = team_games.groupby('team_id')['date'].diff().dt.days.fillna(14)
    # Clip to 14 days max to avoid outliers (e.g. season break)
    team_games['rest_days'] = team_games['rest_days'].clip(0, 14)

    # Defensive Resilience (Proxy: average goals against in last 10)
    team_games['def_resilience'] = team_games.groupby('team_id')['ga'].transform(
        lambda x: x.shift().rolling(10, min_periods=1).mean()
    )
    team_games['xg_eff_5'] = team_games.groupby('team_id').apply(
        lambda g: (
            g['gf'].shift().rolling(5, min_periods=1).sum()
            / g['xg_f'].shift().rolling(5, min_periods=1).sum().replace(0, np.nan)
        )
    ).reset_index(level=0, drop=True).fillna(1.0)

    # Home/Away Differential
    # (Average points at home vs average points away over last 20 games)
    team_games['avg_pts_home'] = team_games[team_games['is_home'] == 1].groupby('team_id')['points'].transform(
        lambda x: x.shift().rolling(10, min_periods=1).mean()
    )
    team_games['avg_pts_away'] = team_games[team_games['is_home'] == 0].groupby('team_id')['points'].transform(
        lambda x: x.shift().rolling(10, min_periods=1).mean()
    )
    # Forward fill to ensure every row has the latest home/away avg
    team_games['avg_pts_home'] = team_games.groupby('team_id').apply(lambda x: x['avg_pts_home'].ffill()).reset_index(level=0, drop=True)
    team_games['avg_pts_away'] = team_games.groupby('team_id').apply(lambda x: x['avg_pts_away'].ffill()).reset_index(level=0, drop=True)
    team_games['venue_diff'] = team_games['avg_pts_home'].fillna(1.0) - team_games['avg_pts_away'].fillna(1.0)


    # Merge back to fixture level
    f_features = team_games[team_games['is_home'] == 1].merge(
        team_games[team_games['is_home'] == 0],
        on='fixture_id',
        suffixes=('_h', '_a')
    )
    competition_context = fixtures_df[[
        'fixture_id',
        'league_type',
        'league_importance',
        'country_name',
        'country_importance',
        'round'
    ]].drop_duplicates('fixture_id')
    f_features = f_features.merge(competition_context, on='fixture_id', how='left')

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
    cur = conn.cursor()
    cur.execute(lineups_query)
    lineups = cur.fetchall()
    cur.close()
    
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


def load_team_feature_set(conn, feature_set_id, horizon_type='FULL_HISTORICAL'):
    query = """
        SELECT fixture_id, team_id, features_json
        FROM V3_Team_Features_PreMatch
        WHERE feature_set_id = %s AND horizon_type = %s
    """
    df = pd.read_sql_query(query, conn, params=(feature_set_id, horizon_type))
    if df.empty:
        return df

    parsed = pd.json_normalize(df['features_json'].apply(json.loads))
    for col in parsed.columns:
        df[col] = parsed[col]

    return df.drop(columns=['features_json'])

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


def compute_competition_context(row):
    round_name = str(row.get('round', '') or '').lower()
    country_name = str(row.get('country_name', '') or '')
    league_type = str(row.get('league_type', '') or '')
    international_names = {'Europe', 'South America', 'North America', 'Asia', 'Africa', 'World'}

    is_cup = 1 if league_type.lower() == 'cup' else 0
    is_league = 1 if league_type.lower() == 'league' else 0
    is_international = 1 if country_name in international_names else 0
    is_knockout = 1 if any(
        token in round_name for token in ['final', 'semi', 'quarter', 'round of', 'play-off', 'playoff', 'knockout']
    ) else 0

    if 'final' in round_name:
        stage_weight = 4.0
    elif 'semi' in round_name or 'quarter' in round_name:
        stage_weight = 3.0
    elif 'round of' in round_name or 'play-off' in round_name or 'playoff' in round_name or 'knockout' in round_name:
        stage_weight = 2.0
    else:
        stage_weight = 1.0

    return {
        "competition_importance": row.get('league_importance'),
        "country_importance": row.get('country_importance'),
        "is_cup": is_cup,
        "is_league": is_league,
        "is_international_competition": is_international,
        "is_knockout": is_knockout,
        "stage_weight": stage_weight,
    }


def build_style_matchup_features(row):
    shots_h = safe_num(row.get('home_p_shots_per_match_5'))
    shots_a = safe_num(row.get('away_p_shots_per_match_5'))
    sot_h = safe_num(row.get('home_p_sot_per_match_5'))
    sot_a = safe_num(row.get('away_p_sot_per_match_5'))
    corners_h = safe_num(row.get('home_p_corners_per_match_5'))
    corners_a = safe_num(row.get('away_p_corners_per_match_5'))
    fouls_h = safe_num(row.get('home_p_fouls_per_match_5'))
    fouls_a = safe_num(row.get('away_p_fouls_per_match_5'))
    yellow_h = safe_num(row.get('home_p_yellow_per_match_5'))
    yellow_a = safe_num(row.get('away_p_yellow_per_match_5'))
    red_h = safe_num(row.get('home_p_red_per_match_5'))
    red_a = safe_num(row.get('away_p_red_per_match_5'))
    possession_h = safe_num(row.get('home_p_possession_avg_5'), 50.0)
    possession_a = safe_num(row.get('away_p_possession_avg_5'), 50.0)
    control_h = safe_num(row.get('home_p_control_index_5'))
    control_a = safe_num(row.get('away_p_control_index_5'))
    shots_1h_h = safe_num(row.get('home_p_shots_per_match_1h5'))
    shots_1h_a = safe_num(row.get('away_p_shots_per_match_1h5'))
    sot_1h_h = safe_num(row.get('home_p_sot_per_match_1h5'))
    sot_1h_a = safe_num(row.get('away_p_sot_per_match_1h5'))
    corners_1h_h = safe_num(row.get('home_p_corners_per_match_1h5'))
    corners_1h_a = safe_num(row.get('away_p_corners_per_match_1h5'))
    xg_for_h = safe_num(row.get('xg_f_5_h'))
    xg_for_a = safe_num(row.get('xg_f_5_a'))
    xg_against_h = safe_num(row.get('xg_a_5_h'))
    xg_against_a = safe_num(row.get('xg_a_5_a'))

    cards_pressure_h = yellow_h + (2.0 * red_h)
    cards_pressure_a = yellow_a + (2.0 * red_a)

    return {
        "home_p_shot_volume_1h_share_5": safe_div(shots_1h_h, shots_h, 0.5),
        "away_p_shot_volume_1h_share_5": safe_div(shots_1h_a, shots_a, 0.5),
        "home_p_sot_volume_1h_share_5": safe_div(sot_1h_h, sot_h, 0.5),
        "away_p_sot_volume_1h_share_5": safe_div(sot_1h_a, sot_a, 0.5),
        "home_p_corner_volume_1h_share_5": safe_div(corners_1h_h, corners_h, 0.5),
        "away_p_corner_volume_1h_share_5": safe_div(corners_1h_a, corners_a, 0.5),
        "home_p_non_sot_rate_5": safe_div(max(shots_h - sot_h, 0.0), shots_h),
        "away_p_non_sot_rate_5": safe_div(max(shots_a - sot_a, 0.0), shots_a),
        "home_p_corner_to_shot_rate_5": safe_div(corners_h, shots_h),
        "away_p_corner_to_shot_rate_5": safe_div(corners_a, shots_a),
        "home_p_cards_per_foul_5": safe_div(cards_pressure_h, fouls_h),
        "away_p_cards_per_foul_5": safe_div(cards_pressure_a, fouls_a),
        "home_p_cards_pressure_5": cards_pressure_h,
        "away_p_cards_pressure_5": cards_pressure_a,
        "home_p_possession_to_shot_5": safe_div(shots_h, possession_h, 0.0),
        "away_p_possession_to_shot_5": safe_div(shots_a, possession_a, 0.0),
        "home_p_xg_per_shot_5": safe_div(xg_for_h, shots_h),
        "away_p_xg_per_shot_5": safe_div(xg_for_a, shots_a),
        "home_p_xg_per_sot_5": safe_div(xg_for_h, sot_h),
        "away_p_xg_per_sot_5": safe_div(xg_for_a, sot_a),
        "matchup_tempo_sum_5": shots_h + shots_a,
        "matchup_shot_quality_gap_5": abs(safe_num(row.get('home_p_sot_rate_5')) - safe_num(row.get('away_p_sot_rate_5'))),
        "matchup_possession_gap_5": abs(possession_h - possession_a),
        "matchup_control_gap_5": abs(control_h - control_a),
        "matchup_corner_pressure_sum_5": corners_h + corners_a,
        "matchup_discipline_sum_5": cards_pressure_h + cards_pressure_a,
        "matchup_foul_intensity_sum_5": fouls_h + fouls_a,
        "matchup_first_half_tempo_sum_5": shots_1h_h + shots_1h_a,
        "matchup_first_half_sot_sum_5": sot_1h_h + sot_1h_a,
        "matchup_open_game_index_5": xg_for_h + xg_for_a + xg_against_h + xg_against_a,
    }

def run_feature_pipeline(reset=False):
    print(f"🚀 [US_153] Starting Feature Engineering Pipeline...")
    conn = get_db_connection()
    if reset:
        print("   🧹 Resetting V3_ML_Feature_Store...")
        reset_feature_store(conn)
        write_progress(status="reset_complete", processed=0, persisted=0)

    print("   📋 Loading fast feature sources...")
    f_features = compute_advanced_features(conn)
    print(f"      Loaded advanced fixture features: {len(f_features)} rows")
    baseline_df = load_team_feature_set(conn, 'BASELINE_V1')
    print(f"      Loaded BASELINE_V1 rows: {len(baseline_df)}")
    process_df = load_team_feature_set(conn, 'PROCESS_V1')
    print(f"      Loaded PROCESS_V1 rows: {len(process_df)}")
    narrative_map = compute_narrative_context(conn, f_features)
    print(f"      Built narrative context for {len(narrative_map)} fixtures")

    print("   🔗 Merging BASELINE_V1...")
    f_features = pd.merge(
        f_features,
        baseline_df.add_prefix('home_b_'),
        left_on=['fixture_id', 'team_id_h'],
        right_on=['home_b_fixture_id', 'home_b_team_id'],
        how='left'
    )
    f_features = pd.merge(
        f_features,
        baseline_df.add_prefix('away_b_'),
        left_on=['fixture_id', 'team_id_a'],
        right_on=['away_b_fixture_id', 'away_b_team_id'],
        how='left'
    )
    print(f"      After BASELINE merges: {len(f_features)} rows")

    print("   🔗 Merging PROCESS_V1...")
    f_features = pd.merge(
        f_features,
        process_df.add_prefix('home_p_'),
        left_on=['fixture_id', 'team_id_h'],
        right_on=['home_p_fixture_id', 'home_p_team_id'],
        how='left'
    )
    f_features = pd.merge(
        f_features,
        process_df.add_prefix('away_p_'),
        left_on=['fixture_id', 'team_id_a'],
        right_on=['away_p_fixture_id', 'away_p_team_id'],
        how='left'
    )
    print(f"      After PROCESS merges: {len(f_features)} rows")

    completed_fixture_ids = get_completed_fixture_ids(conn)
    if completed_fixture_ids:
        f_features = f_features[~f_features['fixture_id'].isin(completed_fixture_ids)].copy()
        print(f"   ♻️ Resume mode: skipping {len(completed_fixture_ids)} already stored fixtures")

    f_features = f_features.sort_values('date_h')
    print(f"   ▶️ Pending fixtures to process: {len(f_features)}")
    write_progress(
        status="running",
        processed=0,
        persisted=len(completed_fixture_ids),
        remaining=len(f_features),
        reset=reset
    )

    print("   💾 Saving features to V3_ML_Feature_Store...")

    processed_count = 0
    total_fixtures = len(f_features)
    chunk = []
    chunk_size = 10000
    cur = conn.cursor()
    sql = """
        INSERT INTO V3_ML_Feature_Store (fixture_id, league_id, feature_vector, calculated_at)
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
    """

    for _, row in f_features.iterrows():
        fid = int(row['fixture_id'])
        lid = int(row['league_id_h'])
        narrative = narrative_map.get(fid, {"is_derby": 0, "travel_km": 0, "is_high_stakes": 0})
        competition = compute_competition_context(row)
        style_matchup = build_style_matchup_features(row)
        vector = {
            "mom_gd_h3": row.get('momentum_gd_3_h'),
            "mom_gd_h5": row.get('momentum_gd_5_h'),
            "mom_gd_h10": row.get('momentum_gd_10_h'),
            "mom_gd_h20": row.get('momentum_gd_20_h'),
            "mom_pts_h3": row.get('momentum_pts_3_h'),
            "mom_pts_h5": row.get('momentum_pts_5_h'),
            "mom_pts_h10": row.get('momentum_pts_10_h'),
            "mom_pts_h20": row.get('momentum_pts_20_h'),
            "win_rate_h5": row.get('win_rate_5_h'),
            "win_rate_h10": row.get('win_rate_10_h'),
            "cs_rate_h5": row.get('cs_rate_5_h'),
            "cs_rate_h10": row.get('cs_rate_10_h'),
            "mom_gd_a3": row.get('momentum_gd_3_a'),
            "mom_gd_a5": row.get('momentum_gd_5_a'),
            "mom_gd_a10": row.get('momentum_gd_10_a'),
            "mom_gd_a20": row.get('momentum_gd_20_a'),
            "mom_pts_a3": row.get('momentum_pts_3_a'),
            "mom_pts_a5": row.get('momentum_pts_5_a'),
            "mom_pts_a10": row.get('momentum_pts_10_a'),
            "mom_pts_a20": row.get('momentum_pts_20_a'),
            "win_rate_a5": row.get('win_rate_5_a'),
            "win_rate_a10": row.get('win_rate_10_a'),
            "cs_rate_a5": row.get('cs_rate_5_a'),
            "cs_rate_a10": row.get('cs_rate_10_a'),
            "rest_h": row.get('rest_days_h'),
            "rest_a": row.get('rest_days_a'),
            "venue_diff_h": row.get('venue_diff_h'),
            "venue_diff_a": row.get('venue_diff_a'),
            "def_res_h": row.get('def_resilience_h'),
            "def_res_a": row.get('def_resilience_a'),
            "home_b_elo": row.get('home_b_elo'),
            "away_b_elo": row.get('away_b_elo'),
            "diff_elo": (row.get('home_b_elo') or 1500) - (row.get('away_b_elo') or 1500),
            "home_b_rank": row.get('home_b_rank'),
            "away_b_rank": row.get('away_b_rank'),
            "diff_rank": (row.get('away_b_rank') or 0) - (row.get('home_b_rank') or 0),
            "home_b_points": row.get('home_b_points'),
            "away_b_points": row.get('away_b_points'),
            "diff_points": (row.get('home_b_points') or 0) - (row.get('away_b_points') or 0),
            "home_b_goals_diff": row.get('home_b_goals_diff'),
            "away_b_goals_diff": row.get('away_b_goals_diff'),
            "diff_goals_diff": (row.get('home_b_goals_diff') or 0) - (row.get('away_b_goals_diff') or 0),
            "home_b_played": row.get('home_b_played'),
            "away_b_played": row.get('away_b_played'),
            "home_b_lineup_strength_v1": row.get('home_b_lineup_strength_v1'),
            "away_b_lineup_strength_v1": row.get('away_b_lineup_strength_v1'),
            "diff_lineup_strength": (row.get('home_b_lineup_strength_v1') or 0) - (row.get('away_b_lineup_strength_v1') or 0),
            "home_b_missing_starters_count": row.get('home_b_missing_starters_count'),
            "away_b_missing_starters_count": row.get('away_b_missing_starters_count'),
            "home_p_possession_avg_5": row.get('home_p_possession_avg_5'),
            "away_p_possession_avg_5": row.get('away_p_possession_avg_5'),
            "diff_possession_l5": (row.get('home_p_possession_avg_5') or 50) - (row.get('away_p_possession_avg_5') or 50),
            "home_p_control_index_5": row.get('home_p_control_index_5'),
            "away_p_control_index_5": row.get('away_p_control_index_5'),
            "diff_control_l5": (row.get('home_p_control_index_5') or 0) - (row.get('away_p_control_index_5') or 0),
            "home_p_shots_per_match_5": row.get('home_p_shots_per_match_5'),
            "away_p_shots_per_match_5": row.get('away_p_shots_per_match_5'),
            "diff_shots_l5": (row.get('home_p_shots_per_match_5') or 0) - (row.get('away_p_shots_per_match_5') or 0),
            "home_p_sot_per_match_5": row.get('home_p_sot_per_match_5'),
            "away_p_sot_per_match_5": row.get('away_p_sot_per_match_5'),
            "diff_sot_l5": (row.get('home_p_sot_per_match_5') or 0) - (row.get('away_p_sot_per_match_5') or 0),
            "home_p_corners_per_match_5": row.get('home_p_corners_per_match_5'),
            "away_p_corners_per_match_5": row.get('away_p_corners_per_match_5'),
            "diff_corners_l5": (row.get('home_p_corners_per_match_5') or 0) - (row.get('away_p_corners_per_match_5') or 0),
            "home_p_fouls_per_match_5": row.get('home_p_fouls_per_match_5'),
            "away_p_fouls_per_match_5": row.get('away_p_fouls_per_match_5'),
            "diff_fouls_l5": (row.get('home_p_fouls_per_match_5') or 0) - (row.get('away_p_fouls_per_match_5') or 0),
            "home_p_yellow_per_match_5": row.get('home_p_yellow_per_match_5'),
            "away_p_yellow_per_match_5": row.get('away_p_yellow_per_match_5'),
            "diff_yellow_l5": (row.get('home_p_yellow_per_match_5') or 0) - (row.get('away_p_yellow_per_match_5') or 0),
            "home_p_red_per_match_5": row.get('home_p_red_per_match_5'),
            "away_p_red_per_match_5": row.get('away_p_red_per_match_5'),
            "diff_red_l5": (row.get('home_p_red_per_match_5') or 0) - (row.get('away_p_red_per_match_5') or 0),
            "home_p_pass_acc_rate_5": row.get('home_p_pass_acc_rate_5'),
            "away_p_pass_acc_rate_5": row.get('away_p_pass_acc_rate_5'),
            "home_p_sot_rate_5": row.get('home_p_sot_rate_5'),
            "away_p_sot_rate_5": row.get('away_p_sot_rate_5'),
            "home_p_shot_volume_1h_share_5": style_matchup["home_p_shot_volume_1h_share_5"],
            "away_p_shot_volume_1h_share_5": style_matchup["away_p_shot_volume_1h_share_5"],
            "home_p_sot_volume_1h_share_5": style_matchup["home_p_sot_volume_1h_share_5"],
            "away_p_sot_volume_1h_share_5": style_matchup["away_p_sot_volume_1h_share_5"],
            "home_p_corner_volume_1h_share_5": style_matchup["home_p_corner_volume_1h_share_5"],
            "away_p_corner_volume_1h_share_5": style_matchup["away_p_corner_volume_1h_share_5"],
            "home_p_non_sot_rate_5": style_matchup["home_p_non_sot_rate_5"],
            "away_p_non_sot_rate_5": style_matchup["away_p_non_sot_rate_5"],
            "home_p_corner_to_shot_rate_5": style_matchup["home_p_corner_to_shot_rate_5"],
            "away_p_corner_to_shot_rate_5": style_matchup["away_p_corner_to_shot_rate_5"],
            "home_p_cards_per_foul_5": style_matchup["home_p_cards_per_foul_5"],
            "away_p_cards_per_foul_5": style_matchup["away_p_cards_per_foul_5"],
            "home_p_cards_pressure_5": style_matchup["home_p_cards_pressure_5"],
            "away_p_cards_pressure_5": style_matchup["away_p_cards_pressure_5"],
            "home_p_possession_to_shot_5": style_matchup["home_p_possession_to_shot_5"],
            "away_p_possession_to_shot_5": style_matchup["away_p_possession_to_shot_5"],
            "home_p_xg_per_shot_5": style_matchup["home_p_xg_per_shot_5"],
            "away_p_xg_per_shot_5": style_matchup["away_p_xg_per_shot_5"],
            "home_p_xg_per_sot_5": style_matchup["home_p_xg_per_sot_5"],
            "away_p_xg_per_sot_5": style_matchup["away_p_xg_per_sot_5"],
            "mom_xg_f_h5": row.get('xg_f_5_h'),
            "mom_xg_f_h10": row.get('xg_f_10_h'),
            "mom_xg_a_h5": row.get('xg_a_5_h'),
            "mom_xg_a_h10": row.get('xg_a_10_h'),
            "xg_eff_h5": row.get('xg_eff_5_h'),
            "mom_xg_f_a5": row.get('xg_f_5_a'),
            "mom_xg_f_a10": row.get('xg_f_10_a'),
            "mom_xg_a_a5": row.get('xg_a_5_a'),
            "mom_xg_a_a10": row.get('xg_a_10_a'),
            "xg_eff_a5": row.get('xg_eff_5_a'),
            "diff_xg_for_l5": (row.get('xg_f_5_h') or 0) - (row.get('xg_f_5_a') or 0),
            "diff_xg_against_l5": (row.get('xg_a_5_h') or 0) - (row.get('xg_a_5_a') or 0),
            "diff_xg_eff_l5": (row.get('xg_eff_5_h') or 1.0) - (row.get('xg_eff_5_a') or 1.0),
            "matchup_tempo_sum_5": style_matchup["matchup_tempo_sum_5"],
            "matchup_shot_quality_gap_5": style_matchup["matchup_shot_quality_gap_5"],
            "matchup_possession_gap_5": style_matchup["matchup_possession_gap_5"],
            "matchup_control_gap_5": style_matchup["matchup_control_gap_5"],
            "matchup_corner_pressure_sum_5": style_matchup["matchup_corner_pressure_sum_5"],
            "matchup_discipline_sum_5": style_matchup["matchup_discipline_sum_5"],
            "matchup_foul_intensity_sum_5": style_matchup["matchup_foul_intensity_sum_5"],
            "matchup_first_half_tempo_sum_5": style_matchup["matchup_first_half_tempo_sum_5"],
            "matchup_first_half_sot_sum_5": style_matchup["matchup_first_half_sot_sum_5"],
            "matchup_open_game_index_5": style_matchup["matchup_open_game_index_5"],
            "competition_importance": competition["competition_importance"],
            "country_importance": competition["country_importance"],
            "is_cup": competition["is_cup"],
            "is_league": competition["is_league"],
            "is_international_competition": competition["is_international_competition"],
            "is_knockout": competition["is_knockout"],
            "stage_weight": competition["stage_weight"],
            "is_derby": narrative['is_derby'],
            "travel_km": narrative['travel_km'],
            "high_stakes": narrative['is_high_stakes'],
        }
        vector = normalize_feature_vector(vector)
        chunk.append((fid, lid, json.dumps(vector)))
        processed_count += 1
        if len(chunk) >= chunk_size:
            cur.executemany(sql, chunk)
            conn.commit()
            print(f"      Stored {processed_count}/{total_fixtures} features...")
            write_progress(
                status="running",
                processed=processed_count,
                persisted=len(completed_fixture_ids) + processed_count,
                remaining=total_fixtures - processed_count,
                last_fixture_id=chunk[-1][0],
                reset=reset
            )
            chunk = []

    if chunk:
        cur.executemany(sql, chunk)
        conn.commit()
        print(f"      Stored {processed_count}/{total_fixtures} features...")
        write_progress(
            status="running",
            processed=processed_count,
            persisted=len(completed_fixture_ids) + processed_count,
            remaining=0,
            last_fixture_id=chunk[-1][0],
            reset=reset
        )

    cur.close()
    
    conn.close()
    write_progress(
        status="completed",
        processed=processed_count,
        persisted=len(completed_fixture_ids) + processed_count,
        remaining=0,
        reset=reset
    )
    print(f"✅ [US_153] Pipeline Finished. {processed_count} features stored.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build V3_ML_Feature_Store with resumable batches.")
    parser.add_argument("--reset", action="store_true", help="Delete existing rows before rebuilding from scratch.")
    args = parser.parse_args()
    run_feature_pipeline(reset=args.reset)
