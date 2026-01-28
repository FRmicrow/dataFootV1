-- ============================================
-- CLUB TROPHY IMPORT SCRIPT (Italy)
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
('AC Milan', 'Serie A', '1901'),
('AC Milan', 'Serie A', '1906'),
('AC Milan', 'Serie A', '1907'),
('AC Milan', 'Serie A', '1950–51'),
('AC Milan', 'Serie A', '1954–55'),
('AC Milan', 'Serie A', '1956–57'),
('AC Milan', 'Serie A', '1958–59'),
('AC Milan', 'Serie A', '1961–62'),
('AC Milan', 'Serie A', '1967–68'),
('AC Milan', 'Serie A', '1978–79'),
('AC Milan', 'Serie A', '1987–88'),
('AC Milan', 'Serie A', '1991–92'),
('AC Milan', 'Serie A', '1992–93'),
('AC Milan', 'Serie A', '1993–94'),
('AC Milan', 'Serie A', '1995–96'),
('AC Milan', 'Serie A', '1998–99'),
('AC Milan', 'Serie A', '2003–04'),
('AC Milan', 'Serie A', '2010–11'),
('AC Milan', 'Serie A', '2021–22'),
('AC Milan', 'Coppa Italia', '1966–67'),
('AC Milan', 'Coppa Italia', '1971–72'),
('AC Milan', 'Coppa Italia', '1972–73'),
('AC Milan', 'Coppa Italia', '1976–77'),
('AC Milan', 'Coppa Italia', '2002–03'),
('AC Milan', 'Supercoppa Italiana', '1988'),
('AC Milan', 'Supercoppa Italiana', '1992'),
('AC Milan', 'Supercoppa Italiana', '1993'),
('AC Milan', 'Supercoppa Italiana', '1994'),
('AC Milan', 'Supercoppa Italiana', '2004'),
('AC Milan', 'Supercoppa Italiana', '2011'),
('AC Milan', 'Ligue des Champions', '1962–63'),
('AC Milan', 'Ligue des Champions', '1968–69'),
('AC Milan', 'Ligue des Champions', '1988–89'),
('AC Milan', 'Ligue des Champions', '1989–90'),
('AC Milan', 'Ligue des Champions', '1993–94'),
('AC Milan', 'Ligue des Champions', '2002–03'),
('AC Milan', 'Ligue des Champions', '2006–07'),
('AC Milan', 'Coupe des Vainqueurs de Coupe', '1967–68'),
('AC Milan', 'Coupe des Vainqueurs de Coupe', '1972–73'),
('AC Milan', 'Supercoupe de l’UEFA', '1989'),
('AC Milan', 'Supercoupe de l’UEFA', '1990'),
('AC Milan', 'Supercoupe de l’UEFA', '1994'),
('AC Milan', 'Supercoupe de l’UEFA', '2003'),
('AC Milan', 'Supercoupe de l’UEFA', '2007'),
('AC Milan', 'Coupe Intercontinentale', '1969'),
('AC Milan', 'Coupe Intercontinentale', '1989'),
('AC Milan', 'Coupe Intercontinentale', '1990'),
('AC Milan', 'Coupe du Monde des Clubs', '2007'),
('Atalanta BC', 'Coppa Italia', '1962–63'),
('Atalanta BC', 'Serie B', '1927–28'),
('Atalanta BC', 'Serie B', '1939–40'),
('Atalanta BC', 'Serie B', '1958–59'),
('Atalanta BC', 'Serie B', '1983–84'),
('Atalanta BC', 'Serie B', '2005–06'),
('Bologna FC', 'Serie A', '1924–25'),
('Bologna FC', 'Serie A', '1928–29'),
('Bologna FC', 'Serie A', '1935–36'),
('Bologna FC', 'Serie A', '1936–37'),
('Bologna FC', 'Serie A', '1938–39'),
('Bologna FC', 'Serie A', '1940–41'),
('Bologna FC', 'Serie A', '1963–64'),
('Bologna FC', 'Coppa Italia', '1969–70'),
('Bologna FC', 'Coppa Italia', '1973–74'),
('Bologna FC', 'Coupe Mitropa', '1932'),
('Bologna FC', 'Coupe Mitropa', '1934'),
('Cagliari Calcio', 'Serie A', '1969–70'),
('Cagliari Calcio', 'Coppa Italia', '1968–69'),
('Cagliari Calcio', 'Serie B', '1951–52'),
('Cagliari Calcio', 'Serie B', '1963–64'),
('Cagliari Calcio', 'Serie B', '2015–16'),
('Como 1907', 'Serie B', '1948–49'),
('Como 1907', 'Serie C', '1978–79'),
('Como 1907', 'Serie C', '2020–21'),
('US Cremonese', 'Serie B', '1935–36'),
('US Cremonese', 'Serie B', '1983–84'),
('US Cremonese', 'Serie C', '1941–42'),
('US Cremonese', 'Serie C', '1966–67'),
('ACF Fiorentina', 'Serie A', '1955–56'),
('ACF Fiorentina', 'Serie A', '1968–69'),
('ACF Fiorentina', 'Coppa Italia', '1939–40'),
('ACF Fiorentina', 'Coppa Italia', '1960–61'),
('ACF Fiorentina', 'Coppa Italia', '1965–66'),
('ACF Fiorentina', 'Coppa Italia', '1974–75'),
('ACF Fiorentina', 'Coppa Italia', '1995–96'),
('ACF Fiorentina', 'Coppa Italia', '2000–01'),
('ACF Fiorentina', 'Supercoppa Italiana', '1996'),
('Genoa CFC', 'Serie A', '1898'),
('Genoa CFC', 'Serie A', '1899'),
('Genoa CFC', 'Serie A', '1900'),
('Genoa CFC', 'Serie A', '1901'),
('Genoa CFC', 'Serie A', '1902'),
('Genoa CFC', 'Serie A', '1903'),
('Genoa CFC', 'Serie A', '1904'),
('Genoa CFC', 'Serie A', '1914–15'),
('Genoa CFC', 'Serie A', '1922–23'),
('Genoa CFC', 'Coppa Italia', '1936–37'),
('Genoa CFC', 'Serie B', '1934–35'),
('Genoa CFC', 'Serie B', '1952–53'),
('Genoa CFC', 'Serie B', '1961–62'),
('Genoa CFC', 'Serie B', '1988–89'),
('Hellas Verona', 'Serie A', '1984–85'),
('Hellas Verona', 'Serie B', '1956–57'),
('Hellas Verona', 'Serie B', '1981–82'),
('Hellas Verona', 'Serie B', '2018–19'),
('Inter Milan', 'Serie A', '1909–10'),
('Inter Milan', 'Serie A', '1919–20'),
('Inter Milan', 'Serie A', '1929–30'),
('Inter Milan', 'Serie A', '1937–38'),
('Inter Milan', 'Serie A', '1939–40'),
('Inter Milan', 'Serie A', '1952–53'),
('Inter Milan', 'Serie A', '1953–54'),
('Inter Milan', 'Serie A', '1962–63'),
('Inter Milan', 'Serie A', '1964–65'),
('Inter Milan', 'Serie A', '1965–66'),
('Inter Milan', 'Serie A', '1970–71'),
('Inter Milan', 'Serie A', '1979–80'),
('Inter Milan', 'Serie A', '1988–89'),
('Inter Milan', 'Serie A', '2005–06'),
('Inter Milan', 'Serie A', '2006–07'),
('Inter Milan', 'Serie A', '2007–08'),
('Inter Milan', 'Serie A', '2008–09'),
('Inter Milan', 'Serie A', '2009–10'),
('Inter Milan', 'Serie A', '2020–21'),
('Inter Milan', 'Coppa Italia', '1938–39'),
('Inter Milan', 'Coppa Italia', '1976–77'),
('Inter Milan', 'Coppa Italia', '1977–78'),
('Inter Milan', 'Coppa Italia', '1981–82'),
('Inter Milan', 'Coppa Italia', '2004–05'),
('Inter Milan', 'Coppa Italia', '2005–06'),
('Inter Milan', 'Coppa Italia', '2009–10'),
('Inter Milan', 'Coppa Italia', '2010–11'),
('Inter Milan', 'Supercoppa Italiana', '1989'),
('Inter Milan', 'Supercoppa Italiana', '2005'),
('Inter Milan', 'Supercoppa Italiana', '2006'),
('Inter Milan', 'Supercoppa Italiana', '2008'),
('Inter Milan', 'Supercoppa Italiana', '2010'),
('Inter Milan', 'Ligue des Champions', '1963–64'),
('Inter Milan', 'Ligue des Champions', '1964–65'),
('Inter Milan', 'Ligue des Champions', '2009–10'),
('Inter Milan', 'Coupe Intercontinentale', '1964'),
('Inter Milan', 'Coupe Intercontinentale', '1965'),
('Inter Milan', 'Coupe UEFA', '1990–91'),
('Inter Milan', 'Coupe UEFA', '1993–94'),
('Inter Milan', 'Coupe UEFA', '1997–98'),
('Juventus', 'Serie A', '1905'),
('Juventus', 'Serie A', '1925–26'),
('Juventus', 'Serie A', '1930–31'),
('Juventus', 'Serie A', '1931–32'),
('Juventus', 'Serie A', '1932–33'),
('Juventus', 'Serie A', '1933–34'),
('Juventus', 'Serie A', '1934–35'),
('Juventus', 'Serie A', '1949–50'),
('Juventus', 'Serie A', '1951–52'),
('Juventus', 'Serie A', '1957–58'),
('Juventus', 'Serie A', '1959–60'),
('Juventus', 'Serie A', '1960–61'),
('Juventus', 'Serie A', '1966–67'),
('Juventus', 'Serie A', '1971–72'),
('Juventus', 'Serie A', '1972–73'),
('Juventus', 'Serie A', '1974–75'),
('Juventus', 'Serie A', '1976–77'),
('Juventus', 'Serie A', '1977–78'),
('Juventus', 'Serie A', '1980–81'),
('Juventus', 'Serie A', '1981–82'),
('Juventus', 'Serie A', '1983–84'),
('Juventus', 'Serie A', '1985–86'),
('Juventus', 'Serie A', '1994–95'),
('Juventus', 'Serie A', '1996–97'),
('Juventus', 'Serie A', '1997–98'),
('Juventus', 'Serie A', '2001–02'),
('Juventus', 'Serie A', '2002–03'),
('Juventus', 'Serie A', '2011–12'),
('Juventus', 'Serie A', '2012–13'),
('Juventus', 'Serie A', '2013–14'),
('Juventus', 'Serie A', '2014–15'),
('Juventus', 'Serie A', '2015–16'),
('Juventus', 'Serie A', '2016–17'),
('Juventus', 'Serie A', '2017–18'),
('Juventus', 'Serie A', '2018–19'),
('Juventus', 'Serie A', '2019–20'),
('Juventus', 'Coppa Italia', '1937–38'),
('Juventus', 'Coppa Italia', '1941–42'),
('Juventus', 'Coppa Italia', '1958–59'),
('Juventus', 'Coppa Italia', '1959–60'),
('Juventus', 'Coppa Italia', '1964–65'),
('Juventus', 'Coppa Italia', '1978–79'),
('Juventus', 'Coppa Italia', '1982–83'),
('Juventus', 'Coppa Italia', '1989–90'),
('Juventus', 'Coppa Italia', '1994–95'),
('Juventus', 'Coppa Italia', '2014–15'),
('Juventus', 'Coppa Italia', '2015–16'),
('Juventus', 'Coppa Italia', '2016–17'),
('Juventus', 'Coppa Italia', '2017–18'),
('Juventus', 'Supercoppa Italiana', '1984'),
('Juventus', 'Supercoppa Italiana', '1995'),
('Juventus', 'Supercoppa Italiana', '1997'),
('Juventus', 'Supercoppa Italiana', '2002'),
('Juventus', 'Supercoppa Italiana', '2003'),
('Juventus', 'Supercoppa Italiana', '2012'),
('Juventus', 'Supercoppa Italiana', '2013'),
('Juventus', 'Supercoppa Italiana', '2015'),
('Juventus', 'Ligue des Champions', '1984–85'),
('Juventus', 'Ligue des Champions', '1995–96'),
('Juventus', 'Coupe UEFA', '1976–77'),
('Juventus', 'Coupe UEFA', '1989–90'),
('Juventus', 'Coupe des Vainqueurs de Coupe', '1983–84'),
('Juventus', 'UEFA Super Cup', '1984'),
('Juventus', 'Coupe Intercontinentale', '1985'),
('Juventus', 'Coupe Intertoto', '1999'),
('SS Lazio', 'Serie A', '1973–74'),
('SS Lazio', 'Serie A', '1999–2000'),
('SS Lazio', 'Coppa Italia', '1957–58'),
('SS Lazio', 'Coppa Italia', '1997–98'),
('SS Lazio', 'Coppa Italia', '1999–2000'),
('SS Lazio', 'Coppa Italia', '2003–04'),
('SS Lazio', 'Coppa Italia', '2008–09'),
('SS Lazio', 'Coppa Italia', '2018–19'),
('SS Lazio', 'Supercoppa Italiana', '1998'),
('SS Lazio', 'Supercoppa Italiana', '2000'),
('SS Lazio', 'Supercoppa Italiana', '2009'),
('SS Lazio', 'Supercoppa Italiana', '2017'),
('SS Lazio', 'Coupe des Vainqueurs de Coupe', '1998–99'),
('SS Lazio', 'UEFA Super Cup', '1999'),
('US Lecce', 'Serie B', '1984–85'),
('US Lecce', 'Serie B', '1987–88'),
('US Lecce', 'Serie B', '2009–10'),
('US Lecce', 'Serie C', '1975–76'),
('US Lecce', 'Serie C', '1980–81'),
('US Lecce', 'Serie C', '1995–96'),
('SSC Napoli', 'Serie A', '1986–87'),
('SSC Napoli', 'Serie A', '1989–90'),
('SSC Napoli', 'Serie A', '2022–23'),
('SSC Napoli', 'Coppa Italia', '1961–62'),
('SSC Napoli', 'Coppa Italia', '1975–76'),
('SSC Napoli', 'Coppa Italia', '1986–87'),
('SSC Napoli', 'Coppa Italia', '2011–12'),
('SSC Napoli', 'Coppa Italia', '2013–14'),
('SSC Napoli', 'Supercoppa Italiana', '1990'),
('SSC Napoli', 'Supercoppa Italiana', '2014'),
('SSC Napoli', 'UEFA Cup (C3)', '1988–89'),
('Parma Calcio', 'Coppa Italia', '1991–92'),
('Parma Calcio', 'Coppa Italia', '1998–99'),
('Parma Calcio', 'Coppa Italia', '2001–02'),
('Parma Calcio', 'Supercoppa Italiana', '1999'),
('Parma Calcio', 'Coupe des Vainqueurs de Coupe', '1992–93'),
('Parma Calcio', 'Coupe UEFA', '1994–95'),
('Parma Calcio', 'Coupe UEFA', '1998–99'),
('Parma Calcio', 'UEFA Super Cup', '1993'),
('Parma Calcio', 'Serie B', '1978–79'),
('Parma Calcio', 'Serie B', '1983–84'),
('Parma Calcio', 'Serie B', '1985–86'),
('Pisa SC', 'Serie B', '1984–85'),
('Pisa SC', 'Serie B', '1990–91'),
('Pisa SC', 'Serie C1 / Serie C', '1968–69'),
('Pisa SC', 'Serie C1 / Serie C', '1974–75'),
('AS Roma', 'Serie A', '1941–42'),
('AS Roma', 'Serie A', '1982–83'),
('AS Roma', 'Serie A', '2000–01'),
('AS Roma', 'Coppa Italia', '1963–64'),
('AS Roma', 'Coppa Italia', '1968–69'),
('AS Roma', 'Coppa Italia', '1979–80'),
('AS Roma', 'Coppa Italia', '1980–81'),
('AS Roma', 'Coppa Italia', '1983–84'),
('AS Roma', 'Coppa Italia', '1985–86'),
('AS Roma', 'Coppa Italia', '1990–91'),
('AS Roma', 'Coppa Italia', '2006–07'),
('AS Roma', 'Coppa Italia', '2007–08'),
('AS Roma', 'Supercoppa Italiana', '2001'),
('AS Roma', 'Supercoppa Italiana', '2007'),
('US Sassuolo', 'Serie B', '2012–13'),
('US Sassuolo', 'Serie C1 / Lega Pro', '2007–08'),
('US Sassuolo', 'Serie C2 / Lega Pro Seconda Divisione', '2006–07'),
('Torino FC', 'Serie A', '1927–28'),
('Torino FC', 'Serie A', '1942–43'),
('Torino FC', 'Serie A', '1945–46'),
('Torino FC', 'Serie A', '1946–47'),
('Torino FC', 'Serie A', '1947–48'),
('Torino FC', 'Serie A', '1948–49'),
('Torino FC', 'Serie A', '1949–50'),
('Torino FC', 'Coppa Italia', '1935–36'),
('Torino FC', 'Coppa Italia', '1942–43'),
('Torino FC', 'Coppa Italia', '1967–68'),
('Torino FC', 'Coppa Italia', '1970–71'),
('Torino FC', 'Coppa Italia', '1992–93'),
('Torino FC', 'Supercoppa Italiana', '1993'),
('Udinese Calcio', 'Serie B', '1955–56'),
('Udinese Calcio', 'Serie B', '1978–79'),
('Udinese Calcio', 'Serie B', '2000–01'),
('Udinese Calcio', 'Coppa Italia', '1937–38');

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
            WHEN ti.competition_name = 'Serie A' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Serie A' LIMIT 1)
            WHEN ti.competition_name = 'Serie B' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Serie B' LIMIT 1)
            WHEN ti.competition_name = 'Serie C' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Serie C' LIMIT 1)
            WHEN ti.competition_name = 'Serie C1 / Serie C' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Serie C' LIMIT 1)
            WHEN ti.competition_name = 'Serie C1 / Lega Pro' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Serie C' LIMIT 1)
            WHEN ti.competition_name = 'Serie C2 / Lega Pro Seconda Divisione' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Serie C' LIMIT 1)
            WHEN ti.competition_name = 'Coppa Italia' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Coppa Italia' LIMIT 1)
            WHEN ti.competition_name = 'Supercoppa Italiana' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Supercoppa Italiana' LIMIT 1)
            WHEN ti.competition_name = 'Coupe Mitropa' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Mitropa Cup' LIMIT 1)
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

