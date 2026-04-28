
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_05 — Enrich V4 Venues (Safe Version)
 * 
 * - Adds 'team_id' column to v4.venues.
 * - Populates 'team_id' using ONLY 'club' type teams from match history.
 * - Completes 'capacity' using strict matching from v3_venues and safe match attendance.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Starting safe enrichment of V4 Venues');

    // 1. Add team_id column
    await db.run(`
        ALTER TABLE v4.venues 
        ADD COLUMN IF NOT EXISTS team_id BIGINT REFERENCES v4.teams(team_id)
    `);
    logger.info({}, '✅ Added team_id column to v4.venues');

    // 2. Populate team_id based on CLUB match history (excluding nations)
    await db.run(`
        WITH venue_clubs AS (
            SELECT 
                m.venue_id, 
                m.home_team_id,
                COUNT(*) as matches_played,
                ROW_NUMBER() OVER (PARTITION BY m.venue_id ORDER BY COUNT(*) DESC) as rank
            FROM v4.matches m
            JOIN v4.teams t ON m.home_team_id = t.team_id
            WHERE m.venue_id IS NOT NULL 
              AND t.type = 'club'
            GROUP BY m.venue_id, m.home_team_id
        )
        UPDATE v4.venues v
        SET team_id = vc.home_team_id
        FROM venue_clubs vc
        WHERE v.venue_id = vc.venue_id 
          AND vc.rank = 1 
          AND v.team_id IS NULL
    `);
    logger.info({}, '✅ Populated team_id in v4.venues (clubs only)');

    // 3. Complete capacity from v3_venues (STRICT matching)
    const v3Merge = await db.run(`
        UPDATE v4.venues v
        SET capacity = v3.capacity
        FROM v3_venues v3
        WHERE v.capacity IS NULL 
          AND v3.capacity IS NOT NULL
          AND v.name = v3.name
    `);
    logger.info({ changes: v3Merge.changes }, '✅ Completed missing capacities from v3_venues (strict match)');

    // 4. Fallback: Use max attendance if it is reasonable (< 120,000)
    const attendanceFallback = await db.run(`
        WITH safe_max_attendance AS (
            SELECT venue_id, MAX(attendance) as peak_attendance
            FROM v4.matches
            WHERE venue_id IS NOT NULL 
              AND attendance > 0 
              AND attendance < 120000
            GROUP BY venue_id
        )
        UPDATE v4.venues v
        SET capacity = sma.peak_attendance
        FROM safe_max_attendance sma
        WHERE v.venue_id = sma.venue_id
          AND v.capacity IS NULL
    `);
    logger.info({ changes: attendanceFallback.changes }, '✅ Filled remaining capacities using safe peak attendance (< 120k)');

    logger.info({}, '🏁 Safe Enrich V4 Venues migration complete');
};

export const down = async (db) => {
    await db.run(`ALTER TABLE v4.venues DROP COLUMN IF EXISTS team_id`);
    logger.info({}, '⏪ Safe Enrich V4 Venues migration reverted');
};
