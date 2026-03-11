export const up = async (db) => {
    // New Analytical Table V3_Player_Season_xG
    await db.run(`CREATE TABLE IF NOT EXISTS V3_Player_Season_xG (
        id SERIAL PRIMARY KEY,
        player_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        apps INTEGER DEFAULT 0,
        minutes INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        npg INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        xg REAL,
        npxg REAL,
        xa REAL,
        xg_chain REAL,
        xg_buildup REAL,
        xg_90 REAL,
        npxg_90 REAL,
        xa_90 REAL,
        xg90_xa90 REAL,
        npxg90_xa90 REAL,
        xg_chain_90 REAL,
        xg_buildup_90 REAL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES V3_Players(player_id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id) ON DELETE CASCADE,
        FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id) ON DELETE CASCADE,
        UNIQUE(player_id, league_id, season_year, team_id)
    )`);

    // Index for faster lookups by player/league/season
    await db.run(`CREATE INDEX IF NOT EXISTS idx_v3_player_xg_lookup 
                  ON V3_Player_Season_xG(player_id, league_id, season_year)`);
};
