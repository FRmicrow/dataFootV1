-- Migration: Add table for tracking unresolved competitions
-- This table stores competitions that couldn't be automatically detected
-- and need manual review/assignment

CREATE TABLE IF NOT EXISTS V2_unresolved_competitions (
    unresolved_id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    club_id INTEGER NOT NULL,
    season TEXT NOT NULL,
    league_name TEXT,
    league_api_id INTEGER,
    matches_played INTEGER,
    goals INTEGER,
    assists INTEGER,
    resolved BOOLEAN DEFAULT 0,
    resolved_competition_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (player_id) REFERENCES V2_players(player_id),
    FOREIGN KEY (club_id) REFERENCES V2_clubs(club_id),
    FOREIGN KEY (resolved_competition_id) REFERENCES V2_competitions(competition_id),
    UNIQUE(player_id, club_id, season, league_name)
);

CREATE INDEX IF NOT EXISTS idx_unresolved_resolved ON V2_unresolved_competitions(resolved);
CREATE INDEX IF NOT EXISTS idx_unresolved_season ON V2_unresolved_competitions(season);
CREATE INDEX IF NOT EXISTS idx_unresolved_club ON V2_unresolved_competitions(club_id);
