
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_04 — Finalize Venue Schema
 * 
 * - Adds 'city' and 'image_url' to v4.venues.
 * - Migrates data from v3_venues.
 * - Removes redundant venue columns from v4.teams.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Finalizing Venue Schema: Centralizing in v4.venues');

    // 1. Add missing columns to v4.venues
    await db.run(`
        ALTER TABLE v4.venues 
        ADD COLUMN IF NOT EXISTS city TEXT,
        ADD COLUMN IF NOT EXISTS image_url TEXT
    `);
    logger.info({}, '✅ Added city and image_url to v4.venues');

    // 2. Populate from v3_venues
    await db.run(`
        UPDATE v4.venues v
        SET 
            city = v3.city,
            image_url = v3.image_url
        FROM v3_venues v3
        WHERE (v.city IS NULL OR v.image_url IS NULL)
          AND (
            LOWER(v.name) = LOWER(v3.name)
            OR LOWER(v.name) = LOWER(REPLACE(v3.name, 'Stade ', ''))
            OR LOWER(v.name) = LOWER(REPLACE(v3.name, 'Stadium ', ''))
          )
    `);
    logger.info({}, '✅ Migrated city and image_url data to v4.venues');

    // 3. Remove redundant columns from v4.teams
    await db.run(`
        ALTER TABLE v4.teams 
        DROP COLUMN IF EXISTS venue_name,
        DROP COLUMN IF EXISTS venue_city,
        DROP COLUMN IF EXISTS venue_capacity,
        DROP COLUMN IF EXISTS venue_image_url
    `);
    logger.info({}, '✅ Removed redundant columns from v4.teams');

    logger.info({}, '🏁 Finalize Venue Schema migration complete');
};

export const down = async (db) => {
    // Note: Re-adding columns to teams would require re-populating them.
    await db.run(`ALTER TABLE v4.teams ADD COLUMN IF NOT EXISTS venue_name TEXT`);
    await db.run(`ALTER TABLE v4.teams ADD COLUMN IF NOT EXISTS venue_city TEXT`);
    await db.run(`ALTER TABLE v4.teams ADD COLUMN IF NOT EXISTS venue_capacity INTEGER`);
    await db.run(`ALTER TABLE v4.teams ADD COLUMN IF NOT EXISTS venue_image_url TEXT`);
    
    await db.run(`ALTER TABLE v4.venues DROP COLUMN IF EXISTS city`);
    await db.run(`ALTER TABLE v4.venues DROP COLUMN IF EXISTS image_url`);
};
