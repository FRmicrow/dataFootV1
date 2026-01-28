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
-- France (example import)
('Auxerre', 'Championnat de France / Ligue 1', '1995–96'),
('Auxerre', 'Coupe de France', '1993–94'),
('Auxerre', 'Coupe de France', '1995–96'),
('Auxerre', 'Coupe de France', '2002–03'),
('Auxerre', 'Coupe de France', '2004–05'),
('Auxerre', 'Coupe de la Ligue', '1995–96'),
('Auxerre', 'Trophée des Champions', '1996'),

('Angers SCO', 'Championnat de France Ligue 2 (niveau 2)', '1968–69'),
('Angers SCO', 'Championnat de France Ligue 2 (niveau 2)', '1975–76'),

('AS Monaco', 'Ligue 1', '1960–61'),
('AS Monaco', 'Ligue 1', '1962–63'),
('AS Monaco', 'Ligue 1', '1977–78'),
('AS Monaco', 'Ligue 1', '1981–82'),
('AS Monaco', 'Ligue 1', '1987–88'),
('AS Monaco', 'Ligue 1', '1996–97'),
('AS Monaco', 'Ligue 1', '1999–2000'),
('AS Monaco', 'Ligue 1', '2016–17'),
('AS Monaco', 'Coupe de France', '1960–61'),
('AS Monaco', 'Coupe de France', '1962–63'),
('AS Monaco', 'Coupe de France', '1979–80'),
('AS Monaco', 'Coupe de France', '1984–85'),
('AS Monaco', 'Coupe de France', '1990–91'),
('AS Monaco', 'Coupe de France', '1991–92'),
('AS Monaco', 'Coupe de la Ligue', '2002–03'),
('AS Monaco', 'Trophée des Champions', '1961'),
('AS Monaco', 'Trophée des Champions', '1985'),
('AS Monaco', 'Trophée des Champions', '1997'),
('AS Monaco', 'Trophée des Champions', '2000'),
('AS Monaco', 'Trophée des Champions', '2017'),

('Stade Brestois 29', 'Ligue 2', '1980–81'),
('Stade Brestois 29', 'Coupe Gambardella', '1990'),

('Le Havre AC', 'Championnat de France / Ligue 2', '1990–91'),
('Le Havre AC', 'Championnat de France / Ligue 2', '1993–94'),
('Le Havre AC', 'Championnat de France / Ligue 2', '2007–08'),
('Le Havre AC', 'Championnat de France / Ligue 2', '2017–18'),

('Lille OSC', 'Ligue 1', '1945–46'),
('Lille OSC', 'Ligue 1', '1953–54'),
('Lille OSC', 'Ligue 1', '2010–11'),
('Lille OSC', 'Ligue 1', '2020–21'),
('Lille OSC', 'Coupe de France', '1945–46'),
('Lille OSC', 'Coupe de France', '1946–47'),
('Lille OSC', 'Coupe de France', '1947–48'),
('Lille OSC', 'Coupe de France', '1952–53'),
('Lille OSC', 'Coupe de France', '1954–55'),
('Lille OSC', 'Coupe de France', '2010–11'),
('Lille OSC', 'Trophée des Champions', '1946'),
('Lille OSC', 'Trophée des Champions', '1955'),
('Lille OSC', 'Trophée des Champions', '2021'),

('RC Lens', 'Ligue 1', '1997–98'),
('RC Lens', 'Ligue 2', '1936–37'),
('RC Lens', 'Ligue 2', '1948–49'),
('RC Lens', 'Ligue 2', '1972–73'),
('RC Lens', 'Coupe de France', '1998–99'),
('RC Lens', 'Coupe de la Ligue', '1998–99'),
('RC Lens', 'Trophée des Champions', '1998'),

('FC Lorient', 'Coupe de France', '2001–02'),
('FC Lorient', 'Coupe de la Ligue', '2001–02'),
('FC Lorient', 'Ligue 2', '1994–95'),
('FC Lorient', 'Ligue 2', '2005–06'),

