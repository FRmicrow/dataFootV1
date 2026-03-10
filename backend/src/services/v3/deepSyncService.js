
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { runImportJob } from './leagueImportService.js';
import { syncLeagueEventsService } from './fixtureService.js';
import { syncLeagueTacticalStatsService } from './tacticalStatsService.js';
import footballApi from '../footballApi.js';
import * as ImportStatusService from './importStatusService.js';
import * as ImportControl from './importControlService.js';
import { Mappers, ImportRepository as DB } from './ImportService.js';
import {
    IMPORT_STATUS,
    STATUS_LABELS,
    PILLARS,
    HISTORICAL_NO_DATA_STREAK_LIMIT
} from './importStatusConstants.js';
import { syncAllV3Sequences } from '../../utils/v3/dbMaintenance.js';

// --- Private Sync Helpers ---

const calculateActionableCount = (seasons, allStatuses) => {
    return seasons.filter(season => {
        const seasonStatuses = allStatuses.filter(s => s.season_year === season.season_year);
        return !(seasonStatuses.length >= PILLARS.length && seasonStatuses.every(s => s.status === IMPORT_STATUS.LOCKED));
    }).length;
};

const syncSingleSeason = async (leagueId, season_year, sendLog, inference) => {
    sendLog(``, 'info');
    sendLog(`━━━ Season ${season_year} ━━━`, 'info');

    try {
        await syncCorePillar(leagueId, season_year, sendLog);
        await syncEventsPillar(leagueId, season_year, sendLog);
        await syncLineupsPillar(leagueId, season_year, sendLog);
        await syncTacticalPillar(leagueId, season_year, sendLog, inference);
    } catch (err) {
        if (err.message === 'IMPORT_ABORTED') throw err;
        sendLog(`   ❌ Failed: ${err.message}`, 'error');
    }
};

const syncTacticalPillar = async (leagueId, season_year, sendLog, inference) => {
    const { fsInfer, psInfer } = inference;

    if (fsInfer) await ImportStatusService.setStatus(leagueId, season_year, 'fs', IMPORT_STATUS.NO_DATA, { failure_reason: 'Historical range inference' });
    if (psInfer) await ImportStatusService.setStatus(leagueId, season_year, 'ps', IMPORT_STATUS.NO_DATA, { failure_reason: 'Historical range inference' });

    if (!fsInfer || !psInfer) {
        await runTacticalSync(leagueId, season_year, sendLog, inference);
    } else {
        sendLog(`   [Tactical] Skip — Cascade "No Data" ⏩`, 'warning');
    }
};

const runTacticalSync = async (leagueId, season_year, sendLog, inference) => {
    const { fsInfer, psInfer } = inference;
    const start = Date.now();
    await syncLeagueTacticalStatsService(leagueId, season_year, 2000, sendLog, { includeFS: !fsInfer, includePS: !psInfer });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!fsInfer) await updateInferenceStreak(leagueId, season_year, 'fs', inference);
    if (!psInfer) await updateInferenceStreak(leagueId, season_year, 'ps', inference);

    sendLog(`   [Tactical] FS+PS ✅ — Done in ${elapsed}s`, 'success');
};

const updateInferenceStreak = async (leagueId, season_year, pillar, inference) => {
    const stat = await ImportStatusService.getStatus(leagueId, season_year, pillar);
    const streakKey = `${pillar}Streak`;
    const inferKey = `${pillar}Infer`;

    inference[streakKey] = (stat.status === IMPORT_STATUS.NO_DATA) ? (inference[streakKey] || 0) + 1 : 0;
    if (inference[streakKey] >= HISTORICAL_NO_DATA_STREAK_LIMIT) {
        inference[inferKey] = true;
    }
};

