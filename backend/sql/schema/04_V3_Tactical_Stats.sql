-- ============================================
-- V3 Tactical & High-Fidelity Statistics
-- Optimized for tactical modeling and player scouting
-- ============================================

-- 1. FIXTURE LEVEL STATISTICS (Team Performance)
-- Captures FT, 1H, and 2H splits for both teams
CREATE TABLE IF NOT EXISTS V3_Fixture_Stats (
    fixture_stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    half TEXT NOT NULL, -- 'FT', '1H', '2H'
    
    -- Shot Metrics
    shots_on_goal INTEGER DEFAULT 0,
    shots_off_goal INTEGER DEFAULT 0,
    shots_inside_box INTEGER DEFAULT 0,
    shots_outside_box INTEGER DEFAULT 0,
    shots_total INTEGER DEFAULT 0,
    shots_blocked INTEGER DEFAULT 0,
    
    -- General Play
    fouls INTEGER DEFAULT 0,
    corner_kicks INTEGER DEFAULT 0,
    offsides INTEGER DEFAULT 0,
    ball_possession TEXT, -- e.g., "55%"
    
    -- Discipline & Defense
    yellow_cards INTEGER DEFAULT 0,
    red_cards INTEGER DEFAULT 0,
    goalkeeper_saves INTEGER DEFAULT 0,
    
    -- Passing
    passes_total INTEGER DEFAULT 0,
    passes_accurate INTEGER DEFAULT 0,
    pass_accuracy_pct INTEGER DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    UNIQUE(fixture_id, team_id, half)
);

-- 2. FIXTURE PLAYER STATISTICS (Individual Performance)
-- Captures detailed performance of each player in a specific fixture
CREATE TABLE IF NOT EXISTS V3_Fixture_Player_Stats (
    fixture_player_stats_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    
    -- Game Metadata
    is_start_xi BOOLEAN DEFAULT 1, -- 1 for Start XI, 0 for Substitute
    minutes_played INTEGER DEFAULT 0,
    position TEXT, -- G, D, M, F
    rating TEXT, -- Store as text to handle "N/A" or floating points
    
    -- Performance Stats
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

-- 3. UPDATED SEASONAL STATS (With Per-90 Metrics)
-- Consolidated seasonal performance with normalization
CREATE TABLE IF NOT EXISTS V3_Player_Season_Stats (
    season_stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    
    -- Totals
    appearances INTEGER DEFAULT 0,
    minutes_played INTEGER DEFAULT 0,
    goals_total INTEGER DEFAULT 0,
    goals_conceded INTEGER DEFAULT 0,
    goals_assists INTEGER DEFAULT 0,
    
    -- Normalized Metrics (Per 90 mins)
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

-- 4. INDICES FOR PERFORMANCE
CREATE INDEX idx_v3_fixture_stats_fixture ON V3_Fixture_Stats(fixture_id);
CREATE INDEX idx_v3_fixture_player_stats_fixture ON V3_Fixture_Player_Stats(fixture_id);
CREATE INDEX idx_v3_fixture_player_stats_player ON V3_Fixture_Player_Stats(player_id);
CREATE INDEX idx_v3_player_season_stats_composite ON V3_Player_Season_Stats(league_id, season_year);
