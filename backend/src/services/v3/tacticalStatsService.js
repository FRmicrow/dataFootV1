import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { Mappers, ImportRepository as DB } from './ImportService.js';
import ImportStatusService from './importStatusService.js';
import * as ImportControl from './importControlService.js';
import {
    IMPORT_STATUS,
    CONSECUTIVE_FAILURE_THRESHOLD,
    CROSS_PILLAR_REDUCED_THRESHOLD
} from './importStatusConstants.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// --- Private Helpers for Tactical Sync ---

/**
 * Resolves thresholds for FS and PS based on status and options.
 */
const resolvePillarThresholds = async (leagueId, seasonYear, skipFS, skipPS) => {
    let fsThreshold = CONSECUTIVE_FAILURE_THRESHOLD;
    let psThreshold = CONSECUTIVE_FAILURE_THRESHOLD;

    if (!skipPS && skipFS) {
        const fsStatus = await ImportStatusService.getStatus(leagueId, seasonYear, 'fs');
        if (fsStatus.status === IMPORT_STATUS.NO_DATA) {
            psThreshold = CROSS_PILLAR_REDUCED_THRESHOLD;
        }
    }
    return { fsThreshold, psThreshold };
};

/**
 * Builds the SQL query to find fixtures missing tactical data.
 */
const buildFixtureQuery = (skipFS, skipPS) => {
    let whereClause = "";
    let selectClause = "f.fixture_id, f.api_id, ";

    if (!skipFS && !skipPS) {
        selectClause += "CASE WHEN fs.fixture_id IS NULL THEN 1 ELSE 0 END as needs_fs, CASE WHEN fps.fixture_id IS NULL THEN 1 ELSE 0 END as needs_ps";
        whereClause = "AND (fs.fixture_id IS NULL OR fps.fixture_id IS NULL)";
    } else if (!skipFS) {
        selectClause += "1 as needs_fs, 0 as needs_ps";
        whereClause = "AND fs.fixture_id IS NULL";
    } else {
        selectClause += "0 as needs_fs, 1 as needs_ps";
        whereClause = "AND fps.fixture_id IS NULL";
    }

    return `
        SELECT ${selectClause}
        FROM V3_Fixtures f
        LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Stats) fs ON f.fixture_id = fs.fixture_id
        LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Player_Stats) fps ON f.fixture_id = fps.fixture_id
        WHERE f.league_id = ? AND f.season_year = ?
        AND f.status_short IN ('FT', 'AET', 'PEN')
        ${whereClause}
        LIMIT ?
    `;
};

/**
 * Process a single fixture for FS (Fixture Stats)
 */
const processFixtureFS = async (fixture, stats, leagueId, seasonYear, fsThreshold, psThreshold, skipPS) => {
    if (!fixture.needs_fs || stats.fsBlack) return psThreshold;

    const ok = await fetchAndStoreFixtureStats(fixture.fixture_id, fixture.api_id);
    if (ok) {
        stats.fsSuccess++;
        stats.fsConsec = 0;
        await ImportStatusService.resetFailures(leagueId, seasonYear, 'fs');
    } else {
        stats.fsFailed++;
        stats.fsConsec++;
        if (stats.fsConsec >= fsThreshold) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'fs', IMPORT_STATUS.NO_DATA, { failure_reason: 'Auto-blacklisted' });
            stats.fsBlack = true;
            if (!stats.psBlack && !skipPS) return CROSS_PILLAR_REDUCED_THRESHOLD;
        }
    }
    return psThreshold;
};

/**
 * Process a single fixture for PS (Player Stats)
 */
const processFixturePS = async (fixture, stats, leagueId, seasonYear, psThreshold) => {
    if (!fixture.needs_ps || stats.psBlack) return;

    const ok = await fetchAndStorePlayerStats(fixture.fixture_id, fixture.api_id);
    if (ok) {
        stats.psSuccess++;
        stats.psConsec = 0;
        await ImportStatusService.resetFailures(leagueId, seasonYear, 'ps');
    } else {
        stats.psFailed++;
        stats.psConsec++;
        if (stats.psConsec >= psThreshold) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'ps', IMPORT_STATUS.NO_DATA, { failure_reason: 'Auto-blacklisted' });
            stats.psBlack = true;
        }
    }
};

/**
 * US_265: Combined FS+PS Single-Pass Import
 */
