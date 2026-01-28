-- ============================================
-- CLUB TROPHY IMPORT SCRIPT (England)
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
('Arsenal', 'Championnat d’Angleterre', '1930–31'),
('Arsenal', 'Championnat d’Angleterre', '1932–33'),
('Arsenal', 'Championnat d’Angleterre', '1933–34'),
('Arsenal', 'Championnat d’Angleterre', '1934–35'),
('Arsenal', 'Championnat d’Angleterre', '1937–38'),
('Arsenal', 'Championnat d’Angleterre', '1947–48'),
('Arsenal', 'Championnat d’Angleterre', '1952–53'),
('Arsenal', 'Championnat d’Angleterre', '1970–71'),
('Arsenal', 'Championnat d’Angleterre', '1988–89'),
('Arsenal', 'Championnat d’Angleterre', '1990–91'),
('Arsenal', 'Championnat d’Angleterre', '1997–98'),
('Arsenal', 'Championnat d’Angleterre', '2001–02'),
('Arsenal', 'Championnat d’Angleterre', '2003–04'),
('Arsenal', 'FA Cup', '1929–30'),
('Arsenal', 'FA Cup', '1935–36'),
('Arsenal', 'FA Cup', '1949–50'),
('Arsenal', 'FA Cup', '1970–71'),
('Arsenal', 'FA Cup', '1978–79'),
('Arsenal', 'FA Cup', '1992–93'),
('Arsenal', 'FA Cup', '1997–98'),
('Arsenal', 'FA Cup', '2001–02'),
('Arsenal', 'FA Cup', '2002–03'),
('Arsenal', 'FA Cup', '2004–05'),
('Arsenal', 'FA Cup', '2013–14'),
('Arsenal', 'FA Cup', '2014–15'),
('Arsenal', 'FA Cup', '2016–17'),
('Arsenal', 'FA Cup', '2019–20'),
('Arsenal', 'League Cup', '1986–87'),
('Arsenal', 'League Cup', '1992–93'),
('Arsenal', 'FA Community Shield', '1930'),
('Arsenal', 'FA Community Shield', '1931'),
('Arsenal', 'FA Community Shield', '1933'),
('Arsenal', 'FA Community Shield', '1934'),
('Arsenal', 'FA Community Shield', '1938'),
('Arsenal', 'FA Community Shield', '1948'),
('Arsenal', 'FA Community Shield', '1953'),
('Arsenal', 'FA Community Shield', '1991'),
('Arsenal', 'FA Community Shield', '1998'),
('Arsenal', 'FA Community Shield', '1999'),
('Arsenal', 'FA Community Shield', '2002'),
('Arsenal', 'FA Community Shield', '2004'),
('Arsenal', 'FA Community Shield', '2014'),
('Arsenal', 'FA Community Shield', '2015'),
('Arsenal', 'FA Community Shield', '2017'),
('Arsenal', 'FA Community Shield', '2020'),
('Arsenal', 'FA Community Shield', '2023'),
('Arsenal', 'Coupe des villes de foires (Inter-Cities Fairs Cup)', '1970'),
('Arsenal', 'Coupe des coupes (UEFA Cup Winners’ Cup)', '1994'),
('Aston Villa', 'Football League First Division / Championnat d’Angleterre', '1893–94'),
('Aston Villa', 'Football League First Division / Championnat d’Angleterre', '1895–96'),
('Aston Villa', 'Football League First Division / Championnat d’Angleterre', '1896–97'),
('Aston Villa', 'Football League First Division / Championnat d’Angleterre', '1898–99'),
('Aston Villa', 'Football League First Division / Championnat d’Angleterre', '1899–00'),
('Aston Villa', 'Football League First Division / Championnat d’Angleterre', '1909–10'),
('Aston Villa', 'Football League First Division / Championnat d’Angleterre', '1980–81'),
('Aston Villa', 'FA Cup', '1886–87'),
('Aston Villa', 'FA Cup', '1894–95'),
('Aston Villa', 'FA Cup', '1896–97'),
('Aston Villa', 'FA Cup', '1904–05'),
('Aston Villa', 'FA Cup', '1912–13'),
('Aston Villa', 'FA Cup', '1919–20'),
('Aston Villa', 'FA Cup', '1956–57'),
('Aston Villa', 'League Cup (Football League Cup / EFL Cup)', '1960–61'),
('Aston Villa', 'League Cup (Football League Cup / EFL Cup)', '1974–75'),
('Aston Villa', 'League Cup (Football League Cup / EFL Cup)', '1976–77'),
('Aston Villa', 'League Cup (Football League Cup / EFL Cup)', '1993–94'),
('Aston Villa', 'League Cup (Football League Cup / EFL Cup)', '1995–96'),
('Aston Villa', 'FA Community Shield / English Supercup', '1981'),
('Aston Villa', 'European Cup / Ligue des champions (UEFA Champions League)', '1981–82'),
('Aston Villa', 'UEFA Super Cup', '1982–83'),
('Aston Villa', 'UEFA Intertoto Cup', '2001'),
('Brighton & Hove Albion', 'FA Charity Shield / Community Shield', '1910'),
('Brighton & Hove Albion', 'Football League Third Division South / League One (championnat tiers 3)', '1957–58'),
('Brighton & Hove Albion', 'Football League Fourth Division / League Two (championnat tiers 4)', '1964–65'),
('Brighton & Hove Albion', 'Football League Second Division / Championship (championnat tiers 2) – Runners‑up', '1978–79'),
('Brighton & Hove Albion', 'Football League Third Division / League One (championnat tiers 3)', '2001–02'),
('Brighton & Hove Albion', 'Football League Fourth Division / League Two (championnat tiers 4)', '2000–01'),
('Brighton & Hove Albion', 'Football League One (championnat tiers 3)', '2010–11'),
('Brighton & Hove Albion', 'Football League Second Division / Championship (championnat tiers 2) – Runners‑up', '2016–17'),
('Burnley', 'Championnat d’Angleterre (Premier League / First Division)', '1920–21'),
('Burnley', 'Championnat d’Angleterre (Premier League / First Division)', '1959–60'),
('Burnley', 'Championship / Division Two (niveau 2)', '1897–98'),
('Burnley', 'Championship / Division Two (niveau 2)', '1972–73'),
('Burnley', 'Championship / Division Two (niveau 2)', '2015–16'),
('Burnley', 'Championship / Division Two (niveau 2)', '2022–23'),
('Burnley', 'Third Division / League One (niveau 3)', '1981–82'),
('Burnley', 'Fourth Division / League Two (niveau 4)', '1991–92'),
('Burnley', 'FA Cup', '1913–14'),
('Burnley', 'FA Charity Shield / Community Shield', '1960 (partagé)'),
('Burnley', 'FA Charity Shield / Community Shield', '1973'),
('Burnley', 'Anglo‑Scottish Cup', '1978–79'),
('Chelsea', 'Premier League / First Division', '1954–55'),
('Chelsea', 'Premier League', '2004–05'),
('Chelsea', 'Premier League', '2005–06'),
('Chelsea', 'Premier League', '2009–10'),
('Chelsea', 'Premier League', '2014–15'),
('Chelsea', 'Premier League', '2016–17'),
('Chelsea', 'Second Division / Championship', '1983–84'),
('Chelsea', 'Second Division / Championship', '1988–89'),
('Chelsea', 'FA Cup', '1969–70'),
('Chelsea', 'FA Cup', '1996–97'),
('Chelsea', 'FA Cup', '1999–2000'),
('Chelsea', 'FA Cup', '2006–07'),
('Chelsea', 'FA Cup', '2008–09'),
('Chelsea', 'FA Cup', '2009–10'),
('Chelsea', 'FA Cup', '2011–12'),
('Chelsea', 'FA Cup', '2017–18'),
('Chelsea', 'League Cup (EFL Cup)', '1964–65'),
('Chelsea', 'League Cup (EFL Cup)', '1997–98'),
('Chelsea', 'League Cup (EFL Cup)', '2004–05'),
('Chelsea', 'League Cup (EFL Cup)', '2006–07'),
('Chelsea', 'League Cup (EFL Cup)', '2014–15'),
('Chelsea', 'FA Community Shield', '1955'),
('Chelsea', 'FA Community Shield', '2000'),
('Chelsea', 'FA Community Shield', '2005'),
('Chelsea', 'FA Community Shield', '2009'),
('Chelsea', 'UEFA Champions League', '2011–12'),
('Chelsea', 'UEFA Champions League', '2020–21'),
('Chelsea', 'UEFA Europa League', '2012–13'),
('Chelsea', 'UEFA Europa League', '2018–19'),
('Chelsea', 'UEFA Europa Conference League', '2024–25'),
('Chelsea', 'UEFA Cup Winners’ Cup', '1970–71'),
('Chelsea', 'UEFA Cup Winners’ Cup', '1997–98'),
('Chelsea', 'UEFA Super Cup', '1998'),
('Chelsea', 'UEFA Super Cup', '2021'),
('Chelsea', 'FIFA Club World Cup', '2021'),
('Chelsea', 'FIFA Club World Cup', '2025'),
('Crystal Palace', 'English Second Division / EFL Championship (Champions)', '1978–79'),
('Crystal Palace', 'English Second Division / EFL Championship (Champions)', '1993–94'),
('Crystal Palace', 'English Third Division South (Champions)', '1920–21'),
('Crystal Palace', 'FA Cup', '2024–25'),
('Crystal Palace', 'FA Community Shield', '2025'),
('Crystal Palace', 'Full Members'' Cup', '1990–91'),
('Everton', 'Championnat d’Angleterre / First Division', '1890–91'),
('Everton', 'Championnat d’Angleterre / First Division', '1914–15'),
('Everton', 'Championnat d’Angleterre / First Division', '1927–28'),
('Everton', 'Championnat d’Angleterre / First Division', '1931–32'),
('Everton', 'Championnat d’Angleterre / First Division', '1938–39'),
('Everton', 'Championnat d’Angleterre / First Division', '1962–63'),
('Everton', 'Championnat d’Angleterre / First Division', '1969–70'),
('Everton', 'Championnat d’Angleterre / First Division', '1984–85'),
('Everton', 'Championnat d’Angleterre / First Division', '1986–87'),
('Everton', 'FA Cup', '1905–06'),
('Everton', 'FA Cup', '1932–33'),
('Everton', 'FA Cup', '1965–66'),
('Everton', 'FA Cup', '1983–84'),
('Everton', 'FA Cup', '1994–95'),
('Everton', 'Second Division (championnat niveau 2)', '1930–31'),
('Everton', 'FA Charity Shield / Community Shield', '1928'),
('Everton', 'FA Charity Shield / Community Shield', '1932'),
('Everton', 'FA Charity Shield / Community Shield', '1963'),
('Everton', 'FA Charity Shield / Community Shield', '1970'),
('Everton', 'FA Charity Shield / Community Shield', '1984'),
('Everton', 'FA Charity Shield / Community Shield', '1985'),
('Everton', 'FA Charity Shield / Community Shield', '1986 (shared)'),
('Everton', 'FA Charity Shield / Community Shield', '1987'),
('Everton', 'FA Charity Shield / Community Shield', '1995'),
('Everton', 'European Cup Winners’ Cup (UEFA)', '1984–85'),
('Fulham', 'Football League Second Division / Championship (championnat niveau 2)', '1948–49'),
('Fulham', 'Football League Second Division / Championship (championnat niveau 2)', '2000–01'),
('Fulham', 'Football League Second Division / Championship (championnat niveau 2)', '2021–22'),
('Fulham', 'Football League Third Division / League One (championnat niveau 3)', '1931–32'),
('Fulham', 'Football League Third Division / League One (championnat niveau 3)', '1998–99'),
('Fulham', 'UEFA Intertoto Cup (compétition européenne officielle)', '2002'),
('Leeds United', 'Championnat d’Angleterre / First Division', '1968–69'),
('Leeds United', 'Championnat d’Angleterre / First Division', '1973–74'),
('Leeds United', 'Championnat d’Angleterre / First Division', '1991–92'),
('Leeds United', 'Championnat d’Angleterre de deuxième division / Championship', '1923–24'),
('Leeds United', 'Championnat d’Angleterre de deuxième division / Championship', '1963–64'),
('Leeds United', 'Championnat d’Angleterre de deuxième division / Championship', '1989–90'),
('Leeds United', 'Championnat d’Angleterre de deuxième division / Championship', '2019–20'),
('Leeds United', 'Championnat d’Angleterre de deuxième division / Championship', '2024–25'),
('Leeds United', 'FA Cup', '1971–72'),
('Leeds United', 'Football League Cup', '1967–68'),
('Leeds United', 'FA Charity Shield', '1969'),
('Leeds United', 'FA Charity Shield', '1992'),
('Leeds United', 'Inter‑Cities Fairs Cup', '1967–68'),
('Leeds United', 'Inter‑Cities Fairs Cup', '1970–71'),
('Liverpool', 'Premier League / First Division', '1900–01'),
('Liverpool', 'Premier League / First Division', '1905–06'),
('Liverpool', 'Premier League / First Division', '1921–22'),
('Liverpool', 'Premier League / First Division', '1922–23'),
('Liverpool', 'Premier League / First Division', '1946–47'),
('Liverpool', 'Premier League / First Division', '1963–64'),
('Liverpool', 'Premier League / First Division', '1965–66'),
('Liverpool', 'Premier League / First Division', '1972–73'),
('Liverpool', 'Premier League / First Division', '1975–76'),
('Liverpool', 'Premier League / First Division', '1976–77'),
('Liverpool', 'Premier League / First Division', '1978–79'),
('Liverpool', 'Premier League / First Division', '1979–80'),
('Liverpool', 'Premier League / First Division', '1981–82'),
('Liverpool', 'Premier League / First Division', '1982–83'),
('Liverpool', 'Premier League / First Division', '1983–84'),
('Liverpool', 'Premier League / First Division', '1985–86'),
('Liverpool', 'Premier League / First Division', '1987–88'),
('Liverpool', 'Premier League / First Division', '1989–90'),
('Liverpool', 'Premier League', '2019–20'),
('Liverpool', 'Premier League', '2024–25'),
('Liverpool', 'FA Cup', '1964–65'),
('Liverpool', 'FA Cup', '1973–74'),
('Liverpool', 'FA Cup', '1985–86'),
('Liverpool', 'FA Cup', '1988–89'),
('Liverpool', 'FA Cup', '1991–92'),
('Liverpool', 'FA Cup', '2000–01'),
('Liverpool', 'FA Cup', '2005–06'),
('Liverpool', 'FA Cup', '2021–22'),
('Liverpool', 'EFL Cup / League Cup', '1980–81'),
('Liverpool', 'EFL Cup / League Cup', '1981–82'),
('Liverpool', 'EFL Cup / League Cup', '1982–83'),
('Liverpool', 'EFL Cup / League Cup', '1983–84'),
('Liverpool', 'EFL Cup / League Cup', '1994–95'),
('Liverpool', 'EFL Cup / League Cup', '2000–01'),
('Liverpool', 'EFL Cup / League Cup', '2002–03'),
('Liverpool', 'EFL Cup / League Cup', '2011–12'),
('Liverpool', 'EFL Cup / League Cup', '2021–22'),
('Liverpool', 'EFL Cup / League Cup', '2023–24'),
('Liverpool', 'UEFA Champions League / European Cup', '1976–77'),
('Liverpool', 'UEFA Champions League / European Cup', '1977–78'),
('Liverpool', 'UEFA Champions League / European Cup', '1980–81'),
('Liverpool', 'UEFA Champions League / European Cup', '1983–84'),
('Liverpool', 'UEFA Champions League / European Cup', '2004–05'),
('Liverpool', 'UEFA Champions League / European Cup', '2018–19'),
('Liverpool', 'UEFA Europa League / UEFA Cup', '1972–73'),
('Liverpool', 'UEFA Europa League / UEFA Cup', '1975–76'),
('Liverpool', 'UEFA Europa League / UEFA Cup', '2000–01'),
('Liverpool', 'UEFA Super Cup', '1977'),
('Liverpool', 'UEFA Super Cup', '2001'),
('Liverpool', 'UEFA Super Cup', '2005'),
('Liverpool', 'UEFA Super Cup', '2019'),
('Liverpool', 'FIFA Club World Cup', '2019'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1964'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1965'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1966'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1974'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1976'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1977'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1979'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1980'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1982'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1986'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1988'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1989'),
('Liverpool', 'FA Community Shield (Charity Shield)', '1990'),
('Liverpool', 'FA Community Shield (Charity Shield)', '2001'),
('Liverpool', 'FA Community Shield (Charity Shield)', '2006'),
('Liverpool', 'FA Community Shield (Charity Shield)', '2022'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '1936–37'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '1967–68'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2011–12'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2013–14'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2017–18'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2018–19'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2020–21'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2021–22'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2022–23'),
('Manchester City', 'Championnat d’Angleterre / Premier League', '2023–24'),
('Manchester City', 'FA Cup', '1903–04'),
('Manchester City', 'FA Cup', '1933–34'),
('Manchester City', 'FA Cup', '1955–56'),
('Manchester City', 'FA Cup', '1968–69'),
('Manchester City', 'FA Cup', '2010–11'),
('Manchester City', 'FA Cup', '2018–19'),
('Manchester City', 'FA Cup', '2022–23'),
('Manchester City', 'League Cup (EFL Cup)', '1969–70'),
('Manchester City', 'League Cup (EFL Cup)', '1975–76'),
('Manchester City', 'League Cup (EFL Cup)', '2013–14'),
('Manchester City', 'League Cup (EFL Cup)', '2015–16'),
('Manchester City', 'League Cup (EFL Cup)', '2017–18'),
('Manchester City', 'League Cup (EFL Cup)', '2018–19'),
('Manchester City', 'League Cup (EFL Cup)', '2019–20'),
('Manchester City', 'League Cup (EFL Cup)', '2020–21'),
('Manchester City', 'FA Community/Charity Shield', '1937'),
('Manchester City', 'FA Community/Charity Shield', '1968'),
('Manchester City', 'FA Community/Charity Shield', '1972'),
('Manchester City', 'FA Community/Charity Shield', '2012'),
('Manchester City', 'FA Community/Charity Shield', '2018'),
('Manchester City', 'FA Community/Charity Shield', '2019'),
('Manchester City', 'FA Community/Charity Shield', '2024'),
('Manchester City', 'European Cup Winners’ Cup', '1969–70'),
('Manchester City', 'UEFA Champions League', '2022–23'),
('Manchester City', 'UEFA Super Cup', '2023'),
('Manchester City', 'FIFA Club World Cup', '2023'),
('Manchester United', 'Championnat d’Angleterre / First Division / Premier League', '1907–08'),
('Manchester United', 'Championnat d’Angleterre / First Division / Premier League', '1910–11'),
('Manchester United', 'Championnat d’Angleterre / First Division / Premier League', '1951–52'),
('Manchester United', 'Championnat d’Angleterre / First Division / Premier League', '1955–56'),
('Manchester United', 'Championnat d’Angleterre / First Division / Premier League', '1956–57'),
('Manchester United', 'Championnat d’Angleterre / First Division / Premier League', '1964–65'),
('Manchester United', 'Championnat d’Angleterre / First Division / Premier League', '1966–67'),
('Manchester United', 'Premier League', '1992–93'),
('Manchester United', 'Premier League', '1993–94'),
('Manchester United', 'Premier League', '1995–96'),
('Manchester United', 'Premier League', '1996–97'),
('Manchester United', 'Premier League', '1998–99'),
('Manchester United', 'Premier League', '1999–2000'),
('Manchester United', 'Premier League', '2000–01'),
('Manchester United', 'Premier League', '2002–03'),
('Manchester United', 'Premier League', '2006–07'),
('Manchester United', 'Premier League', '2007–08'),
('Manchester United', 'Premier League', '2008–09'),
('Manchester United', 'Premier League', '2010–11'),
('Manchester United', 'Premier League', '2012–13'),
('Manchester United', 'Second Division (championnat niveau 2)', '1935–36'),
('Manchester United', 'Second Division (championnat niveau 2)', '1974–75'),
('Manchester United', 'FA Cup', '1908–09'),
('Manchester United', 'FA Cup', '1947–48'),
('Manchester United', 'FA Cup', '1962–63'),
('Manchester United', 'FA Cup', '1976–77'),
('Manchester United', 'FA Cup', '1982–83'),
('Manchester United', 'FA Cup', '1984–85'),
('Manchester United', 'FA Cup', '1989–90'),
('Manchester United', 'FA Cup', '1993–94'),
('Manchester United', 'FA Cup', '1995–96'),
('Manchester United', 'FA Cup', '1998–99'),
('Manchester United', 'FA Cup', '2003–04'),
('Manchester United', 'FA Cup', '2015–16'),
('Manchester United', 'FA Cup', '2023–24'),
('Manchester United', 'Football League Cup / EFL Cup', '1991–92'),
('Manchester United', 'Football League Cup / EFL Cup', '2005–06'),
('Manchester United', 'Football League Cup / EFL Cup', '2008–09'),
('Manchester United', 'Football League Cup / EFL Cup', '2009–10'),
('Manchester United', 'Football League Cup / EFL Cup', '2016–17'),
('Manchester United', 'Football League Cup / EFL Cup', '2022–23'),
('Manchester United', 'FA Community Shield', '1908'),
('Manchester United', 'FA Community Shield', '1911'),
('Manchester United', 'FA Community Shield', '1952'),
('Manchester United', 'FA Community Shield', '1956'),
('Manchester United', 'FA Community Shield', '1957'),
('Manchester United', 'FA Community Shield', '1965'),
('Manchester United', 'FA Community Shield', '1967'),
('Manchester United', 'FA Community Shield', '1977'),
('Manchester United', 'FA Community Shield', '1983'),
('Manchester United', 'FA Community Shield', '1990'),
('Manchester United', 'FA Community Shield', '1993'),
('Manchester United', 'FA Community Shield', '1994'),
('Manchester United', 'FA Community Shield', '1996'),
('Manchester United', 'FA Community Shield', '1997'),
('Manchester United', 'FA Community Shield', '2003'),
('Manchester United', 'FA Community Shield', '2007'),
('Manchester United', 'FA Community Shield', '2008'),
('Manchester United', 'FA Community Shield', '2010'),
('Manchester United', 'FA Community Shield', '2011'),
('Manchester United', 'FA Community Shield', '2013'),
('Manchester United', 'FA Community Shield', '2016'),
('Manchester United', 'UEFA Champions League / European Cup', '1967–68'),
('Manchester United', 'UEFA Champions League / European Cup', '1998–99'),
('Manchester United', 'UEFA Champions League / European Cup', '2007–08'),
('Manchester United', 'UEFA Europa League', '2016–17'),
('Manchester United', 'UEFA Cup Winners’ Cup', '1990–91'),
('Manchester United', 'UEFA Super Cup', '1991'),
('Manchester United', 'FIFA Club World Cup', '2008'),
('Manchester United', 'Intercontinental Cup', '1999'),
('Newcastle United', 'Championnat d’Angleterre / First Division', '1904–05'),
('Newcastle United', 'Championnat d’Angleterre / First Division', '1906–07'),
('Newcastle United', 'Championnat d’Angleterre / First Division', '1908–09'),
('Newcastle United', 'Championnat d’Angleterre / First Division', '1926–27'),
('Newcastle United', 'FA Cup', '1909–10'),
('Newcastle United', 'FA Cup', '1923–24'),
('Newcastle United', 'FA Cup', '1931–32'),
('Newcastle United', 'FA Cup', '1950–51'),
('Newcastle United', 'FA Cup', '1951–52'),
('Newcastle United', 'FA Cup', '1954–55'),
('Newcastle United', 'Football League Cup / EFL Cup', '2024–25'),
('Newcastle United', 'FA Charity Shield', '1909'),
('Newcastle United', 'Inter‑Cities Fairs Cup', '1968–69'),
('Nottingham Forest', 'Championnat d’Angleterre / First Division', '1977–78'),
('Nottingham Forest', 'FA Cup', '1897–98'),
('Nottingham Forest', 'FA Cup', '1958–59'),
('Nottingham Forest', 'Football League Cup (EFL Cup)', '1977–78'),
('Nottingham Forest', 'Football League Cup (EFL Cup)', '1978–79'),
('Nottingham Forest', 'Football League Cup (EFL Cup)', '1988–89'),
('Nottingham Forest', 'Football League Cup (EFL Cup)', '1989–90'),
('Nottingham Forest', 'FA Charity Shield / FA Community Shield', '1978'),
('Nottingham Forest', 'UEFA Champions League / European Cup', '1978–79'),
('Nottingham Forest', 'UEFA Champions League / European Cup', '1979–80'),
('Nottingham Forest', 'UEFA Super Cup', '1979'),
('Sunderland', 'English First Division (championnat d’Angleterre)', '1891–92'),
('Sunderland', 'English First Division (championnat d’Angleterre)', '1892–93'),
('Sunderland', 'English First Division (championnat d’Angleterre)', '1894–95'),
('Sunderland', 'English First Division (championnat d’Angleterre)', '1901–02'),
('Sunderland', 'English First Division (championnat d’Angleterre)', '1912–13'),
('Sunderland', 'English First Division (championnat d’Angleterre)', '1935–36'),
('Sunderland', 'FA Cup', '1936–37'),
('Sunderland', 'FA Cup', '1972–73'),
('Sunderland', 'English Second Division / Championship (championnat niveau 2)', '1975–76'),
('Sunderland', 'English Second Division / Championship (championnat niveau 2)', '1995–96'),
('Sunderland', 'English Second Division / Championship (championnat niveau 2)', '1998–99'),
('Sunderland', 'English Second Division / Championship (championnat niveau 2)', '2004–05'),
('Sunderland', 'English Second Division / Championship (championnat niveau 2)', '2006–07'),
('Sunderland', 'English Third Division / League One (championnat niveau 3)', '1987–88'),
('Sunderland', 'Football League Trophy', '2020–21'),
('Sunderland', 'FA Charity Shield', '1936'),
('Tottenham Hotspur', 'Championnat d’Angleterre / First Division', '1950–51'),
('Tottenham Hotspur', 'Championnat d’Angleterre / First Division', '1960–61'),
('Tottenham Hotspur', 'FA Cup', '1900–01'),
('Tottenham Hotspur', 'FA Cup', '1920–21'),
('Tottenham Hotspur', 'FA Cup', '1960–61'),
('Tottenham Hotspur', 'FA Cup', '1961–62'),
('Tottenham Hotspur', 'FA Cup', '1966–67'),
('Tottenham Hotspur', 'FA Cup', '1980–81'),
('Tottenham Hotspur', 'FA Cup', '1981–82'),
('Tottenham Hotspur', 'FA Cup', '1990–91'),
('Tottenham Hotspur', 'Football League Cup / EFL Cup', '1970–71'),
('Tottenham Hotspur', 'Football League Cup / EFL Cup', '1972–73'),
('Tottenham Hotspur', 'Football League Cup / EFL Cup', '1998–99'),
('Tottenham Hotspur', 'Football League Cup / EFL Cup', '2007–08'),
('Tottenham Hotspur', 'FA Community Shield / Charity Shield', '1921'),
('Tottenham Hotspur', 'FA Community Shield / Charity Shield', '1951'),
('Tottenham Hotspur', 'FA Community Shield / Charity Shield', '1961'),
('Tottenham Hotspur', 'FA Community Shield / Charity Shield', '1962'),
('Tottenham Hotspur', 'FA Community Shield / Charity Shield', '1967'),
('Tottenham Hotspur', 'FA Community Shield / Charity Shield', '1981'),
('Tottenham Hotspur', 'FA Community Shield / Charity Shield', '1991'),
('Tottenham Hotspur', 'UEFA Cup Winners’ Cup', '1962–63'),
('Tottenham Hotspur', 'UEFA Cup / UEFA Europa League', '1971–72'),
('Tottenham Hotspur', 'UEFA Cup / UEFA Europa League', '1983–84'),
('Tottenham Hotspur', 'UEFA Cup / UEFA Europa League', '2024–25'),
('West Ham United', 'FA Cup', '1963–64'),
('West Ham United', 'FA Cup', '1974–75'),
('West Ham United', 'FA Cup', '1979–80'),
('West Ham United', 'FA Charity Shield', '1964 (partagé)'),
('West Ham United', 'Football League Second Division / Championship (championnat niveau 2)', '1957–58'),
('West Ham United', 'Football League Second Division / Championship (championnat niveau 2)', '1980–81'),
('West Ham United', 'UEFA Cup Winners’ Cup', '1964–65'),
('West Ham United', 'UEFA Intertoto Cup', '1998–99'),
('West Ham United', 'UEFA Europa Conference League', '2022–23'),
('Wolverhampton Wanderers', 'Championnat d’Angleterre / First Division', '1953–54'),
('Wolverhampton Wanderers', 'Championnat d’Angleterre / First Division', '1957–58'),
('Wolverhampton Wanderers', 'Championnat d’Angleterre / First Division', '1958–59'),
('Wolverhampton Wanderers', 'FA Cup', '1892–93'),
('Wolverhampton Wanderers', 'FA Cup', '1907–08'),
('Wolverhampton Wanderers', 'FA Cup', '1948–49'),
('Wolverhampton Wanderers', 'FA Cup', '1959–60'),
('Wolverhampton Wanderers', 'Football League Cup / League Cup', '1973–74'),
('Wolverhampton Wanderers', 'Football League Cup / League Cup', '1979–80'),
('Wolverhampton Wanderers', 'FA Charity Shield / Community Shield', '1949'),
('Wolverhampton Wanderers', 'FA Charity Shield / Community Shield', '1954'),
('Wolverhampton Wanderers', 'FA Charity Shield / Community Shield', '1959'),
('Wolverhampton Wanderers', 'FA Charity Shield / Community Shield', '1960'),
('Wolverhampton Wanderers', 'Championship / Second Division', '1931–32'),
('Wolverhampton Wanderers', 'Championship / Second Division', '1976–77'),
('Wolverhampton Wanderers', 'Championship / Second Division', '2008–09'),
('Wolverhampton Wanderers', 'Championship / Second Division', '2017–18');

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
            WHEN ti.competition_name = 'Premier League' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'Championnat d’Angleterre' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'Championnat d’Angleterre / First Division' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'Championnat d’Angleterre / Premier League' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'Championnat d’Angleterre (Premier League / First Division)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'Premier League / First Division' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'Championnat d’Angleterre / First Division / Premier League' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'Football League First Division / Championnat d’Angleterre' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'English First Division (championnat d’Angleterre)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Premier League' LIMIT 1)
            WHEN ti.competition_name = 'FA Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Cup' LIMIT 1)
            WHEN ti.competition_name = 'League Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'League Cup (EFL Cup)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'Football League Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'Football League Cup / EFL Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'Football League Cup / EFL Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'EFL Cup / League Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'Football League Cup (EFL Cup)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'Football League Cup / League Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'EFL Cup' LIMIT 1)
            WHEN ti.competition_name = 'FA Community Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Community Shield / English Supercup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Community/Charity Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Community Shield (Charity Shield)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Charity Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Charity Shield / Community Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Charity Shield / FA Community Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Charity Shield / Community Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Charity Shield / Community Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'FA Charity Shield / Community Shield' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'FA Community Shield' LIMIT 1)
            WHEN ti.competition_name = 'Second Division / Championship' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'English Second Division / EFL Championship (Champions)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'English Second Division / Championship (championnat niveau 2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Football League Second Division / Championship (championnat niveau 2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Football League Second Division / Championship (championnat niveau 2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Football League Second Division / Championship (championnat tiers 2) – Runners‑up' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Championnat d’Angleterre de deuxième division / Championship' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Championship / Division Two (niveau 2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Second Division (championnat niveau 2)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Championship / Second Division' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Championship' LIMIT 1)
            WHEN ti.competition_name = 'Football League Third Division / League One (championnat niveau 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Football League Third Division / League One (championnat niveau 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Football League Third Division / League One (championnat tiers 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Football League Third Division / League One (championnat niveau 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Football League Third Division South / League One (championnat tiers 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Third Division / League One (niveau 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'English Third Division / League One (championnat niveau 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'English Third Division South (Champions)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Football League Third Division / League One (championnat niveau 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Football League One (championnat tiers 3)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League One' LIMIT 1)
            WHEN ti.competition_name = 'Football League Fourth Division / League Two (championnat tiers 4)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League Two' LIMIT 1)
            WHEN ti.competition_name = 'Football League Fourth Division / League Two (championnat tiers 4)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League Two' LIMIT 1)
            WHEN ti.competition_name = 'Fourth Division / League Two (niveau 4)' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'League Two' LIMIT 1)
            WHEN ti.competition_name = 'Anglo‑Scottish Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Anglo-Scottish Cup' LIMIT 1)
            WHEN ti.competition_name = 'Full Members'' Cup' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Full Members'' Cup' LIMIT 1)
            WHEN ti.competition_name = 'Football League Trophy' THEN (SELECT competition_id FROM competitions WHERE competition_name = 'Football League Trophy' LIMIT 1)
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

