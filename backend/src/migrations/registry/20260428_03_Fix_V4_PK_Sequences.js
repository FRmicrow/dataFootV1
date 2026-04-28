
import logger from '../../utils/logger.js';

/**
 * Migration 20260428_03 — Fix V4 PK Sequences
 * 
 * Adds sequences and DEFAULT values to primary key columns in v4 schema 
 * that were missing them, causing insert failures for new entities.
 */
export const up = async (db) => {
    logger.info({}, '🚀 Starting Fix V4 PK Sequences migration');

    const tablesToFix = [
        { table: 'people', pk: 'person_id', seq: 'v4.people_person_id_seq' },
        { table: 'teams', pk: 'team_id', seq: 'v4.teams_team_id_seq' },
        { table: 'competitions', pk: 'competition_id', seq: 'v4.competitions_competition_id_seq' },
        { table: 'venues', pk: 'venue_id', seq: 'v4.venues_venue_id_seq' },
        { table: 'matches', pk: 'match_id', seq: 'v4.matches_match_id_seq' }
    ];

    for (const { table, pk, seq } of tablesToFix) {
        logger.info({ table, pk }, `Fixing PK for v4.${table}`);

        // 1. Get current MAX ID
        const maxResult = await db.get(`SELECT MAX(${pk}) as max_id FROM v4.${table}`);
        const maxId = maxResult?.max_id || 0;
        // Start sequence at maxId + 1, or 1000000 if empty to avoid collisions with legacy IDs
        const startValue = maxId > 0 ? Number(maxId) + 1 : 1000000;

        logger.info({ table, maxId, startValue }, `Creating sequence for v4.${table}`);

        // 2. Create sequence
        await db.run(`CREATE SEQUENCE IF NOT EXISTS ${seq} START ${startValue} INCREMENT 1`);

        // 3. Set DEFAULT nextval
        await db.run(`
            ALTER TABLE v4.${table} 
            ALTER COLUMN ${pk} SET DEFAULT nextval('${seq}'::regclass)
        `);

        logger.info({ table }, `✅ Successfully fixed PK for v4.${table}`);
    }

    // Also fix match_events if not already done (the disabled migration was supposed to do it)
    const eventSeq = 'v4.match_events_match_event_id_seq';
    const eventMax = await db.get(`SELECT MAX(match_event_id) as max_id FROM v4.match_events`);
    const eventStart = eventMax?.max_id ? Number(eventMax.max_id) + 1 : 1000000;
    
    await db.run(`CREATE SEQUENCE IF NOT EXISTS ${eventSeq} START ${eventStart} INCREMENT 1`);
    await db.run(`
        ALTER TABLE v4.match_events 
        ALTER COLUMN match_event_id SET DEFAULT nextval('${eventSeq}'::regclass)
    `);
    logger.info({}, '✅ Fixed match_event_id sequence');

    logger.info({}, '🏁 Fix V4 PK Sequences migration complete');
};

export const down = async (db) => {
    const tablesToFix = [
        { table: 'people', pk: 'person_id', seq: 'v4.people_person_id_seq' },
        { table: 'teams', pk: 'team_id', seq: 'v4.teams_team_id_seq' },
        { table: 'competitions', pk: 'competition_id', seq: 'v4.competitions_competition_id_seq' },
        { table: 'venues', pk: 'venue_id', seq: 'v4.venues_venue_id_seq' },
        { table: 'matches', pk: 'match_id', seq: 'v4.matches_match_id_seq' },
        { table: 'match_events', pk: 'match_event_id', seq: 'v4.match_events_match_event_id_seq' }
    ];

    for (const { table, pk, seq } of tablesToFix) {
        await db.run(`ALTER TABLE v4.${table} ALTER COLUMN ${pk} DROP DEFAULT`);
        await db.run(`DROP SEQUENCE IF EXISTS ${seq}`);
    }
    logger.info({}, '⏪ Fix V4 PK Sequences migration reverted');
};
