import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import ImportStatusService from './importStatusService.js';
import { IMPORT_STATUS, STATUS_LABELS, PILLARS } from './importStatusConstants.js';

// --- Private Pillar Audit Helpers ---

const auditCore = async (league_id, season_year) => {
    const current = await ImportStatusService.getStatus(league_id, season_year, 'core');
    if (current.status === IMPORT_STATUS.NO_DATA || current.status === IMPORT_STATUS.LOCKED) return false;

    const fixtureCount = (await db.get("SELECT COUNT(*) as count FROM V3_Fixtures WHERE league_id = ? AND season_year = ?", cleanParams([league_id, season_year]))).count;
    const standingCount = (await db.get("SELECT COUNT(*) as count FROM V3_Standings WHERE league_id = ? AND season_year = ?", cleanParams([league_id, season_year]))).count;
    const playerStatsCount = (await db.get("SELECT COUNT(*) as count FROM V3_Player_Stats WHERE league_id = ? AND season_year = ?", cleanParams([league_id, season_year]))).count;

    const hasFixtures = fixtureCount > 0;
    const hasStandings = standingCount > 0;
    const hasPlayers = playerStatsCount > 0;

    if (hasFixtures && hasStandings && hasPlayers) {
        await ImportStatusService.setStatus(league_id, season_year, 'core', IMPORT_STATUS.COMPLETE, { total_items_expected: 1, total_items_imported: 1 });
        return true;
    } else if (hasFixtures || hasStandings || hasPlayers) {
        await ImportStatusService.setStatus(league_id, season_year, 'core', IMPORT_STATUS.PARTIAL, {
            total_items_expected: 3,
            total_items_imported: (hasFixtures ? 1 : 0) + (hasStandings ? 1 : 0) + (hasPlayers ? 1 : 0)
        });
        return true;
    }
    return false;
};

const auditEvents = async (league_id, season_year, totalFixtures) => {
    const current = await ImportStatusService.getStatus(league_id, season_year, 'events');
    if (current.status === IMPORT_STATUS.NO_DATA || current.status === IMPORT_STATUS.LOCKED) return false;

    const evtFixtures = (await db.get(`
        SELECT COUNT(DISTINCT e.fixture_id) as count
        FROM V3_Fixture_Events e
        JOIN V3_Fixtures f ON e.fixture_id = f.fixture_id
        WHERE f.league_id = ? AND f.season_year = ?
    `, [league_id, season_year])).count;

    if (totalFixtures > 0 && evtFixtures > 0) {
        const ratio = evtFixtures / totalFixtures;
        await ImportStatusService.setStatus(league_id, season_year, 'events', ratio >= 0.95 ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.PARTIAL, {
            total_items_expected: totalFixtures,
            total_items_imported: evtFixtures
        });
        return true;
    }
    return false;
};

const auditLineups = async (league_id, season_year, totalFixtures) => {
    const current = await ImportStatusService.getStatus(league_id, season_year, 'lineups');
    if (current.status === IMPORT_STATUS.NO_DATA || current.status === IMPORT_STATUS.LOCKED) return false;

    const linFixtures = (await db.get(`
        SELECT COUNT(DISTINCT l.fixture_id) as count
        FROM V3_Fixture_Lineups l
        JOIN V3_Fixtures f ON l.fixture_id = f.fixture_id
        WHERE f.league_id = ? AND f.season_year = ?
    `, [league_id, season_year])).count;

    if (totalFixtures > 0 && linFixtures > 0) {
        const ratio = linFixtures / totalFixtures;
        await ImportStatusService.setStatus(league_id, season_year, 'lineups', ratio >= 0.95 ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.PARTIAL, {
            total_items_expected: totalFixtures,
            total_items_imported: linFixtures
        });
        return true;
    }
    return false;
};

