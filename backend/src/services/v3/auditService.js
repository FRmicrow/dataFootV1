import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import ImportStatusService from './importStatusService.js';
import { IMPORT_STATUS, STATUS_LABELS, PILLARS } from './importStatusConstants.js';

/**
 * US_268: Audit Service Upgrade — Smart Discovery Scan
 * Populates V3_Import_Status with accurate status codes by comparing
 * imported item counts against expected totals.
 * Preserves NO_DATA and LOCKED statuses (never overwritten).
 */
export const performDiscoveryScan = async () => {
    console.log('🔍 Starting Database Discovery Scan (US_268)...');
    const seasons = db.all("SELECT * FROM V3_League_Seasons");
    let updatedCount = 0;
    let autoLockedCount = 0;
    let alreadyLockedCount = 0;

    for (const season of seasons) {
        const { league_id, season_year, league_season_id } = season;

        // 1. Count total finished fixtures (expected baseline)
        const totalFixtures = db.get(
            `SELECT COUNT(*) as count FROM V3_Fixtures 
             WHERE league_id = ? AND season_year = ? AND status_short IN ('FT', 'AET', 'PEN')`,
            cleanParams([league_id, season_year])
        ).count;

        // ──────────────────────────
        // Pillar: Core
        // ──────────────────────────
        const currentCore = ImportStatusService.getStatus(league_id, season_year, 'core');
        if (currentCore.status !== IMPORT_STATUS.NO_DATA && currentCore.status !== IMPORT_STATUS.LOCKED) {
            const fixtureCount = db.get(
                "SELECT COUNT(*) as count FROM V3_Fixtures WHERE league_id = ? AND season_year = ?",
                cleanParams([league_id, season_year])
            ).count;

            const standingCount = db.get(
                "SELECT COUNT(*) as count FROM V3_Standings WHERE league_id = ? AND season_year = ?",
                cleanParams([league_id, season_year])
            ).count;

            const playerStatsCount = db.get(
                "SELECT COUNT(*) as count FROM V3_Player_Stats WHERE league_id = ? AND season_year = ?",
                cleanParams([league_id, season_year])
            ).count;

            const hasFixtures = fixtureCount > 0;
            const hasStandings = standingCount > 0;
            const hasPlayers = playerStatsCount > 0;

            if (!hasFixtures && !hasStandings && !hasPlayers) {
                // Ratio = 0, status remains NONE
            } else if (hasFixtures && hasStandings && hasPlayers) {
                ImportStatusService.setStatus(league_id, season_year, 'core', IMPORT_STATUS.COMPLETE, {
                    total_items_expected: 1,
                    total_items_imported: 1
                });
                updatedCount++;
            } else {
                ImportStatusService.setStatus(league_id, season_year, 'core', IMPORT_STATUS.PARTIAL, {
                    total_items_expected: 3,
                    total_items_imported: (hasFixtures ? 1 : 0) + (hasStandings ? 1 : 0) + (hasPlayers ? 1 : 0)
                });
                updatedCount++;
            }

            // Legacy sync
            let legacyUpdates = [];
            if (fixtureCount > 0 && !season.imported_fixtures) {
                legacyUpdates.push("imported_fixtures = 1, last_sync_core = CURRENT_TIMESTAMP");
            }
        } else {
            alreadyLockedCount++;
        }

        // ──────────────────────────
        // Pillar: Events
        // ──────────────────────────
        const currentEvents = ImportStatusService.getStatus(league_id, season_year, 'events');
        if (currentEvents.status !== IMPORT_STATUS.NO_DATA && currentEvents.status !== IMPORT_STATUS.LOCKED) {
            const evtFixtures = db.get(`
                SELECT COUNT(DISTINCT e.fixture_id) as count
                FROM V3_Fixture_Events e
                JOIN V3_Fixtures f ON e.fixture_id = f.fixture_id
                WHERE f.league_id = ? AND f.season_year = ?
            `, [league_id, season_year]).count;

            if (totalFixtures === 0 || evtFixtures === 0) {
                // No data yet
            } else {
                const ratio = evtFixtures / totalFixtures;
                if (ratio >= 0.95) {
                    ImportStatusService.setStatus(league_id, season_year, 'events', IMPORT_STATUS.COMPLETE, {
                        total_items_expected: totalFixtures,
                        total_items_imported: evtFixtures
                    });
                } else {
                    ImportStatusService.setStatus(league_id, season_year, 'events', IMPORT_STATUS.PARTIAL, {
                        total_items_expected: totalFixtures,
                        total_items_imported: evtFixtures
                    });
                }
                updatedCount++;
            }
        } else { alreadyLockedCount++; }

        // ──────────────────────────
        // Pillar: Lineups
        // ──────────────────────────
        const currentLineups = ImportStatusService.getStatus(league_id, season_year, 'lineups');
        if (currentLineups.status !== IMPORT_STATUS.NO_DATA && currentLineups.status !== IMPORT_STATUS.LOCKED) {
            const linFixtures = db.get(`
                SELECT COUNT(DISTINCT l.fixture_id) as count
                FROM V3_Fixture_Lineups l
                JOIN V3_Fixtures f ON l.fixture_id = f.fixture_id
                WHERE f.league_id = ? AND f.season_year = ?
            `, [league_id, season_year]).count;

            if (totalFixtures > 0 && linFixtures > 0) {
                const ratio = linFixtures / totalFixtures;
                if (ratio >= 0.95) {
                    ImportStatusService.setStatus(league_id, season_year, 'lineups', IMPORT_STATUS.COMPLETE, {
                        total_items_expected: totalFixtures,
                        total_items_imported: linFixtures
                    });
                } else {
                    ImportStatusService.setStatus(league_id, season_year, 'lineups', IMPORT_STATUS.PARTIAL, {
                        total_items_expected: totalFixtures,
                        total_items_imported: linFixtures
                    });
                }
                updatedCount++;
            }
        } else { alreadyLockedCount++; }

        // ──────────────────────────
        // Pillar: Trophies
        // ──────────────────────────
        const currentTrophies = ImportStatusService.getStatus(league_id, season_year, 'trophies');
        if (currentTrophies.status !== IMPORT_STATUS.NO_DATA && currentTrophies.status !== IMPORT_STATUS.LOCKED) {
            // Trophies: check if players in this season are trophy-synced
            const trophySync = db.get(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN p.is_trophy_synced = 1 THEN 1 ELSE 0 END) as synced
                FROM V3_Player_Stats ps
                JOIN V3_Players p ON ps.player_id = p.player_id
                WHERE ps.league_id = ? AND ps.season_year = ?
            `, cleanParams([league_id, season_year]));

            if (trophySync && trophySync.total > 0) {
                const ratio = trophySync.synced / trophySync.total;
                if (ratio >= 0.95) {
                    ImportStatusService.setStatus(league_id, season_year, 'trophies', IMPORT_STATUS.COMPLETE);
                } else if (trophySync.synced > 0) {
                    ImportStatusService.setStatus(league_id, season_year, 'trophies', IMPORT_STATUS.PARTIAL, {
                        total_items_expected: trophySync.total,
                        total_items_imported: trophySync.synced
                    });
                }
                updatedCount++;
            }
        } else { alreadyLockedCount++; }

        // ──────────────────────────
        // Pillar: FS
        // ──────────────────────────
        const currentFS = ImportStatusService.getStatus(league_id, season_year, 'fs');
        if (currentFS.status !== IMPORT_STATUS.NO_DATA && currentFS.status !== IMPORT_STATUS.LOCKED) {
            const fsFixtures = db.get(`
                SELECT COUNT(DISTINCT s.fixture_id) as count
                FROM V3_Fixture_Stats s
                JOIN V3_Fixtures f ON s.fixture_id = f.fixture_id
                WHERE f.league_id = ? AND f.season_year = ?
            `, [league_id, season_year]).count;

            if (totalFixtures > 0 && fsFixtures > 0) {
                const ratio = fsFixtures / totalFixtures;
                if (ratio >= 0.95) {
                    ImportStatusService.setStatus(league_id, season_year, 'fs', IMPORT_STATUS.COMPLETE, {
                        total_items_expected: totalFixtures,
                        total_items_imported: fsFixtures
                    });
                } else {
                    ImportStatusService.setStatus(league_id, season_year, 'fs', IMPORT_STATUS.PARTIAL, {
                        total_items_expected: totalFixtures,
                        total_items_imported: fsFixtures
                    });
                }
                updatedCount++;
            }
        } else { alreadyLockedCount++; }

        // ──────────────────────────
        // Pillar: PS
        // ──────────────────────────
        const currentPS = ImportStatusService.getStatus(league_id, season_year, 'ps');
        if (currentPS.status !== IMPORT_STATUS.NO_DATA && currentPS.status !== IMPORT_STATUS.LOCKED) {
            const psFixtures = db.get(`
                SELECT COUNT(DISTINCT s.fixture_id) as count
                FROM V3_Fixture_Player_Stats s
                JOIN V3_Fixtures f ON s.fixture_id = f.fixture_id
                WHERE f.league_id = ? AND f.season_year = ?
            `, [league_id, season_year]).count;

            if (totalFixtures > 0 && psFixtures > 0) {
                const ratio = psFixtures / totalFixtures;
                if (ratio >= 0.95) {
                    ImportStatusService.setStatus(league_id, season_year, 'ps', IMPORT_STATUS.COMPLETE, {
                        total_items_expected: totalFixtures,
                        total_items_imported: psFixtures
                    });
                } else {
                    ImportStatusService.setStatus(league_id, season_year, 'ps', IMPORT_STATUS.PARTIAL, {
                        total_items_expected: totalFixtures,
                        total_items_imported: psFixtures
                    });
                }
                updatedCount++;
            }
        } else { alreadyLockedCount++; }

        // Post-season: check auto-lock
        const locked = ImportStatusService.checkAutoLock(league_id, season_year);
        if (locked) autoLockedCount++;
    }

    const summary = `Scan complete: ${updatedCount} seasons updated, ${autoLockedCount} auto-locked, ${alreadyLockedCount} already locked/no-data`;
    console.log(`✅ Discovery Scan Complete. ${summary}`);
    return {
        scanned: seasons.length,
        updated: updatedCount,
        autoLocked: autoLockedCount,
        alreadyLocked: alreadyLockedCount,
        timestamp: new Date().toISOString()
    };
};
