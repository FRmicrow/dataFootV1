import logger from '../../utils/logger.js';

/**
 * Migration 20260428_06 — Fix Transfermarkt Venue Mappings
 * 
 * Transfermarkt venue URLs in the mapping table were brittle because they included
 * domain (.com vs .fr) and dynamic season_ids (/saison_id/2015).
 * This migration cleans up existing URL-based source_ids by extracting the stable 
 * 'verein_X' or 'stadion_X' identifier, and removes duplicates.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Cleaning up Transfermarkt venue mapping URLs');

    // 1. Create a temporary table with the parsed stable IDs
    await db.run(`
        CREATE TEMP TABLE temp_venues AS
        SELECT id, source_id, venue_id, source_name,
               (regexp_match(source_id, '/(verein|stadion)/(\\d+)'))[1] || '_' || (regexp_match(source_id, '/(verein|stadion)/(\\d+)'))[2] as new_id
        FROM v4.mapping_venues 
        WHERE source = 'transfermarkt' AND source_id LIKE 'http%';
    `);

    // 2. Insert the cleaned mappings (ignoring conflicts for duplicates like different saison_ids)
    const insertResult = await db.run(`
        INSERT INTO v4.mapping_venues (source, source_id, venue_id, source_name)
        SELECT DISTINCT ON (new_id) 'transfermarkt', new_id, venue_id, source_name
        FROM temp_venues
        WHERE new_id IS NOT NULL
        ON CONFLICT (source, source_id) DO NOTHING;
    `);

    // 3. Delete the old dirty URL-based mappings
    const deleteResult = await db.run(`
        DELETE FROM v4.mapping_venues 
        WHERE source = 'transfermarkt' AND source_id LIKE 'http%';
    `);

    logger.info({ 
        insertedClean: insertResult?.changes || 'unknown', 
        deletedDirty: deleteResult?.changes || 'unknown' 
    }, '✅ Cleaned up v4.mapping_venues source IDs');
};

export const down = async (db) => {
    logger.warn({}, '⏪ Cannot cleanly revert venue URL cleanup (data loss of original raw URLs)');
};
