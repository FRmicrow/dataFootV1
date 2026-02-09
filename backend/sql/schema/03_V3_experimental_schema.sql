-- V3 Experimental Schema
-- Based on DATABASE_SCHEMA_V3.md

-- 1. Countries
CREATE TABLE IF NOT EXISTS V3_Countries (
    country_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    flag_url TEXT,
    api_id INTEGER UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Venues
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

-- 3. Leagues (The brand)
CREATE TABLE IF NOT EXISTS V3_Leagues (
    league_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    type TEXT, -- League, Cup
    logo_url TEXT,
    country_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES V3_Countries(country_id)
);

-- 4. League Seasons (The specific edition tracker)
CREATE TABLE IF NOT EXISTS V3_League_Seasons (
    league_season_id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT 0,
    
    -- Status Flags
    coverage_fixtures BOOLEAN DEFAULT 0,
    coverage_standings BOOLEAN DEFAULT 0,
    coverage_players BOOLEAN DEFAULT 0,
    coverage_top_scorers BOOLEAN DEFAULT 0,
    coverage_predictions BOOLEAN DEFAULT 0,
    coverage_odds BOOLEAN DEFAULT 0,
    
    -- Import Tracking
    imported_fixtures BOOLEAN DEFAULT 0,
    imported_standings BOOLEAN DEFAULT 0,
    imported_players BOOLEAN DEFAULT 0,
    last_updated DATETIME,
    
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(league_id, season_year)
);

-- 5. Teams
CREATE TABLE IF NOT EXISTS V3_Teams (
    team_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    name TEXT NOT NULL,
    code TEXT,
    country_id INTEGER,
    founded INTEGER,
    national BOOLEAN DEFAULT 0,
    logo_url TEXT,
    venue_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES V3_Countries(country_id),
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id)
);

-- 6. Team Season Stats (Performance per season)
CREATE TABLE IF NOT EXISTS V3_Team_Season_Stats (
    stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    form TEXT,
    matches_played_home INTEGER DEFAULT 0,
    matches_played_away INTEGER DEFAULT 0,
    matches_played_total INTEGER DEFAULT 0,
    wins_home INTEGER DEFAULT 0,
    wins_away INTEGER DEFAULT 0,
    wins_total INTEGER DEFAULT 0,
    draws_home INTEGER DEFAULT 0,
    draws_away INTEGER DEFAULT 0,
    draws_total INTEGER DEFAULT 0,
    loses_home INTEGER DEFAULT 0,
    loses_away INTEGER DEFAULT 0,
    loses_total INTEGER DEFAULT 0,
    goals_for_home INTEGER DEFAULT 0,
    goals_for_away INTEGER DEFAULT 0,
    goals_for_total INTEGER DEFAULT 0,
    goals_against_home INTEGER DEFAULT 0,
    goals_against_away INTEGER DEFAULT 0,
    goals_against_total INTEGER DEFAULT 0,
    clean_sheets_home INTEGER DEFAULT 0,
    clean_sheets_away INTEGER DEFAULT 0,
    clean_sheets_total INTEGER DEFAULT 0,
    failed_to_score_home INTEGER DEFAULT 0,
    failed_to_score_away INTEGER DEFAULT 0,
    failed_to_score_total INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id)
);

-- 7. Players
CREATE TABLE IF NOT EXISTS V3_Players (
    player_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    first_name TEXT,
    last_name TEXT,
    name TEXT NOT NULL, -- Display Name
    age INTEGER,
    date_of_birth DATE,
    nationality_id INTEGER,
    height TEXT,
    weight TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nationality_id) REFERENCES V3_Countries(country_id)
);

-- 8. Player Stats (Detailed metrics per season)
CREATE TABLE IF NOT EXISTS V3_Player_Stats (
    stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    
    -- Game Time
    minutes_played INTEGER DEFAULT 0,
    position TEXT,
    rating REAL,
    captain BOOLEAN DEFAULT 0,
    substitute_in INTEGER DEFAULT 0,
    substitute_out INTEGER DEFAULT 0,
    bench INTEGER DEFAULT 0,
    
    -- Performance
    goals_total INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    passes_total INTEGER DEFAULT 0,
    passes_key INTEGER DEFAULT 0,
    passes_accuracy INTEGER DEFAULT 0,
    tackles_total INTEGER DEFAULT 0,
    blocks INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    duels_total INTEGER DEFAULT 0,
    duels_won INTEGER DEFAULT 0,
    dribbles_attempts INTEGER DEFAULT 0,
    dribbles_success INTEGER DEFAULT 0,
    fouls_drawn INTEGER DEFAULT 0,
    fouls_committed INTEGER DEFAULT 0,
    
    -- Cards
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    
    -- Penalty
    penalties_won INTEGER DEFAULT 0,
    penalties_commited INTEGER DEFAULT 0,
    penalties_scored INTEGER DEFAULT 0,
    penalties_missed INTEGER DEFAULT 0,
    penalties_saved INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id)
);

-- 9. Fixtures
CREATE TABLE IF NOT EXISTS V3_Fixtures (
    fixture_id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_id INTEGER UNIQUE,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    round TEXT,
    date DATETIME,
    timestamp INTEGER,
    timezone TEXT,
    venue_id INTEGER,
    status_long TEXT,
    status_short TEXT,
    status_elapsed INTEGER,
    
    home_team_id INTEGER,
    away_team_id INTEGER,
    
    goals_home INTEGER,
    goals_away INTEGER,
    halftime_score_home INTEGER,
    halftime_score_away INTEGER,
    fulltime_score_home INTEGER,
    fulltime_score_away INTEGER,
    extratime_score_home INTEGER,
    extratime_score_away INTEGER,
    penalty_score_home INTEGER,
    penalty_score_away INTEGER,
    
    referee TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    FOREIGN KEY (venue_id) REFERENCES V3_Venues(venue_id),
    FOREIGN KEY (home_team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (away_team_id) REFERENCES V3_Teams(team_id)
);
