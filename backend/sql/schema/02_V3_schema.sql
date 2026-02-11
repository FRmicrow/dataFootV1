-- ============================================
-- V3 Schema Definition
-- Optimized for mass import and analytical queries
-- ============================================

-- 1. BASE TABLES
CREATE TABLE IF NOT EXISTS V3_Countries (
    country_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    flag_url TEXT,
    flag_small_url TEXT,
    api_id INTEGER UNIQUE,
    importance_rank INTEGER DEFAULT 999, -- Synced from V2: 1=top priority, 999=unranked
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id)
);

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
    
    -- Coverage Flags
    coverage_standings BOOLEAN DEFAULT 0,
    coverage_players BOOLEAN DEFAULT 0,
    coverage_top_scorers BOOLEAN DEFAULT 0,
    coverage_top_assists BOOLEAN DEFAULT 0,
    coverage_top_cards BOOLEAN DEFAULT 0,
    coverage_injuries BOOLEAN DEFAULT 0,
    coverage_predictions BOOLEAN DEFAULT 0,
    coverage_odds BOOLEAN DEFAULT 0,
    
    -- Import Status Flags
    imported_standings BOOLEAN DEFAULT 0,
    imported_fixtures BOOLEAN DEFAULT 0,
    imported_players BOOLEAN DEFAULT 0,
    last_imported_at DATETIME,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(league_id, season_year)
);

-- 3. STATISTICAL DATA
CREATE TABLE IF NOT EXISTS V3_Player_Stats (
    stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    
    -- Game Stats
    games_appearences INTEGER DEFAULT 0,
    games_lineups INTEGER DEFAULT 0,
    games_minutes INTEGER DEFAULT 0,
    games_number INTEGER,
    games_position TEXT,
    games_rating TEXT,
    games_captain BOOLEAN DEFAULT 0,
    
    -- Substitutes
    substitutes_in INTEGER DEFAULT 0,
    substitutes_out INTEGER DEFAULT 0,
    substitutes_bench INTEGER DEFAULT 0,
    
    -- Shots
    shots_total INTEGER DEFAULT 0,
    shots_on INTEGER DEFAULT 0,
    
    -- Goals/Assists
    goals_total INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    goals_assists INTEGER DEFAULT 0,
    goals_saves INTEGER DEFAULT 0,
    
    -- Passes
    passes_total INTEGER DEFAULT 0,
    passes_key INTEGER DEFAULT 0,
    passes_accuracy INTEGER DEFAULT 0,
    
    -- Tackles
    tackles_total INTEGER DEFAULT 0,
    tackles_blocks INTEGER DEFAULT 0,
    tackles_interceptions INTEGER DEFAULT 0,
    
    -- Duels
    duels_total INTEGER DEFAULT 0,
    duels_won INTEGER DEFAULT 0,
    
    -- Dribbles
    dribbles_attempts INTEGER DEFAULT 0,
    dribbles_success INTEGER DEFAULT 0,
    dribbles_past INTEGER DEFAULT 0,
    
    -- Fouls
    fouls_drawn INTEGER DEFAULT 0,
    fouls_committed INTEGER DEFAULT 0,
    
    -- Cards
    cards_yellow INTEGER DEFAULT 0,
    cards_yellowred INTEGER DEFAULT 0,
    cards_red INTEGER DEFAULT 0,
    
    -- Penalties
    penalty_won INTEGER DEFAULT 0,
    penalty_commited INTEGER DEFAULT 0, -- API typo usually 'commited' or 'committed' depending on version, generic is 'commited' in v3
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

CREATE INDEX idx_v3_player_stats_season ON V3_Player_Stats(season_year);
CREATE INDEX idx_v3_player_stats_league ON V3_Player_Stats(league_id);
CREATE INDEX idx_v3_player_stats_team ON V3_Player_Stats(team_id);

-- 4. STANDINGS & FIXTURES (US-V3-POC-006)
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
    round TEXT, -- "Regular Season - 1"
    date DATETIME,
    timestamp INTEGER,
    timezone TEXT,
    venue_id INTEGER,
    
    -- Status
    status_long TEXT,
    status_short TEXT,
    elapsed INTEGER,
    
    -- Teams
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    
    -- Score
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
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id),
    FOREIGN KEY (home_team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (away_team_id) REFERENCES V3_Teams(team_id)
);

CREATE INDEX idx_v3_fixtures_league_season ON V3_Fixtures(league_id, season_year);
CREATE INDEX idx_v3_fixtures_date ON V3_Fixtures(date);
CREATE INDEX idx_v3_standings_league_season ON V3_Standings(league_id, season_year);
