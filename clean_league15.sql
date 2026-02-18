DELETE FROM V3_Standings WHERE league_id = 15 AND team_id IN (SELECT team_id FROM V3_Teams WHERE country != 'Italy');
DELETE FROM V3_Fixtures WHERE league_id = 15 AND (home_team_id IN (SELECT team_id FROM V3_Teams WHERE country != 'Italy') OR away_team_id IN (SELECT team_id FROM V3_Teams WHERE country != 'Italy'));
DELETE FROM V3_Player_Stats WHERE league_id = 15 AND team_id IN (SELECT team_id FROM V3_Teams WHERE country != 'Italy');
