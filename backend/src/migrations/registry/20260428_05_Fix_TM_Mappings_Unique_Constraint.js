import logger from '../../utils/logger.js';

/**
 * Migration 20260428_05 — Fix Transfermarkt Mappings Unique Constraint
 * 
 * Transfermarkt has overlapping IDs for players, referees, and coaches (all starting at 1).
 * The v4.mapping_people table has a UNIQUE (source, source_id) constraint.
 * This migration prefixes the source in mapping_people with the person_type 
 * (e.g. transfermarkt_player, transfermarkt_referee) to avoid unique constraint collisions.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Fixing Transfermarkt mapping prefixes to avoid ID collisions');

    const result = await db.run(`
        UPDATE v4.mapping_people mp
        SET source = 'transfermarkt_' || p.person_type
        FROM v4.people p
        WHERE mp.person_id = p.person_id 
          AND mp.source = 'transfermarkt'
    `);

    logger.info({ changes: result.changes }, '✅ Updated v4.mapping_people with prefixed sources');
};

export const down = async (db) => {
    logger.warn({}, '⏪ Reverting Transfermarkt mapping prefixes');
    
    await db.run(`
        UPDATE v4.mapping_people
        SET source = 'transfermarkt'
        WHERE source LIKE 'transfermarkt_%'
    `);
};
