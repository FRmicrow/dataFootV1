
-- V2 Schema Creation for SQLite

-- ============================================
-- REFERENCE TABLES (Lookup/Master Data)
-- ============================================

-- Countries
CREATE TABLE V2_countries (
    country_id INTEGER PRIMARY KEY AUTOINCREMENT,
    country_name TEXT NOT NULL UNIQUE,
    country_code TEXT UNIQUE, -- ISO code (FRA, ESP, ENG, etc.)
    importance_rank INTEGER DEFAULT 999, -- For sorting (1-5 for big leagues)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Trophy Types (categories)
CREATE TABLE V2_trophy_types (
    trophy_type_id INTEGER PRIMARY KEY AUTOINCREMENT,
    type_name TEXT NOT NULL UNIQUE, -- 'UEFA', 'FIFA', 'Domestic League', 'Domestic Cup', 'Continental', 'International'
    type_order INTEGER DEFAULT 0, -- For display ordering
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Competitions
CREATE TABLE V2_competitions (
    competition_id INTEGER PRIMARY KEY AUTOINCREMENT,
    competition_name TEXT NOT NULL,
    competition_short_name TEXT, -- UCL, EPL, La Liga, etc.
    trophy_type_id INTEGER,
    country_id INTEGER NULL, -- NULL for international competitions
    level INTEGER DEFAULT 1, -- 1 = top tier, 2 = second tier, etc.
    is_active BOOLEAN DEFAULT 1,
    start_year INTEGER, -- When competition was founded
    end_year INTEGER NULL, -- NULL if still active
    api_id INTEGER, -- API-Football ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trophy_type_id) REFERENCES V2_trophy_types(trophy_type_id),
    FOREIGN KEY (country_id) REFERENCES V2_countries(country_id)
);
CREATE INDEX idx_V2_competition_country ON V2_competitions(country_id);
CREATE INDEX idx_V2_competition_type ON V2_competitions(trophy_type_id);
CREATE INDEX idx_V2_competitions_api_id ON V2_competitions(api_id);

-- ============================================
-- CLUBS
-- ============================================

CREATE TABLE V2_clubs (
    club_id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_name TEXT NOT NULL,
    club_short_name TEXT, -- Abbreviated name
    country_id INTEGER NOT NULL,
    city TEXT,
    stadium_name TEXT,
    stadium_capacity INTEGER,
    founded_year INTEGER,
    club_logo_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    api_id INTEGER, -- API-Football ID
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country_id) REFERENCES V2_countries(country_id)
);
CREATE INDEX idx_V2_club_country ON V2_clubs(country_id);
CREATE INDEX idx_V2_club_name ON V2_clubs(club_name);
CREATE INDEX idx_V2_clubs_api_id ON V2_clubs(api_id);

-- ============================================
-- PLAYERS
-- ============================================

CREATE TABLE V2_players (
    player_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    nationality_id INTEGER NOT NULL, -- Primary nationality
    photo_url TEXT,
    position TEXT, -- GK, DEF, MID, FWD
    preferred_foot TEXT, -- Left, Right, Both
    height_cm INTEGER,
    weight_kg INTEGER,
    birth_country TEXT,
    birth_place TEXT,
    is_active BOOLEAN DEFAULT 1,
    api_id INTEGER, -- API-Football ID
    fully_imported BOOLEAN NOT NULL DEFAULT 0,
    last_full_sync DATETIME, -- Tracking for career sync
    is_history_complete BOOLEAN DEFAULT 0, -- Fully backfilled career flag
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nationality_id) REFERENCES V2_countries(country_id)
);
CREATE INDEX idx_V2_player_nationality ON V2_players(nationality_id);
CREATE INDEX idx_V2_player_name ON V2_players(last_name, first_name);
CREATE INDEX idx_V2_players_api_id ON V2_players(api_id);

-- Player Secondary Nationalities (for dual citizenship)
CREATE TABLE V2_player_nationalities (
    player_nationality_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    country_id INTEGER NOT NULL,
    is_primary BOOLEAN DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES V2_players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (country_id) REFERENCES V2_countries(country_id),
    UNIQUE (player_id, country_id)
);

