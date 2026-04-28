
import logger from '../../utils/logger.js';

/**
 * Migration 20260428_02 — V4 Backfill TM Mappings
 * 
 * Populates mapping tables from existing source_tm_id and source_key columns.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Backfilling Transfermarkt mappings');

    // 1. Backfill Teams
    const teamInsert = await db.run(`
        INSERT INTO v4.mapping_teams (source, source_id, team_id, source_name)
        SELECT 'transfermarkt', source_tm_id, team_id, name
        FROM v4.teams
        WHERE source_tm_id IS NOT NULL
        ON CONFLICT (source, source_id) DO NOTHING
    `);
    logger.info({ changes: teamInsert.changes }, '✅ Backfilled v4.mapping_teams');

    // 2. Backfill People
    const peopleInsert = await db.run(`
        INSERT INTO v4.mapping_people (source, source_id, person_id, source_name)
        SELECT 'transfermarkt', source_tm_id, person_id, full_name
        FROM v4.people
        WHERE source_tm_id IS NOT NULL
        ON CONFLICT (source, source_id) DO NOTHING
    `);
    logger.info({ changes: peopleInsert.changes }, '✅ Backfilled v4.mapping_people');

    // 3. Backfill Competitions
    const compInsert = await db.run(`
        INSERT INTO v4.mapping_competitions (source, source_id, competition_id, source_name)
        SELECT 'transfermarkt', source_key, competition_id, name
        FROM v4.competitions
        WHERE source_key IS NOT NULL
        ON CONFLICT (source, source_id) DO NOTHING
    `);
    logger.info({ changes: compInsert.changes }, '✅ Backfilled v4.mapping_competitions');

    // 4. Venues - No clear source ID yet, skipping backfill for now
    logger.info({}, 'ℹ️ Skipping v4.mapping_venues backfill (no source_tm_id found in v4.venues)');

    logger.info({}, '🏁 Backfill migration complete');
};

export const down = async (db) => {
    logger.warn({}, '⏪ Reverting backfill (clearing TM mappings)');
    await db.run(`DELETE FROM v4.mapping_teams WHERE source = 'transfermarkt'`);
    await db.run(`DELETE FROM v4.mapping_people WHERE source = 'transfermarkt'`);
    await db.run(`DELETE FROM v4.mapping_competitions WHERE source = 'transfermarkt'`);
};