('Olympique Lyonnais', 'Ligue 1', '2001–02'),
('Olympique Lyonnais', 'Ligue 1', '2002–03'),
('Olympique Lyonnais', 'Ligue 1', '2003–04'),
('Olympique Lyonnais', 'Ligue 1', '2004–05'),
('Olympique Lyonnais', 'Ligue 1', '2005–06'),
('Olympique Lyonnais', 'Ligue 1', '2006–07'),
('Olympique Lyonnais', 'Ligue 1', '2007–08'),
('Olympique Lyonnais', 'Ligue 1', '2008–09'),
('Olympique Lyonnais', 'Coupe de France', '1963–64'),
('Olympique Lyonnais', 'Coupe de France', '1966–67'),
('Olympique Lyonnais', 'Coupe de France', '1972–73'),
('Olympique Lyonnais', 'Coupe de France', '2007–08'),
('Olympique Lyonnais', 'Coupe de France', '2011–12'),
('Olympique Lyonnais', 'Coupe de la Ligue', '2000–01'),
('Olympique Lyonnais', 'Trophée des Champions', '1973'),
('Olympique Lyonnais', 'Trophée des Champions', '2002'),
('Olympique Lyonnais', 'Trophée des Champions', '2003'),
('Olympique Lyonnais', 'Trophée des Champions', '2004'),
('Olympique Lyonnais', 'Trophée des Champions', '2005'),
('Olympique Lyonnais', 'Trophée des Champions', '2006'),
('Olympique Lyonnais', 'Trophée des Champions', '2007'),
('Olympique Lyonnais', 'Trophée des Champions', '2012'),

('Olympique de Marseille', 'Ligue 1', '1936–37'),
('Olympique de Marseille', 'Ligue 1', '1947–48'),
('Olympique de Marseille', 'Ligue 1', '1970–71'),
('Olympique de Marseille', 'Ligue 1', '1971–72'),
('Olympique de Marseille', 'Ligue 1', '1988–89'),
('Olympique de Marseille', 'Ligue 1', '1989–90'),
('Olympique de Marseille', 'Ligue 1', '1990–91'),
('Olympique de Marseille', 'Ligue 1', '1991–92'),
('Olympique de Marseille', 'Ligue 1', '1992–93'),
('Olympique de Marseille', 'Ligue 1', '1993–94'),
('Olympique de Marseille', 'Coupe de France', '1923–24'),
('Olympique de Marseille', 'Coupe de France', '1924–25'),
('Olympique de Marseille', 'Coupe de France', '1925–26'),
('Olympique de Marseille', 'Coupe de France', '1926–27'),
('Olympique de Marseille', 'Coupe de France', '1934–35'),
('Olympique de Marseille', 'Coupe de France', '1937–38'),
('Olympique de Marseille', 'Coupe de France', '1942–43'),
('Olympique de Marseille', 'Coupe de France', '1968–69'),
('Olympique de Marseille', 'Coupe de France', '1971–72'),
('Olympique de Marseille', 'Coupe de France', '1975–76'),
('Olympique de Marseille', 'Coupe de France', '1988–89'),
('Olympique de Marseille', 'Coupe de France', '1989–90'),
('Olympique de Marseille', 'Coupe de France', '1990–91'),
('Olympique de Marseille', 'Coupe de France', '1991–92'),
('Olympique de Marseille', 'Coupe de France', '1998–99'),
('Olympique de Marseille', 'Coupe de France', '2005–06'),
('Olympique de Marseille', 'Coupe de la Ligue', '2010–11'),
('Olympique de Marseille', 'Coupe de la Ligue', '2011–12'),
('Olympique de Marseille', 'Coupe de la Ligue', '2012–13'),
('Olympique de Marseille', 'Trophée des Champions', '1971'),
('Olympique de Marseille', 'Trophée des Champions', '2010'),
('Olympique de Marseille', 'Trophée des Champions', '2011'),
('Olympique de Marseille', 'Trophée des Champions', '2012'),
('Olympique de Marseille', 'Trophée des Champions', '2013'),
('Olympique de Marseille', 'Ligue des Champions / European Cup', '1992–93'),

