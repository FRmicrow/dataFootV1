import db from '../../config/database.js';
import { performDiscoveryScan } from '../../services/v3/auditService.js';
import { runDeepSyncLeague } from '../../services/v3/deepSyncService.js';
import * as ImportControl from '../../services/v3/importControlService.js';
import ImportStatusService from '../../services/v3/importStatusService.js';
import { IMPORT_STATUS, STATUS_LABELS, PILLARS } from '../../services/v3/importStatusConstants.js';

/**
 * US_266: Matrix API — Status-Aware Endpoint
 */
export const getImportMatrixStatus = (req, res) => {
    try {
        const leaguesSql = `
            SELECT 
                l.league_id, l.api_id, l.name as league_name, l.logo_url as league_logo,
                c.name as country_name, c.flag_url as country_flag, c.importance_rank,
                s.league_season_id, s.season_year,
                s.imported_standings, s.imported_fixtures, s.imported_players,
                s.imported_events, s.imported_lineups, s.imported_trophies,
                s.imported_fixture_stats, s.imported_player_stats,
                s.last_sync_core, s.last_sync_events, s.last_sync_lineups,
                s.last_sync_trophies, s.last_sync_fixture_stats, s.last_sync_player_stats
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN V3_League_Seasons s ON l.league_id = s.league_id
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC, s.season_year DESC
        `;

        const rows = db.all(leaguesSql);
        const allStatuses = db.all(`SELECT * FROM V3_Import_Status`);

        const statusIndex = {};
        for (const s of allStatuses) {
            const key = `${s.league_id}-${s.season_year}`;
            if (!statusIndex[key]) statusIndex[key] = {};
            statusIndex[key][s.pillar] = s;
        }

        const dataRanges = {};
        for (const s of allStatuses) {
            if (!dataRanges[s.league_id]) dataRanges[s.league_id] = {};
            if (!dataRanges[s.league_id][s.pillar]) dataRanges[s.league_id][s.pillar] = { start: null, end: null };
            if (s.status === IMPORT_STATUS.COMPLETE || s.status === IMPORT_STATUS.LOCKED) {
                const range = dataRanges[s.league_id][s.pillar];
                if (!range.start || s.season_year < range.start) range.start = s.season_year;
                if (!range.end || s.season_year > range.end) range.end = s.season_year;
            }
        }

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
                const key = `${row.league_id}-${row.season_year}`;
                const statusMap = statusIndex[key] || {};

                const buildPillarStatus = (pillar, legacyValue, legacySync) => {
                    const s = statusMap[pillar];
                    if (s) return {
                        code: s.status, label: STATUS_LABELS[s.status],
                        lastSync: s.last_success_at || s.last_checked_at || null,
                        consecutiveFailures: s.consecutive_failures || 0,
                        reason: s.failure_reason || null,
                        itemsExpected: s.total_items_expected, itemsImported: s.total_items_imported
                    };
                    return {
                        code: legacyValue === 1 ? IMPORT_STATUS.COMPLETE : (legacyValue === 0.5 ? IMPORT_STATUS.PARTIAL : IMPORT_STATUS.NONE),
                        label: legacyValue === 1 ? 'COMPLETE' : (legacyValue === 0.5 ? 'PARTIAL' : 'NONE'),
                        lastSync: legacySync || null, consecutiveFailures: 0, reason: null
                    };
                };

                const coreValue = (row.imported_standings && row.imported_fixtures) ? 1 : (row.imported_fixtures ? 0.5 : 0);
                const status = {
                    core: buildPillarStatus('core', coreValue, row.last_sync_core),
                    events: buildPillarStatus('events', row.imported_events || 0, row.last_sync_events),
                    lineups: buildPillarStatus('lineups', row.imported_lineups || 0, row.last_sync_lineups),
                    trophies: buildPillarStatus('trophies', row.imported_trophies || 0, row.last_sync_trophies),
                    fs: buildPillarStatus('fs', row.imported_fixture_stats || 0, row.last_sync_fixture_stats),
                    ps: buildPillarStatus('ps', row.imported_player_stats || 0, row.last_sync_player_stats)
                };

                matrixMap[row.league_id].seasons.push({
                    id: row.league_season_id, year: row.season_year,
                    status, seasonLocked: Object.values(status).every(s => s.code === IMPORT_STATUS.LOCKED)
                });
            }
        });

        res.json(Object.values(matrixMap));
    } catch (error) {
        res.status(500).json({ error: error.message });
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

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
    });

    // Prime the stream for picky browsers/proxies (2KB of padding)
    res.write(':[initial-ping]\n' + ': ' + ' '.repeat(2048) + '\n\n');
    if (res.flushHeaders) res.flushHeaders();

    const sendLog = (message, type = 'info') => {
        try { res.write(`data: ${JSON.stringify({ message, type })}\n\n`); } catch (e) { }
    };
    sendLog.emit = (data) => {
        try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (e) { }
    };

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
            const league = db.get("SELECT name FROM V3_Leagues WHERE league_id = ?", [leagueId]);
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
export const resetImportStatus = (req, res) => {
    try {
        const { leagueId, seasonYear, pillar, reason, resetAll } = req.body;
        ImportStatusService.resetStatus(leagueId, seasonYear, pillar, reason, !!resetAll);
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
    res.json(ImportControl.getImportState());
};

// Placeholder for removed endpoint
export const triggerDeepSync = (req, res) => res.status(410).json({ error: 'Deprecated' });
export const triggerAuditScan = async (req, res) => {
    const result = await performDiscoveryScan();
    res.json(result);
};
