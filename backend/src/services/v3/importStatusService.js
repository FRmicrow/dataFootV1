/**
 * US_261: Import Status Service — CRUD & Query Layer
 * 
 * Centralized service for reading/writing import status.
 * All import services MUST use this instead of direct boolean flag manipulation.
 * Provides: getStatus, setStatus, incrementFailure, resetFailures,
 *           checkAutoLock, shouldSkip, getLeagueMatrix, getDataRange.
 */

import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import {
    IMPORT_STATUS,
    STATUS_LABELS,
    PILLARS,
    CONSECUTIVE_FAILURE_THRESHOLD
} from './importStatusConstants.js';

// ─────────────────────────────────────────────
// READ Operations
// ─────────────────────────────────────────────

/**
 * Get status for a specific pillar. Creates a NONE entry if missing.
 * @param {number} leagueId
 * @param {number} seasonYear
 * @param {string} pillar
 * @returns {Object} status row
 */
export async function getStatus(leagueId, seasonYear, pillar) {
    let row = await db.get(
        `SELECT * FROM V3_Import_Status 
         WHERE league_id = ? AND season_year = ? AND pillar = ?`,
        cleanParams([leagueId, seasonYear, pillar])
    );

    if (!row) {
        await db.run(
            `INSERT INTO V3_Import_Status (league_id, season_year, pillar, status) 
             VALUES (?, ?, ?, ?)`,
            cleanParams([leagueId, seasonYear, pillar, IMPORT_STATUS.NONE])
        );
        row = await db.get(
            `SELECT * FROM V3_Import_Status 
             WHERE league_id = ? AND season_year = ? AND pillar = ?`,
            cleanParams([leagueId, seasonYear, pillar])
        );
    }

    return row;
}

/**
 * Check if a pillar should be skipped (COMPLETE, LOCKED, or NO_DATA).
 * @returns {boolean}
 */
export async function shouldSkip(leagueId, seasonYear, pillar) {
    const row = await getStatus(leagueId, seasonYear, pillar);
    return [IMPORT_STATUS.COMPLETE, IMPORT_STATUS.LOCKED, IMPORT_STATUS.NO_DATA].includes(row.status);
}

/**
 * Get data range for a league/pillar (earliest and latest year with confirmed data).
 * @returns {{ start: number|null, end: number|null }}
 */
export async function getDataRange(leagueId, pillar) {
    const row = await db.get(
        `SELECT MIN(data_range_start) as start, MAX(data_range_end) as end
         FROM V3_Import_Status
         WHERE league_id = ? AND pillar = ? AND status IN (?, ?)`,
        cleanParams([leagueId, pillar, IMPORT_STATUS.COMPLETE, IMPORT_STATUS.LOCKED])
    );
    return { start: row?.start || null, end: row?.end || null };
}

/**
 * Get full matrix data for one or all leagues.
 * Returns enriched status objects per pillar.
 * @param {number|null} leagueId - null for all leagues
 */
export async function getLeagueMatrix(leagueId = null) {
    let sql = `SELECT * FROM V3_Import_Status`;
    const params = [];

    if (leagueId) {
        sql += ` WHERE league_id = ?`;
        params.push(...cleanParams([leagueId]));
    }
    sql += ` ORDER BY league_id, season_year DESC, pillar`;

    return await db.all(sql, params);
}

/**
 * Get all statuses for a specific league/season (all 6 pillars).
 * @returns {Object[]}
 */
export async function getSeasonStatuses(leagueId, seasonYear) {
    return await db.all(
        `SELECT * FROM V3_Import_Status 
         WHERE league_id = ? AND season_year = ?`,
        cleanParams([leagueId, seasonYear])
    );
}

// ─────────────────────────────────────────────
// WRITE Operations
// ─────────────────────────────────────────────

/**
 * Set status for a pillar with optional metadata.
 * Also updates old V3_League_Seasons boolean flags for backward compatibility.
 * @param {number} leagueId
 * @param {number} seasonYear
 * @param {string} pillar
 * @param {number} status - IMPORT_STATUS enum value
 * @param {Object} metadata - Optional: { failure_reason, total_items_expected, total_items_imported, data_range_start, data_range_end }
 */
