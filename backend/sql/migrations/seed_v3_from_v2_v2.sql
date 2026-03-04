-- Migration Script: V2 to V3 (Base Data)
-- Attached database 'v2' must be the old database.sqlite

ATTACH 'backend/database.sqlite' AS v2;

-- 1. Migrate Countries
INSERT OR IGNORE INTO V3_Countries (name, code, flag_url, api_id)
SELECT DISTINCT country_name, NULL, flag_url, NULL 
FROM v2.V2_countries;

-- 2. Migrate Leagues
-- Convert trophy_type_id to type string
INSERT INTO V3_Leagues (name, type, logo_url, country_id, api_id)
SELECT 
    v2c.competition_name, 
    CASE 
        WHEN v2c.trophy_type_id = 7 THEN 'League'
        WHEN v2c.trophy_type_id IN (8, 9, 10) THEN 'Cup'
        WHEN v2c.trophy_type_id IN (1, 2, 3, 4, 5, 6) THEN 'International'
        ELSE 'Unknown'
    END, 
    NULL, -- Logo might not be in V2 competition table directly
    v3cn.country_id,
    v2c.api_id
FROM v2.V2_competitions v2c
LEFT JOIN v2.V2_countries v2cnt ON v2c.country_id = v2cnt.country_id
LEFT JOIN V3_Countries v3cn ON v2cnt.country_name = v3cn.name;

-- 3. Migrate/Initialize League Seasons
-- Populate from existing player stats to see what coverage we had.
INSERT OR IGNORE INTO V3_League_Seasons (league_id, season_year, imported_players, imported_fixtures, imported_standings)
SELECT DISTINCT 
    v3l.league_id, 
    v2ps.season, 
    1, -- imported_players = true because we found stats
    0, -- fixtures not strictly tracked in V2 as separate entity per season
    0  -- standings not strictly tracked
FROM v2.V2_player_statistics v2ps
JOIN v2.V2_competitions v2c ON v2ps.competition_id = v2c.competition_id
JOIN V3_Leagues v3l ON v2c.competition_name = v3l.name;

DETACH v2;