('FC Metz', 'Ligue 2', '1933–34'),
('FC Metz', 'Ligue 2', '2006–07'),
('FC Metz', 'Coupe de France', '1983–84'),
('FC Metz', 'Coupe de France', '1987–88'),
('FC Metz', 'Coupe de la Ligue', '1995–96'),
('FC Metz', 'Trophée des Champions', '1984'),

('FC Nantes', 'Ligue 1', '1964–65'),
('FC Nantes', 'Ligue 1', '1965–66'),
('FC Nantes', 'Ligue 1', '1972–73'),
('FC Nantes', 'Ligue 1', '1976–77'),
('FC Nantes', 'Ligue 1', '1979–80'),
('FC Nantes', 'Ligue 1', '1982–83'),
('FC Nantes', 'Ligue 1', '1994–95'),
('FC Nantes', 'Ligue 1', '2000–01'),
('FC Nantes', 'Coupe de France', '1978–79'),
('FC Nantes', 'Coupe de France', '1998–99'),
('FC Nantes', 'Coupe de France', '1999–2000'),
('FC Nantes', 'Coupe de la Ligue', '1964–65'),
('FC Nantes', 'Trophée des Champions', '1965'),
('FC Nantes', 'Trophée des Champions', '1966'),
('FC Nantes', 'Trophée des Champions', '1973'),
('FC Nantes', 'Trophée des Champions', '1977'),
('FC Nantes', 'Trophée des Champions', '1999'),

('OGC Nice', 'Ligue 1', '1950–51'),
('OGC Nice', 'Ligue 1', '1951–52'),
('OGC Nice', 'Ligue 1', '1955–56'),
('OGC Nice', 'Ligue 1', '1958–59'),
('OGC Nice', 'Coupe de France', '1951–52'),
('OGC Nice', 'Coupe de France', '1953–54'),
('OGC Nice', 'Coupe de France', '1963–64'),
('OGC Nice', 'Trophée des Champions', '1952'),
('OGC Nice', 'Trophée des Champions', '1956'),

('Paris Saint-Germain', 'Ligue 1', '1985–86'),
('Paris Saint-Germain', 'Ligue 1', '1993–94'),
('Paris Saint-Germain', 'Ligue 1', '2012–13'),
('Paris Saint-Germain', 'Ligue 1', '2013–14'),
('Paris Saint-Germain', 'Ligue 1', '2014–15'),
('Paris Saint-Germain', 'Ligue 1', '2015–16'),
('Paris Saint-Germain', 'Ligue 1', '2017–18'),
('Paris Saint-Germain', 'Ligue 1', '2018–19'),
('Paris Saint-Germain', 'Ligue 1', '2019–20'),
('Paris Saint-Germain', 'Ligue 1', '2021–22'),
('Paris Saint-Germain', 'Ligue 1', '2022–23'),
('Paris Saint-Germain', 'Coupe de France', '1981–82'),
('Paris Saint-Germain', 'Coupe de France', '1982–83'),
('Paris Saint-Germain', 'Coupe de France', '1992–93'),
('Paris Saint-Germain', 'Coupe de France', '1994–95'),
('Paris Saint-Germain', 'Coupe de France', '1997–98'),
('Paris Saint-Germain', 'Coupe de France', '2003–04'),
('Paris Saint-Germain', 'Coupe de France', '2005–06'),
('Paris Saint-Germain', 'Coupe de France', '2009–10'),
('Paris Saint-Germain', 'Coupe de France', '2014–15'),
('Paris Saint-Germain', 'Coupe de France', '2015–16'),
('Paris Saint-Germain', 'Coupe de France', '2016–17'),
('Paris Saint-Germain', 'Coupe de France', '2017–18'),
('Paris Saint-Germain', 'Coupe de France', '2019–20'),
('Paris Saint-Germain', 'Coupe de France', '2020–21'),
('Paris Saint-Germain', 'Coupe de France', '2022–23'),
('Paris Saint-Germain', 'Coupe de la Ligue', '1994–95'),
('Paris Saint-Germain', 'Coupe de la Ligue', '1997–98'),
('Paris Saint-Germain', 'Coupe de la Ligue', '2007–08'),
('Paris Saint-Germain', 'Coupe de la Ligue', '2013–14'),
('Paris Saint-Germain', 'Coupe de la Ligue', '2014–15'),
('Paris Saint-Germain', 'Coupe de la Ligue', '2015–16'),
('Paris Saint-Germain', 'Coupe de la Ligue', '2016–17'),
('Paris Saint-Germain', 'Coupe de la Ligue', '2017–18'),
('Paris Saint-Germain', 'Trophée des Champions', '1995'),
('Paris Saint-Germain', 'Trophée des Champions', '1998'),
('Paris Saint-Germain', 'Trophée des Champions', '2013'),
('Paris Saint-Germain', 'Trophée des Champions', '2014'),
('Paris Saint-Germain', 'Trophée des Champions', '2015'),
('Paris Saint-Germain', 'Trophée des Champions', '2016'),
('Paris Saint-Germain', 'Trophée des Champions', '2017'),
('Paris Saint-Germain', 'Trophée des Champions', '2018'),
('Paris Saint-Germain', 'Trophée des Champions', '2019'),
('Paris Saint-Germain', 'Trophée des Champions', '2020'),
('Paris Saint-Germain', 'Trophée des Champions', '2022'),
('Paris Saint-Germain', 'UEFA Cup Winners’ Cup', '1995–96'),

