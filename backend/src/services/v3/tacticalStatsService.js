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

/**
 * US_265: Combined FS+PS Single-Pass Import
 * Iterates fixtures once, fetching both FS and PS as needed.
 * Tracks consecutive failures independently per pillar.
 * Uses US_263 auto-blacklisting logic.
 */
export const syncLeagueTacticalStatsService = async (
    leagueId, seasonYear, limit = 2000, sendLog = null,
    options = { includeFS: true, includePS: true }
) => {
    const log = (msg, type = 'info') => {
        console.log(msg);
        if (sendLog && typeof sendLog === 'function') sendLog(msg, type);
    };

    const { includeFS, includePS } = options;

    // US_262/263: Pre-check — should we skip?
    const skipFS = !includeFS || await ImportStatusService.shouldSkip(leagueId, seasonYear, 'fs');
    const skipPS = !includePS || await ImportStatusService.shouldSkip(leagueId, seasonYear, 'ps');

    if (skipFS && skipPS) {
        const fsStatus = await ImportStatusService.getStatus(leagueId, seasonYear, 'fs');
        const psStatus = await ImportStatusService.getStatus(leagueId, seasonYear, 'ps');
        log(`   ⏩ [FS+PS] Both pillars skipped — FS: ${fsStatus.status}, PS: ${psStatus.status}`, 'success');
        return { fs: { total: 0, success: 0, failed: 0, skipped: true }, ps: { total: 0, success: 0, failed: 0, skipped: true } };
    }

    log(`📡 US_265: Combined Tactical Stats for League ${leagueId}/${seasonYear} [FS:${!skipFS}, PS:${!skipPS}]`);

    // US_264: Cross-pillar inference — reduce PS threshold if FS is NO_DATA
    let fsThreshold = CONSECUTIVE_FAILURE_THRESHOLD;
    let psThreshold = CONSECUTIVE_FAILURE_THRESHOLD;

    if (!skipPS && !skipFS) {
        // Will adjust dynamically during processing
    } else if (!skipPS && skipFS) {
        const fsStatus = await ImportStatusService.getStatus(leagueId, seasonYear, 'fs');
        if (fsStatus.status === IMPORT_STATUS.NO_DATA) {
            psThreshold = CROSS_PILLAR_REDUCED_THRESHOLD;
            log(`   ℹ️ Cross-pillar: FS is NO_DATA, PS threshold reduced to ${psThreshold}`, 'info');
        }
    }

    // Build the unified fixture target set
    let targetFixtures = [];

    if (!skipFS && !skipPS) {
        // Get fixtures missing EITHER FS or PS
        const sql = `
            SELECT f.fixture_id, f.api_id,
                   CASE WHEN fs.fixture_id IS NULL THEN 1 ELSE 0 END as needs_fs,
                   CASE WHEN fps.fixture_id IS NULL THEN 1 ELSE 0 END as needs_ps
            FROM V3_Fixtures f
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Stats) fs ON f.fixture_id = fs.fixture_id
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Player_Stats) fps ON f.fixture_id = fps.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND (fs.fixture_id IS NULL OR fps.fixture_id IS NULL)
            LIMIT ?
        `;
        targetFixtures = await db.all(sql, cleanParams([leagueId, seasonYear, limit]));
    } else if (!skipFS) {
        const sql = `
            SELECT f.fixture_id, f.api_id, 1 as needs_fs, 0 as needs_ps
            FROM V3_Fixtures f
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Stats) fs ON f.fixture_id = fs.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND fs.fixture_id IS NULL
            LIMIT ?
        `;
        targetFixtures = await db.all(sql, cleanParams([leagueId, seasonYear, limit]));
    } else if (!skipPS) {
        const sql = `
            SELECT f.fixture_id, f.api_id, 0 as needs_fs, 1 as needs_ps
            FROM V3_Fixtures f
            LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Player_Stats) fps ON f.fixture_id = fps.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
            AND f.status_short IN ('FT', 'AET', 'PEN')
            AND fps.fixture_id IS NULL
            LIMIT ?
        `;
        targetFixtures = await db.all(sql, cleanParams([leagueId, seasonYear, limit]));
    }

    if (targetFixtures.length === 0) {
        log('   ✅ No missing tactical stats found.', 'success');

        // Mark as COMPLETE if no missing data
        if (!skipFS) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'fs', IMPORT_STATUS.COMPLETE);
        }
        if (!skipPS) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'ps', IMPORT_STATUS.COMPLETE);
        }

        return {
            fs: { total: 0, success: 0, failed: 0, skipped: skipFS },
            ps: { total: 0, success: 0, failed: 0, skipped: skipPS }
        };
    }

    log(`   Found ${targetFixtures.length} fixtures in unified target set.`);

    let fsSuccess = 0, fsFailed = 0, fsConsecutiveFailures = 0, fsBlacklisted = false;
    let psSuccess = 0, psFailed = 0, psConsecutiveFailures = 0, psBlacklisted = false;

    for (let i = 0; i < targetFixtures.length; i++) {
        const fixture = targetFixtures[i];

        // US_270: Check if we should abort or pause
        await ImportControl.checkAbortOrPause(sendLog);

        // Fetch team names for better logging
        const fixtureInfo = await db.get(`
            SELECT h.name as home, a.name as away 
            FROM V3_Fixtures f
            JOIN V3_Teams h ON f.home_team_id = h.team_id
            JOIN V3_Teams a ON f.away_team_id = a.team_id
            WHERE f.fixture_id = ?
        `, cleanParams([fixture.fixture_id]));

        const matchup = fixtureInfo ? `${fixtureInfo.home} vs ${fixtureInfo.away}` : `Fixture ${fixture.fixture_id}`;

        // Emit progress
        if (sendLog && sendLog.emit && (i % 5 === 0 || targetFixtures.length < 10)) {
            sendLog.emit({
                type: 'progress',
                step: 'tactical_stats',
                current: i + 1,
                total: targetFixtures.length,
                label: `Syncing stats for: ${matchup}`
            });
        }

        if (i % 20 === 0) log(`   [${i + 1}/${targetFixtures.length}] Syncing stats for: ${matchup}...`);

        // FS processing
        if (fixture.needs_fs && !skipFS && !fsBlacklisted) {
            try {
                const hasData = await fetchAndStoreFixtureStats(fixture.fixture_id, fixture.api_id);
                if (hasData) {
                    fsConsecutiveFailures = 0;
                    await ImportStatusService.resetFailures(leagueId, seasonYear, 'fs');
                    fsSuccess++;
                } else {
                    fsConsecutiveFailures++;
                    if (fsConsecutiveFailures >= fsThreshold) {
                        // US_263: Auto-blacklist
                        const hasAnyData = fsSuccess > 0;
                        await ImportStatusService.setStatus(
                            leagueId, seasonYear, 'fs',
                            IMPORT_STATUS.NO_DATA,
                            { failure_reason: `${fsThreshold} consecutive fixtures returned no data (auto-blacklisted)` }
                        );
                        log(`   ⛔ Auto-Blacklisted: FS for League ${leagueId} / Season ${seasonYear}`, 'warning');
                        fsBlacklisted = true;

                        // Cross-pillar: if FS just got blacklisted, reduce PS threshold
                        if (!psBlacklisted && !skipPS) {
                            psThreshold = CROSS_PILLAR_REDUCED_THRESHOLD;
                            log(`   ℹ️ Cross-pillar: FS blacklisted mid-run, PS threshold reduced to ${psThreshold}`, 'info');
                        }
                    }
                    fsFailed++;
                }
            } catch (err) {
                console.error(`   ❌ FS Failed fixture ${fixture.fixture_id}: ${err.message}`);
                fsFailed++;
            }
        }

        // PS processing
        if (fixture.needs_ps && !skipPS && !psBlacklisted) {
            try {
                const hasData = await fetchAndStorePlayerStats(fixture.fixture_id, fixture.api_id);
                if (hasData) {
                    psConsecutiveFailures = 0;
                    await ImportStatusService.resetFailures(leagueId, seasonYear, 'ps');
                    psSuccess++;
                } else {
                    psConsecutiveFailures++;
                    if (psConsecutiveFailures >= psThreshold) {
                        await ImportStatusService.setStatus(
                            leagueId, seasonYear, 'ps',
                            IMPORT_STATUS.NO_DATA,
                            { failure_reason: `${psThreshold} consecutive fixtures returned no data (auto-blacklisted)` }
                        );
                        log(`   ⛔ Auto-Blacklisted: PS for League ${leagueId} / Season ${seasonYear}`, 'warning');
                        psBlacklisted = true;
                    }
                    psFailed++;
                }
            } catch (err) {
                console.error(`   ❌ PS Failed fixture ${fixture.fixture_id}: ${err.message}`);
                psFailed++;
            }
        }

        // If both are blacklisted, stop processing
        if ((fsBlacklisted || skipFS) && (psBlacklisted || skipPS)) {
            log(`   ⛔ Both FS and PS blacklisted/skipped. Stopping fixture iteration.`, 'warning');
            break;
        }

        // Rate limiting
        await delay(50);
    }

    // Post-loop: Update statuses for non-blacklisted pillars
    if (!skipFS && !fsBlacklisted) {
        if (fsSuccess > 0) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'fs', IMPORT_STATUS.COMPLETE);
            // Backward compat
            await db.run(
                "UPDATE V3_League_Seasons SET imported_fixture_stats = 1 WHERE league_id = ? AND season_year = ?",
                cleanParams([leagueId, seasonYear])
            );
        } else if (fsFailed > 0) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'fs', IMPORT_STATUS.PARTIAL);
        }
    }

    if (!skipPS && !psBlacklisted) {
        if (psSuccess > 0) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'ps', IMPORT_STATUS.COMPLETE);
            await db.run(
                "UPDATE V3_League_Seasons SET imported_player_stats = 1, last_sync_player_stats = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?",
                cleanParams([leagueId, seasonYear])
            );
            // Trigger normalization
            log('🔄 Triggering seasonal player normalization (Per-90 metrics)...');
            await computePlayerSeasonNormalization(leagueId, seasonYear);
            log('✅ Normalization complete.');
        } else if (psFailed > 0) {
            await ImportStatusService.setStatus(leagueId, seasonYear, 'ps', IMPORT_STATUS.PARTIAL);
        }
    }

    return {
        fs: { total: targetFixtures.length, success: fsSuccess, failed: fsFailed, skipped: skipFS, blacklisted: fsBlacklisted },
        ps: { total: targetFixtures.length, success: psSuccess, failed: psFailed, skipped: skipPS, blacklisted: psBlacklisted }
    };
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

    await db.run('BEGIN TRANSACTION');
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
        await db.run('COMMIT');
        return true;
    } catch (err) {
        try { await db.run('ROLLBACK'); } catch (e) { }
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

    await db.run('BEGIN TRANSACTION');
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
        await db.run('COMMIT');
        return true;
    } catch (err) {
        try { await db.run('ROLLBACK'); } catch (e) { }
        throw err;
    }
}

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

        await db.run('BEGIN TRANSACTION');
        for (const p of players) {
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

            if (!sums || !sums.total_minutes) continue;

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
        }
        await db.run('COMMIT');
    } catch (err) {
        try { await db.run('ROLLBACK'); } catch (e) { }
        console.error('Normalization Error:', err);
    }
}
