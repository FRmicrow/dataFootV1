-- ============================================
-- V3 Unified Baseline Schema
-- Consensus version for mass import and analytical queries
-- ============================================

-- 1. BASE TABLES
CREATE TABLE IF NOT EXISTS V3_Countries (
    country_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    flag_url TEXT,
    flag_small_url TEXT,
    api_id INTEGER UNIQUE,
    importance_rank INTEGER DEFAULT 999,
    continent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS V3_Leagues (
    league_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    type TEXT, -- League, Cup
    logo_url TEXT,
    country_id INTEGER,
    importance_rank INTEGER DEFAULT 999,
    is_discovered BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES V3_Countries(country_id)
);

CREATE TABLE IF NOT EXISTS V3_Venues (
    venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    capacity INTEGER,
    surface TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS V3_Teams;
CREATE TABLE IF NOT EXISTS V3_Teams (
    team_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    code TEXT,
    country TEXT,
    founded INTEGER,
    national BOOLEAN DEFAULT 0,
    is_national_team BOOLEAN DEFAULT 0,
    logo_url TEXT,
    venue_id INTEGER,
    accent_color TEXT,
    scout_rank REAL, -- For sorting relevance
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id)
);

DROP TABLE IF EXISTS V3_Players;
CREATE TABLE IF NOT EXISTS V3_Players (
    player_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    firstname TEXT,
    lastname TEXT,
    age INTEGER,
    birth_date TEXT,
    birth_place TEXT,
    birth_country TEXT,
    nationality TEXT,
    height TEXT,
    weight TEXT,
    injured BOOLEAN,
    photo_url TEXT,
    scout_rank REAL, -- For sorting relevance
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. SEASONAL TRACKING
CREATE TABLE IF NOT EXISTS V3_League_Seasons (
    league_season_id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN DEFAULT 0,
    sync_status TEXT DEFAULT 'NONE', -- NONE, PARTIAL_DISCOVERY, SYNCED
    
    -- Coverage Flags
    coverage_fixtures BOOLEAN DEFAULT 0,
    coverage_standings BOOLEAN DEFAULT 0,
    coverage_players BOOLEAN DEFAULT 0,
    coverage_top_scorers BOOLEAN DEFAULT 0,
    coverage_top_assists BOOLEAN DEFAULT 0,
    coverage_top_cards BOOLEAN DEFAULT 0,
    coverage_injuries BOOLEAN DEFAULT 0,
    coverage_predictions BOOLEAN DEFAULT 0,
    coverage_odds BOOLEAN DEFAULT 0,
    
    -- Import Status Flags (Legacy but kept for compatibility)
    imported_standings BOOLEAN DEFAULT 0,
    imported_fixtures BOOLEAN DEFAULT 0,
    imported_players BOOLEAN DEFAULT 0,
    last_imported_at DATETIME,
    last_updated DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(league_id, season_year)
);

-- 3. STANDINGS & FIXTURES
CREATE TABLE IF NOT EXISTS V3_Standings (
    standings_id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    points INTEGER DEFAULT 0,
    goals_diff INTEGER DEFAULT 0,
    played INTEGER DEFAULT 0,
    win INTEGER DEFAULT 0,
    draw INTEGER DEFAULT 0,
    lose INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    form TEXT,
    status TEXT, -- "Promotion", "Relegation"
    description TEXT,
    group_name TEXT, -- For Cups/Group stages
    update_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    UNIQUE(league_id, season_year, team_id, group_name)
);

CREATE TABLE IF NOT EXISTS V3_Fixtures (
    fixture_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    round TEXT,
    date DATETIME,
    timestamp INTEGER,
    timezone TEXT,
    venue_id INTEGER,
    status_long TEXT,
    status_short TEXT,
    elapsed INTEGER,
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    goals_home INTEGER,
    goals_away INTEGER,
    score_halftime_home INTEGER,
    score_halftime_away INTEGER,
    score_fulltime_home INTEGER,
    score_fulltime_away INTEGER,
    score_extratime_home INTEGER,
    score_extratime_away INTEGER,
    score_penalty_home INTEGER,
    score_penalty_away INTEGER,
    referee TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id),
    FOREIGN KEY (home_team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (away_team_id) REFERENCES V3_Teams(team_id)
);

-- 4. MATCH EVENTS & DETAILS
CREATE TABLE IF NOT EXISTS V3_Fixture_Events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    time_elapsed INTEGER NOT NULL,
    extra_minute INTEGER,
    team_id INTEGER,
    player_id INTEGER,
    player_name TEXT,
    assist_id INTEGER,
    assist_name TEXT,
    type TEXT NOT NULL, -- 'Goal', 'Card', 'subst', 'Var'
    detail TEXT,        -- 'Normal Goal', 'Yellow Card'
    comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS V3_Fixture_Stats (
    fixture_stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    half TEXT NOT NULL, -- 'FT', '1H', '2H'
    shots_on_goal INTEGER DEFAULT 0,
    shots_off_goal INTEGER DEFAULT 0,
    shots_inside_box INTEGER DEFAULT 0,
    shots_outside_box INTEGER DEFAULT 0,
    shots_total INTEGER DEFAULT 0,
    shots_blocked INTEGER DEFAULT 0,
    fouls INTEGER DEFAULT 0,
    corner_kicks INTEGER DEFAULT 0,
    offsides INTEGER DEFAULT 0,
    ball_possession TEXT,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    goalkeeper_saves INTEGER DEFAULT 0,
    passes_total INTEGER DEFAULT 0,
    passes_accurate INTEGER DEFAULT 0,
    pass_accuracy_pct INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    UNIQUE(fixture_id, team_id, half)
);

CREATE TABLE IF NOT EXISTS V3_Fixture_Player_Stats (
    fixture_player_stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    is_start_xi BOOLEAN DEFAULT 1,
    minutes_played INTEGER DEFAULT 0,
    position TEXT,
    rating TEXT,
    goals_total INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    goals_assists INTEGER DEFAULT 0,
    goals_saves INTEGER DEFAULT 0,
    shots_total INTEGER DEFAULT 0,
    shots_on INTEGER DEFAULT 0,
    passes_total INTEGER DEFAULT 0,
    passes_key INTEGER DEFAULT 0,
    passes_accuracy INTEGER DEFAULT 0,
    tackles_total INTEGER DEFAULT 0,
    tackles_blocks INTEGER DEFAULT 0,
    tackles_interceptions INTEGER DEFAULT 0,
    duels_total INTEGER DEFAULT 0,
    duels_won INTEGER DEFAULT 0,
    dribbles_attempts INTEGER DEFAULT 0,
    dribbles_success INTEGER DEFAULT 0,
    fouls_drawn INTEGER DEFAULT 0,
    fouls_committed INTEGER DEFAULT 0,
    cards_yellow INTEGER DEFAULT 0,
    cards_red INTEGER DEFAULT 0,
    penalty_won INTEGER DEFAULT 0,
    penalty_commited INTEGER DEFAULT 0,
    penalty_scored INTEGER DEFAULT 0,
    penalty_missed INTEGER DEFAULT 0,
    penalty_saved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    UNIQUE(fixture_id, player_id)
);

-- 5. SEASONAL STATISTICS
CREATE TABLE IF NOT EXISTS V3_Player_Season_Stats (
    season_stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    appearances INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    goals_assists INTEGER DEFAULT 0,
    goals_per_90 REAL DEFAULT 0.0,
    assists_per_90 REAL DEFAULT 0.0,
    shots_per_90 REAL DEFAULT 0.0,
    shots_on_target_per_90 REAL DEFAULT 0.0,
    passes_per_90 REAL DEFAULT 0.0,
    key_passes_per_90 REAL DEFAULT 0.0,
    tackles_per_90 REAL DEFAULT 0.0,
    interceptions_per_90 REAL DEFAULT 0.0,
    duels_won_per_90 REAL DEFAULT 0.0,
    dribbles_success_per_90 REAL DEFAULT 0.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(player_id, team_id, league_id, season_year)
);

-- Compatibility / Legacy Stat table (from 02_V3)
CREATE TABLE IF NOT EXISTS V3_Player_Stats (
    stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    games_appearences INTEGER DEFAULT 0,
    games_lineups INTEGER DEFAULT 0,
    games_minutes INTEGER DEFAULT 0,
    games_number INTEGER,
    games_position TEXT,
    games_rating TEXT,
    games_captain BOOLEAN DEFAULT 0,
    substitutes_in INTEGER DEFAULT 0,
    substitutes_out INTEGER DEFAULT 0,
    substitutes_bench INTEGER DEFAULT 0,
    shots_total INTEGER DEFAULT 0,
    shots_on INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    goals_assists INTEGER DEFAULT 0,
    goals_saves INTEGER DEFAULT 0,
    passes_total INTEGER DEFAULT 0,
    passes_key INTEGER DEFAULT 0,
    passes_accuracy INTEGER DEFAULT 0,
    tackles_total INTEGER DEFAULT 0,
    tackles_blocks INTEGER DEFAULT 0,
    tackles_interceptions INTEGER DEFAULT 0,
    duels_total INTEGER DEFAULT 0,
    duels_won INTEGER DEFAULT 0,
    dribbles_attempts INTEGER DEFAULT 0,
    dribbles_success INTEGER DEFAULT 0,
    dribbles_past INTEGER DEFAULT 0,
    fouls_drawn INTEGER DEFAULT 0,
    fouls_committed INTEGER DEFAULT 0,
    cards_yellow INTEGER DEFAULT 0,
    cards_yellowred INTEGER DEFAULT 0,
    cards_red INTEGER DEFAULT 0,
    penalty_won INTEGER DEFAULT 0,
    penalty_commited INTEGER DEFAULT 0,
    penalty_scored INTEGER DEFAULT 0,
    penalty_missed INTEGER DEFAULT 0,
    penalty_saved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(player_id, team_id, league_id, season_year)
);

-- 6. TROPHIES
CREATE TABLE IF NOT EXISTS V3_Trophies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER,
    league_id INTEGER,
    season_year INTEGER NOT NULL,
    name TEXT NOT NULL,
    place TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id)
);

