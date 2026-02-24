import sqlite3
import pandas as pd
DB_PATH = 'backend/database.sqlite'
conn = sqlite3.connect(DB_PATH)
query = """
    SELECT fixture_id, date, league_id, round, home_team_id, away_team_id, goals_home, goals_away, status_short
    FROM V3_Fixtures 
    WHERE status_short IN ('FT', 'AET', 'PEN')
    ORDER BY date ASC
"""
fixtures_df = pd.read_sql_query(query, conn)
print("Dups in fixtures_df:", fixtures_df['fixture_id'].duplicated().sum())

home = fixtures_df[['fixture_id', 'date', 'league_id', 'home_team_id', 'goals_home', 'goals_away']].copy()
home.columns = ['fixture_id', 'date', 'league_id', 'team_id', 'gf', 'ga']
home['is_home'] = 1
away = fixtures_df[['fixture_id', 'date', 'league_id', 'away_team_id', 'goals_away', 'goals_home']].copy()
away.columns = ['fixture_id', 'date', 'league_id', 'team_id', 'gf', 'ga']
away['is_home'] = 0
team_games = pd.concat([home, away]).sort_values(['team_id', 'date'])
team_games['gd'] = team_games['gf'] - team_games['ga']
team_games['points'] = team_games.apply(lambda r: 3 if r.gf > r.ga else (1 if r.gf == r.ga else 0), axis=1)
for w in [5, 10]:
    team_games[f'mom_gd_{w}'] = team_games.groupby('team_id')['gd'].transform(lambda x: x.shift().rolling(w, min_periods=1).mean())
    team_games[f'mom_pts_{w}'] = team_games.groupby('team_id')['points'].transform(lambda x: x.shift().rolling(w, min_periods=1).mean())
team_games['def_res'] = team_games.groupby('team_id')['ga'].transform(lambda x: x.shift().rolling(10, min_periods=1).mean())
team_games['avg_pts_home'] = team_games[team_games['is_home'] == 1].groupby('team_id')['points'].transform(lambda x: x.shift().rolling(20, min_periods=1).mean())
team_games['avg_pts_away'] = team_games[team_games['is_home'] == 0].groupby('team_id')['points'].transform(lambda x: x.shift().rolling(20, min_periods=1).mean())
team_games['avg_pts_home'] = team_games.groupby('team_id')['avg_pts_home'].ffill()
team_games['avg_pts_away'] = team_games.groupby('team_id')['avg_pts_away'].ffill()
team_games['venue_diff'] = team_games['avg_pts_home'] - team_games['avg_pts_away']

home_feats = team_games[team_games['is_home'] == 1][['fixture_id', 'team_id', 'mom_gd_5']]
home_feats.columns = ['fixture_id', 'home_team_id', 'mom_gd_h5']
away_feats = team_games[team_games['is_home'] == 0][['fixture_id', 'team_id', 'mom_gd_5']]
away_feats.columns = ['fixture_id', 'away_team_id', 'mom_gd_a5']

df_feat = fixtures_df.merge(home_feats, on=['fixture_id', 'home_team_id'], how='left')
df_feat = df_feat.merge(away_feats, on=['fixture_id', 'away_team_id'], how='left')

print("Dups after merge home/away:", df_feat['fixture_id'].duplicated().sum())

elo_df = pd.read_sql_query("SELECT fixture_id, team_id, elo_score FROM V3_Team_Ratings ORDER BY date ASC, fixture_id ASC", conn)
team_elos = elo_df.sort_values('fixture_id')
team_elos['pre_match_elo'] = team_elos.groupby('team_id')['elo_score'].shift(1).fillna(1500.0)

home_elo = team_elos.copy()
home_elo.columns = ['fixture_id', 'home_team_id', 'post_elo_h', 'elo_h']
away_elo = team_elos.copy()
away_elo.columns = ['fixture_id', 'away_team_id', 'post_elo_a', 'elo_a']

df_feat = df_feat.merge(home_elo[['fixture_id', 'home_team_id', 'elo_h']], on=['fixture_id', 'home_team_id'], how='left')
df_feat = df_feat.merge(away_elo[['fixture_id', 'away_team_id', 'elo_a']], on=['fixture_id', 'away_team_id'], how='left')

print("Dups after merge ELO:", df_feat['fixture_id'].duplicated().sum())

