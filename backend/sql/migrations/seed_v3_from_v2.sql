-- Migration Script: V2 to V3 (Base Data)
-- Attached database 'v2' must be the old database.sqlite

ATTACH 'backend/database.sqlite' AS v2;

-- 1. Migrate Countries
INSERT INTO V3_Countries (name, code, flag_url, api_id)
SELECT DISTINCT country_name, NULL, flag_url, NULL 
FROM v2.V2_countries;
-- Note: V2 might not have api_id for countries in the same way, or code. We take what we can.

-- 2. Migrate Leagues
-- We need to link leagues to countries.
INSERT INTO V3_Leagues (name, type, logo_url, country_id, api_id)
SELECT 
    v2c.competition_name, 
    v2c.type, 
    NULL, -- Logo might not be in V2 competition table directly or different format
    v3cn.country_id,
    v2c.api_id
FROM v2.V2_competitions v2c
LEFT JOIN v2.V2_countries v2cnt ON v2c.country_id = v2cnt.country_id
LEFT JOIN V3_Countries v3cn ON v2cnt.country_name = v3cn.name;

-- 3. Migrate/Initialize League Seasons
-- distinct seasons from player stats or just known scope?
-- Let's populate from existing player stats to see what coverage we had.
INSERT INTO V3_League_Seasons (league_id, season_year, imported_players)
SELECT DISTINCT 
    v3l.league_id, 
    v2ps.season, 
    1 -- imported_players = true because we found stats
FROM v2.V2_player_statistics v2ps
JOIN v2.V2_competitions v2c ON v2ps.competition_id = v2c.competition_id
JOIN V3_Leagues v3l ON v2c.competition_name = v3l.name;

DETACH v2;
