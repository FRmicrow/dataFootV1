
BEGIN TRANSACTION;

-- 1. Clean up existing V2 data to avoid duplicates/conflicts
DELETE FROM V2_player_individual_awards;
DELETE FROM V2_individual_awards;
DELETE FROM V2_player_club_history;
DELETE FROM V2_player_statistics;
DELETE FROM V2_club_trophies;
DELETE FROM V2_player_trophies;
DELETE FROM V2_competitions;
DELETE FROM V2_trophy_types;
DELETE FROM V2_clubs; -- Be careful if clubs depend on countries
DELETE FROM V2_countries;

-- 2. Insert Trophy Types
INSERT INTO V2_trophy_types (type_name, type_order) VALUES
('UEFA Club', 1),
('UEFA National Team', 2),
('FIFA Club', 3),
('FIFA National Team', 4),
('Continental Club', 5),
('Continental National Team', 6),
('Domestic League', 7),
('Domestic Cup', 8),
('Domestic Super Cup', 9),
('Domestic League Cup', 10),
('Individual Award', 11);

-- 3. Insert Countries (Reworked with latest data)
-- Using flag_url for SVG and flag_small_url for PNG to match schema
INSERT INTO V2_countries (country_name, country_code, flag_url, flag_small_url, continent, importance_rank) VALUES
('England', 'ENG', 'https://flagcdn.com/gb.svg', 'https://flagcdn.com/256x192/gb.png', 'Europe', 1),
('Spain', 'ES', 'https://flagcdn.com/es.svg', 'https://flagcdn.com/256x192/es.png', 'Europe', 2),
('Germany', 'DE', 'https://flagcdn.com/de.svg', 'https://flagcdn.com/256x192/de.png', 'Europe', 3),
('Italy', 'IT', 'https://flagcdn.com/it.svg', 'https://flagcdn.com/256x192/it.png', 'Europe', 4),
('France', 'FR', 'https://flagcdn.com/fr.svg', 'https://flagcdn.com/256x192/fr.png', 'Europe', 5),
('Portugal', 'PT', 'https://flagcdn.com/pt.svg', 'https://flagcdn.com/256x192/pt.png', 'Europe', 6),
('Netherlands', 'NL', 'https://flagcdn.com/nl.svg', 'https://flagcdn.com/256x192/nl.png', 'Europe', 7),
('Belgium', 'BE', 'https://flagcdn.com/be.svg', 'https://flagcdn.com/256x192/be.png', 'Europe', 8),
('Turkey', 'TR', 'https://flagcdn.com/tr.svg', 'https://flagcdn.com/256x192/tr.png', 'Europe', 9),
('Scotland', 'SCO', 'https://flagcdn.com/gb-sct.svg', 'https://flagcdn.com/256x192/gb-sct.png', 'Europe', 10),
('Austria', 'AT', 'https://flagcdn.com/at.svg', 'https://flagcdn.com/256x192/at.png', 'Europe', 11),
('Switzerland', 'CH', 'https://flagcdn.com/ch.svg', 'https://flagcdn.com/256x192/ch.png', 'Europe', 12),
('Greece', 'GR', 'https://flagcdn.com/gr.svg', 'https://flagcdn.com/256x192/gr.png', 'Europe', 13),
('Czech Republic', 'CZ', 'https://flagcdn.com/cz.svg', 'https://flagcdn.com/256x192/cz.png', 'Europe', 14),
('Ukraine', 'UA', 'https://flagcdn.com/ua.svg', 'https://flagcdn.com/256x192/ua.png', 'Europe', 15),
('Russian Federation', 'RU', 'https://flagcdn.com/ru.svg', 'https://flagcdn.com/256x192/ru.png', 'Europe', 16),
('Croatia', 'HR', 'https://flagcdn.com/hr.svg', 'https://flagcdn.com/256x192/hr.png', 'Europe', 17),
('Serbia', 'RS', 'https://flagcdn.com/rs.svg', 'https://flagcdn.com/256x192/rs.png', 'Europe', 18),
('Poland', 'PL', 'https://flagcdn.com/pl.svg', 'https://flagcdn.com/256x192/pl.png', 'Europe', 19),
('Denmark', 'DK', 'https://flagcdn.com/dk.svg', 'https://flagcdn.com/256x192/dk.png', 'Europe', 20),
('Norway', 'NO', 'https://flagcdn.com/no.svg', 'https://flagcdn.com/256x192/no.png', 'Europe', 21),
('Sweden', 'SE', 'https://flagcdn.com/se.svg', 'https://flagcdn.com/256x192/se.png', 'Europe', 22),
('Brazil', 'BR', 'https://flagcdn.com/br.svg', 'https://flagcdn.com/256x192/br.png', 'Americas', 23),
('Argentina', 'AR', 'https://flagcdn.com/ar.svg', 'https://flagcdn.com/256x192/ar.png', 'Americas', 24),
('Uruguay', 'UY', 'https://flagcdn.com/uy.svg', 'https://flagcdn.com/256x192/uy.png', 'Americas', 25),
('Colombia', 'CO', 'https://flagcdn.com/co.svg', 'https://flagcdn.com/256x192/co.png', 'Americas', 26),
('Chile', 'CL', 'https://flagcdn.com/cl.svg', 'https://flagcdn.com/256x192/cl.png', 'Americas', 27),
('Mexico', 'MX', 'https://flagcdn.com/mx.svg', 'https://flagcdn.com/256x192/mx.png', 'Americas', 28),
('United States', 'US', 'https://flagcdn.com/us.svg', 'https://flagcdn.com/256x192/us.png', 'Americas', 29),
('Paraguay', 'PY', 'https://flagcdn.com/py.svg', 'https://flagcdn.com/256x192/py.png', 'Americas', 30),
('Peru', 'PE', 'https://flagcdn.com/pe.svg', 'https://flagcdn.com/256x192/pe.png', 'Americas', 31),
('Ecuador', 'EC', 'https://flagcdn.com/ec.svg', 'https://flagcdn.com/256x192/ec.png', 'Americas', 32),
('Japan', 'JP', 'https://flagcdn.com/jp.svg', 'https://flagcdn.com/256x192/jp.png', 'Asia', 33),
('South Korea', 'KR', 'https://flagcdn.com/kr.svg', 'https://flagcdn.com/256x192/kr.png', 'Asia', 34),
('Saudi Arabia', 'SA', 'https://flagcdn.com/sa.svg', 'https://flagcdn.com/256x192/sa.png', 'Asia', 35),
('China', 'CN', 'https://flagcdn.com/cn.svg', 'https://flagcdn.com/256x192/cn.png', 'Asia', 36),
('Qatar', 'QA', 'https://flagcdn.com/qa.svg', 'https://flagcdn.com/256x192/qa.png', 'Asia', 37),
('United Arab Emirates', 'AE', 'https://flagcdn.com/ae.svg', 'https://flagcdn.com/256x192/ae.png', 'Asia', 38),
('Australia', 'AU', 'https://flagcdn.com/au.svg', 'https://flagcdn.com/256x192/au.png', 'Oceania', 39),
('Egypt', 'EG', 'https://flagcdn.com/eg.svg', 'https://flagcdn.com/256x192/eg.png', 'Africa', 40),
('Morocco', 'MA', 'https://flagcdn.com/ma.svg', 'https://flagcdn.com/256x192/ma.png', 'Africa', 41),
('South Africa', 'ZA', 'https://flagcdn.com/za.svg', 'https://flagcdn.com/256x192/za.png', 'Africa', 42),
('Nigeria', 'NG', 'https://flagcdn.com/ng.svg', 'https://flagcdn.com/256x192/ng.png', 'Africa', 43),
('Senegal', 'SN', 'https://flagcdn.com/sn.svg', 'https://flagcdn.com/256x192/sn.png', 'Africa', 44),
('Algeria', 'DZ', 'https://flagcdn.com/dz.svg', 'https://flagcdn.com/256x192/dz.png', 'Africa', 45);

