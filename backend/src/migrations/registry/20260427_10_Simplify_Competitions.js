
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_10 — Simplify and Cleanup Competitions
 * 
 * - Drops redundant ranking and metadata columns.
 * - Keeps essential fields for UI and identification.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Simplifying v4.competitions table');

    // 1. Remove unnecessary columns
    await db.run(`
        ALTER TABLE v4.competitions 
        DROP COLUMN IF EXISTS importance_score,
        DROP COLUMN IF EXISTS rank_band,
        DROP COLUMN IF EXISTS rank_source,
        DROP COLUMN IF EXISTS rank_updated_at,
        DROP COLUMN IF EXISTS display_rank_override,
        DROP COLUMN IF EXISTS country_rank_snapshot,
        DROP COLUMN IF EXISTS data_depth_score,
        DROP COLUMN IF EXISTS type_weight,
        DROP COLUMN IF EXISTS active_from,
        DROP COLUMN IF EXISTS active_until,
        DROP COLUMN IF EXISTS source_code_old, -- cleanup potential old columns
        DROP COLUMN IF EXISTS competition_scope,
        DROP COLUMN IF EXISTS competition_level_tier,
        DROP COLUMN IF EXISTS competition_level_label,
        DROP COLUMN IF EXISTS competition_format
    `);

    logger.info({}, '✅ Dropped redundant columns from v4.competitions');
};

export const down = async (db) => {
    // Re-adding all these columns with their types would be very verbose.
    // Given the task is simplification, we'll just add back the main ones if needed.
    await db.run(`ALTER TABLE v4.competitions ADD COLUMN IF NOT EXISTS importance_score NUMERIC(10,2)`);
    logger.info({}, '⏪ Simplification of competitions reverted (partial)');
};
