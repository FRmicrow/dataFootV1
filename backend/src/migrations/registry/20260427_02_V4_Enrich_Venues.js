
import logger from '../../utils/logger.js';

/**
 * Migration 20260427_02 — Enrich V4 Venues
 * 
 * - Adds 'club_id' column to v4.venues to link a stadium to its main occupant.
 * - Populates 'club_id' by analyzing match history (team with most home matches).
 * - Completes 'capacity' by merging data from v3_venues and match attendance.
 */

export const up = async (db) => {
    logger.info({}, '🚀 Starting migration: Enrich V4 Venues');

    // 1. Add club_id column
    await db.run(`
        ALTER TABLE v4.venues 
        ADD COLUMN IF NOT EXISTS club_id BIGINT REFERENCES v4.teams(team_id)
    `);
    logger.info({}, '✅ Added club_id column to v4.venues');

    // 2. Populate club_id based on match history
    // We associate each venue with the team that played the most home matches there.
    await db.run(`
        WITH venue_occupants AS (
            SELECT 
                venue_id, 
                home_team_id,
                COUNT(*) as matches_played,
                ROW_NUMBER() OVER (PARTITION BY venue_id ORDER BY COUNT(*) DESC) as rank
            FROM v4.matches
            WHERE venue_id IS NOT NULL
            GROUP BY venue_id, home_team_id
        )
        UPDATE v4.venues v
        SET club_id = vo.home_team_id
        FROM venue_occupants vo
        WHERE v.venue_id = vo.venue_id 
          AND vo.rank = 1 
          AND v.club_id IS NULL
    `);
    logger.info({}, '✅ Populated club_id in v4.venues based on home match frequency');

    // 3. Complete capacity from v3_venues (cross-version enrichment)
    const v3Merge = await db.run(`
        UPDATE v4.venues v
        SET capacity = v3.capacity
        FROM v3_venues v3
        WHERE v.capacity IS NULL 
          AND v3.capacity IS NOT NULL
          AND (
            LOWER(v.name) = LOWER(v3.name)
            OR LOWER(v.name) = LOWER(REPLACE(v3.name, 'Stade ', ''))
            OR LOWER(v.name) = LOWER(REPLACE(v3.name, 'Stadium ', ''))
          )
    `);
    logger.info({ changes: v3Merge.changes }, '✅ Completed missing capacities from v3_venues');

    // 4. Fallback: Use maximum recorded attendance as a minimum capacity if still NULL
    const attendanceFallback = await db.run(`
        WITH max_attendance AS (
            SELECT venue_id, MAX(attendance) as peak_attendance
            FROM v4.matches
            WHERE venue_id IS NOT NULL AND attendance > 0
            GROUP BY venue_id
        )
        UPDATE v4.venues v
        SET capacity = ma.peak_attendance
        FROM max_attendance ma
        WHERE v.venue_id = ma.venue_id
          AND v.capacity IS NULL
          AND ma.peak_attendance > 0
    `);
    logger.info({ changes: attendanceFallback.changes }, '✅ Filled remaining capacities using peak match attendance');

    logger.info({}, '🏁 Enrich V4 Venues migration complete');
};

export const down = async (db) => {
    // We only remove the added column. Data for capacity is kept but column survives.
    // However, if we want a clean rollback:
    await db.run(`ALTER TABLE v4.venues DROP COLUMN IF EXISTS club_id`);
    logger.info({}, '⏪ Enrich V4 Venues migration reverted (club_id removed)');
};
