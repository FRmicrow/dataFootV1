import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import { performDiscoveryScan } from '../../services/v3/auditService.js';
import { runDeepSyncLeague } from '../../services/v3/deepSyncService.js';
import { runImportJob } from '../../services/v3/leagueImportService.js';
import * as ImportControl from '../../services/v3/importControlService.js';
import ImportStatusService from '../../services/v3/importStatusService.js';
import { IMPORT_STATUS } from '../../services/v3/importStatusConstants.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

import { buildStatusIndex, mapMatrixRow } from '../../utils/v3Helpers.js';

/**
 * Utility to setup SSE headers and return a logging function
 */
const setupSSEStream = (res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked'
    });

    // Padding for browsers/proxies
    res.write(':[initial-ping]\n' + ': ' + ' '.repeat(2048) + '\n\n');
    if (res.flush) res.flush();
    else if (res.flushHeaders) res.flushHeaders();

    const sendLog = (message, type = 'info') => {
        try {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
            if (res.flush) res.flush();
        } catch (e) {
            console.warn("SSE write failed:", e.message);
        }
    };
    sendLog.emit = (data) => {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            if (res.flush) res.flush();
        } catch (e) {
            console.warn("SSE emit failed:", e.message);
        }
    };
    return sendLog;
};

/**
 * Calculates data ranges for each league/pillar based on completed imports
 */
const calculateDataRanges = (statuses) => {
    const ranges = {};
    for (const s of statuses) {
        if (!ranges[s.league_id]) ranges[s.league_id] = {};
        if (!ranges[s.league_id][s.pillar]) ranges[s.league_id][s.pillar] = { start: null, end: null };
        if (s.status === IMPORT_STATUS.COMPLETE || s.status === IMPORT_STATUS.LOCKED) {
            const range = ranges[s.league_id][s.pillar];
            if (!range.start || s.season_year < range.start) range.start = s.season_year;
            if (!range.end || s.season_year > range.end) range.end = s.season_year;
        }
    }
    return ranges;
};

/**
 * US_266: Matrix API — Status-Aware Endpoint (Paginated & Filterable)
 */
export const getImportMatrixStatus = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let whereClause = '';
        const params = [];
        if (search) {
            whereClause = `WHERE (l.name ILIKE $1 OR c.name ILIKE $1)`;
            params.push(`%${search}%`);
        }

        // 1. Get total count for pagination
        const countSql = `
            SELECT COUNT(DISTINCT l.league_id) as total
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            ${whereClause}
        `;
        const countRes = await db.get(countSql, params);
        const total = parseInt(countRes.total);

        // 2. Get paginated league IDs
        const leaguesIdSql = `
            SELECT l.league_id
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            ${whereClause}
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC
            LIMIT ${limit} OFFSET ${offset}
        `;
        const leagueIdsRows = await db.all(leaguesIdSql, params);
        const leagueIds = leagueIdsRows.map(r => r.league_id);

        if (leagueIds.length === 0) {
            return res.json({ success: true, data: [], total, page, limit });
        }

        // 3. Get full data for these leagues and their seasons
        const leagueIdsStr = leagueIds.join(',');
        const fullLeaguesSql = `
            SELECT 
                l.league_id, l.api_id, l.name as league_name, l.logo_url as league_logo,
                c.name as country_name, c.flag_url as country_flag, c.importance_rank,
                s.league_season_id, s.season_year, s.is_current
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN V3_League_Seasons s ON l.league_id = s.league_id
            WHERE l.league_id IN (${leagueIdsStr})
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC, s.season_year DESC
        `;

        const rows = await db.all(fullLeaguesSql);

        // Optimize: only fetch statuses for these specific leagues
        const allStatuses = await db.all(`SELECT * FROM V3_Import_Status WHERE league_id IN (${leagueIdsStr})`);
        const statusIndex = buildStatusIndex(allStatuses);
        const dataRanges = calculateDataRanges(allStatuses);

        const matrixMap = {};
        rows.forEach(row => {
            if (!matrixMap[row.league_id]) {
                matrixMap[row.league_id] = {
                    id: row.league_id, api_id: row.api_id, name: row.league_name, logo: row.league_logo,
                    country: row.country_name, flag: row.country_flag, rank: row.importance_rank,
                    dataRange: dataRanges[row.league_id] || {}, seasons: []
                };
            }
            if (row.season_year) {
                const mappedSeasons = mapMatrixRow(row, statusIndex);
                matrixMap[row.league_id].seasons.push({
                    id: row.league_season_id,
                    year: row.season_year,
                    status: mappedSeasons.pillars,
                    seasonLocked: Object.values(mappedSeasons.pillars).every(p => p.status === IMPORT_STATUS.LOCKED)
                });
            }
        });

        // Maintain the original order from leagueIds
        const orderedData = leagueIds.map(id => matrixMap[id]).filter(Boolean);

        res.json({ success: true, leagues: orderedData, total, page, limit });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/v3/import/leagues/batch-deep-sync
 */
