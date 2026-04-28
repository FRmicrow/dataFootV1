
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_07 — Cleanup Match Scrape Columns
 * 
 * Removes redundant scraping timestamp columns from v4.matches.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Cleaning up scraping columns from v4.matches');

    await db.run(`
        ALTER TABLE v4.matches 
        DROP COLUMN IF EXISTS scraped_score_at,
        DROP COLUMN IF EXISTS scraped_stats_at,
        DROP COLUMN IF EXISTS scraped_events_at,
        DROP COLUMN IF EXISTS scraped_lineups_at
    `);

    logger.info({}, '✅ Removed scraping timestamp columns from v4.matches');
};

export const down = async (db) => {
    await db.run(`
        ALTER TABLE v4.matches 
        ADD COLUMN IF NOT EXISTS scraped_score_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS scraped_stats_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS scraped_events_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS scraped_lineups_at TIMESTAMPTZ
    `);
    logger.info({}, '⏪ Cleanup of match scraping columns reverted');
};
