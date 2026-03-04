-- US-DB-003: Optimize Schema for Sync Tracking and Data Integrity

-- 1. Schema Extensions (V2_players)
-- Add columns for sync tracking
ALTER TABLE V2_players ADD COLUMN last_full_sync DATETIME;
ALTER TABLE V2_players ADD COLUMN is_history_complete BOOLEAN DEFAULT 0;

-- 2. Performance Indexing
-- Faster lookups by API ID
CREATE INDEX IF NOT EXISTS idx_V2_competitions_api_id ON V2_competitions(api_id);
CREATE INDEX IF NOT EXISTS idx_V2_clubs_api_id ON V2_clubs(api_id);
CREATE INDEX IF NOT EXISTS idx_V2_players_api_id ON V2_players(api_id);

-- Faster lookups for player stats during import/display
CREATE INDEX IF NOT EXISTS idx_V2_player_statistics_player_season ON V2_player_statistics(player_id, season);

-- 3. Data Integrity
-- Ensure hard constraint on unique statistics (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_stats_unique ON V2_player_statistics(player_id, club_id, competition_id, season);
