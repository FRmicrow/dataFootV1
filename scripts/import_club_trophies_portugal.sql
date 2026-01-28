-- ============================================
-- CLUB TROPHY IMPORT SCRIPT (Portugal)
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
('Benfica', 'Primeira Liga', '1935–36'),
('Benfica', 'Primeira Liga', '1936–37'),
('Benfica', 'Primeira Liga', '1937–38'),
('Benfica', 'Primeira Liga', '1941–42'),
('Benfica', 'Primeira Liga', '1942–43'),
('Benfica', 'Primeira Liga', '1944–45'),
('Benfica', 'Primeira Liga', '1949–50'),
('Benfica', 'Primeira Liga', '1954–55'),
('Benfica', 'Primeira Liga', '1956–57'),
('Benfica', 'Primeira Liga', '1959–60'),
('Benfica', 'Primeira Liga', '1960–61'),
('Benfica', 'Primeira Liga', '1962–63'),
('Benfica', 'Primeira Liga', '1963–64'),
('Benfica', 'Primeira Liga', '1964–65'),
('Benfica', 'Primeira Liga', '1966–67'),
('Benfica', 'Primeira Liga', '1967–68'),
('Benfica', 'Primeira Liga', '1968–69'),
('Benfica', 'Primeira Liga', '1970–71'),
('Benfica', 'Primeira Liga', '1971–72'),
('Benfica', 'Primeira Liga', '1972–73'),
('Benfica', 'Primeira Liga', '1974–75'),
('Benfica', 'Primeira Liga', '1975–76'),
('Benfica', 'Primeira Liga', '1976–77'),
('Benfica', 'Primeira Liga', '1980–81'),
('Benfica', 'Primeira Liga', '1982–83'),
('Benfica', 'Primeira Liga', '1983–84'),
('Benfica', 'Primeira Liga', '1986–87'),
('Benfica', 'Primeira Liga', '1988–89'),
('Benfica', 'Primeira Liga', '1990–91'),
('Benfica', 'Primeira Liga', '1993–94'),
('Benfica', 'Primeira Liga', '2004–05'),
('Benfica', 'Primeira Liga', '2009–10'),
('Benfica', 'Primeira Liga', '2013–14'),
('Benfica', 'Primeira Liga', '2014–15'),
('Benfica', 'Primeira Liga', '2015–16'),
('Benfica', 'Primeira Liga', '2016–17'),
('Benfica', 'Primeira Liga', '2018–19'),
('Benfica', 'Taça de Portugal', '1939–40'),
('Benfica', 'Taça de Portugal', '1942–43'),
('Benfica', 'Taça de Portugal', '1943–44'),
('Benfica', 'Taça de Portugal', '1948–49'),
('Benfica', 'Taça de Portugal', '1950–51'),
('Benfica', 'Taça de Portugal', '1951–52'),
('Benfica', 'Taça de Portugal', '1952–53'),
('Benfica', 'Taça de Portugal', '1954–55'),
('Benfica', 'Taça de Portugal', '1956–57'),
('Benfica', 'Taça de Portugal', '1958–59'),
('Benfica', 'Taça de Portugal', '1961–62'),
('Benfica', 'Taça de Portugal', '1963–64'),
('Benfica', 'Taça de Portugal', '1968–69'),
('Benfica', 'Taça de Portugal', '1969–70'),
('Benfica', 'Taça de Portugal', '1971–72'),
('Benfica', 'Taça de Portugal', '1979–80'),
('Benfica', 'Taça de Portugal', '1980–81'),
('Benfica', 'Taça de Portugal', '1982–83'),
('Benfica', 'Taça de Portugal', '1984–85'),
('Benfica', 'Taça de Portugal', '1985–86'),
('Benfica', 'Taça de Portugal', '1986–87'),
('Benfica', 'Taça de Portugal', '1992–93'),
('Benfica', 'Taça de Portugal', '1995–96'),
('Benfica', 'Taça de Portugal', '2003–04'),
('Benfica', 'Taça de Portugal', '2013–14'),
('Benfica', 'Taça de Portugal', '2016–17'),
('Benfica', 'Supertaça Cândido de Oliveira', '1980'),
('Benfica', 'Supertaça Cândido de Oliveira', '1985'),
('Benfica', 'Supertaça Cândido de Oliveira', '1989'),
('Benfica', 'Supertaça Cândido de Oliveira', '2005'),
('Benfica', 'Supertaça Cândido de Oliveira', '2014'),
('Benfica', 'Supertaça Cândido de Oliveira', '2016'),
('Benfica', 'Ligue des Champions', '1960–61'),
('Benfica', 'Ligue des Champions', '1961–62'),
('FC Porto', 'Primeira Liga', '1934–35'),
('FC Porto', 'Primeira Liga', '1938–39'),
('FC Porto', 'Primeira Liga', '1955–56'),
('FC Porto', 'Primeira Liga', '1958–59'),
('FC Porto', 'Primeira Liga', '1959–60'),
('FC Porto', 'Primeira Liga', '1977–78'),
('FC Porto', 'Primeira Liga', '1978–79'),
('FC Porto', 'Primeira Liga', '1984–85'),
('FC Porto', 'Primeira Liga', '1985–86'),
('FC Porto', 'Primeira Liga', '1987–88'),
('FC Porto', 'Primeira Liga', '1989–90'),
('FC Porto', 'Primeira Liga', '1991–92'),
('FC Porto', 'Primeira Liga', '1992–93'),
('FC Porto', 'Primeira Liga', '1994–95'),
('FC Porto', 'Primeira Liga', '1995–96'),
('FC Porto', 'Primeira Liga', '1996–97'),
('FC Porto', 'Primeira Liga', '1997–98'),
('FC Porto', 'Primeira Liga', '1998–99'),
('FC Porto', 'Primeira Liga', '2002–03'),
('FC Porto', 'Primeira Liga', '2003–04'),
('FC Porto', 'Primeira Liga', '2005–06'),
('FC Porto', 'Primeira Liga', '2006–07'),
('FC Porto', 'Primeira Liga', '2007–08'),
('FC Porto', 'Primeira Liga', '2008–09'),
('FC Porto', 'Primeira Liga', '2010–11'),
('FC Porto', 'Primeira Liga', '2011–12'),
('FC Porto', 'Primeira Liga', '2012–13'),
('FC Porto', 'Primeira Liga', '2017–18'),
('FC Porto', 'Primeira Liga', '2019–20'),
('FC Porto', 'Taça de Portugal', '1955–56'),
('FC Porto', 'Taça de Portugal', '1957–58'),
('FC Porto', 'Taça de Portugal', '1967–68'),
('FC Porto', 'Taça de Portugal', '1976–77'),
('FC Porto', 'Taça de Portugal', '1983–84'),
('FC Porto', 'Taça de Portugal', '1987–88'),
('FC Porto', 'Taça de Portugal', '1990–91'),
('FC Porto', 'Taça de Portugal', '1993–94'),
('FC Porto', 'Taça de Portugal', '1997–98'),
('FC Porto', 'Taça de Portugal', '1999–2000'),
('FC Porto', 'Taça de Portugal', '2002–03'),
('FC Porto', 'Taça de Portugal', '2005–06'),
('FC Porto', 'Taça de Portugal', '2008–09'),
('FC Porto', 'Taça de Portugal', '2009–10'),
('FC Porto', 'Taça de Portugal', '2010–11'),
('FC Porto', 'Taça de Portugal', '2019–20'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1981'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1983'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1984'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1986'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1990'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1991'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1993'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1994'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1996'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1998'),
('FC Porto', 'Supertaça Cândido de Oliveira', '1999'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2001'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2003'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2004'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2006'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2009'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2010'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2011'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2012'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2013'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2018'),
('FC Porto', 'Supertaça Cândido de Oliveira', '2020'),
('FC Porto', 'Ligue des Champions', '1986–87'),
('FC Porto', 'Ligue des Champions', '2003–04'),
('FC Porto', 'Coupe UEFA', '2002–03'),
('FC Porto', 'Coupe Intercontinentale', '1987'),
('FC Porto', 'Coupe Intercontinentale', '2004'),
('Sporting CP', 'Primeira Liga', '1940–41'),
('Sporting CP', 'Primeira Liga', '1943–44'),
('Sporting CP', 'Primeira Liga', '1946–47'),
('Sporting CP', 'Primeira Liga', '1947–48'),
('Sporting CP', 'Primeira Liga', '1948–49'),
('Sporting CP', 'Primeira Liga', '1950–51'),
('Sporting CP', 'Primeira Liga', '1951–52'),
('Sporting CP', 'Primeira Liga', '1952–53'),
('Sporting CP', 'Primeira Liga', '1953–54'),
('Sporting CP', 'Primeira Liga', '1957–58'),
('Sporting CP', 'Primeira Liga', '1958–59'),
('Sporting CP', 'Primeira Liga', '1961–62'),
('Sporting CP', 'Primeira Liga', '1965–66'),
('Sporting CP', 'Primeira Liga', '1969–70'),
('Sporting CP', 'Primeira Liga', '1973–74'),
('Sporting CP', 'Primeira Liga', '1979–80'),
('Sporting CP', 'Primeira Liga', '1981–82'),
('Sporting CP', 'Primeira Liga', '1999–2000'),
('Sporting CP', 'Primeira Liga', '2001–02'),
('Sporting CP', 'Primeira Liga', '2020–21'),
('Sporting CP', 'Taça de Portugal', '1940–41'),
('Sporting CP', 'Taça de Portugal', '1944–45'),
('Sporting CP', 'Taça de Portugal', '1945–46'),
('Sporting CP', 'Taça de Portugal', '1947–48'),
('Sporting CP', 'Taça de Portugal', '1953–54'),
('Sporting CP', 'Taça de Portugal', '1962–63'),
('Sporting CP', 'Taça de Portugal', '1970–71'),
('Sporting CP', 'Taça de Portugal', '1973–74'),
('Sporting CP', 'Taça de Portugal', '1977–78'),
('Sporting CP', 'Taça de Portugal', '1981–82'),
('Sporting CP', 'Taça de Portugal', '1994–95'),
('Sporting CP', 'Taça de Portugal', '2001–02'),
('Sporting CP', 'Taça de Portugal', '2006–07'),
('Sporting CP', 'Taça de Portugal', '2007–08'),
('Sporting CP', 'Supertaça Cândido de Oliveira', '1982'),
('Sporting CP', 'Supertaça Cândido de Oliveira', '1995'),
('Sporting CP', 'Supertaça Cândido de Oliveira', '2000'),
('Sporting CP', 'Supertaça Cândido de Oliveira', '2002'),
('Sporting CP', 'Supertaça Cândido de Oliveira', '2007'),
('Sporting CP', 'Supertaça Cândido de Oliveira', '2008'),
('Sporting CP', 'UEFA Cup Winners’ Cup', '1963–64'),
('SC Braga', 'Taça de Portugal', '1965–66'),
('SC Braga', 'Taça de Portugal', '2015–16'),
('SC Braga', 'Taça da Liga', '2012–13'),
('SC Braga', 'Taça da Liga', '2019–20'),
('SC Braga', 'Supertaça Cândido de Oliveira', '1982'),
('SC Braga', 'Supertaça Cândido de Oliveira', '2020'),
('Boavista FC', 'Primeira Liga', '2000–01'),
('Boavista FC', 'Taça de Portugal', '1974–75'),
('Boavista FC', 'Taça de Portugal', '1975–76'),
('Boavista FC', 'Taça de Portugal', '1978–79'),
('Boavista FC', 'Taça de Portugal', '1991–92'),
('Boavista FC', 'Taça de Portugal', '1996–97'),
('Boavista FC', 'Supertaça Cândido de Oliveira', '1979'),
('Boavista FC', 'Supertaça Cândido de Oliveira', '1992'),
('Boavista FC', 'Supertaça Cândido de Oliveira', '1997'),
('Marítimo', 'Taça da Madeira', '1927–28'),
('Marítimo', 'Taça da Madeira', '1928–29'),
('Marítimo', 'Taça da Madeira', '1929–30'),
('Marítimo', 'Taça da Madeira', '1930–31'),
('Marítimo', 'Taça da Madeira', '1931–32'),
('Marítimo', 'Taça da Madeira', '1932–33'),
('Marítimo', 'Taça da Madeira', '1933–34'),
('Marítimo', 'Taça da Madeira', '1934–35'),
('Vitória SC', 'Taça de Portugal', '1948–49'),
('Vitória SC', 'Taça de Portugal', '1962–63'),
('Vitória SC', 'Supertaça Cândido de Oliveira', '1988'),
('Vitória FC', 'Taça de Portugal', '1964–65'),
('Vitória FC', 'Taça de Portugal', '1966–67'),
('Vitória FC', 'Taça de Portugal', '2004–05'),
('Vitória FC', 'Supertaça Cândido de Oliveira', '1967'),
('Santa Clara', 'Segunda Divisão / Liga Portugal 2 (D2)', '1998–99'),
('Gil Vicente', 'Segunda Divisão / Liga Portugal 2 (D2)', '1998–99'),
('Gil Vicente', 'Taça de Portugal', '1964–65 (finaliste, pas vainqueur)'),
('Estoril Praia', 'Segunda Divisão / Liga Portugal 2 (D2)', '1946–47'),
('Estoril Praia', 'Segunda Divisão / Liga Portugal 2 (D2)', '1990–91'),
('Moreirense', 'Segunda Liga / Liga Portugal 2 (D2)', '2013–14'),
('Moreirense', 'Taça da Liga', '2016–17'),
('Portimonense', 'Segunda Divisão / Liga Portugal 2 (D2)', '1978–79'),
('Paços de Ferreira', 'Segunda Divisão / Liga Portugal 2 (D2)', '1990–91'),
('Paços de Ferreira', 'Segunda Divisão / Liga Portugal 2 (D2)', '1997–98'),
('Famalicão', 'Segunda Divisão / Liga Portugal 2 (D2)', '1959–60');

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
            WHEN ti.competition_name = 'Primeira Liga' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Primeira Liga' LIMIT 1)
            WHEN ti.competition_name = 'Taça de Portugal' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Taça de Portugal' LIMIT 1)
            WHEN ti.competition_name = 'Supertaça Cândido de Oliveira' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Supertaça Cândido de Oliveira' LIMIT 1)
            WHEN ti.competition_name = 'Taça da Liga' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Taça da Liga' LIMIT 1)
            WHEN ti.competition_name = 'Segunda Divisão / Liga Portugal 2 (D2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Liga Portugal 2' LIMIT 1)
            WHEN ti.competition_name = 'Segunda Liga / Liga Portugal 2 (D2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Liga Portugal 2' LIMIT 1)
            WHEN ti.competition_name = 'Liga Portugal 2' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Liga Portugal 2' LIMIT 1)
            WHEN ti.competition_name = 'Taça da Madeira' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Taça da Madeira' LIMIT 1)
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

