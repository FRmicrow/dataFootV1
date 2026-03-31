export const up = async (db) => {
    await db.run(`
        CREATE TABLE IF NOT EXISTS V3_Quarantine_Batches (
            batch_id SERIAL PRIMARY KEY,
            batch_key TEXT NOT NULL UNIQUE,
            description TEXT,
            backup_path TEXT,
            created_by TEXT DEFAULT 'codex',
            created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.run(`
        CREATE TABLE IF NOT EXISTS V3_Quarantine_Records (
            quarantine_record_id BIGSERIAL PRIMARY KEY,
            batch_id INTEGER NOT NULL REFERENCES V3_Quarantine_Batches(batch_id) ON DELETE CASCADE,
            source_table TEXT NOT NULL,
            record_id BIGINT NOT NULL,
            fixture_id INTEGER,
            reason_codes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
            payload JSONB NOT NULL,
            quarantined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(batch_id, source_table, record_id)
        )
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_quarantine_records_batch_source
        ON V3_Quarantine_Records(batch_id, source_table)
    `);

    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v3_quarantine_records_fixture
        ON V3_Quarantine_Records(fixture_id)
    `);
};