export const triggerBatchDeepSync = async (req, res) => {
    const { leagueIds } = req.body;
    if (!leagueIds || !Array.isArray(leagueIds) || leagueIds.length === 0) {
        return res.status(400).json({ error: 'No league IDs provided.' });
    }

    const sendLog = setupSSEStream(res);

    req.on('close', () => {
        if (!res.writableEnded) {
            console.log(`🔌 [SSE] Connection closed by client.`);
        }
    });

    try {
        ImportControl.resetImportState();
        console.log(`📡 [SSE] Initiating batch deep sync for ${leagueIds.length} leagues`);
        const batchStart = Date.now();
        sendLog(`🚀 Batch Deep Sync: ${leagueIds.length} league(s) queued`, 'info');

        for (let i = 0; i < leagueIds.length; i++) {
            const leagueId = leagueIds[i];
            const league = await db.get("SELECT name FROM V3_Leagues WHERE league_id = ?", cleanParams([leagueId]));
            const leagueName = league ? league.name : `ID ${leagueId}`;

            sendLog(``, 'info');
            sendLog(`═══════════════════════════════════════`, 'info');
            sendLog(`📦 [${i + 1}/${leagueIds.length}] ${leagueName}`, 'info');
            sendLog(`═══════════════════════════════════════`, 'info');

            sendLog.emit({
                type: 'progress', step: 'batch-leagues',
                current: i + 1, total: leagueIds.length,
                label: `League ${i + 1}/${leagueIds.length}: ${leagueName}`
            });

            try {
                await runDeepSyncLeague(leagueId, sendLog);
            } catch (err) {
                if (err.message === 'IMPORT_ABORTED') {
                    sendLog('🛑 Import was stopped by user.', 'warning');
                    break;
                }
                sendLog(`⚠️ ${leagueName}: ${err.message}`, 'error');
            }
        }

        const totalElapsed = ((Date.now() - batchStart) / 1000).toFixed(1);
        sendLog(``, 'info');
        sendLog(`✅ Batch Deep Sync finished in ${totalElapsed}s`, 'complete');
        res.end();
    } catch (error) {
        sendLog(`❌ Critical Failure: ${error.message}`, 'error');
        res.end();
    }
};

/**
 * RESET manual override
 */
export const resetImportStatus = async (req, res) => {
    try {
        const { leagueId, seasonYear, pillar, reason, resetAll } = req.body;
        await ImportStatusService.resetStatus(leagueId, seasonYear, pillar, reason, !!resetAll);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Control Endpoints
 */
export const stopImport = (req, res) => {
    ImportControl.requestAbort();
    res.json({ success: true, message: 'Import stop requested.' });
};

export const pauseImport = (req, res) => {
    ImportControl.requestPause();
    res.json({ success: true, message: 'Import paused.' });
};

export const resumeImport = (req, res) => {
    ImportControl.requestResume();
    res.json({ success: true, message: 'Import resumed.' });
};

export const getImportStateEndpoint = (req, res) => {
    res.json({ success: true, data: ImportControl.getImportState() });
};

export const triggerDeepSync = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'League ID is required.' });

    const sendLog = setupSSEStream(res);

    try {
        ImportControl.resetImportState();
        await runDeepSyncLeague(id, sendLog);
        res.end();
    } catch (error) {
        sendLog(`❌ Sync failed: ${error.message}`, 'error');
        res.end();
    }
};

export const triggerAuditScan = async (req, res) => {
    const result = await performDiscoveryScan();
    res.json(result);
};

