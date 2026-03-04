-- Database Cleanup: Remove all non-V2 tables
-- Running without transaction to avoid lock issues

-- Drop old tables
DROP TABLE IF EXISTS user_predictions;
DROP TABLE IF EXISTS prediction_options;
DROP TABLE IF EXISTS prediction_games;
DROP TABLE IF EXISTS player_legacy_scores;
DROP TABLE IF EXISTS player_trophies;
DROP TABLE IF EXISTS player_national_stats;
DROP TABLE IF EXISTS player_club_stats;
DROP TABLE IF EXISTS team_trophies;
DROP TABLE IF EXISTS team_statistics;
DROP TABLE IF EXISTS standings;
DROP TABLE IF EXISTS historical_events;
DROP TABLE IF EXISTS trophies;
DROP TABLE IF EXISTS international_cups;
DROP TABLE IF EXISTS national_team_cups;
DROP TABLE IF EXISTS national_cups;
DROP TABLE IF EXISTS championships;
DROP TABLE IF EXISTS league_classifications;
DROP TABLE IF EXISTS leagues;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS clubs;
DROP TABLE IF EXISTS countries;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS national_teams;

-- Verify remaining tables
.tables
