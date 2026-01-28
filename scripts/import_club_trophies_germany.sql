-- ============================================
-- CLUB TROPHY IMPORT SCRIPT (Germany)
-- Format: Club Name | Competition Name | Season/Year
-- ============================================

-- ============================================
-- HELPER: Season/Year Parser Function
-- ============================================

DELIMITER $$

CREATE FUNCTION IF NOT EXISTS parse_season_year(season_input VARCHAR(50))
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE cleaned VARCHAR(50);
    DECLARE year_value INT;
    DECLARE dash_pos INT;

    -- Remove any trailing notes like " (shared)" or " (finaliste, ...)"
    SET cleaned = TRIM(SUBSTRING_INDEX(season_input, ' (', 1));

    -- Check if it contains a dash (season format like 2022-23)
    SET dash_pos = LOCATE('–', cleaned);
    IF dash_pos = 0 THEN
        SET dash_pos = LOCATE('-', cleaned);
    END IF;

    IF dash_pos > 0 THEN
        SET year_value = CAST(SUBSTRING(cleaned, dash_pos + 1) AS UNSIGNED);
        -- Handle short ending year (e.g. 2022-23)
        IF year_value < 100 THEN
            SET year_value = (FLOOR(CAST(LEFT(cleaned, 4) AS UNSIGNED) / 100) * 100) + year_value;
        END IF;
    ELSE
        SET year_value = CAST(cleaned AS UNSIGNED);
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
    competition_name VARCHAR(200),
    season_input VARCHAR(50)
);

-- ============================================
-- STEP 2: Insert your trophy data here
-- ============================================