-- 4. Insert Competitions
INSERT INTO V2_competitions (competition_name, competition_short_name, trophy_type_id, country_id, level, start_year, is_active) VALUES
-- UEFA Club
('UEFA Champions League', 'UCL', 1, NULL, 1, 1955, 1),
('UEFA Europa League', 'UEL', 1, NULL, 2, 1971, 1),
('UEFA Europa Conference League', 'UECL', 1, NULL, 3, 2021, 1),
('UEFA Super Cup', 'UEFA Super Cup', 1, NULL, 1, 1972, 1),
('European Cup', 'European Cup', 1, NULL, 1, 1955, 0),
('UEFA Cup Winners Cup', 'Cup Winners Cup', 1, NULL, 2, 1960, 0),
('UEFA Intertoto Cup', 'Intertoto Cup', 1, NULL, 3, 1995, 0),

-- UEFA National
('UEFA European Championship', 'Euro', 2, NULL, 1, 1960, 1),
('UEFA Nations League', 'Nations League', 2, NULL, 1, 2018, 1),

-- FIFA Club
('FIFA Club World Cup', 'Club World Cup', 3, NULL, 1, 2000, 1),
('FIFA Intercontinental Cup', 'Intercontinental Cup', 3, NULL, 1, 1960, 0),

-- FIFA National
('FIFA World Cup', 'World Cup', 4, NULL, 1, 1930, 1),
('FIFA Confederations Cup', 'Confederations Cup', 4, NULL, 2, 1992, 0),
('Olympic Football Tournament', 'Olympics', 4, NULL, 2, 1900, 1),

