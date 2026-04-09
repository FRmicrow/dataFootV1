import logger from '../../utils/logger.js';

async function v4TableExists(db, tableName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'v4' AND table_name = ?
        ) AS exists`,
        [tableName]
    );
    return Boolean(row?.exists);
}

async function v4IndexExists(db, indexName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'v4' AND indexname = ?
        ) AS exists`,
        [indexName]
    );
    return Boolean(row?.exists);
}

export const up = async (db) => {
    logger.info('Creating v4.fixture_match_mapping table...');

    // Ensure pg_trgm is available for fuzzy matching in subsequent scripts
    await db.run(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    if (await v4TableExists(db, 'fixture_match_mapping')) {
        logger.info('v4.fixture_match_mapping already exists — skipping');
        return;
    }

    await db.run(`
        CREATE TABLE v4.fixture_match_mapping (
            id             BIGSERIAL PRIMARY KEY,
            v3_fixture_id  INTEGER NOT NULL UNIQUE,
            v4_match_id    BIGINT REFERENCES v4.matches(match_id),
            strategy       TEXT NOT NULL,
            confidence     TEXT NOT NULL,
            notes          TEXT,
            created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_strategy CHECK (strategy IN ('EXACT_TM_ID', 'MULTI_FIELD_SCORE', 'UNMATCHED')),
            CONSTRAINT chk_confidence CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW', 'NONE'))
        )
    `);

    if (!(await v4IndexExists(db, 'idx_fixture_match_mapping_v3'))) {
        await db.run(`CREATE INDEX idx_fixture_match_mapping_v3 ON v4.fixture_match_mapping(v3_fixture_id)`);
    }
    if (!(await v4IndexExists(db, 'idx_fixture_match_mapping_v4'))) {
        await db.run(`CREATE INDEX idx_fixture_match_mapping_v4 ON v4.fixture_match_mapping(v4_match_id) WHERE v4_match_id IS NOT NULL`);
    }

    logger.info('v4.fixture_match_mapping created successfully');
};

export const down = async (db) => {
    if (await v4TableExists(db, 'fixture_match_mapping')) {
        await db.run(`DROP TABLE v4.fixture_match_mapping`);
        logger.info('v4.fixture_match_mapping dropped');
    }
};
