import logger from '../../utils/logger.js';

async function v4ColumnExists(db, tableName, columnName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'v4'
              AND table_name   = ?
              AND column_name  = ?
        ) AS exists`,
        [tableName, columnName]
    );
    return Boolean(row?.exists);
}

export const up = async (db) => {
    logger.info('Adding xg_home / xg_away columns to v4.matches...');

    if (!(await v4ColumnExists(db, 'matches', 'xg_home'))) {
        await db.run(`ALTER TABLE v4.matches ADD COLUMN xg_home NUMERIC(5,2)`);
        logger.info('Added v4.matches.xg_home');
    } else {
        logger.info('v4.matches.xg_home already exists — skipping');
    }

    if (!(await v4ColumnExists(db, 'matches', 'xg_away'))) {
        await db.run(`ALTER TABLE v4.matches ADD COLUMN xg_away NUMERIC(5,2)`);
        logger.info('Added v4.matches.xg_away');
    } else {
        logger.info('v4.matches.xg_away already exists — skipping');
    }

    // Backfill from V3 via mapping table (HIGH and MEDIUM confidence only)
    // Note: PostgreSQL UPDATE with FROM cannot alias the target table in JOIN ON clauses.
    const result = await db.run(`
        UPDATE v4.matches
        SET
            xg_home = vf.xg_home,
            xg_away = vf.xg_away
        FROM V3_Fixtures vf
        JOIN v4.fixture_match_mapping fmm
            ON fmm.v3_fixture_id = vf.fixture_id
           AND fmm.confidence    IN ('HIGH', 'MEDIUM')
        WHERE fmm.v4_match_id = v4.matches.match_id
          AND (vf.xg_home IS NOT NULL OR vf.xg_away IS NOT NULL)
          AND (v4.matches.xg_home IS NULL AND v4.matches.xg_away IS NULL)
    `);

    logger.info({ updated: result.changes }, 'xG backfill complete');
};

export const down = async (_db) => {
    // Columns removal not supported — would destroy data. Must be done manually.
    logger.warn('down() for 20260408_03 is a no-op. Remove xg columns manually if needed.');
};