-- Continental
('Copa Libertadores', 'Libertadores', 5, NULL, 1, 1960, 1),
('Copa Sudamericana', 'Sudamericana', 5, NULL, 2, 2002, 1),
('Recopa Sudamericana', 'Recopa', 5, NULL, 1, 1988, 1),
('Copa America', 'Copa America', 6, NULL, 1, 1916, 1),
('CONCACAF Champions Cup', 'CONCACAF CL', 5, NULL, 1, 1962, 1),
('CONCACAF Gold Cup', 'Gold Cup', 6, NULL, 1, 1991, 1),
('CONCACAF League', 'CONCACAF League', 5, NULL, 2, 2017, 1),
('CAF Champions League', 'CAF CL', 5, NULL, 1, 1964, 1),
('CAF Confederation Cup', 'CAF Confederation', 5, NULL, 2, 2004, 1),
('CAF Super Cup', 'CAF Super Cup', 5, NULL, 1, 1993, 1),
('Africa Cup of Nations', 'AFCON', 6, NULL, 1, 1957, 1),
('AFC Champions League', 'AFC CL', 5, NULL, 1, 1967, 1),
('AFC Cup', 'AFC Cup', 5, NULL, 2, 2004, 1),
('AFC Asian Cup', 'Asian Cup', 6, NULL, 1, 1956, 1),
('OFC Champions League', 'OFC CL', 5, NULL, 1, 2007, 1),

-- Domestic Leagues & Cups (Using matching codes)
-- England (ENG)
('Premier League', 'EPL', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'ENG'), 1, 1992, 1),
('English Football League Championship', 'Championship', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'ENG'), 2, 2004, 1),
('FA Cup', 'FA Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'ENG'), 1, 1871, 1),
('EFL Cup', 'League Cup', 10, (SELECT country_id FROM V2_countries WHERE country_code = 'ENG'), 1, 1960, 1),
('FA Community Shield', 'Community Shield', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'ENG'), 1, 1908, 1),

-- Spain (ES)
('La Liga', 'La Liga', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 1, 1929, 1),
('Copa del Rey', 'Copa del Rey', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 1, 1903, 1),
('Supercopa de España', 'Spanish Super Cup', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 1, 1982, 1),

-- Germany (DE)
('Bundesliga', 'Bundesliga', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'DE'), 1, 1963, 1),
('DFB-Pokal', 'DFB-Pokal', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'DE'), 1, 1935, 1),
('DFL-Supercup', 'German Super Cup', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'DE'), 1, 2010, 1),

-- Italy (IT)
('Serie A', 'Serie A', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'IT'), 1, 1898, 1),
('Coppa Italia', 'Coppa Italia', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'IT'), 1, 1922, 1),
('Supercoppa Italiana', 'Italian Super Cup', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'IT'), 1, 1988, 1),

-- France (FR)
('Ligue 1', 'Ligue 1', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 1, 1932, 1),
('Coupe de France', 'Coupe de France', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 1, 1917, 1),
('Trophée des Champions', 'French Super Cup', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 1, 1995, 1),
('Coupe de la Ligue', 'French League Cup', 10, (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 1, 1994, 0),

-- Portugal (PT)
('Primeira Liga', 'Primeira Liga', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'PT'), 1, 1934, 1),
('Taça de Portugal', 'Portuguese Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'PT'), 1, 1938, 1),
('Supertaça Cândido de Oliveira', 'Portuguese Super Cup', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'PT'), 1, 1979, 1),

-- Netherlands (NL)
('Eredivisie', 'Eredivisie', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'NL'), 1, 1956, 1),
('KNVB Cup', 'KNVB Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'NL'), 1, 1898, 1),
('Johan Cruyff Shield', 'Dutch Super Cup', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'NL'), 1, 1949, 1),