INSERT INTO temp_trophy_import (club_name, competition_name, season_input) VALUES
('FC Augsburg', '2. Bundesliga (D2)', '1973–74'),
('FC Augsburg', '2. Bundesliga (D2)', '1979–80'),
('FC Augsburg', 'Regionalliga Süd (D3)', '1972–73'),
('FC Augsburg', 'Bayernliga', '1968–69'),
('Bayer 04 Leverkusen', 'Bundesliga', '2023–24'),
('Bayer 04 Leverkusen', 'DFB‑Pokal (Coupe d’Allemagne)', '1992–93'),
('Bayer 04 Leverkusen', 'DFB‑Pokal (Coupe d’Allemagne)', '2023–24'),
('Bayer 04 Leverkusen', 'DFL‑Supercup (Supercoupe d’Allemagne)', '1987'),
('Bayer 04 Leverkusen', 'DFL‑Supercup (Supercoupe d’Allemagne)', '1993'),
('Bayer 04 Leverkusen', 'DFL‑Supercup (Supercoupe d’Allemagne)', '2020'),
('Bayer 04 Leverkusen', 'UEFA Cup (C3)', '1987–88'),
('Bayern Munich', 'Bundesliga', '1931–32'),
('Bayern Munich', 'Bundesliga', '1968–69'),
('Bayern Munich', 'Bundesliga', '1971–72'),
('Bayern Munich', 'Bundesliga', '1972–73'),
('Bayern Munich', 'Bundesliga', '1973–74'),
('Bayern Munich', 'Bundesliga', '1974–75'),
('Bayern Munich', 'Bundesliga', '1975–76'),
('Bayern Munich', 'Bundesliga', '1976–77'),
('Bayern Munich', 'Bundesliga', '1977–78'),
('Bayern Munich', 'Bundesliga', '1978–79'),
('Bayern Munich', 'Bundesliga', '1979–80'),
('Bayern Munich', 'Bundesliga', '1980–81'),
('Bayern Munich', 'Bundesliga', '1984–85'),
('Bayern Munich', 'Bundesliga', '1985–86'),
('Bayern Munich', 'Bundesliga', '1986–87'),
('Bayern Munich', 'Bundesliga', '1988–89'),
('Bayern Munich', 'Bundesliga', '1989–90'),
('Bayern Munich', 'Bundesliga', '1993–94'),
('Bayern Munich', 'Bundesliga', '1996–97'),
('Bayern Munich', 'Bundesliga', '1998–99'),
('Bayern Munich', 'Bundesliga', '1999–2000'),
('Bayern Munich', 'Bundesliga', '2000–01'),
('Bayern Munich', 'Bundesliga', '2002–03'),
('Bayern Munich', 'Bundesliga', '2004–05'),
('Bayern Munich', 'Bundesliga', '2005–06'),
('Bayern Munich', 'Bundesliga', '2007–08'),
('Bayern Munich', 'Bundesliga', '2009–10'),
('Bayern Munich', 'Bundesliga', '2012–13'),
('Bayern Munich', 'Bundesliga', '2013–14'),
('Bayern Munich', 'Bundesliga', '2014–15'),
('Bayern Munich', 'Bundesliga', '2015–16'),
('Bayern Munich', 'Bundesliga', '2016–17'),
('Bayern Munich', 'Bundesliga', '2017–18'),
('Bayern Munich', 'Bundesliga', '2018–19'),
('Bayern Munich', 'Bundesliga', '2019–20'),
('Bayern Munich', 'Bundesliga', '2020–21'),
('Bayern Munich', 'Bundesliga', '2021–22'),
('Bayern Munich', 'Bundesliga', '2022–23'),
('Bayern Munich', 'DFB-Pokal', '1956–57'),
('Bayern Munich', 'DFB-Pokal', '1965–66'),
('Bayern Munich', 'DFB-Pokal', '1966–67'),
('Bayern Munich', 'DFB-Pokal', '1968–69'),
('Bayern Munich', 'DFB-Pokal', '1970–71'),
('Bayern Munich', 'DFB-Pokal', '1981–82'),
('Bayern Munich', 'DFB-Pokal', '1983–84'),
('Bayern Munich', 'DFB-Pokal', '1985–86'),
('Bayern Munich', 'DFB-Pokal', '1997–98'),
('Bayern Munich', 'DFB-Pokal', '1999–2000'),
('Bayern Munich', 'DFB-Pokal', '2002–03'),
('Bayern Munich', 'DFB-Pokal', '2004–05'),
('Bayern Munich', 'DFB-Pokal', '2005–06'),
('Bayern Munich', 'DFB-Pokal', '2007–08'),
('Bayern Munich', 'DFB-Pokal', '2009–10'),
('Bayern Munich', 'DFB-Pokal', '2012–13'),
('Bayern Munich', 'DFB-Pokal', '2013–14'),
('Bayern Munich', 'DFB-Pokal', '2015–16'),
('Bayern Munich', 'DFB-Pokal', '2018–19'),
('Bayern Munich', 'DFB-Pokal', '2019–20'),
('Bayern Munich', 'DFL-Supercup', '1987'),
('Bayern Munich', 'DFL-Supercup', '1990'),
('Bayern Munich', 'DFL-Supercup', '1994'),
('Bayern Munich', 'DFL-Supercup', '1995'),
('Bayern Munich', 'DFL-Supercup', '1997'),
('Bayern Munich', 'DFL-Supercup', '1998'),
('Bayern Munich', 'DFL-Supercup', '1999'),
('Bayern Munich', 'DFL-Supercup', '2000'),
('Bayern Munich', 'DFL-Supercup', '2007'),
('Bayern Munich', 'DFL-Supercup', '2010'),
('Bayern Munich', 'DFL-Supercup', '2012'),
('Bayern Munich', 'DFL-Supercup', '2016'),
('Bayern Munich', 'UEFA Champions League', '1973–74'),
('Bayern Munich', 'UEFA Champions League', '1974–75'),
('Bayern Munich', 'UEFA Champions League', '1975–76'),
('Bayern Munich', 'UEFA Champions League', '2000–01'),
('Bayern Munich', 'UEFA Champions League', '2012–13'),
('Bayern Munich', 'UEFA Champions League', '2019–20'),
('Bayern Munich', 'UEFA Super Cup', '1975'),
('Bayern Munich', 'UEFA Super Cup', '1976'),
('Bayern Munich', 'UEFA Super Cup', '2001'),
('Bayern Munich', 'UEFA Super Cup', '2013'),
('Bayern Munich', 'Coupe Intercontinentale', '1976'),
('Bayern Munich', 'Coupe Intercontinentale', '2001'),
('Bayern Munich', 'Coupe du Monde des Clubs', '2013'),
('Bayern Munich', 'Coupe du Monde des Clubs', '2020'),
('Borussia Dortmund', 'Bundesliga', '1955–56'),
('Borussia Dortmund', 'Bundesliga', '1956–57'),
('Borussia Dortmund', 'Bundesliga', '1962–63'),
('Borussia Dortmund', 'Bundesliga', '1994–95'),
('Borussia Dortmund', 'Bundesliga', '1995–96'),
('Borussia Dortmund', 'Bundesliga', '2001–02'),
('Borussia Dortmund', 'Bundesliga', '2010–11'),
('Borussia Dortmund', 'Bundesliga', '2011–12'),
('Borussia Dortmund', 'DFB-Pokal', '1964–65'),
('Borussia Dortmund', 'DFB-Pokal', '1988–89'),
('Borussia Dortmund', 'DFB-Pokal', '2011–12'),
('Borussia Dortmund', 'DFB-Pokal', '2016–17'),
('Borussia Dortmund', 'DFL-Supercup', '1989'),
('Borussia Dortmund', 'DFL-Supercup', '1995'),
('Borussia Dortmund', 'DFL-Supercup', '1996'),
('Borussia Dortmund', 'DFL-Supercup', '2008'),
('Borussia Dortmund', 'DFL-Supercup', '2013'),
('Borussia Dortmund', 'DFL-Supercup', '2014'),
('Borussia Dortmund', 'UEFA Champions League', '1996–97'),
('Borussia Dortmund', 'UEFA Cup Winners’ Cup', '1965–66'),
('Borussia Dortmund', 'UEFA Super Cup', '1997'),
('Borussia Mönchengladbach', 'Bundesliga', '1969–70'),
('Borussia Mönchengladbach', 'Bundesliga', '1970–71'),
('Borussia Mönchengladbach', 'Bundesliga', '1974–75'),
('Borussia Mönchengladbach', 'Bundesliga', '1975–76'),
('Borussia Mönchengladbach', 'Bundesliga', '1976–77'),
('Borussia Mönchengladbach', 'Bundesliga', '1978–79'),
('Borussia Mönchengladbach', 'DFB-Pokal', '1969–70'),
('Borussia Mönchengladbach', 'DFB-Pokal', '1972–73'),
('Borussia Mönchengladbach', 'DFB-Pokal', '1972–73'),
('Borussia Mönchengladbach', 'DFB-Pokal', '1994–95'),
('Borussia Mönchengladbach', 'UEFA Cup (C3)', '1974–75'),
('Borussia Mönchengladbach', 'UEFA Cup (C3)', '1978–79'),
('Eintracht Frankfurt', 'Bundesliga', '1958–59'),
('Eintracht Frankfurt', 'DFB-Pokal', '1973–74'),
('Eintracht Frankfurt', 'DFB-Pokal', '1974–75'),
('Eintracht Frankfurt', 'DFB-Pokal', '1980–81'),
('Eintracht Frankfurt', 'DFB-Pokal', '1987–88'),
('Eintracht Frankfurt', 'DFB-Pokal', '2017–18'),
('Eintracht Frankfurt', 'UEFA Cup (C3)', '1979–80'),
('Eintracht Frankfurt', 'UEFA Europa League', '2021–22'),
('Eintracht Frankfurt', 'UEFA Super Cup', '1980'),
('1. FC Köln', 'Bundesliga', '1963–64'),
('1. FC Köln', 'Bundesliga', '1977–78'),
('1. FC Köln', 'DFB-Pokal', '1967–68'),
('1. FC Köln', 'DFB-Pokal', '1976–77'),
('1. FC Köln', 'DFB-Pokal', '1977–78'),
('1. FC Köln', 'DFB-Pokal', '1982–83'),
('SC Freiburg', '2. Bundesliga (D2)', '1992–93'),
('SC Freiburg', '2. Bundesliga (D2)', '2002–03'),
('SC Freiburg', '2. Bundesliga (D2)', '2015–16'),
('1. FC Heidenheim', '2. Bundesliga (D2)', '2022–23'),
('TSG Hoffenheim', '2. Bundesliga (D2)', '2007–08'),
('Hamburger SV', 'Bundesliga', '1960–61'),
('Hamburger SV', 'Bundesliga', '1978–79'),
('Hamburger SV', 'Bundesliga', '1981–82'),
('Hamburger SV', 'DFB-Pokal', '1962–63'),
('Hamburger SV', 'DFB-Pokal', '1975–76'),
('Hamburger SV', 'DFB-Pokal', '1986–87'),
('Hamburger SV', 'DFL-Supercup', '1983'),
('Hamburger SV', 'DFL-Supercup', '1987'),
('Hamburger SV', 'Ligue des Champions / Coupe d’Europe', '1982–83'),
('Hamburger SV', 'Coupe UEFA', '1976–77'),
('Hamburger SV', 'Coupe des Vainqueurs de Coupe', '1967–68'),
('Mainz 05', '2. Bundesliga (D2)', '1999–2000'),
('Mainz 05', '2. Bundesliga (D2)', '2003–04'),
('RB Leipzig', 'DFB-Pokal', '2021–22'),
('RB Leipzig', 'DFL-Supercup', '2023'),
('FC St. Pauli', 'Regionalliga Nord (D3/D4)', '1966–67'),
('FC St. Pauli', 'Regionalliga Nord (D2/D3)', '1976–77'),
('FC St. Pauli', '2. Bundesliga Nord', '1977–78'),
('VfB Stuttgart', 'Bundesliga', '1950–51'),
('VfB Stuttgart', 'Bundesliga', '1951–52'),
('VfB Stuttgart', 'Bundesliga', '1983–84'),
('VfB Stuttgart', 'Bundesliga', '1991–92'),
('VfB Stuttgart', 'Bundesliga', '2006–07'),
('VfB Stuttgart', 'DFB-Pokal', '1953–54'),
('VfB Stuttgart', 'DFB-Pokal', '1957–58'),
('VfB Stuttgart', 'DFB-Pokal', '1996–97'),
('VfB Stuttgart', 'DFB-Pokal', '1997–98'),
('VfB Stuttgart', 'DFL-Supercup', '1992'),
('VfB Stuttgart', 'DFL-Supercup', '1997'),
('Union Berlin', '2. Bundesliga (D2)', '2008–09'),
('Union Berlin', '2. Bundesliga (D2)', '2018–19'),
('Werder Bremen', 'Bundesliga', '1964–65'),
('Werder Bremen', 'Bundesliga', '1987–88'),
('Werder Bremen', 'Bundesliga', '1992–93'),
('Werder Bremen', 'Bundesliga', '2003–04'),
('Werder Bremen', 'Bundesliga', '2004–05'),
('Werder Bremen', 'DFB-Pokal', '1960–61'),
('Werder Bremen', 'DFB-Pokal', '1990–91'),
('Werder Bremen', 'DFB-Pokal', '1993–94'),
('Werder Bremen', 'DFB-Pokal', '1998–99'),
('Werder Bremen', 'DFB-Pokal', '2003–04'),
('Werder Bremen', 'DFB-Pokal', '2008–09'),
('Werder Bremen', 'DFL-Supercup', '1988'),
('Werder Bremen', 'DFL-Supercup', '1993'),
('Werder Bremen', 'DFL-Supercup', '1994'),
('Werder Bremen', 'UEFA Cup Winners’ Cup', '1991–92'),
('Werder Bremen', 'UEFA Intertoto Cup', '1998'),
('VfL Wolfsburg', 'Bundesliga', '2008–09'),
('VfL Wolfsburg', 'DFB-Pokal', '2014–15'),
('VfL Wolfsburg', 'DFL-Supercup', '2015');

