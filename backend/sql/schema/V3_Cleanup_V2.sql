-- SQL Cleanup: Removing Legacy V2 Definitions
-- Objective: Keep only V3 tables to ensure a clean and modern database state.

-- Drop Views
DROP VIEW IF EXISTS V2_vw_player_career_stats;
DROP VIEW IF EXISTS V2_vw_player_current_club;
DROP VIEW IF EXISTS V2_vw_players_with_age;
DROP VIEW IF EXISTS V2_vw_club_trophy_count;

-- Drop Tables
DROP TABLE IF EXISTS V2_player_individual_awards;
DROP TABLE IF EXISTS V2_individual_awards;
DROP TABLE IF EXISTS V2_player_trophies;
DROP TABLE IF EXISTS V2_club_trophies;
DROP TABLE IF EXISTS V2_player_statistics;
DROP TABLE IF EXISTS V2_player_club_history;
DROP TABLE IF EXISTS V2_player_nationalities;
DROP TABLE IF EXISTS V2_players;
DROP TABLE IF EXISTS V2_clubs;
DROP TABLE IF EXISTS V2_competitions;
DROP TABLE IF EXISTS V2_trophy_types;
DROP TABLE IF EXISTS V2_countries;

-- Vacuum to reclaim space
-- VACUUM removed because it cannot run within a transaction (Migration Service)