export const syncLeagueTacticalStatsService = async (leagueId, seasonYear, limit = 2000, sendLog = null, options = { includeFS: true, includePS: true }) => {
    const { includeFS, includePS } = options;
    const skipFS = !includeFS || await ImportStatusService.shouldSkip(leagueId, seasonYear, 'fs');
    const skipPS = !includePS || await ImportStatusService.shouldSkip(leagueId, seasonYear, 'ps');

    if (skipFS && skipPS) return { fs: { skipped: true }, ps: { skipped: true } };

    const { fsThreshold, psThreshold: initialPsThreshold } = await resolvePillarThresholds(leagueId, seasonYear, skipFS, skipPS);
    let psThreshold = initialPsThreshold;

    const sql = buildFixtureQuery(skipFS, skipPS);
    const targetFixtures = await db.all(sql, cleanParams([leagueId, seasonYear, limit]));
    if (targetFixtures.length === 0) {
        if (!skipFS) await ImportStatusService.setStatus(leagueId, seasonYear, 'fs', IMPORT_STATUS.COMPLETE);
        if (!skipPS) await ImportStatusService.setStatus(leagueId, seasonYear, 'ps', IMPORT_STATUS.COMPLETE);
        return { fs: { success: 0, skipped: skipFS }, ps: { success: 0, skipped: skipPS } };
    }

    let stats = { fsSuccess: 0, fsFailed: 0, fsConsec: 0, fsBlack: false, psSuccess: 0, psFailed: 0, psConsec: 0, psBlack: false };

    for (let i = 0; i < targetFixtures.length; i++) {
        const fixture = targetFixtures[i];
        await ImportControl.checkAbortOrPause(sendLog);

        // Process FS
        psThreshold = await processFixtureFS(fixture, stats, leagueId, seasonYear, fsThreshold, psThreshold, skipPS);

        // Process PS
        await processFixturePS(fixture, stats, leagueId, seasonYear, psThreshold);

        if ((stats.fsBlack || skipFS) && (stats.psBlack || skipPS)) break;
        await delay(50);
    }

    // Wrap up
    if (!skipFS && !stats.fsBlack && stats.fsSuccess > 0) {
        await ImportStatusService.setStatus(leagueId, seasonYear, 'fs', IMPORT_STATUS.COMPLETE);
        await db.run("UPDATE V3_League_Seasons SET imported_fixture_stats = 1 WHERE league_id = ? AND season_year = ?", [leagueId, seasonYear]);
    }
    if (!skipPS && !stats.psBlack && stats.psSuccess > 0) {
        await ImportStatusService.setStatus(leagueId, season_year, 'ps', IMPORT_STATUS.COMPLETE);
        await db.run("UPDATE V3_League_Seasons SET imported_player_stats = 1 WHERE league_id = ? AND season_year = ?", [leagueId, seasonYear]);
        await computePlayerSeasonNormalization(leagueId, seasonYear);
    }

    return { fs: { success: stats.fsSuccess, blacklisted: stats.fsBlack }, ps: { success: stats.psSuccess, blacklisted: stats.psBlack } };
};

/**
 * US_265: Backward-compatible wrapper — FS only
 */
export const syncLeagueFixtureStatsService = async (leagueId, seasonYear, limit = 50, sendLog = null) => {
    const result = await syncLeagueTacticalStatsService(leagueId, seasonYear, limit, sendLog, {
        includeFS: true,
        includePS: false
    });
    return { total: result.fs.total, success: result.fs.success, failed: result.fs.failed };
};

/**
 * US_265: Backward-compatible wrapper — PS only
 */
export const syncLeaguePlayerStatsService = async (leagueId, seasonYear, limit = 50, sendLog = null) => {
    const result = await syncLeagueTacticalStatsService(leagueId, seasonYear, limit, sendLog, {
        includeFS: false,
        includePS: true
    });
    return { total: result.ps.total, success: result.ps.success, failed: result.ps.failed };
};

/**
 * Fetch and store team statistics (with half splits if available)
 * US_263: Now returns boolean indicating if data was found.
 * @returns {boolean} true if data was found and stored
 */
export async function fetchAndStoreFixtureStats(localFixtureId, apiFixtureId) {
    const res = await footballApi.getFixtureStatistics(apiFixtureId, { half: true });

    if (!res.response || res.response.length === 0) {
        console.warn(`      No FS data for fixture ${apiFixtureId}`);
        return false;
    }

    try {
        for (const teamContainer of res.response) {
            const teamApiId = teamContainer.team.id;
            const dbTeam = await db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", cleanParams([teamApiId]));
            const localTeamId = dbTeam?.team_id;

            if (!localTeamId) {
                console.warn(`      Team API ID ${teamApiId} not found locally.`);
                continue;
            }

            const stats = teamContainer.statistics;
            const ftStats = stats.filter(s => !s.type.includes('Half'));
            const h1Stats = stats.filter(s => s.type.includes('1st Half') || s.type.includes('First Half'));
            const h2Stats = stats.filter(s => s.type.includes('2nd Half') || s.type.includes('Second Half'));

            if (ftStats.length > 0) {
                await DB.upsertFixtureStats(Mappers.fixtureStats(localFixtureId, localTeamId, 'FT', ftStats));
            }
            if (h1Stats.length > 0) {
                await DB.upsertFixtureStats(Mappers.fixtureStats(localFixtureId, localTeamId, '1H', h1Stats));
            }
            if (h2Stats.length > 0) {
                await DB.upsertFixtureStats(Mappers.fixtureStats(localFixtureId, localTeamId, '2H', h2Stats));
            }
        }
        return true;
    } catch (err) {
        console.error(`      Error storing statistics for fixture ${localFixtureId}:`, err.message);
        throw err;
    }
}

