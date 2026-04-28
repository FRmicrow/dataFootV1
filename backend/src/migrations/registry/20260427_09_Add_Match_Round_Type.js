
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_09 — Add Match Round Type
 * 
 * Adds a categorized 'round_type' column to v4.matches based on the 'round_label'.
 * Categorization: 'league', 'knockout', 'final'.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Adding round_type to v4.matches');

    // 1. Add column
    await db.run(`
        ALTER TABLE v4.matches 
        ADD COLUMN IF NOT EXISTS round_type TEXT 
        CHECK (round_type IN ('league', 'knockout', 'final'))
    `);
    logger.info({}, '✅ Added round_type column to v4.matches');

    // 2. Categorize 'final'
    await db.run(`
        UPDATE v4.matches
        SET round_type = 'final'
        WHERE round_label ILIKE '%Finale%' 
          AND round_label NOT ILIKE '%1/8%'
          AND round_label NOT ILIKE '%1/4%'
          AND round_label NOT ILIKE '%Demi%'
    `);
    logger.info({}, '✅ Categorized finals');

    // 3. Categorize 'knockout'
    await db.run(`
        UPDATE v4.matches
        SET round_type = 'knockout'
        WHERE round_type IS NULL 
          AND (
            round_label ILIKE '%finale%'
            OR round_label ILIKE '%tour%'
            OR round_label ILIKE '%éliminatoires%'
            OR round_label ILIKE '%barrage%'
            OR round_label ILIKE '%play-off%'
          )
    `);
    logger.info({}, '✅ Categorized knockout rounds');

    // 4. Categorize 'league'
    await db.run(`
        UPDATE v4.matches
        SET round_type = 'league'
        WHERE round_type IS NULL 
          AND (
            round_label ~ '^J[0-9]+$'
            OR round_label ILIKE '%groupe%'
            OR round_label ILIKE '%journée%'
          )
    `);
    logger.info({}, '✅ Categorized league rounds');

    logger.info({}, '🏁 Match round categorization complete');
};

export const down = async (db) => {
    await db.run(`ALTER TABLE v4.matches DROP COLUMN IF EXISTS round_type`);
    logger.info({}, '⏪ Match round categorization reverted');
};