('Stade Rennais', 'Coupe de France', '1964–65'),
('Stade Rennais', 'Coupe de France', '1970–71'),
('Stade Rennais', 'Coupe de France', '2018–19'),
('Stade Rennais', 'Trophée des Champions', '1971'),

('RC Strasbourg', 'Ligue 1', '1978–79'),
('RC Strasbourg', 'Ligue 2', '1938–39'),
('RC Strasbourg', 'Ligue 2', '1965–66'),
('RC Strasbourg', 'Coupe de France', '1950–51'),
('RC Strasbourg', 'Coupe de France', '1965–66'),
('RC Strasbourg', 'Coupe de France', '2000–01'),
('RC Strasbourg', 'Coupe de la Ligue', '1997–98'),
('RC Strasbourg', 'Trophée des Champions', '1979'),

('Toulouse FC', 'Coupe de France', '1956–57'),
('Toulouse FC', 'Coupe de France', '1970–71'),
('Toulouse FC', 'Ligue 2', '1953–54'),
('Toulouse FC', 'Ligue 2', '1981–82'),
('Toulouse FC', 'Ligue 2', '1982–83'),
('Toulouse FC', 'Ligue 2', '2002–03'),
('Toulouse FC', 'Ligue 2', '2006–07');

-- ============================================
-- STEP 3: Insert clubs from import if not exists
-- (minimal info; adjust columns if your schema is stricter)
-- ============================================

INSERT INTO clubs (club_name, club_short_name, country_id, is_active)
SELECT DISTINCT
    ti.club_name,
    ti.club_name,
    (SELECT country_id FROM countries WHERE country_code = 'FR' LIMIT 1),
    TRUE
FROM temp_trophy_import ti
WHERE NOT EXISTS (
    SELECT 1 FROM clubs c WHERE c.club_name = ti.club_name
);

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
            -- France variations
            WHEN ti.competition_name = 'Championnat de France / Ligue 1' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Ligue 1' LIMIT 1)
            WHEN ti.competition_name = 'Championnat de France / Ligue 2' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Ligue 2' LIMIT 1)
            WHEN ti.competition_name = 'Championnat de France Ligue 2 (niveau 2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Ligue 2' LIMIT 1)
            WHEN ti.competition_name = 'Championnat de France Ligue 2 (niveau 2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Ligue 2' LIMIT 1)
            WHEN ti.competition_name = 'Ligue des Champions / European Cup' THEN (SELECT competition_id FROM competitions WHERE competition_short_name = 'UCL' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Cup Winners’ Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup Winners’ Cup' LIMIT 1)
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