-- Scotland (SCO)
('Scottish Premiership', 'SPFL', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'SCO'), 1, 2013, 1),
('Scottish Cup', 'Scottish Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'SCO'), 1, 1873, 1),
('Scottish League Cup', 'Scottish League Cup', 10, (SELECT country_id FROM V2_countries WHERE country_code = 'SCO'), 1, 1946, 1),

-- Belgium (BE)
('Belgian Pro League', 'Pro League', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'BE'), 1, 1895, 1),
('Belgian Cup', 'Belgian Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'BE'), 1, 1911, 1),

-- Turkey (TR)
('Süper Lig', 'Süper Lig', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'TR'), 1, 1959, 1),
('Turkish Cup', 'Turkish Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'TR'), 1, 1962, 1),
('Turkish Super Cup', 'Turkish Super Cup', 9, (SELECT country_id FROM V2_countries WHERE country_code = 'TR'), 1, 1966, 1),

-- Brazil (BR)
('Campeonato Brasileiro Série A', 'Brasileirão', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 1, 1959, 1),
('Copa do Brasil', 'Copa do Brasil', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 1, 1989, 1),

-- Argentina (AR)
('Primera División', 'Argentine League', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'AR'), 1, 1891, 1),
('Copa Argentina', 'Copa Argentina', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'AR'), 1, 1969, 1),

-- Mexico (MX)
('Liga MX', 'Liga MX', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'MX'), 1, 1943, 1),
('Copa MX', 'Copa MX', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'MX'), 1, 1907, 0),

-- USA (US)
('Major League Soccer', 'MLS', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'US'), 1, 1996, 1),
('US Open Cup', 'US Open Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'US'), 1, 1914, 1),

-- Saudi Arabia (SA)
('Saudi Pro League', 'SPL', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'SA'), 1, 1976, 1),
('Kings Cup', 'Kings Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'SA'), 1, 1956, 1),

-- Japan (JP)
('J1 League', 'J1 League', 7, (SELECT country_id FROM V2_countries WHERE country_code = 'JP'), 1, 1993, 1),
('Emperors Cup', 'Emperors Cup', 8, (SELECT country_id FROM V2_countries WHERE country_code = 'JP'), 1, 1921, 1);


-- 5. Insert Individual Awards
INSERT INTO V2_individual_awards (award_name, award_type, trophy_type_id, organizing_body, is_active) VALUES
('Ballon d''Or', 'Player', 11, 'France Football', 1),
('FIFA The Best', 'Player', 11, 'FIFA', 1),
('FIFA Puskas Award', 'Goal', 11, 'FIFA', 1),
('UEFA Men''s Player of the Year', 'Player', 11, 'UEFA', 1),
('UEFA Women''s Player of the Year', 'Player', 11, 'UEFA', 1),
('Golden Boot', 'Top Scorer', 11, 'Various', 1),
('FIFA World Cup Golden Ball', 'Player', 11, 'FIFA', 1),
('FIFA World Cup Golden Boot', 'Top Scorer', 11, 'FIFA', 1),
('FIFA World Cup Golden Glove', 'Goalkeeper', 11, 'FIFA', 1),
('FIFA World Cup Best Young Player', 'Young Player', 11, 'FIFA', 1),
('UEFA Champions League Top Scorer', 'Top Scorer', 11, 'UEFA', 1),
('UEFA Champions League Player of the Season', 'Player', 11, 'UEFA', 1),
('Premier League Golden Boot', 'Top Scorer', 11, 'Premier League', 1),
('PFA Player of the Year', 'Player', 11, 'PFA', 1),
('PFA Young Player of the Year', 'Young Player', 11, 'PFA', 1),
('Premier League Player of the Season', 'Player', 11, 'Premier League', 1),
('Pichichi Trophy', 'Top Scorer', 11, 'Marca', 1),
('Zamora Trophy', 'Goalkeeper', 11, 'Marca', 1),
('Serie A Top Scorer', 'Top Scorer', 11, 'Serie A', 1),
('Serie A Footballer of the Year', 'Player', 11, 'AIC', 1),
('Bundesliga Top Scorer', 'Top Scorer', 11, 'Bundesliga', 1),
('Bundesliga Player of the Season', 'Player', 11, 'Bundesliga', 1),
('Ligue 1 Top Scorer', 'Top Scorer', 11, 'Ligue 1', 1),
('Ligue 1 Player of the Year', 'Player', 11, 'UNFP', 1),
('FIFA World Player of the Year', 'Player', 11, 'FIFA', 0),
('European Golden Shoe', 'Top Scorer', 11, 'ESM', 1);

COMMIT;
