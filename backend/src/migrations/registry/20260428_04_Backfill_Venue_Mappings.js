
import logger from '../../utils/logger.js';

/**
 * Migration 20260428_04 — Backfill Venue Mappings
 * 
 * Populates mapping_venues for existing Transfermarkt data.
 */
export const up = async (db) => {
    logger.info({}, '🚀 Backfilling Venue mappings');

    const result = await db.run(`
        INSERT INTO v4.mapping_venues (source, source_id, venue_id, source_name)
        SELECT 'transfermarkt', COALESCE(source_url, name), venue_id, name
        FROM v4.venues
        ON CONFLICT (source, source_id) DO NOTHING
    `);

    logger.info({ changes: result.changes }, '✅ Backfilled v4.mapping_venues');
    logger.info({}, '🏁 Venue backfill complete');
};

export const down = async (db) => {
    logger.warn({}, '⏪ Reverting venue backfill');
    await db.run(`DELETE FROM v4.mapping_venues WHERE source = 'transfermarkt'`);
};