/**
 * Fetch and store granular player statistics
 * US_263: Now returns boolean indicating if data was found.
 * @returns {boolean} true if data was found and stored
 */
export async function fetchAndStorePlayerStats(localFixtureId, apiFixtureId) {
    const res = await footballApi.getFixturePlayerStatistics(apiFixtureId);

    if (!res.response || res.response.length === 0) {
        console.warn(`      No PS data for fixture ${apiFixtureId}`);
        return false;
    }

    try {
        for (const teamContainer of res.response) {
            const teamApiId = teamContainer.team.id;
            const dbTeam = await db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", cleanParams([teamApiId]));
            const localTeamId = dbTeam?.team_id;

            if (!localTeamId) continue;

            for (const playerStats of teamContainer.players) {
                await DB.upsertFixturePlayerStats(Mappers.fixturePlayerStats(localFixtureId, localTeamId, playerStats));
            }
        }
        return true;
    } catch (err) {
        console.error(`      Error storing player stats for fixture ${localFixtureId}:`, err.message);
        throw err;
    }
}

/**
 * US_233: Analytical layer for seasonal normalization
 */
/**
 * Computes and inserts normalization data for a single player
 */
const computeSinglePlayerNormalization = async (p, leagueId, seasonYear) => {
    const sums = await db.get(`
        SELECT 
            COUNT(*) as appearances,
            SUM(minutes_played) as total_minutes,
            SUM(goals_total) as goals,
            SUM(goals_conceded) as conceded,
            SUM(goals_assists) as assists,
            SUM(shots_total) as shots,
            SUM(shots_on) as shots_on,
            SUM(passes_total) as passes,
            SUM(passes_key) as key_passes,
            SUM(tackles_total) as tackles,
            SUM(tackles_interceptions) as interceptions,
            SUM(duels_won) as duels_won,
            SUM(dribbles_success) as dribbles_success
        FROM V3_Fixture_Player_Stats
        WHERE player_id = ? AND team_id = ? 
        AND fixture_id IN (SELECT fixture_id FROM V3_Fixtures WHERE league_id = ? AND season_year = ?)
    `, cleanParams([p.player_id, p.team_id, leagueId, seasonYear]));

    if (!sums || !sums.total_minutes) return;

    const mins = sums.total_minutes || 1;
    const factor = 90 / mins;

    await db.run(`
        INSERT INTO V3_Player_Season_Stats (
            player_id, team_id, league_id, season_year,
            appearances, minutes_played, goals_total, goals_conceded, goals_assists,
            goals_per_90, assists_per_90, shots_per_90, shots_on_target_per_90,
            passes_per_90, key_passes_per_90, tackles_per_90, interceptions_per_90,
            duels_won_per_90, dribbles_success_per_90
        ) VALUES (?,?,?,?, ?,?,?,?,?, ?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(player_id, team_id, league_id, season_year) DO UPDATE SET
            appearances=excluded.appearances,
            minutes_played=excluded.minutes_played,
            goals_total=excluded.goals_total,
            goals_conceded=excluded.goals_conceded,
            goals_assists=excluded.goals_assists,
            goals_per_90=excluded.goals_per_90,
            assists_per_90=excluded.assists_per_90,
            shots_per_90=excluded.shots_per_90,
            shots_on_target_per_90=excluded.shots_on_target_per_90,
            passes_per_90=excluded.passes_per_90,
            key_passes_per_90=excluded.key_passes_per_90,
            tackles_per_90=excluded.tackles_per_90,
            interceptions_per_90=excluded.interceptions_per_90,
            duels_won_per_90=excluded.duels_won_per_90,
            dribbles_success_per_90=excluded.dribbles_success_per_90,
            updated_at=CURRENT_TIMESTAMP
    `, cleanParams([
        p.player_id, p.team_id, leagueId, seasonYear,
        sums.appearances, sums.total_minutes, sums.goals, sums.conceded, sums.assists,
        sums.goals * factor, sums.assists * factor, sums.shots * factor, sums.shots_on * factor,
        sums.passes * factor, sums.key_passes * factor, sums.tackles * factor, sums.interceptions * factor,
        sums.duels_won * factor, sums.dribbles_success * factor
    ]));
};

/**
 * US_233: Analytical layer for seasonal normalization
 */
export async function computePlayerSeasonNormalization(leagueId, seasonYear) {
    try {
        const players = await db.all(`
            SELECT DISTINCT player_id, team_id
            FROM V3_Fixture_Player_Stats
            WHERE fixture_id IN (SELECT fixture_id FROM V3_Fixtures WHERE league_id = ? AND season_year = ?)
        `, cleanParams([leagueId, seasonYear]));

        if (players.length === 0) return;

        for (const p of players) {
            await computeSinglePlayerNormalization(p, leagueId, seasonYear);
        }
    } catch (err) {
        console.error('Normalization Error:', err);
    }
}
