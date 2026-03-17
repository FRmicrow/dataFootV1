export const up = async (db) => {
    const columns = await db.all(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'v3_leagues'
    `);
    const exists = columns.some((column) => column.column_name === 'global_importance_rank');

    if (!exists) {
        await db.run('ALTER TABLE V3_Leagues ADD COLUMN global_importance_rank INTEGER DEFAULT 99999');
    }

    await db.run('CREATE INDEX IF NOT EXISTS idx_v3_leagues_global_importance ON V3_Leagues(global_importance_rank)');
};