-- ============================================
-- PLAYER-CLUB RELATIONSHIPS (Career History)
-- ============================================

CREATE TABLE V2_player_club_history (
    history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    season_start TEXT NOT NULL, -- '2023-24' format
    season_end TEXT NULL, -- NULL if current club
    year_start INTEGER NOT NULL, -- 2023 (for easier querying)
    year_end INTEGER NULL, -- 2024 or NULL if current
    is_loan BOOLEAN DEFAULT 0,
    shirt_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES V2_players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES V2_clubs(club_id)
);
CREATE INDEX idx_V2_player_history ON V2_player_club_history(player_id, year_start);
CREATE INDEX idx_V2_club_history ON V2_player_club_history(club_id, year_start);
CREATE INDEX idx_V2_season ON V2_player_club_history(season_start, season_end);

-- ============================================
-- PLAYER STATISTICS (Season by Season)
-- ============================================

CREATE TABLE V2_player_statistics (
    stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL, -- Which club they played for
    competition_id INTEGER NULL, -- Specific competition or NULL for all competitions
    season TEXT NOT NULL, -- '2023-24'
    year INTEGER NOT NULL, -- 2023 (for easier querying)
    
    -- Statistics
    matches_played INTEGER DEFAULT 0,
    matches_started INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    
    -- Optional advanced stats
    clean_sheets INTEGER DEFAULT 0, -- For goalkeepers/defenders
    penalty_goals INTEGER DEFAULT 0,
    penalty_misses INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES V2_players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES V2_clubs(club_id),
    FOREIGN KEY (competition_id) REFERENCES V2_competitions(competition_id),
    
    UNIQUE (player_id, club_id, competition_id, season)
);
CREATE INDEX idx_V2_player_stats ON V2_player_statistics(player_id, year);
CREATE INDEX idx_V2_club_stats ON V2_player_statistics(club_id, year);
CREATE INDEX idx_V2_season_stats ON V2_player_statistics(season);
CREATE INDEX idx_V2_player_stats_year_club ON V2_player_statistics(year, club_id, player_id);
CREATE INDEX idx_V2_player_statistics_player_season ON V2_player_statistics(player_id, season);
CREATE UNIQUE INDEX idx_player_stats_unique ON V2_player_statistics(player_id, club_id, competition_id, season);

-- ============================================
-- CLUB TROPHIES
-- ============================================

CREATE TABLE V2_club_trophies (
    club_trophy_id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL,
    competition_id INTEGER NOT NULL,
    season TEXT NOT NULL, -- '2023-24'
    year INTEGER NOT NULL, -- Year trophy was won (2024)
    is_runner_up BOOLEAN DEFAULT 0, -- Track finals lost
    notes TEXT, -- Additional context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (club_id) REFERENCES V2_clubs(club_id) ON DELETE CASCADE,
    FOREIGN KEY (competition_id) REFERENCES V2_competitions(competition_id),
    UNIQUE (club_id, competition_id, year)
);
CREATE INDEX idx_V2_club_trophies ON V2_club_trophies(club_id, year);
CREATE INDEX idx_V2_competition_winners ON V2_club_trophies(competition_id, year);
CREATE INDEX idx_V2_club_trophy_year ON V2_club_trophies(year, club_id);

-- ============================================
-- V2_PLAYER TROPHIES
-- ============================================

