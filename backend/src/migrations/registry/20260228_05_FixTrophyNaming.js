export const up = async (db) => {
    // 1. Rename/Recreate Trophies table to match existing controllers (V3_Trophies)
    db.run(`DROP TABLE IF EXISTS V3_Player_Trophies`);

    db.run(`CREATE TABLE IF NOT EXISTS V3_Trophies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id INTEGER NOT NULL,
        league_id INTEGER,
        season TEXT, -- API uses strings like "2023/2024" sometimes
        team_name TEXT,
        country TEXT,
        league_name TEXT,
        trophy TEXT,
        place TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES V3_Players(player_id) ON DELETE CASCADE,
        UNIQUE(player_id, trophy, season)
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_v3_trophies_player ON V3_Trophies(player_id)`);
};