export async function setStatus(leagueId, seasonYear, pillar, status, metadata = {}) {
    const existing = await db.get(
        `SELECT id FROM V3_Import_Status WHERE league_id = ? AND season_year = ? AND pillar = ?`,
        cleanParams([leagueId, seasonYear, pillar])
    );

    const now = new Date().toISOString();
    const isSuccess = (status === IMPORT_STATUS.COMPLETE || status === IMPORT_STATUS.LOCKED);

    if (existing) {
        await db.run(
            `UPDATE V3_Import_Status SET
                status = ?,
                last_checked_at = ?,
                last_success_at = CASE WHEN ? THEN ? ELSE last_success_at END,
                failure_reason = COALESCE(?, failure_reason),
                total_items_expected = COALESCE(?, total_items_expected),
                total_items_imported = COALESCE(?, total_items_imported),
                data_range_start = COALESCE(?, data_range_start),
                data_range_end = COALESCE(?, data_range_end),
                updated_at = ?
             WHERE id = ?`,
            cleanParams([
                status,
                now,
                isSuccess ? 1 : 0, now,
                metadata.failure_reason || null,
                metadata.total_items_expected ?? null,
                metadata.total_items_imported ?? null,
                metadata.data_range_start ?? null,
                metadata.data_range_end ?? null,
                now,
                existing.id
            ])
        );
    } else {
        await db.run(
            `INSERT INTO V3_Import_Status 
             (league_id, season_year, pillar, status, last_checked_at, last_success_at, failure_reason,
              total_items_expected, total_items_imported, data_range_start, data_range_end)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            cleanParams([
                leagueId, seasonYear, pillar, status, now,
                isSuccess ? now : null,
                metadata.failure_reason || null,
                metadata.total_items_expected ?? null,
                metadata.total_items_imported ?? null,
                metadata.data_range_start ?? null,
                metadata.data_range_end ?? null
            ])
        );
    }

    // Backward compatibility: sync old boolean flags
    syncLegacyFlags(leagueId, seasonYear, pillar, status);

    // Log for audit trail
    console.log(`📋 [ImportStatus] ${pillar.toUpperCase()} → ${STATUS_LABELS[status]} | League ${leagueId} / Season ${seasonYear}${metadata.failure_reason ? ` | Reason: ${metadata.failure_reason}` : ''}`);

    // Auto-lock check after terminal state changes
    if (status === IMPORT_STATUS.COMPLETE || status === IMPORT_STATUS.NO_DATA) {
        await checkAutoLock(leagueId, seasonYear);
    }
}

/**
 * Increment consecutive failure counter for a pillar.
 * If threshold reached (for FS/PS), auto-sets status to NO_DATA.
 * @returns {{ blacklisted: boolean, consecutiveFailures: number }}
 */
export async function incrementFailure(leagueId, seasonYear, pillar, threshold = CONSECUTIVE_FAILURE_THRESHOLD) {
    const row = await getStatus(leagueId, seasonYear, pillar);
    const newCount = (row.consecutive_failures || 0) + 1;

    await db.run(
        `UPDATE V3_Import_Status SET 
            consecutive_failures = ?,
            last_checked_at = ?,
            updated_at = ?
         WHERE league_id = ? AND season_year = ? AND pillar = ?`,
        cleanParams([newCount, new Date().toISOString(), new Date().toISOString(), leagueId, seasonYear, pillar])
    );

    if (newCount >= threshold) {
        setStatus(leagueId, seasonYear, pillar, IMPORT_STATUS.NO_DATA, {
            failure_reason: `${newCount} consecutive fixtures returned no data (auto-blacklisted)`
        });
        console.log(`⛔ Auto-Blacklisted: ${pillar.toUpperCase()} for League ${leagueId} / Season ${seasonYear} — ${newCount} consecutive empty responses`);
        return { blacklisted: true, consecutiveFailures: newCount };
    }

    return { blacklisted: false, consecutiveFailures: newCount };
}

/**
 * Reset consecutive failure counter to 0 on successful import.
 */
export async function resetFailures(leagueId, seasonYear, pillar) {
    await db.run(
        `UPDATE V3_Import_Status SET 
            consecutive_failures = 0,
            updated_at = ?
         WHERE league_id = ? AND season_year = ? AND pillar = ?`,
        cleanParams([new Date().toISOString(), leagueId, seasonYear, pillar])
    );
}

/**
 * Check if all 6 pillars are in terminal state (COMPLETE or NO_DATA).
 * If yes, set all COMPLETE pillars to LOCKED.
 */
export async function checkAutoLock(leagueId, seasonYear) {
    const statuses = await db.all(
        `SELECT pillar, status FROM V3_Import_Status 
         WHERE league_id = ? AND season_year = ?`,
        cleanParams([leagueId, seasonYear])
    );

    // Need all 6 pillars present
    if (statuses.length < PILLARS.length) return false;

    const allTerminal = statuses.every(s =>
        s.status === IMPORT_STATUS.COMPLETE ||
        s.status === IMPORT_STATUS.NO_DATA ||
        s.status === IMPORT_STATUS.LOCKED
    );

    if (!allTerminal) return false;

    // Lock all COMPLETE pillars
    const completePillars = statuses.filter(s => s.status === IMPORT_STATUS.COMPLETE);
    if (completePillars.length === 0) return false; // All NO_DATA, nothing to lock

    for (const s of completePillars) {
        await db.run(
            `UPDATE V3_Import_Status SET 
                status = ?, updated_at = ?
             WHERE league_id = ? AND season_year = ? AND pillar = ?`,
            cleanParams([IMPORT_STATUS.LOCKED, new Date().toISOString(), leagueId, seasonYear, s.pillar])
        );
        syncLegacyFlags(leagueId, seasonYear, s.pillar, IMPORT_STATUS.LOCKED);
    }

    console.log(`🔒 Auto-LOCKED: League ${leagueId} / Season ${seasonYear} — all pillars in terminal state`);
    return true;
}

/**
 * Reset a pillar status to NONE (for manual override - US_270).
 * If the season was LOCKED, revert all LOCKED pillars to COMPLETE.
 * @param {string|null} reason - Override reason for audit trail
 * @param {boolean} resetAll - If true, reset ALL pillars for the season
 */
export async function resetStatus(leagueId, seasonYear, pillar, reason = null, resetAll = false) {
    const now = new Date().toISOString();

    if (resetAll) {
        // Reset all pillars for this season
        const allStatuses = await getSeasonStatuses(leagueId, seasonYear);

        // First check if any are LOCKED - if so, unlock them
        const hasLocked = allStatuses.some(s => s.status === IMPORT_STATUS.LOCKED);
        if (hasLocked) {
            // Revert all LOCKED to COMPLETE first
            await db.run(
                `UPDATE V3_Import_Status SET status = ?, updated_at = ?
                 WHERE league_id = ? AND season_year = ? AND status = ?`,
                cleanParams([IMPORT_STATUS.COMPLETE, now, leagueId, seasonYear, IMPORT_STATUS.LOCKED])
            );
        }

        // Then reset all to NONE
        for (const p of PILLARS) {
            await db.run(
                `UPDATE V3_Import_Status SET 
                    status = ?, consecutive_failures = 0, failure_reason = NULL, updated_at = ?
                 WHERE league_id = ? AND season_year = ? AND pillar = ?`,
                cleanParams([IMPORT_STATUS.NONE, now, leagueId, seasonYear, p])
            );
            syncLegacyFlags(leagueId, seasonYear, p, IMPORT_STATUS.NONE);
        }

        console.log(`⚠️ Manual override: ALL pillars for League ${leagueId} / Season ${seasonYear} reset to NONE. Reason: ${reason || 'not specified'}`);
        return;
    }

    // Check if season was LOCKED — un-locking one pillar must un-LOCK all
    const allStatuses = await getSeasonStatuses(leagueId, seasonYear);
    const hasLocked = allStatuses.some(s => s.status === IMPORT_STATUS.LOCKED);

    if (hasLocked) {
        await db.run(
            `UPDATE V3_Import_Status SET status = ?, updated_at = ?
             WHERE league_id = ? AND season_year = ? AND status = ?`,
            cleanParams([IMPORT_STATUS.COMPLETE, now, leagueId, seasonYear, IMPORT_STATUS.LOCKED])
        );
        // Sync legacy for all previously locked pillar
        allStatuses.filter(s => s.status === IMPORT_STATUS.LOCKED).forEach(s => {
            syncLegacyFlags(leagueId, seasonYear, s.pillar, IMPORT_STATUS.COMPLETE);
        });
    }

    // Reset the specific pillar to NONE
    await db.run(
        `UPDATE V3_Import_Status SET 
            status = ?, consecutive_failures = 0, failure_reason = NULL, updated_at = ?
         WHERE league_id = ? AND season_year = ? AND pillar = ?`,
        cleanParams([IMPORT_STATUS.NONE, now, leagueId, seasonYear, pillar])
    );
    syncLegacyFlags(leagueId, seasonYear, pillar, IMPORT_STATUS.NONE);

    console.log(`⚠️ Manual override: ${pillar.toUpperCase()} for League ${leagueId} / Season ${seasonYear} reset to NONE. Reason: ${reason || 'not specified'}`);
}

// ─────────────────────────────────────────────
// BACKWARD COMPATIBILITY
// ─────────────────────────────────────────────

/**
 * Sync old V3_League_Seasons boolean flags when status changes.
 * During transition period, both systems stay in sync.
 */
async function syncLegacyFlags(leagueId, seasonYear, pillar, status) {
    const isImported = (status === IMPORT_STATUS.COMPLETE || status === IMPORT_STATUS.LOCKED) ? 1 : 0;
    const now = new Date().toISOString();

    const columnMap = {
        core: {
            flags: ['imported_fixtures', 'imported_standings', 'imported_players'],
            sync: 'last_sync_core'
        },
        events: { flags: ['imported_events'], sync: 'last_sync_events' },
        lineups: { flags: ['imported_lineups'], sync: 'last_sync_lineups' },
        trophies: { flags: ['imported_trophies'], sync: 'last_sync_trophies' },
        fs: { flags: ['imported_fixture_stats'], sync: 'last_sync_fixture_stats' },
        ps: { flags: ['imported_player_stats'], sync: 'last_sync_player_stats' }
    };

    const mapping = columnMap[pillar];
    if (!mapping) return;

    const updates = mapping.flags.map(f => `${f} = ?`).join(', ');
    const params = mapping.flags.map(() => isImported);

    if (isImported) {
        await db.run(
            `UPDATE V3_League_Seasons SET ${updates}, ${mapping.sync} = ? WHERE league_id = ? AND season_year = ?`,
            cleanParams([...params, now, leagueId, seasonYear])
        );
    } else {
        await db.run(
            `UPDATE V3_League_Seasons SET ${updates} WHERE league_id = ? AND season_year = ?`,
            cleanParams([...params, leagueId, seasonYear])
        );
    }
}

// ─────────────────────────────────────────────
// BULK Operations (for range inference / audit)
// ─────────────────────────────────────────────

/**
 * Bulk set NO_DATA for multiple seasons (used by historical range inference).
 */
export async function bulkSetNoData(leagueId, pillar, seasonYears, reason) {
    const now = new Date().toISOString();
    for (const year of seasonYears) {
        await setStatus(leagueId, year, pillar, IMPORT_STATUS.NO_DATA, {
            failure_reason: reason
        });
    }
    console.log(`⛔ Bulk NO_DATA: ${pillar.toUpperCase()} for League ${leagueId} — ${seasonYears.length} seasons blacklisted`);
}

// Export the service as a unified object for convenience
const ImportStatusService = {
    getStatus,
    setStatus,
    shouldSkip,
    incrementFailure,
    resetFailures,
    checkAutoLock,
    getLeagueMatrix,
    getSeasonStatuses,
    getDataRange,
    resetStatus,
    bulkSetNoData
};

export default ImportStatusService;
