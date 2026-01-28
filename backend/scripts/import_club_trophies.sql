-- ============================================
-- CLUB TROPHY IMPORT SCRIPT
-- Format: Club Name | Competition Name | Season/Year
-- ============================================

-- This script can handle trophy data in the format:
-- Bayern Munich	Bundesliga	2022–23
-- Bayern Munich	DFB-Pokal	1956–57
-- Bayern Munich	DFL-Supercup	1987
-- Bayern Munich	UEFA Champions League	2019–20
-- Bayern Munich	UEFA Super Cup	1975
-- Bayern Munich	Coupe Intercontinentale	2001
-- Bayern Munich	Coupe du Monde des Clubs	2013

-- ============================================
-- HELPER: Season/Year Parser Function
-- ============================================

DELIMITER $$

CREATE FUNCTION IF NOT EXISTS parse_season_year(season_input VARCHAR(20))
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE year_value INT;
    DECLARE dash_pos INT;
    
    -- Check if it contains a dash (season format like 2022-23)
    SET dash_pos = LOCATE('–', season_input);
    IF dash_pos = 0 THEN
        SET dash_pos = LOCATE('-', season_input);
    END IF;
    
    IF dash_pos > 0 THEN
        -- Extract the ending year from format "2022-23" or "2022–23"
        SET year_value = CAST(SUBSTRING(season_input, dash_pos + 1) AS UNSIGNED);
        
        -- If it's a 2-digit year, add 2000 or 1900
        IF year_value < 100 THEN
            IF year_value < 50 THEN
                SET year_value = 2000 + year_value;
            ELSE
                SET year_value = 1900 + year_value;
            END IF;
        END IF;
    ELSE
        -- It's just a year
        SET year_value = CAST(season_input AS UNSIGNED);
    END IF;
    
    RETURN year_value;
END$$

DELIMITER ;

-- ============================================
-- STEP 1: Create temporary table for import
-- ============================================

DROP TEMPORARY TABLE IF EXISTS temp_trophy_import;

CREATE TEMPORARY TABLE temp_trophy_import (
    club_name VARCHAR(150),
    competition_name VARCHAR(150),
    season_input VARCHAR(20)
);

-- ============================================
-- STEP 2: Insert your trophy data here
-- ============================================

INSERT INTO temp_trophy_import (club_name, competition_name, season_input) VALUES
-- Bayern Munich
('Bayern Munich', 'Bundesliga', '2022–23'),
('Bayern Munich', 'DFB-Pokal', '1956–57'),
('Bayern Munich', 'DFL-Supercup', '1987'),
('Bayern Munich', 'UEFA Champions League', '2019–20'),
('Bayern Munich', 'UEFA Super Cup', '1975'),
('Bayern Munich', 'Coupe Intercontinentale', '2001'),
('Bayern Munich', 'Coupe du Monde des Clubs', '2013');

-- ============================================
-- STEP 3: Insert Bayern Munich if not exists
-- ============================================

INSERT INTO clubs (club_name, club_short_name, country_id, city, stadium_name, stadium_capacity, founded_year, is_active)
SELECT 'Bayern Munich', 'Bayern', 
    (SELECT country_id FROM countries WHERE country_code = 'DE'), 
    'Munich', 
    'Allianz Arena', 
    75000, 
    1900, 
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM clubs WHERE club_name = 'Bayern Munich');

-- ============================================
-- STEP 4: Map competition names (handle variations)
-- ============================================

-- Create a mapping table for competition name variations
DROP TEMPORARY TABLE IF EXISTS temp_competition_mapping;

CREATE TEMPORARY TABLE temp_competition_mapping (
    input_name VARCHAR(150),
    mapped_competition_id INT
);

-- Map common variations to actual competition IDs
INSERT INTO temp_competition_mapping (input_name, mapped_competition_id)
SELECT DISTINCT 
    ti.competition_name,
    COALESCE(
        -- Try exact match first
        (SELECT competition_id FROM competitions WHERE competition_name = ti.competition_name LIMIT 1),
        -- Try short name match
        (SELECT competition_id FROM competitions WHERE competition_short_name = ti.competition_name LIMIT 1),
        -- Try LIKE match
        (SELECT competition_id FROM competitions WHERE competition_name LIKE CONCAT('%', ti.competition_name, '%') LIMIT 1),
        -- Handle specific variations
        CASE 
            WHEN ti.competition_name = 'Coupe Intercontinentale' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FIFA Intercontinental Cup' LIMIT 1)
            WHEN ti.competition_name = 'Coupe du Monde des Clubs' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FIFA Club World Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Champions League' THEN (SELECT competition_id FROM competitions WHERE competition_short_name = 'UCL' LIMIT 1)
            WHEN ti.competition_name = 'Bundesliga' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Bundesliga' LIMIT 1)
            WHEN ti.competition_name = 'DFB-Pokal' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFB-Pokal' LIMIT 1)
            WHEN ti.competition_name = 'DFL-Supercup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFL-Supercup' LIMIT 1)
            ELSE NULL
        END
    ) AS mapped_competition_id
FROM temp_trophy_import ti;

-- ============================================
-- STEP 5: Insert trophies into club_trophies table
-- ============================================

INSERT INTO club_trophies (club_id, competition_id, season, year, is_runner_up, notes)
SELECT 
    c.club_id,
    tcm.mapped_competition_id,
    ti.season_input,
    parse_season_year(ti.season_input) AS year,
    FALSE,
    NULL
FROM temp_trophy_import ti
JOIN clubs c ON c.club_name = ti.club_name
JOIN temp_competition_mapping tcm ON tcm.input_name = ti.competition_name
WHERE tcm.mapped_competition_id IS NOT NULL
ON DUPLICATE KEY UPDATE 
    season = VALUES(season),
    year = VALUES(year);

-- ============================================
-- STEP 6: Report unmapped competitions
-- ============================================

SELECT 
    'UNMAPPED COMPETITIONS - Need to be added to competitions table:' AS warning,
    ti.competition_name,
    COUNT(*) AS occurrences
FROM temp_trophy_import ti
LEFT JOIN temp_competition_mapping tcm ON tcm.input_name = ti.competition_name
WHERE tcm.mapped_competition_id IS NULL
GROUP BY ti.competition_name;

-- ============================================
-- STEP 7: Verify imported trophies
-- ============================================

SELECT 
    'Successfully imported trophies:' AS status,
    cl.club_name,
    co.competition_name,
    ct.season,
    ct.year
FROM club_trophies ct
JOIN clubs cl ON ct.club_id = cl.club_id
JOIN competitions co ON ct.competition_id = co.competition_id
WHERE cl.club_name IN (SELECT DISTINCT club_name FROM temp_trophy_import)
ORDER BY cl.club_name, ct.year DESC;

-- ============================================
-- STEP 8: Summary statistics
-- ============================================

SELECT 
    'Import Summary' AS summary,
    (SELECT COUNT(*) FROM temp_trophy_import) AS total_input_records,
    (SELECT COUNT(*) FROM club_trophies WHERE club_id IN (SELECT club_id FROM clubs WHERE club_name IN (SELECT DISTINCT club_name FROM temp_trophy_import))) AS trophies_inserted,
    (SELECT COUNT(DISTINCT competition_name) FROM temp_trophy_import WHERE competition_name NOT IN (SELECT input_name FROM temp_competition_mapping WHERE mapped_competition_id IS NOT NULL)) AS unmapped_competitions;

-- ============================================
-- CLEANUP
-- ============================================

DROP TEMPORARY TABLE IF EXISTS temp_trophy_import;
DROP TEMPORARY TABLE IF EXISTS temp_competition_mapping;