-- ============================================
-- STEP 3: Insert missing clubs (if needed)
-- ============================================

INSERT INTO clubs (club_name)
SELECT DISTINCT ti.club_name
FROM temp_trophy_import ti
LEFT JOIN clubs c ON c.club_name = ti.club_name
WHERE c.club_id IS NULL;

-- ============================================
-- STEP 4: Map competition names to competition IDs
-- ============================================

DROP TEMPORARY TABLE IF EXISTS temp_competition_mapping;

CREATE TEMPORARY TABLE temp_competition_mapping AS
SELECT DISTINCT
    ti.competition_name AS input_name,
    (
        CASE
            WHEN ti.competition_name = 'Coupe Intercontinentale' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FIFA Intercontinental Cup' LIMIT 1)
            WHEN ti.competition_name = 'Intercontinental Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FIFA Intercontinental Cup' LIMIT 1)
            WHEN ti.competition_name = 'Coupe du Monde des Clubs' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FIFA Club World Cup' LIMIT 1)
            WHEN ti.competition_name = 'FIFA Club World Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FIFA Club World Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Champions League' THEN (SELECT competition_id FROM competitions WHERE competition_short_name = 'UCL' LIMIT 1)
            WHEN ti.competition_name = 'Ligue des Champions' THEN (SELECT competition_id FROM competitions WHERE competition_short_name = 'UCL' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Champions League / European Cup' THEN (SELECT competition_id FROM competitions WHERE competition_short_name = 'UCL' LIMIT 1)
            WHEN ti.competition_name = 'European Cup / Ligue des champions (UEFA Champions League)' THEN (SELECT competition_id FROM competitions WHERE competition_short_name = 'UCL' LIMIT 1)
            WHEN ti.competition_name = 'Ligue des Champions / Coupe d’Europe' THEN (SELECT competition_id FROM competitions WHERE competition_short_name = 'UCL' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Europa League' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Europa League' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Europa League / UEFA Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Europa League' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Europa Conference League' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Europa Conference League' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Cup (C3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup' LIMIT 1)
            WHEN ti.competition_name = 'Coupe UEFA' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Cup / UEFA Europa League' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Cup Winners’ Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup Winners'' Cup' LIMIT 1)
            WHEN ti.competition_name = 'Coupe des Vainqueurs de Coupe' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup Winners'' Cup' LIMIT 1)
            WHEN ti.competition_name = 'Coupe des coupes (UEFA Cup Winners’ Cup)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup Winners'' Cup' LIMIT 1)
            WHEN ti.competition_name = 'European Cup Winners’ Cup (UEFA)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup Winners'' Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Super Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Super Cup' LIMIT 1)
            WHEN ti.competition_name = 'Supercoupe de l’UEFA' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Super Cup' LIMIT 1)
            WHEN ti.competition_name = 'FIFA Club World Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FIFA Club World Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Intertoto Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Intertoto Cup' LIMIT 1)
            WHEN ti.competition_name = 'Coupe Intertoto' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Intertoto Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Intertoto Cup (compétition européenne officielle)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Intertoto Cup' LIMIT 1)
            WHEN ti.competition_name = 'Coupe des villes de foires (Inter-Cities Fairs Cup)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Inter-Cities Fairs Cup' LIMIT 1)
            WHEN ti.competition_name = 'Inter‑Cities Fairs Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Inter-Cities Fairs Cup' LIMIT 1)
            WHEN ti.competition_name = 'UEFA Cup Winners’ Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'UEFA Cup Winners'' Cup' LIMIT 1)
            WHEN ti.competition_name = 'Bundesliga' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Bundesliga' LIMIT 1)
            WHEN ti.competition_name = '2. Bundesliga (D2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = '2. Bundesliga' LIMIT 1)
            WHEN ti.competition_name = '2. Bundesliga' THEN (SELECT competition_id FROM competitions WHERE competition_name = '2. Bundesliga' LIMIT 1)
            WHEN ti.competition_name = '2. Bundesliga Nord' THEN (SELECT competition_id FROM competitions WHERE competition_name = '2. Bundesliga' LIMIT 1)
            WHEN ti.competition_name = 'DFB-Pokal' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFB-Pokal' LIMIT 1)
            WHEN ti.competition_name = 'DFB‑Pokal (Coupe d’Allemagne)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFB-Pokal' LIMIT 1)
            WHEN ti.competition_name = 'DFB‑Pokal (Coupe d''Allemagne)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFB-Pokal' LIMIT 1)
            WHEN ti.competition_name = 'DFL-Supercup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFL-Supercup' LIMIT 1)
            WHEN ti.competition_name = 'DFL‑Supercup (Supercoupe d’Allemagne)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFL-Supercup' LIMIT 1)
            WHEN ti.competition_name = 'DFL‑Supercup (Supercoupe d''Allemagne)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'DFL-Supercup' LIMIT 1)
            WHEN ti.competition_name = 'Regionalliga Süd (D3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Regionalliga Süd' LIMIT 1)
            WHEN ti.competition_name = 'Regionalliga Süd' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Regionalliga Süd' LIMIT 1)
            WHEN ti.competition_name = 'Regionalliga Nord (D3/D4)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Regionalliga Nord' LIMIT 1)
            WHEN ti.competition_name = 'Regionalliga Nord (D2/D3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Regionalliga Nord' LIMIT 1)
            WHEN ti.competition_name = 'Regionalliga Nord' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Regionalliga Nord' LIMIT 1)
            WHEN ti.competition_name = 'Bayernliga' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Bayernliga' LIMIT 1)
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
    TRIM(SUBSTRING_INDEX(ti.season_input, ' (', 1)) AS season,
    parse_season_year(ti.season_input) AS year,
    (
        ti.competition_name LIKE '%Runners%' 
        OR ti.competition_name LIKE '%Runner%' 
        OR ti.season_input LIKE '%finaliste%' 
        OR ti.season_input LIKE '%Runners%'
    ) AS is_runner_up,
    IF(LOCATE('(', ti.season_input) > 0,
        TRIM(BOTH ')' FROM SUBSTRING(ti.season_input, LOCATE('(', ti.season_input) + 1)),
        NULL
    ) AS notes
FROM temp_trophy_import ti
JOIN clubs c ON c.club_name = ti.club_name
JOIN temp_competition_mapping tcm ON tcm.input_name = ti.competition_name
WHERE tcm.mapped_competition_id IS NOT NULL
ON DUPLICATE KEY UPDATE 
    season = VALUES(season),
    year = VALUES(year),
    is_runner_up = VALUES(is_runner_up),
    notes = VALUES(notes);

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

