
BEGIN TRANSACTION;

-- ============================================
-- FC BARCELONA MVP DATA SAMPLE (Corrected)
-- ============================================

-- 1. Insert Club
INSERT INTO V2_clubs (club_name, club_short_name, country_id, city, stadium_name, stadium_capacity, founded_year, club_logo_url, is_active) 
VALUES ('FC Barcelona', 'Barça', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'Barcelona', 'Spotify Camp Nou', 99354, 1899, 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', 1);

-- 2. Insert Players (Broken down to avoid giant block errors and fixed quotes)
-- Goalkeepers
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Víctor', 'Valdés', '1982-01-14', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'GK', 'Right', 183, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Marc-André', 'ter Stegen', '1992-04-30', (SELECT country_id FROM V2_countries WHERE country_code = 'DE'), 'GK', 'Right', 187, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Claudio', 'Bravo', '1983-04-13', (SELECT country_id FROM V2_countries WHERE country_code = 'CL'), 'GK', 'Right', 184, NULL, 1);

-- Defenders
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Carles', 'Puyol', '1978-04-13', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'DEF', 'Right', 178, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Gerard', 'Piqué', '1987-02-02', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'DEF', 'Right', 194, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Daniel', 'Alves', '1983-05-06', (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 'DEF', 'Right', 173, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Jordi', 'Alba', '1989-03-21', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'DEF', 'Left', 170, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Javier', 'Mascherano', '1984-06-08', (SELECT country_id FROM V2_countries WHERE country_code = 'AR'), 'DEF', 'Right', 174, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Éric', 'Abidal', '1979-09-11', (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 'DEF', 'Left', 186, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Rafael', 'Márquez', '1979-02-13', (SELECT country_id FROM V2_countries WHERE country_code = 'MX'), 'DEF', 'Right', 182, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Juliano', 'Belletti', '1976-06-20', (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 'DEF', 'Right', 179, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Ronald', 'Araújo', '1999-03-07', (SELECT country_id FROM V2_countries WHERE country_code = 'UY'), 'DEF', 'Right', 188, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Jules', 'Koundé', '1998-11-12', (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 'DEF', 'Right', 178, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Alejandro', 'Balde', '2003-10-18', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'DEF', 'Left', 175, NULL, 1);

-- Midfielders (Fixing CI/ML codes if mismatch, using existing Country Code)
-- Yaya Toure (Ivory Coast code was CI in my population script)
-- Keita (Mali code was ML)
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Xavier', 'Hernández', '1980-01-25', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'MID', 'Right', 170, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Andrés', 'Iniesta', '1984-05-11', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'MID', 'Right', 171, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Sergio', 'Busquets', '1988-07-16', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'MID', 'Right', 189, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Ivan', 'Rakitić', '1988-03-10', (SELECT country_id FROM V2_countries WHERE country_code = 'HR'), 'MID', 'Right', 184, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Frenkie', 'de Jong', '1997-05-12', (SELECT country_id FROM V2_countries WHERE country_code = 'NL'), 'MID', 'Right', 180, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Pedro', 'González López', '2002-11-25', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'MID', 'Right', 174, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Pablo', 'Páez Gavira', '2004-08-05', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'MID', 'Right', 173, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Arturo', 'Vidal', '1987-05-22', (SELECT country_id FROM V2_countries WHERE country_code = 'CL'), 'MID', 'Right', 180, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Philippe', 'Coutinho', '1992-06-12', (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 'MID', 'Right', 172, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Anderson', 'Luís de Souza', '1977-08-27', (SELECT country_id FROM V2_countries WHERE country_code = 'PT'), 'MID', 'Right', 174, NULL, 0);

-- Fixing the issue: Use the explicit strings 'Ivory Coast' and 'Mali' if codes fail, or ensure codes match populate script.
-- Populate script used 'CI' for Ivory Coast and 'ML' for Mali.
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Yaya', 'Touré', '1983-05-13', (SELECT country_id FROM V2_countries WHERE country_code = 'CI'), 'MID', 'Right', 188, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Seydou', 'Keita', '1980-01-16', (SELECT country_id FROM V2_countries WHERE country_code = 'ML'), 'MID', 'Right', 183, NULL, 0);

-- Forwards (Fixed Eto'o apostrophe escape)
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Lionel', 'Messi', '1987-06-24', (SELECT country_id FROM V2_countries WHERE country_code = 'AR'), 'FWD', 'Left', 170, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Ronaldo', 'de Assis Moreira', '1980-03-21', (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 'FWD', 'Right', 181, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Samuel', 'Eto''o', '1981-03-10', (SELECT country_id FROM V2_countries WHERE country_code = 'CM'), 'FWD', 'Right', 180, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Thierry', 'Henry', '1977-08-17', (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 'FWD', 'Right', 188, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('David', 'Villa', '1981-12-03', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'FWD', 'Right', 175, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Pedro', 'Rodríguez', '1987-07-28', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'FWD', 'Right', 169, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Luis', 'Suárez', '1987-01-24', (SELECT country_id FROM V2_countries WHERE country_code = 'UY'), 'FWD', 'Right', 182, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Neymar', 'da Silva Santos Júnior', '1992-02-05', (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 'FWD', 'Right', 175, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Antoine', 'Griezmann', '1991-03-21', (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 'FWD', 'Left', 176, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Ousmane', 'Dembélé', '1997-05-15', (SELECT country_id FROM V2_countries WHERE country_code = 'FR'), 'FWD', 'Both', 178, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Robert', 'Lewandowski', '1988-08-21', (SELECT country_id FROM V2_countries WHERE country_code = 'PL'), 'FWD', 'Right', 185, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Ferran', 'Torres', '2000-02-29', (SELECT country_id FROM V2_countries WHERE country_code = 'ES'), 'FWD', 'Right', 184, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Raphael', 'Dias Belloli', '1996-12-14', (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 'FWD', 'Left', 176, NULL, 1);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Zlatan', 'Ibrahimović', '1981-10-03', (SELECT country_id FROM V2_countries WHERE country_code = 'SE'), 'FWD', 'Right', 195, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Rivaldo', 'Vítor Borba Ferreira', '1972-04-19', (SELECT country_id FROM V2_countries WHERE country_code = 'BR'), 'FWD', 'Left', 186, NULL, 0);
INSERT INTO V2_players (first_name, last_name, date_of_birth, nationality_id, position, preferred_foot, height_cm, photo_url, is_active) VALUES ('Patrick', 'Kluivert', '1976-07-01', (SELECT country_id FROM V2_countries WHERE country_code = 'NL'), 'FWD', 'Right', 188, NULL, 0);


-- 3. Insert Player Club History
INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '2004-05', '2020-21', 2004, 2021, 0, 10 FROM V2_players WHERE last_name='Messi';

INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '2008-09', '2015-16', 2008, 2016, 0, 2 FROM V2_players WHERE last_name='Alves' AND first_name='Daniel';

INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '2008-09', '2021-22', 2008, 2022, 0, 3 FROM V2_players WHERE last_name='Piqué';

INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '1999-00', '2013-14', 1999, 2014, 0, 5 FROM V2_players WHERE last_name='Puyol';

INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '1998-99', '2014-15', 1998, 2015, 0, 6 FROM V2_players WHERE last_name='Hernández' AND first_name='Xavier';

INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '2002-03', '2017-18', 2002, 2018, 0, 8 FROM V2_players WHERE last_name='Iniesta';

INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '2013-14', '2016-17', 2013, 2017, 0, 11 FROM V2_players WHERE last_name LIKE 'Neymar%';

INSERT INTO V2_player_club_history (player_id, club_id, season_start, season_end, year_start, year_end, is_loan, shirt_number) 
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), '2014-15', '2019-20', 2014, 2020, 0, 9 FROM V2_players WHERE last_name='Suárez';

-- 4. Club Trophies
INSERT INTO V2_club_trophies (club_id, competition_id, season, year, is_runner_up, notes)
VALUES 
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2004-05', 2005, 0, 'Rijkaard era'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2005-06', 2006, 0, 'Ronaldinho'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2008-09', 2009, 0, 'Treble'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2009-10', 2010, 0, NULL),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2010-11', 2011, 0, NULL),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2012-13', 2013, 0, '100 points'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2014-15', 2015, 0, 'Treble'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2015-16', 2016, 0, NULL),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2017-18', 2018, 0, NULL),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2018-19', 2019, 0, NULL),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='La Liga'), '2022-23', 2023, 0, 'Xavi'),