-- 6.5 PRE-MATCH ODDS
CREATE TABLE IF NOT EXISTS V3_Odds (
    odd_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    bookmaker_id INTEGER NOT NULL,
    bookmaker_name TEXT NOT NULL,
    bet_id INTEGER NOT NULL,
    bet_name TEXT NOT NULL,
    value_label TEXT NOT NULL, -- e.g. "Home", "Draw", "Away", "Over 2.5"
    value_odd TEXT NOT NULL,   -- The actual odd string value (usually float as string)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    UNIQUE(fixture_id, bookmaker_id, bet_id, value_label)
);


-- 7. IMPORT SYSTEM & AUDIT
CREATE TABLE IF NOT EXISTS V3_Import_Status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    pillar TEXT NOT NULL CHECK(pillar IN ('core', 'events', 'lineups', 'trophies', 'fs', 'ps')),
    status INTEGER NOT NULL DEFAULT 0 CHECK(status IN (0, 1, 2, 3, 4)),
    consecutive_failures INTEGER DEFAULT 0,
    failure_reason TEXT,
    total_items_expected INTEGER,
    total_items_imported INTEGER DEFAULT 0,
    data_range_start INTEGER,
    data_range_end INTEGER,
    last_checked_at DATETIME,
    last_success_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id) ON DELETE CASCADE,
    UNIQUE(league_id, season_year, pillar)
);

CREATE TABLE IF NOT EXISTS V3_Cleanup_History (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    original_pk_id INTEGER,
    raw_data TEXT NOT NULL,
    reason TEXT,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. INDICES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_v3_fixtures_league_season ON V3_Fixtures(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_fixtures_date ON V3_Fixtures(date);
CREATE INDEX IF NOT EXISTS idx_v3_standings_league_season ON V3_Standings(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_events_fixture ON V3_Fixture_Events(fixture_id);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_stats_fixture ON V3_Fixture_Stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_player_stats_fixture ON V3_Fixture_Player_Stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_player_stats_player ON V3_Fixture_Player_Stats(player_id);
CREATE INDEX IF NOT EXISTS idx_v3_player_season_stats_composite ON V3_Player_Season_Stats(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_leagues_name_country ON V3_Leagues(name, country_id);
CREATE INDEX IF NOT EXISTS idx_v3_trophies_player_id ON V3_Trophies(player_id);
CREATE INDEX IF NOT EXISTS idx_import_status_lookup ON V3_Import_Status(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_odds_fixture ON V3_Odds(fixture_id);