export const getDiscoveryCountries = async (req, res) => {
    try {
        const response = await footballApi.getCountries();
        const countries = response.response || [];
        countries.sort((a, b) => a.name.localeCompare(b.name));
        res.json({ success: true, data: countries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDiscoveryLeagues = async (req, res) => {
    try {
        const { country } = req.query;
        if (!country) return res.status(400).json({ error: 'Country is required.' });

        const response = await footballApi.getLeagues({ country });
        const apiLeagues = response.response || [];

        const existingLeagues = await db.all("SELECT api_id FROM V3_Leagues");
        const existingApiIds = new Set(existingLeagues.map(l => l.api_id));

        const filtered = apiLeagues
            .filter(l => !existingApiIds.has(l.league.id))
            .sort((a, b) => {
                // Priority to "League" over "Cup"
                if (a.league.type !== b.league.type) {
                    return a.league.type === 'League' ? -1 : 1;
                }
                // Sort by ID ascending (heuristic: lower ID = higher division/importance)
                return a.league.id - b.league.id;
            });

        res.json({ success: true, data: filtered });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const triggerDiscoveryImport = async (req, res) => {
    const { leagueId, seasonYear } = req.body;
    if (!leagueId || !seasonYear) {
        return res.status(400).json({ error: 'leagueId and seasonYear are required.' });
    }

    const sendLog = setupSSEStream(res);

    try {
        ImportControl.resetImportState();
        sendLog(`🚀 Initializing Discovery Core Import for League ${leagueId}/${seasonYear}...`, 'info');

        const sanitizedSeason = Number.parseInt(seasonYear);
        if (!sanitizedSeason) throw new Error("Invalid seasonYear provided.");

        await runImportJob(leagueId, sanitizedSeason, sendLog, { forceApiId: true });

        const localLeague = await db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", [leagueId]);
        if (localLeague) {
            await ImportStatusService.setStatus(localLeague.league_id, seasonYear, 'core', IMPORT_STATUS.COMPLETE);
        }

        sendLog(`✅ Core Discovery Import Complete.`, 'complete');
        res.end();
    } catch (error) {
        sendLog(`❌ Discovery Import failed: ${error.message}`, 'error');
        res.end();
    }
};

export const triggerDiscoveryBatchImport = async (req, res) => {
    const { selection } = req.body;
    if (!selection || !Array.isArray(selection) || selection.length === 0) {
        return res.status(400).json({ error: 'Selection array is required.' });
    }

    const sendLog = setupSSEStream(res);

    try {
        ImportControl.resetImportState();
        sendLog(`🚀 Initializing Discovery Batch Import for ${selection.length} leagues...`, 'info');

        const startTime = Date.now();
        let successCount = 0;
        let failCount = 0;

        for (const item of selection) {
            await ImportControl.checkAbortOrPause(sendLog);
            const { leagueId, seasonYear } = item;

            try {
                sendLog(`\n[${successCount + failCount + 1}/${selection.length}] Processing League ID ${leagueId} (${seasonYear})...`, 'info');
                await runImportJob(leagueId, Number.parseInt(seasonYear), sendLog, { forceApiId: true });

                const localLeague = await db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([leagueId]));
                if (localLeague) {
                    await ImportStatusService.setStatus(localLeague.league_id, seasonYear, 'core', IMPORT_STATUS.COMPLETE);
                }
                successCount++;
            } catch (err) {
                failCount++;
                sendLog(`❌ Failed League ${leagueId}: ${err.message}`, 'error');
            }
        }

        const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        sendLog(`\n✅ Discovery Batch Complete: ${successCount} success, ${failCount} failed.`, 'complete');
        sendLog(`⏱️ Total time: ${totalElapsed}s`, 'info');
        res.end();
    } catch (error) {
        sendLog(`❌ Critical Batch Failure: ${error.message}`, 'error');
        res.end();
    }
};

export default {
    getImportMatrixStatus,
    triggerBatchDeepSync,
    resetImportStatus,
    stopImport,
    pauseImport,
    resumeImport,
    getImportStateEndpoint,
    triggerDeepSync,
    triggerAuditScan,
    getDiscoveryCountries,
    getDiscoveryLeagues,
    triggerDiscoveryImport,
    triggerDiscoveryBatchImport
};