const initializeSeasonsFromApi = async (leagueId, apiId, leagueName, sendLog) => {
    try {
        if (!apiId) return;
        sendLog(`📡 Fetching available seasons from API for League ${apiId}...`, 'info');
        const leagueRes = await footballApi.getLeagues({ id: apiId });
        if (leagueRes.response?.[0]?.seasons) {
            const apiSeasons = leagueRes.response[0].seasons;
            let initializedCount = 0;
            for (const s of apiSeasons) {
                const existing = await db.get("SELECT 1 FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([leagueId, s.year]));
                if (!existing) {
                    await DB.upsertLeagueSeason(Mappers.leagueSeason(leagueId, s.year));
                    initializedCount++;
                }
            }
            if (initializedCount > 0) {
                sendLog(`✨ Initialized ${initializedCount} new seasons for ${leagueName}.`, 'success');
            }
        }
    } catch (err) {
        // Initialization can fail silently if API unavailable
    }
};

const syncCorePillar = async (leagueId, season_year, sendLog) => {
    await ImportControl.checkAbortOrPause(sendLog);
    if (await ImportStatusService.shouldSkip(leagueId, season_year, 'core')) {
        const stat = await ImportStatusService.getStatus(leagueId, season_year, 'core');
        sendLog(`   [C] Core — ${STATUS_LABELS[stat.status]} ⏩`, 'success');
        return;
    }
    const start = Date.now();
    await runImportJob(leagueId, season_year, sendLog);
    await ImportStatusService.setStatus(leagueId, season_year, 'core', IMPORT_STATUS.COMPLETE);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    sendLog(`   [C] Core ✅ — Done in ${elapsed}s`, 'success');
};

const syncEventsPillar = async (leagueId, season_year, sendLog) => {
    await ImportControl.checkAbortOrPause(sendLog);
    if (await ImportStatusService.shouldSkip(leagueId, season_year, 'events')) {
        const stat = await ImportStatusService.getStatus(leagueId, season_year, 'events');
        sendLog(`   [E] Events — ${STATUS_LABELS[stat.status]} ⏩`, 'success');
        return;
    }
    const start = Date.now();
    const res = await syncLeagueEventsService(leagueId, season_year, 2000, sendLog);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    await ImportStatusService.setStatus(leagueId, season_year, 'events', res.success > 0 || res.total === 0 ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.PARTIAL);
    sendLog(`   [E] Events ✅ — ${res.success} synced | ${elapsed}s`, 'success');
};

const syncLineupsPillar = async (leagueId, season_year, sendLog) => {
    await ImportControl.checkAbortOrPause(sendLog);
    if (await ImportStatusService.shouldSkip(leagueId, season_year, 'lineups')) {
        const stat = await ImportStatusService.getStatus(leagueId, season_year, 'lineups');
        sendLog(`   [L] Lineups — ${STATUS_LABELS[stat.status]} ⏩`, 'success');
        return;
    }
    const start = Date.now();
    const res = await syncSeasonLineups(leagueId, season_year, sendLog);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const getStatus = (res) => {
        if (res.success > 0) return IMPORT_STATUS.COMPLETE;
        return res.failed > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.NONE;
    };
    await ImportStatusService.setStatus(leagueId, season_year, 'lineups', getStatus(res));
    sendLog(`   [L] Lineups ✅ — ${res.success} synced | ${elapsed}s`, 'success');
};

/**
 * US_269: Status-Aware Deep Sync Orchestration
 */
export const runDeepSyncLeague = async (leagueId, sendLog) => {
    const leagueStart = Date.now();
    const leagueInfo = await db.get("SELECT name, api_id FROM V3_Leagues WHERE league_id = ?", cleanParams([leagueId]));
    const leagueName = leagueInfo ? leagueInfo.name : `ID ${leagueId}`;

    sendLog(`🚀 Deep Sync: ${leagueName} (ID: ${leagueId})`, 'info');
    await syncAllV3Sequences((msg) => sendLog(msg, 'info'));
    await initializeSeasonsFromApi(leagueId, leagueInfo?.api_id, leagueName, sendLog);

    const seasons = await db.all(
        "SELECT * FROM V3_League_Seasons WHERE league_id = ? ORDER BY season_year DESC",
        cleanParams([leagueId])
    );

    if (seasons.length === 0) {
        sendLog(`⚠️ No seasons found for ${leagueName}.`, 'warning');
        throw new Error("No seasons initialized for this league.");
    }

    const allStatuses = await ImportStatusService.getLeagueMatrix(leagueId);
    const actionableSeasons = calculateActionableCount(seasons, allStatuses);

    sendLog(`📅 ${leagueName}: ${seasons.length} seasons | Actionable: ${actionableSeasons}`, 'info');

    let completedTasks = 0;
    const totalTasks = actionableSeasons * 4;
    const inference = { fsStreak: 0, psStreak: 0, fsInfer: false, psInfer: false };

    for (const season of seasons) {
        const { season_year } = season;
        await ImportControl.checkAbortOrPause(sendLog);

        const seasonStatuses = allStatuses.filter(s => s.season_year === season_year);
        const isLocked = seasonStatuses.length >= PILLARS.length && seasonStatuses.every(s => s.status === IMPORT_STATUS.LOCKED);

        if (isLocked) {
            sendLog(`⏩ Season ${season_year} is LOCKED — Skipping.`, 'warning');
            continue;
        }

        await syncSingleSeason(leagueId, season_year, sendLog, inference);

        completedTasks += 4;
        await ImportStatusService.checkAutoLock(leagueId, season_year);
        if (sendLog.emit) {
            sendLog.emit({ type: 'progress', step: 'overall', current: completedTasks, total: totalTasks, label: `${leagueName}: Season ${season_year} complete` });
        }
    }

    const totalElapsed = ((Date.now() - leagueStart) / 1000).toFixed(1);
    sendLog(``, 'info');
    sendLog(`🎉 ${leagueName} Complete in ${totalElapsed}s`, 'complete');
};

/**
 * Lineups Sync Helper
 */
export async function syncSeasonLineups(leagueId, seasonYear, sendLog) {
    const targets = await db.all(`
        SELECT f.api_id, f.fixture_id FROM V3_Fixtures f
        LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Lineups) fl ON f.fixture_id = fl.fixture_id
        WHERE f.league_id = ? AND f.season_year = ? AND f.status_short IN ('FT','AET','PEN') AND fl.fixture_id IS NULL
    `, cleanParams([leagueId, seasonYear]));

    if (targets.length === 0) return { success: 0, failed: 0 };

    let success = 0; let failed = 0;
    for (const t of targets) {
        await ImportControl.checkAbortOrPause(sendLog);
        try {
            const response = await footballApi.getFixtureLineups(t.api_id);
            if (response.response?.length) {
                for (const l of response.response) {
                    await db.run("INSERT INTO V3_Fixture_Lineups (fixture_id, team_id, formation) VALUES (?,?,?)",
                        cleanParams([t.fixture_id, l.team.id, l.formation]));
                }
                success++;
                await ImportStatusService.resetFailures(leagueId, seasonYear, 'lineups');
            } else {
                failed++;
                const res = await ImportStatusService.incrementFailure(leagueId, seasonYear, 'lineups', 'No data returned from API');
                if (res?.blacklisted) break;
            }
        } catch (e) {
            failed++;
            const res = await ImportStatusService.incrementFailure(leagueId, seasonYear, 'lineups', e.message);
            if (res?.blacklisted) break;
        }
        await new Promise(r => setTimeout(r, 100));
    }
    return { success, failed };
}

/**
 * Trophies Sync Helper (Manual trigger only)
 */
export async function syncSeasonTrophies(leagueId, seasonYear, sendLog) {
    sendLog(`🏆 Trophy sync for League ${leagueId}/${seasonYear} is currently handled per-player via Discovery.`, 'info');
    return { success: 0, failed: 0 };
}
