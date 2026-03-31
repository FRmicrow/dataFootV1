-- ============================================
-- V3 Unified Baseline Schema
-- Consensus version for mass import and analytical queries
-- ============================================

-- 1. BASE TABLES
CREATE TABLE IF NOT EXISTS V3_Countries (
    country_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    flag_url TEXT,
    flag_small_url TEXT,
    api_id INTEGER UNIQUE,
    importance_rank INTEGER DEFAULT 999,
    continent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS V3_Leagues (
    league_id SERIAL PRIMARY KEY,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    type TEXT, -- League, Cup
    logo_url TEXT,
    country_id INTEGER,
    importance_rank INTEGER DEFAULT 999,
    is_discovered BOOLEAN DEFAULT FALSE,
    is_live_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES V3_Countries(country_id)
);

CREATE TABLE IF NOT EXISTS V3_Venues (
    venue_id SERIAL PRIMARY KEY,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    capacity INTEGER,
    surface TEXT,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS V3_Teams;
CREATE TABLE IF NOT EXISTS V3_Teams (
    team_id SERIAL PRIMARY KEY,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    code TEXT,
    country TEXT,
    founded INTEGER,
    national BOOLEAN DEFAULT FALSE,
    is_national_team BOOLEAN DEFAULT FALSE,
    logo_url TEXT,
    venue_id INTEGER,
    accent_color TEXT,
    scout_rank REAL, -- For sorting relevance
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id)
);

DROP TABLE IF EXISTS V3_Players;
CREATE TABLE IF NOT EXISTS V3_Players (
    player_id SERIAL PRIMARY KEY,
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
    is_trophy_synced BOOLEAN DEFAULT FALSE,
    last_sync_trophies TIMESTAMPTZ,
    position TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. SEASONAL TRACKING
CREATE TABLE IF NOT EXISTS V3_League_Seasons (
    league_season_id SERIAL PRIMARY KEY,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    start_date TEXT,
    end_date TEXT,
    is_current BOOLEAN DEFAULT FALSE,
    sync_status TEXT DEFAULT 'NONE', -- NONE, PARTIAL_DISCOVERY, SYNCED
    
    -- Coverage Flags
    coverage_fixtures BOOLEAN DEFAULT FALSE,
    coverage_standings BOOLEAN DEFAULT FALSE,
    coverage_players BOOLEAN DEFAULT FALSE,
    coverage_top_scorers BOOLEAN DEFAULT FALSE,
    coverage_top_assists BOOLEAN DEFAULT FALSE,
    coverage_top_cards BOOLEAN DEFAULT FALSE,
    coverage_injuries BOOLEAN DEFAULT FALSE,
    coverage_predictions BOOLEAN DEFAULT FALSE,
    coverage_odds BOOLEAN DEFAULT FALSE,
    
    -- Import & Sync Status Flags
    imported_standings BOOLEAN DEFAULT FALSE,
    imported_fixtures BOOLEAN DEFAULT FALSE,
    imported_players BOOLEAN DEFAULT FALSE,
    imported_events BOOLEAN DEFAULT FALSE,
    imported_lineups BOOLEAN DEFAULT FALSE,
    imported_trophies BOOLEAN DEFAULT FALSE,
    imported_fixture_stats BOOLEAN DEFAULT FALSE,
    imported_player_stats BOOLEAN DEFAULT FALSE,
    
    -- Sync Timestamps
    last_sync_core TIMESTAMPTZ,
    last_sync_events TIMESTAMPTZ,
    last_sync_lineups TIMESTAMPTZ,
    last_sync_trophies TIMESTAMPTZ,
    last_sync_fixture_stats TIMESTAMPTZ,
    last_sync_player_stats TIMESTAMPTZ,
    
    last_imported_at TIMESTAMPTZ,
    last_updated TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(league_id, season_year)
);

-- 3. STANDINGS & FIXTURES
CREATE TABLE IF NOT EXISTS V3_Standings (
    standings_id SERIAL PRIMARY KEY,
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
    update_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    UNIQUE(league_id, season_year, team_id, group_name)
);

CREATE TABLE IF NOT EXISTS V3_Fixtures (
    fixture_id SERIAL PRIMARY KEY,
    api_id INTEGER UNIQUE, -- Note: can be NULL for manually created shells
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    round TEXT,
    date TIMESTAMPTZ,
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
    xg_home REAL,
    xg_away REAL,
    data_source TEXT DEFAULT 'api_football',
    external_id TEXT,
    tm_match_id TEXT,
    home_logo_url TEXT,
    away_logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id),
    FOREIGN KEY (home_team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (away_team_id) REFERENCES V3_Teams(team_id)
);

-- 4. MATCH EVENTS & DETAILS
CREATE TABLE IF NOT EXISTS V3_Fixture_Events (
    id SERIAL PRIMARY KEY,
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
    data_source TEXT DEFAULT 'api_football',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS V3_Fixture_Lineups (
    lineup_id SERIAL PRIMARY KEY,
    fixture_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    formation TEXT,
    coach_id INTEGER,
    coach_name TEXT,
    coach_photo TEXT,
    starting_xi TEXT, -- JSON Array of {player: {name, number, pos, grid}}
    substitutes TEXT, -- JSON Array of {player: {name, number, pos, grid}}
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    UNIQUE(fixture_id, team_id)
);

CREATE TABLE IF NOT EXISTS V3_Fixture_Stats (
    fixture_stats_id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    UNIQUE(fixture_id, team_id, half)
);

CREATE TABLE IF NOT EXISTS V3_Fixture_Player_Stats (
    fixture_player_stats_id SERIAL PRIMARY KEY,
    fixture_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    is_start_xi BOOLEAN DEFAULT TRUE,
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    UNIQUE(fixture_id, player_id)
);

-- 5. SEASONAL STATISTICS
CREATE TABLE IF NOT EXISTS V3_Player_Season_Stats (
    season_stat_id SERIAL PRIMARY KEY,
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(player_id, team_id, league_id, season_year)
);

-- Compatibility / Legacy Stat table (from 02_V3)
CREATE TABLE IF NOT EXISTS V3_Player_Stats (
    stat_id SERIAL PRIMARY KEY,
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
    games_captain BOOLEAN DEFAULT FALSE,
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
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(player_id, team_id, league_id, season_year)
);

-- 6. TROPHIES
CREATE TABLE IF NOT EXISTS V3_Trophies (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL,
    team_id INTEGER,
    league_id INTEGER,
    season_year INTEGER NOT NULL,
    name TEXT NOT NULL,
    place TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id)
);

-- 6.5 PRE-MATCH ODDS (Wide Schema)
CREATE TABLE IF NOT EXISTS V3_Odds (
    odds_id SERIAL PRIMARY KEY,
    fixture_id INTEGER NOT NULL,
    bookmaker_id INTEGER NOT NULL,
    market_id INTEGER NOT NULL,
    value_home_over REAL,
    value_draw REAL,
    value_away_under REAL,
    handicap_value REAL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    UNIQUE NULLS NOT DISTINCT (fixture_id, bookmaker_id, market_id, handicap_value)
);


-- 7. IMPORT SYSTEM & AUDIT
CREATE TABLE IF NOT EXISTS V3_System_Preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    favorite_leagues JSON DEFAULT '[]',
    favorite_teams JSON DEFAULT '[]',
    tracked_leagues TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS V3_Predictions (
    id SERIAL PRIMARY KEY,
    fixture_id INTEGER NOT NULL UNIQUE,
    league_id INTEGER,
    season TEXT,
    winner_id INTEGER,
    winner_name TEXT,
    winner_comment TEXT,
    prob_home TEXT,
    prob_draw TEXT,
    prob_away TEXT,
    goals_home INTEGER,
    goals_away INTEGER,
    advice TEXT,
    comparison_data JSON,
    h2h_data JSON,
    teams_data JSON,
    edge_value REAL,
    confidence_score INTEGER,
    risk_level TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS V3_Import_Status (
    id SERIAL PRIMARY KEY,
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
    last_checked_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id) ON DELETE CASCADE,
    UNIQUE(league_id, season_year, pillar)
);

CREATE TABLE IF NOT EXISTS V3_Cleanup_History (
    id SERIAL PRIMARY KEY,
    group_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    original_pk_id INTEGER,
    raw_data TEXT NOT NULL,
    reason TEXT,
    deleted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. INDICES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_v3_fixtures_league_season ON V3_Fixtures(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_fixtures_date ON V3_Fixtures(date);
CREATE INDEX IF NOT EXISTS idx_v3_standings_league_season ON V3_Standings(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_events_fixture ON V3_Fixture_Events(fixture_id);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_stats_fixture ON V3_Fixture_Stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_player_stats_fixture ON V3_Fixture_Player_Stats(fixture_id);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_player_stats_player ON V3_Fixture_Player_Stats(player_id);
CREATE INDEX IF NOT EXISTS idx_v3_fixture_lineups_fixture ON V3_Fixture_Lineups(fixture_id);
CREATE INDEX IF NOT EXISTS idx_v3_player_season_stats_composite ON V3_Player_Season_Stats(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_leagues_name_country ON V3_Leagues(name, country_id);
CREATE INDEX IF NOT EXISTS idx_v3_trophies_player_id ON V3_Trophies(player_id);
CREATE INDEX IF NOT EXISTS idx_import_status_lookup ON V3_Import_Status(league_id, season_year);
CREATE INDEX IF NOT EXISTS idx_v3_odds_fixture ON V3_Odds(fixture_id);

