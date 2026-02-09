-- ============================================================================
-- V3 SCHEMA: API-FOOTBALL ALIGNED ARCHITECTURE
-- Designed for complete data integrity, tracking, and future-proofing.
-- ============================================================================

-- ============================================================================
-- 1. REGIONAL & META DATA
-- ============================================================================

CREATE TABLE V3_Countries (
    country_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT, -- ISO code (e.g., "GB", "FR")
    flag_url TEXT,
    api_id INTEGER UNIQUE, -- Mapping to API-Football "countries" endpoint
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. COMPETITION STRUCTURE
-- ============================================================================

CREATE TABLE V3_Leagues (
    league_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT, -- "League", "Cup"
    logo_url TEXT,
    country_id INTEGER,
    api_id INTEGER UNIQUE, -- Mapping to API-Football "leagues" endpoint
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    formatted_slug TEXT, -- URL friendly name for frontend
    FOREIGN KEY (country_id) REFERENCES V3_Countries(country_id)
);

-- Essential for "Tracker" requirement: Which season of which league is imported?
CREATE TABLE V3_League_Seasons (
    ls_id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL, -- e.g., 2010, 2023
    
    -- API Coverage Metadata (What the API offers for this season)
    start_date DATE,
    end_date DATE,
    coverage_events BOOLEAN DEFAULT 0,
    coverage_lineups BOOLEAN DEFAULT 0,
    coverage_players BOOLEAN DEFAULT 0,
    coverage_top_scorers BOOLEAN DEFAULT 0,
    coverage_predictions BOOLEAN DEFAULT 0,
    coverage_odds BOOLEAN DEFAULT 0,
    
    -- Import Status Tracking (Tracking exactly what we have fetched)
    is_fully_imported BOOLEAN DEFAULT 0, -- Master flag
    imported_standings BOOLEAN DEFAULT 0,
    imported_fixtures BOOLEAN DEFAULT 0,
    imported_players BOOLEAN DEFAULT 0, -- If true, player stats for this season are fetched
    imported_odd BOOLEAN DEFAULT 0,
    last_updated_at DATETIME,
    
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(league_id, season_year) -- One entry per league-season pair
);

-- ============================================================================
-- 3. TEAMS & VENUES
-- ============================================================================

CREATE TABLE V3_Venues (
    venue_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    address TEXT,
    city TEXT,
    capacity INTEGER,
    surface TEXT, -- grass, artificial
    image_url TEXT,
    api_id INTEGER UNIQUE, -- Mapping to specific venue info if available
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE V3_Teams (
    team_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT, -- TLA (Three Letter Acronym)
    country_id INTEGER,
    founded INTEGER,
    national BOOLEAN DEFAULT 0, -- Is it a national team?
    logo_url TEXT,
    venue_id INTEGER, -- Primary home venue
    api_id INTEGER UNIQUE, -- Mapping to API-Football criteria
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES V3_Countries(country_id),
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id)
);

-- Teams participate in leagues each season.
-- This table is implicitly derived from Standings, but useful for quick lookups if needed.
-- Often redundant if strict normalization is preferred, but for performance:
CREATE TABLE V3_Team_Season_Stats (
    team_season_id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    form TEXT, -- "WWLDW"
    played_total INTEGER DEFAULT 0,
    played_home INTEGER DEFAULT 0,
    played_away INTEGER DEFAULT 0,
    wins_total INTEGER DEFAULT 0,
    draws_total INTEGER DEFAULT 0,
    loses_total INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    rank INTEGER, -- Current position in table
    status TEXT, -- "Promotion", "Relegation" etc.
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(team_id, league_id, season_year)
);

-- ============================================================================
-- 4. PLAYERS & SQUADS
-- ============================================================================

CREATE TABLE V3_Players (
    player_id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstname TEXT,
    lastname TEXT,
    name TEXT, -- Common display name
    age INTEGER, -- Dynamic but stored for snapshot
    birth_date DATE,
    birth_place TEXT,
    birth_country TEXT,
    nationality TEXT, -- Primary
    height TEXT,
    weight TEXT,
    injured BOOLEAN DEFAULT 0,
    photo_url TEXT,
    api_id INTEGER UNIQUE, -- Mapping to API-Football
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE V3_Player_Stats (
    stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    
    -- Positioning
    position TEXT, -- Attacker, Defender...
    captain BOOLEAN DEFAULT 0,
    
    -- Game Time
    appearances INTEGER DEFAULT 0,
    lineups INTEGER DEFAULT 0,
    minutes INTEGER DEFAULT 0,
    
    -- Performance
    rating FLOAT, -- Average rating
    goals_total INTEGER DEFAULT 0,
    goals_assists INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    goals_saves INTEGER DEFAULT 0,
    passes_total INTEGER DEFAULT 0,
    passes_key INTEGER DEFAULT 0,
    passes_accuracy INTEGER,
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
    cards_yellowred INTEGER DEFAULT 0,
    cards_red INTEGER DEFAULT 0,
    penalty_won INTEGER DEFAULT 0,
    penalty_commited INTEGER DEFAULT 0,
    penalty_scored INTEGER DEFAULT 0,
    penalty_missed INTEGER DEFAULT 0,
    penalty_saved INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(player_id, team_id, league_id, season_year)
);

-- Transfer History (Optional but powerful)
CREATE TABLE V3_Transfers (
    transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_in_id INTEGER, -- Can be null if retired/free agent
    team_out_id INTEGER,
    transfer_date DATE,
    type TEXT, -- "Free", "Loan", "€ 50M"
    api_id INTEGER UNIQUE, -- API transfers usually don't have IDs, so composite key might be better, but we leave this for now.
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_in_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (team_out_id) REFERENCES V3_Teams(team_id)
);

-- ============================================================================
-- 5. MATCHES (FIXTURES)
-- ============================================================================

CREATE TABLE V3_Fixtures (
    fixture_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE NOT NULL, -- The main hook for detailed match data
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    round TEXT, -- "Regular Season - 1"
    venue_id INTEGER,
    date DATETIME, -- UTC
    timestamp INTEGER, -- Unix
    
    -- Status
    status_long TEXT, -- "Match Finished"
    status_short TEXT, -- "FT"
    elapsed INTEGER, -- Minutes played
    
    -- Teams
    home_team_id INTEGER NOT NULL,
    away_team_id INTEGER NOT NULL,
    
    -- Score
    goals_home INTEGER DEFAULT 0,
    goals_away INTEGER DEFAULT 0,
    score_halftime_home INTEGER,
    score_halftime_away INTEGER,
    score_fulltime_home INTEGER,
    score_fulltime_away INTEGER,
    score_extratime_home INTEGER,
    score_extratime_away INTEGER,
    score_penalty_home INTEGER,
    score_penalty_away INTEGER,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id),
    FOREIGN KEY (home_team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (away_team_id) REFERENCES V3_Teams(team_id)
);

-- ============================================================================
-- 6. TROPHIES
-- ============================================================================

CREATE TABLE V3_Trophies (
    trophy_id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL, -- or string "2020-2021"
    place TEXT, -- "Winner", "Second Place"
    
    -- Polymorphic relationship (Team or Player)
    team_id INTEGER,
    player_id INTEGER,
    
    start_season_year INTEGER, -- Sometimes trophies span
    end_season_year INTEGER,
    
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id)
);

-- Indexes for alignment and speed
CREATE INDEX idx_v3_leagues_api ON V3_Leagues(api_id);
CREATE INDEX idx_v3_teams_api ON V3_Teams(api_id);
CREATE INDEX idx_v3_players_api ON V3_Players(api_id);
CREATE INDEX idx_v3_fixtures_api ON V3_Fixtures(api_id);
CREATE INDEX idx_v3_player_stats_search ON V3_Player_Stats(player_id, season_year);
CREATE INDEX idx_v3_fixtures_date ON V3_Fixtures(date);