((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='UCL'), '2005-06', 2006, 0, 'Paris'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='UCL'), '2008-09', 2009, 0, 'Rome'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='UCL'), '2010-11', 2011, 0, 'Wembley'),
((SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), (SELECT competition_id FROM V2_competitions WHERE competition_short_name='UCL'), '2014-15', 2015, 0, 'Berlin');

-- 5. Player Trophies (Messi Sample)
INSERT INTO V2_player_trophies (player_id, club_id, competition_id, season, year, is_team_trophy, was_key_player, appearances_in_competition, goals_in_competition)
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), 
       (SELECT competition_id FROM V2_competitions WHERE competition_short_name='UCL'),
       '2008-09', 2009, 1, 1, 12, 9 
FROM V2_players WHERE last_name='Messi';

INSERT INTO V2_player_trophies (player_id, club_id, competition_id, season, year, is_team_trophy, was_key_player, appearances_in_competition, goals_in_competition)
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), 
       (SELECT competition_id FROM V2_competitions WHERE competition_short_name='UCL'),
       '2010-11', 2011, 1, 1, 13, 12
FROM V2_players WHERE last_name='Messi';

INSERT INTO V2_player_trophies (player_id, club_id, competition_id, season, year, is_team_trophy, was_key_player, appearances_in_competition, goals_in_competition)
SELECT player_id, (SELECT club_id FROM V2_clubs WHERE club_name='FC Barcelona'), 
       (SELECT competition_id FROM V2_competitions WHERE competition_short_name='UCL'),
       '2014-15', 2015, 1, 1, 13, 10
FROM V2_players WHERE last_name='Messi';

COMMIT;
