import logger from '../../utils/logger.js';

async function tableExists(db, tableName) {
    const row = await db.get(
        `
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = ?
            ) AS exists
        `,
        [tableName]
    );

    return Boolean(row?.exists);
}

async function constraintExists(db, tableName, constraintName) {
    const row = await db.get(
        `
            SELECT EXISTS (
                SELECT 1
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = 'public'
                  AND t.relname = ?
                  AND c.conname = ?
            ) AS exists
        `,
        [tableName, constraintName]
    );

    return Boolean(row?.exists);
}

async function ensureCompositeUnique(db, tableName, constraintName) {
    if (!(await tableExists(db, tableName))) {
        logger.info({ tableName }, 'Skipping V4 taxonomy migration for missing table');
        return;
    }

    await db.run(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_name_key`);

    if (await constraintExists(db, tableName, constraintName)) {
        logger.info({ tableName, constraintName }, 'V4 taxonomy constraint already in place');
        return;
    }

    await db.run(`ALTER TABLE ${tableName} ADD CONSTRAINT ${constraintName} UNIQUE (name, country_id)`);
    logger.info({ tableName, constraintName }, 'Applied V4 taxonomy constraint');
}

export const up = async (db) => {
    logger.info('🛠️  Fixing V4 League & Team Taxonomy Constraints...');

    await ensureCompositeUnique(db, 'v4_leagues', 'v4_leagues_name_country_unique');
    await ensureCompositeUnique(db, 'v4_teams', 'v4_teams_name_country_unique');
};

export const down = async (db) => {
    if (await tableExists(db, 'v4_leagues')) {
        await db.run('ALTER TABLE v4_leagues DROP CONSTRAINT IF EXISTS v4_leagues_name_country_unique');
        await db.run('ALTER TABLE v4_leagues ADD CONSTRAINT v4_leagues_name_key UNIQUE (name)');
    }
};