CREATE TABLE V2_player_trophies (
    player_trophy_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    club_id INTEGER NULL, -- NULL for individual awards (Ballon d'Or)
    competition_id INTEGER NOT NULL,
    season TEXT NOT NULL, -- '2023-24'
    year INTEGER NOT NULL, -- Year trophy was won
    is_team_trophy BOOLEAN DEFAULT 1, -- FALSE for individual awards
    was_key_player BOOLEAN DEFAULT 0, -- Significant contributor?
    appearances_in_competition INTEGER DEFAULT 0, -- How many matches played
    goals_in_competition INTEGER DEFAULT 0, -- Goals in that trophy run
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES V2_players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (club_id) REFERENCES V2_clubs(club_id),
    FOREIGN KEY (competition_id) REFERENCES V2_competitions(competition_id)
);
CREATE INDEX idx_V2_player_trophies ON V2_player_trophies(player_id, year);
CREATE INDEX idx_V2_club_player_trophies ON V2_player_trophies(club_id, player_id, year);
CREATE INDEX idx_V2_competition_players ON V2_player_trophies(competition_id, year);
CREATE INDEX idx_V2_player_trophy_year_club ON V2_player_trophies(year, club_id, player_id);

-- ============================================
-- INDIVIDUAL AWARDS (Ballon d'Or, Golden Boot, etc.)
-- ============================================

CREATE TABLE V2_individual_awards (
    award_id INTEGER PRIMARY KEY AUTOINCREMENT,
    award_name TEXT NOT NULL UNIQUE, -- 'Ballon d\'Or', 'Golden Boot', 'FIFA Best Player'
    award_type TEXT, -- 'Player', 'Goalkeeper', 'Young Player', etc.
    trophy_type_id INTEGER,
    organizing_body TEXT, -- FIFA, UEFA, League, etc.
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trophy_type_id) REFERENCES V2_trophy_types(trophy_type_id)
);

CREATE TABLE V2_player_individual_awards (
    player_award_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    award_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    season TEXT, -- '2023-24' if seasonal
    rank INTEGER DEFAULT 1, -- 1st place, 2nd place, etc.
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES V2_players(player_id) ON DELETE CASCADE,
    FOREIGN KEY (award_id) REFERENCES V2_individual_awards(award_id),
    UNIQUE (player_id, award_id, year, rank)
);
CREATE INDEX idx_V2_player_awards ON V2_player_individual_awards(player_id, year);

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Player Age Calculation
CREATE VIEW V2_vw_players_with_age AS
SELECT 
    p.*,
    (CAST(strftime('%Y', 'now') AS INT) - CAST(strftime('%Y', p.date_of_birth) AS INT) - (strftime('%m-%d', 'now') < strftime('%m-%d', p.date_of_birth))) AS age,
    c.country_name AS nationality
FROM V2_players p
JOIN V2_countries c ON p.nationality_id = c.country_id;

-- View: Player Current Club
CREATE VIEW V2_vw_player_current_club AS
SELECT 
    p.player_id,
    p.first_name || ' ' || p.last_name AS player_name,
    p.photo_url,
    (CAST(strftime('%Y', 'now') AS INT) - CAST(strftime('%Y', p.date_of_birth) AS INT) - (strftime('%m-%d', 'now') < strftime('%m-%d', p.date_of_birth))) AS age,
    c.country_name AS nationality,
    cl.club_name AS current_club,
    pch.shirt_number,
    pch.season_start AS joined_season
FROM V2_players p
JOIN V2_countries c ON p.nationality_id = c.country_id
LEFT JOIN V2_player_club_history pch ON p.player_id = pch.player_id 
    AND pch.season_end IS NULL
LEFT JOIN V2_clubs cl ON pch.club_id = cl.club_id;

-- View: Club Trophy Count
CREATE VIEW V2_vw_club_trophy_count AS
SELECT 
    cl.club_id,
    cl.club_name,
    co.country_name,
    comp.competition_name,
    tt.type_name AS trophy_type,
    COUNT(*) AS trophy_count
FROM V2_club_trophies ct
JOIN V2_clubs cl ON ct.club_id = cl.club_id
JOIN V2_countries co ON cl.country_id = co.country_id
JOIN V2_competitions comp ON ct.competition_id = comp.competition_id
JOIN V2_trophy_types tt ON comp.trophy_type_id = tt.trophy_type_id
GROUP BY cl.club_id, comp.competition_id;

-- View: Player Career Statistics (Total)
CREATE VIEW V2_vw_player_career_stats AS
SELECT 
    p.player_id,
    p.first_name || ' ' || p.last_name AS player_name,
    SUM(ps.matches_played) AS total_matches,
    SUM(ps.goals) AS total_goals,
    SUM(ps.assists) AS total_assists,
    COUNT(DISTINCT ps.club_id) AS clubs_played_for,
    MIN(ps.year) AS career_start_year,
    MAX(ps.year) AS latest_season_year
FROM V2_players p
LEFT JOIN V2_player_statistics ps ON p.player_id = ps.player_id
GROUP BY p.player_id;