const auditTrophies = async (league_id, season_year) => {
    const current = await ImportStatusService.getStatus(league_id, season_year, 'trophies');
    if (current.status === IMPORT_STATUS.NO_DATA || current.status === IMPORT_STATUS.LOCKED) return false;

    const trophySync = await db.get(`
        SELECT COUNT(*) as total, SUM(CASE WHEN p.is_trophy_synced = 1 THEN 1 ELSE 0 END) as synced
        FROM V3_Player_Stats ps
        JOIN V3_Players p ON ps.player_id = p.player_id
        WHERE ps.league_id = ? AND ps.season_year = ?
    `, cleanParams([league_id, season_year]));

    if (trophySync && trophySync.total > 0 && trophySync.synced > 0) {
        const ratio = trophySync.synced / trophySync.total;
        await ImportStatusService.setStatus(league_id, season_year, 'trophies', ratio >= 0.95 ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.PARTIAL, {
            total_items_expected: trophySync.total,
            total_items_imported: trophySync.synced
        });
        return true;
    }
    return false;
};

const auditTacticalPillar = async (pillar, league_id, season_year, totalFixtures) => {
    const current = await ImportStatusService.getStatus(league_id, season_year, pillar);
    if (current.status === IMPORT_STATUS.NO_DATA || current.status === IMPORT_STATUS.LOCKED) return false;

    const tableName = pillar === 'fs' ? 'V3_Fixture_Stats' : 'V3_Fixture_Player_Stats';
    const statsFixtures = (await db.get(`
        SELECT COUNT(DISTINCT s.fixture_id) as count
        FROM ${tableName} s
        JOIN V3_Fixtures f ON s.fixture_id = f.fixture_id
        WHERE f.league_id = ? AND f.season_year = ?
    `, [league_id, season_year])).count;

    if (totalFixtures > 0 && statsFixtures > 0) {
        const ratio = statsFixtures / totalFixtures;
        await ImportStatusService.setStatus(league_id, season_year, pillar, ratio >= 0.95 ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.PARTIAL, {
            total_items_expected: totalFixtures,
            total_items_imported: statsFixtures
        });
        return true;
    }
    return false;
};

/**
 * US_268: Audit Service Upgrade — Smart Discovery Scan
 * @returns {Promise<Object>} scan results
 */
export const performDiscoveryScan = async () => {
    console.log('🔍 Starting Database Discovery Scan (US_268)...');
    const seasons = await db.all("SELECT * FROM V3_League_Seasons");
    let updatedCount = 0;
    let autoLockedCount = 0;
    let alreadyLockedCount = 0;

    for (const season of seasons) {
        const { league_id, season_year } = season;

        const totalFixtures = (await db.get(
            `SELECT COUNT(*) as count FROM V3_Fixtures 
             WHERE league_id = ? AND season_year = ? AND status_short IN ('FT', 'AET', 'PEN')`,
            cleanParams([league_id, season_year])
        )).count;

        // Perform audits for each pillar
        const coreUpdated = await auditCore(league_id, season_year);
        const eventsUpdated = await auditEvents(league_id, season_year, totalFixtures);
        const lineupsUpdated = await auditLineups(league_id, season_year, totalFixtures);
        const trophiesUpdated = await auditTrophies(league_id, season_year);
        const fsUpdated = await auditTacticalPillar('fs', league_id, season_year, totalFixtures);
        const psUpdated = await auditTacticalPillar('ps', league_id, season_year, totalFixtures);

        if (coreUpdated || eventsUpdated || lineupsUpdated || trophiesUpdated || fsUpdated || psUpdated) {
            updatedCount++;
        }

        const locked = await ImportStatusService.checkAutoLock(league_id, season_year);
        if (locked) autoLockedCount++;
    }

    const result = {
        scanned: seasons.length,
        updated: updatedCount,
        autoLocked: autoLockedCount,
        timestamp: new Date().toISOString()
    };
    console.log(`✅ Discovery Scan Complete: ${updatedCount} seasons updated.`);
    return result;
};
