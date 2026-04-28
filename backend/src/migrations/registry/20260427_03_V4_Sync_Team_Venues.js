
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_03 — Sync Team Venues
 * 
 * Adds venue-related columns to v4.teams to match the expectations of TeamServiceV4.
 * Populates them from the enriched v4.venues table.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Starting migration: Sync Team Venues');

    // 1. Add columns to v4.teams
    await db.run(`
        ALTER TABLE v4.teams 
        ADD COLUMN IF NOT EXISTS venue_name TEXT,
        ADD COLUMN IF NOT EXISTS venue_city TEXT,
        ADD COLUMN IF NOT EXISTS venue_capacity INTEGER,
        ADD COLUMN IF NOT EXISTS venue_image_url TEXT
    `);
    logger.info({}, '✅ Added venue columns to v4.teams');

    // 2. Populate from v4.venues
    const result = await db.run(`
        UPDATE v4.teams t
        SET 
            venue_name = v.name,
            venue_capacity = v.capacity
        FROM v4.venues v
        WHERE t.team_id = v.club_id
    `);
    logger.info({ changes: result.changes }, '✅ Populated team venue info from v4.venues');

    logger.info({}, '🏁 Sync Team Venues migration complete');
};

export const down = async (db) => {
    await db.run(`
        ALTER TABLE v4.teams 
        DROP COLUMN IF EXISTS venue_name,
        DROP COLUMN IF EXISTS venue_city,
        DROP COLUMN IF EXISTS venue_capacity,
        DROP COLUMN IF EXISTS venue_image_url
    `);
    logger.info({}, '⏪ Sync Team Venues migration reverted');
};
