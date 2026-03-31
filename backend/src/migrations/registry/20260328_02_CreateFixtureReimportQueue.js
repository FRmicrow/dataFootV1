export const up = async (db) => {
    await db.run(`
        CREATE TABLE IF NOT EXISTS v3_fixture_reimport_queue (
            reimport_queue_id SERIAL PRIMARY KEY,
            fixture_id INTEGER NOT NULL REFERENCES v3_fixtures(fixture_id) ON DELETE CASCADE,
            api_id INTEGER,
            league_id INTEGER NOT NULL,
            season_year INTEGER NOT NULL,
            data_source TEXT NOT NULL,
            reason_code TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            notes TEXT,
            metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
            batch_key TEXT,
            flagged_by TEXT NOT NULL DEFAULT 'codex',
            flagged_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (fixture_id, reason_code)
        )
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_fixture_reimport_queue_status_reason
        ON v3_fixture_reimport_queue(status, reason_code)
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_fixture_reimport_queue_league_season
        ON v3_fixture_reimport_queue(league_id, season_year, data_source)
    `);
};
