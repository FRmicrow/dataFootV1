
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import { runImportJob } from './leagueImportService.js';
import { syncLeagueEventsService } from './fixtureService.js';
import { syncLeagueTacticalStatsService } from './tacticalStatsService.js';
import footballApi from '../footballApi.js';
import ImportStatusService from './importStatusService.js';
import * as ImportControl from './importControlService.js';
import {
    IMPORT_STATUS,
    STATUS_LABELS,
    PILLARS,
    HISTORICAL_NO_DATA_STREAK_LIMIT
} from './importStatusConstants.js';

/**
 * US_269: Status-Aware Deep Sync Orchestration
 * - Skips LOCKED seasons entirely
 * - Per-pillar skip checks
 * - Combined FS+PS single-pass (US_265)
 * - Historical range inference (US_264)
 * - Trophies EXCLUDED from full import
 * - Improved logging with timing & details
 */
export const runDeepSyncLeague = async (leagueId, sendLog) => {
    const leagueStart = Date.now();
    const leagueInfo = db.get("SELECT name, api_id FROM V3_Leagues WHERE league_id = ?", cleanParams([leagueId]));
    const leagueName = leagueInfo ? leagueInfo.name : `ID ${leagueId}`;

    sendLog(`🚀 Deep Sync: ${leagueName} (ID: ${leagueId})`, 'info');

    const seasons = db.all(
        "SELECT * FROM V3_League_Seasons WHERE league_id = ? ORDER BY season_year DESC",
        cleanParams([leagueId])
    );

    if (seasons.length === 0) {
        sendLog(`⚠️ No seasons found for ${leagueName}.`, 'warning');
        throw new Error("No seasons initialized for this league.");
    }

    const allStatuses = ImportStatusService.getLeagueMatrix(leagueId);
    let actionableSeasons = seasons.filter(season => {
        const seasonStatuses = allStatuses.filter(s => s.season_year === season.season_year);
        return !(seasonStatuses.length >= PILLARS.length && seasonStatuses.every(s => s.status === IMPORT_STATUS.LOCKED));
    }).length;

    sendLog(`📅 ${leagueName}: ${seasons.length} seasons | Actionable: ${actionableSeasons}`, 'info');

    let completedTasks = 0;
    const totalTasks = actionableSeasons * 4; // Core, Events, Lineups, FS+PS (Combined)

    let fsNoDataStreak = 0;
    let psNoDataStreak = 0;
    let fsRangeInferenceActive = false;
    let psRangeInferenceActive = false;

    for (const season of seasons) {
        const { season_year } = season;
        await ImportControl.checkAbortOrPause(sendLog);

        const seasonStatuses = allStatuses.filter(s => s.season_year === season_year);
        const isLocked = seasonStatuses.length >= PILLARS.length && seasonStatuses.every(s => s.status === IMPORT_STATUS.LOCKED);

        if (isLocked) {
            sendLog(`⏩ Season ${season_year} is LOCKED — Skipping.`, 'warning');
            continue;
        }

        sendLog(`📅 Syncing Season: ${season_year}...`, 'info');

        const fc = db.get(
            "SELECT COUNT(*) as total, SUM(CASE WHEN status_short IN ('FT','AET','PEN') THEN 1 ELSE 0 END) as finished FROM V3_Fixtures WHERE league_id = ? AND season_year = ?",
            cleanParams([leagueId, season_year])
        );

        sendLog(``, 'info');
        sendLog(`━━━ Season ${season_year} ━━━ (${fc?.finished || 0} finished fixtures)`, 'info');
        const seasonStart = Date.now();

        // 1. Core
        try {
            await ImportControl.checkAbortOrPause(sendLog);
            if (ImportStatusService.shouldSkip(leagueId, season_year, 'core')) {
                const stat = ImportStatusService.getStatus(leagueId, season_year, 'core');
                sendLog(`   [C] Core — ${STATUS_LABELS[stat.status]} ⏩`, 'success');
            } else {
                const start = Date.now();
                await runImportJob(leagueId, season_year, sendLog);
                ImportStatusService.setStatus(leagueId, season_year, 'core', IMPORT_STATUS.COMPLETE);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                sendLog(`   [C] Core ✅ — Done in ${elapsed}s`, 'success');
            }
        } catch (err) {
            if (err.message === 'IMPORT_ABORTED') throw err;
            sendLog(`   [C] ❌ Core failed: ${err.message}`, 'error');
        }
        completedTasks++;

        // 2. Events
        try {
            await ImportControl.checkAbortOrPause(sendLog);
            if (ImportStatusService.shouldSkip(leagueId, season_year, 'events')) {
                const stat = ImportStatusService.getStatus(leagueId, season_year, 'events');
                sendLog(`   [E] Events — ${STATUS_LABELS[stat.status]} ⏩`, 'success');
            } else {
                const start = Date.now();
                const res = await syncLeagueEventsService(leagueId, season_year, 2000, sendLog);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                ImportStatusService.setStatus(leagueId, season_year, 'events', res.success > 0 || res.total === 0 ? IMPORT_STATUS.COMPLETE : IMPORT_STATUS.PARTIAL);
                sendLog(`   [E] Events ✅ — ${res.success} synced | ${elapsed}s`, 'success');
            }
        } catch (err) {
            if (err.message === 'IMPORT_ABORTED') throw err;
            sendLog(`   [E] ❌ Events failed: ${err.message}`, 'error');
        }
        completedTasks++;

        // 3. Lineups
        try {
            await ImportControl.checkAbortOrPause(sendLog);
            if (ImportStatusService.shouldSkip(leagueId, season_year, 'lineups')) {
                const stat = ImportStatusService.getStatus(leagueId, season_year, 'lineups');
                sendLog(`   [L] Lineups — ${STATUS_LABELS[stat.status]} ⏩`, 'success');
            } else {
                const start = Date.now();
                const res = await syncSeasonLineups(leagueId, season_year, sendLog);
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                ImportStatusService.setStatus(leagueId, season_year, 'lineups', res.success > 0 ? IMPORT_STATUS.COMPLETE : (res.failed > 0 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.NONE));
                sendLog(`   [L] Lineups ✅ — ${res.success} synced | ${elapsed}s`, 'success');
            }
        } catch (err) {
            if (err.message === 'IMPORT_ABORTED') throw err;
            sendLog(`   [L] ❌ Lineups failed: ${err.message}`, 'error');
        }
        completedTasks++;

        // 4. Tactical (FS+PS)
        try {
            await ImportControl.checkAbortOrPause(sendLog);
            if (fsRangeInferenceActive) ImportStatusService.setStatus(leagueId, season_year, 'fs', IMPORT_STATUS.NO_DATA, { failure_reason: 'Historical range inference' });
            if (psRangeInferenceActive) ImportStatusService.setStatus(leagueId, season_year, 'ps', IMPORT_STATUS.NO_DATA, { failure_reason: 'Historical range inference' });

            if (!fsRangeInferenceActive || !psRangeInferenceActive) {
                const start = Date.now();
                const res = await syncLeagueTacticalStatsService(leagueId, season_year, 2000, sendLog, { includeFS: !fsRangeInferenceActive, includePS: !psRangeInferenceActive });
                const elapsed = ((Date.now() - start) / 1000).toFixed(1);

                if (!fsRangeInferenceActive) {
                    const fsStatus = ImportStatusService.getStatus(leagueId, season_year, 'fs');
                    if (fsStatus.status === IMPORT_STATUS.NO_DATA) fsNoDataStreak++;
                    else fsNoDataStreak = 0;
                    if (fsNoDataStreak >= HISTORICAL_NO_DATA_STREAK_LIMIT) fsRangeInferenceActive = true;
                }
                if (!psRangeInferenceActive) {
                    const psStatus = ImportStatusService.getStatus(leagueId, season_year, 'ps');
                    if (psStatus.status === IMPORT_STATUS.NO_DATA) psNoDataStreak++;
                    else psNoDataStreak = 0;
                    if (psNoDataStreak >= HISTORICAL_NO_DATA_STREAK_LIMIT) psRangeInferenceActive = true;
                }
                sendLog(`   [Tactical] FS+PS ✅ — Done in ${elapsed}s`, 'success');
            } else {
                sendLog(`   [Tactical] Skip (Inference) ⏩`, 'warning');
            }
        } catch (err) {
            if (err.message === 'IMPORT_ABORTED') throw err;
            sendLog(`   [Tactical] ❌ Failed: ${err.message}`, 'error');
        }
        completedTasks++;

        ImportStatusService.checkAutoLock(leagueId, season_year);
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
    const targets = db.all(`
        SELECT f.api_id, f.fixture_id FROM V3_Fixtures f
        LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Lineups) fl ON f.fixture_id = fl.fixture_id
        WHERE f.league_id = ? AND f.season_year = ? AND f.status_short IN ('FT','AET','PEN') AND fl.fixture_id IS NULL
    `, cleanParams([leagueId, seasonYear]));

    if (targets.length === 0) return { success: 0, failed: 0 };

    let success = 0; let failed = 0;
    for (let i = 0; i < targets.length; i++) {
        await ImportControl.checkAbortOrPause(sendLog);
        try {
            const response = await footballApi.getFixtureLineups(targets[i].api_id);
            if (response.response?.length) {
                for (const l of response.response) {
                    db.run("INSERT INTO V3_Fixture_Lineups (fixture_id, team_id, formation) VALUES (?,?,?)",
                        cleanParams([targets[i].fixture_id, l.team.id, l.formation]));
                }
                success++;
            } else {
                failed++;
            }
        } catch (e) { failed++; }
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
