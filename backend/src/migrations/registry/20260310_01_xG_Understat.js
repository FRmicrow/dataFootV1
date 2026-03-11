export const up = async (db) => {
    // Modify V3_Fixtures
    try {
        const tableExists = await db.get("SELECT table_name FROM information_schema.tables WHERE table_name='v3_fixtures' AND table_schema='public'");
        if (tableExists) {
            await db.run("ALTER TABLE V3_Fixtures ADD COLUMN IF NOT EXISTS understat_id INTEGER UNIQUE");
            await db.run("ALTER TABLE V3_Fixtures ADD COLUMN IF NOT EXISTS xg_home REAL");
            await db.run("ALTER TABLE V3_Fixtures ADD COLUMN IF NOT EXISTS xg_away REAL");
        }
    } catch (e) {
        if (!e.message.includes('already exists')) throw e;
    }

    // New Analytical Table V3_League_Season_xG
    await db.run(`CREATE TABLE IF NOT EXISTS V3_League_Season_xG (
        id SERIAL PRIMARY KEY,
        league_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        xg_for REAL,
        xg_against REAL,
        xg_points REAL,
        np_xg REAL,
        ppda REAL,
        deep_completions INTEGER,
        raw_json JSONB,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id) ON DELETE CASCADE,
        FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id) ON DELETE CASCADE,
        UNIQUE(league_id, season_year, team_id)
    )`);
};
