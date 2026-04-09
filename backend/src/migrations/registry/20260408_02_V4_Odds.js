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
    logger.info('Creating v4.odds table...');

    if (await v4TableExists(db, 'odds')) {
        logger.info('v4.odds already exists — skipping');
        return;
    }

    await db.run(`
        CREATE TABLE v4.odds (
            odds_id      BIGSERIAL PRIMARY KEY,
            match_id     BIGINT NOT NULL REFERENCES v4.matches(match_id) ON DELETE CASCADE,
            bookmaker_id INTEGER NOT NULL,
            market_id    INTEGER NOT NULL,
            market_type  TEXT NOT NULL DEFAULT 'FT_1X2',
            value_home   NUMERIC(7,3),
            value_draw   NUMERIC(7,3),
            value_away   NUMERIC(7,3),
            handicap_value NUMERIC(6,2),
            captured_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE NULLS NOT DISTINCT (match_id, bookmaker_id, market_id, handicap_value)
        )
    `);

    if (!(await v4IndexExists(db, 'idx_v4_odds_match_id'))) {
        await db.run(`CREATE INDEX idx_v4_odds_match_id ON v4.odds(match_id)`);
    }
    if (!(await v4IndexExists(db, 'idx_v4_odds_bookmaker'))) {
        await db.run(`CREATE INDEX idx_v4_odds_bookmaker ON v4.odds(match_id, bookmaker_id)`);
    }

    logger.info('v4.odds created successfully');
};

export const down = async (db) => {
    if (await v4TableExists(db, 'odds')) {
        await db.run(`DROP TABLE v4.odds`);
        logger.info('v4.odds dropped');
    }
};
