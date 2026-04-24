import logger from '../../utils/logger.js';

async function v4TableExists(db, tableName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'v4' AND table_name = $1
        ) AS exists`,
        [tableName]
    );
    return Boolean(row?.exists);
}

export const up = async (db) => {
    logger.info({}, '🚀 Starting migration: US-400 Competition Relations & Temporal Columns');

    // 1. Add temporal and source columns to v4.competitions
    await db.run(`
        ALTER TABLE v4.competitions 
        ADD COLUMN IF NOT EXISTS active_from INTEGER,
        ADD COLUMN IF NOT EXISTS active_until INTEGER,
        ADD COLUMN IF NOT EXISTS source_url TEXT,
        ADD COLUMN IF NOT EXISTS source_code TEXT,
        ADD COLUMN IF NOT EXISTS competition_scope TEXT,
        ADD COLUMN IF NOT EXISTS competition_level_tier INTEGER,
        ADD COLUMN IF NOT EXISTS competition_level_label TEXT,
        ADD COLUMN IF NOT EXISTS competition_format TEXT
    `);
    logger.info({}, '✅ Updated v4.competitions with temporal and source columns');

    // 2. Add source columns to v4.people and v4.clubs
    await db.run(`
        ALTER TABLE v4.people 
        ADD COLUMN IF NOT EXISTS source_tm_id TEXT,
        ADD COLUMN IF NOT EXISTS source_url TEXT
    `);
    await db.run(`
        ALTER TABLE v4.clubs 
        ADD COLUMN IF NOT EXISTS source_tm_id TEXT,
        ADD COLUMN IF NOT EXISTS source_url TEXT
    `);
    logger.info({}, '✅ Added source columns to v4.people and v4.clubs');

    // 3. Create v4.competition_relations table
    if (!(await v4TableExists(db, 'competition_relations'))) {
        await db.run(`
            CREATE TABLE v4.competition_relations (
                relation_id SERIAL PRIMARY KEY,
                source_id BIGINT NOT NULL REFERENCES v4.competitions(competition_id) ON DELETE CASCADE,
                target_id BIGINT NOT NULL REFERENCES v4.competitions(competition_id) ON DELETE CASCADE,
                relation_type TEXT NOT NULL,
                is_exclusive BOOLEAN DEFAULT FALSE,
                metadata JSONB,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(source_id, target_id, relation_type)
            )
        `);
        logger.info({}, '✅ Created table v4.competition_relations');
    } else {
        logger.info({}, 'ℹ️ Table v4.competition_relations already exists — skipping');
    }

    logger.info({}, '🏁 US-400 Migration complete');
};

export const down = async (db) => {
    await db.run(`DROP TABLE IF EXISTS v4.competition_relations CASCADE`);
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS active_from`);
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS active_until`);
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS source_url`);
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS source_code`);
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS competition_scope`);
    await db.run(`ALTER TABLE v4.competitions DROP COLUMN IF EXISTS competition_level_tier`);
    await db.run({ sql: `ALTER TABLE v4.competitions DROP COLUMN IF EXISTS competition_level_label` });
    await db.run({ sql: `ALTER TABLE v4.competitions DROP COLUMN IF EXISTS competition_format` });
    await db.run(`ALTER TABLE v4.people DROP COLUMN IF EXISTS source_tm_id`);
    await db.run(`ALTER TABLE v4.people DROP COLUMN IF EXISTS source_url`);
    await db.run(`ALTER TABLE v4.clubs DROP COLUMN IF EXISTS source_tm_id`);
    await db.run(`ALTER TABLE v4.clubs DROP COLUMN IF EXISTS source_url`);
    logger.info({}, '⏪ US-400 Migration reverted');
};
