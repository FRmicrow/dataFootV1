import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import { performDiscoveryScan } from '../../services/v3/auditService.js';
import { runDeepSyncLeague } from '../../services/v3/deepSyncService.js';
import { runImportJob } from '../../services/v3/leagueImportService.js';
import * as ImportControl from '../../services/v3/importControlService.js';
import ImportStatusService from '../../services/v3/importStatusService.js';
import { IMPORT_STATUS, STATUS_LABELS, PILLARS } from '../../services/v3/importStatusConstants.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

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
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked'
    });

    // Prime the stream for picky browsers/proxies (2KB of padding)
    res.write(':[initial-ping]\n' + ': ' + ' '.repeat(2048) + '\n\n');
    if (res.flush) res.flush();
    else if (res.flushHeaders) res.flushHeaders();

    const sendLog = (message, type = 'info') => {
        try {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
    };
    sendLog.emit = (data) => {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
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
            const league = db.get("SELECT name FROM V3_Leagues WHERE league_id = ?", cleanParams([leagueId]));
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

/**
 * US-202: Trigger Deep Sync for a single league
 */
export const triggerDeepSync = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'League ID is required.' });

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked'
    });

    res.write(':[initial-ping]\n' + ': ' + ' '.repeat(2048) + '\n\n');
    if (res.flush) res.flush();
    else if (res.flushHeaders) res.flushHeaders();

    const sendLog = (message, type = 'info') => {
        try {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
    };
    sendLog.emit = (data) => {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
    };

    try {
        ImportControl.resetImportState();
        await runDeepSyncLeague(id, sendLog);
        res.end();
    } catch (error) {
        sendLog(`❌ Sync failed: ${error.message}`, 'error');
        res.end();
    }
};

// Placeholder for removed endpoint
export const triggerAuditScan = async (req, res) => {
    const result = await performDiscoveryScan();
    res.json(result);
};

/**
 * US-206: Discover countries from API
 */
export const getDiscoveryCountries = async (req, res) => {
    try {
        const response = await footballApi.getCountries();
        res.json(response.response || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * US-206: Discover leagues from API by country, filtering existing ones
 */
export const getDiscoveryLeagues = async (req, res) => {
    try {
        const { country } = req.query;
        if (!country) return res.status(400).json({ error: 'Country is required.' });

        const response = await footballApi.getLeagues({ country });
        const apiLeagues = response.response || [];

        // Filter out leagues that already exist in our DB
        const existingApiIds = db.all("SELECT api_id FROM V3_Leagues").map(l => l.api_id);
        const filtered = apiLeagues.filter(l => !existingApiIds.includes(l.league.id));

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * US-206: Trigger Core Import for a newly discovered league
 */
export const triggerDiscoveryImport = async (req, res) => {
    const { leagueId, seasonYear } = req.body;
    if (!leagueId || !seasonYear) {
        return res.status(400).json({ error: 'leagueId and seasonYear are required.' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked'
    });

    res.write(':[initial-ping]\n' + ': ' + ' '.repeat(2048) + '\n\n');
    if (res.flush) res.flush();
    else if (res.flushHeaders) res.flushHeaders();

    const sendLog = (message, type = 'info') => {
        try {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
    };
    sendLog.emit = (data) => {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
    };

    try {
        ImportControl.resetImportState();
        sendLog(`🚀 Initializing Discovery Core Import for League ${leagueId}/${seasonYear}...`, 'info');

        // This only fetches Core data by default (Teams, Season, Standings, Fixtures)
        const sanitizedSeason = parseInt(seasonYear);
        if (!sanitizedSeason) throw new Error("Invalid seasonYear provided.");

        await runImportJob(leagueId, sanitizedSeason, sendLog, { forceApiId: true });

        // Mark as complete for core
        const localLeague = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", [leagueId]);
        if (localLeague) {
            ImportStatusService.setStatus(localLeague.league_id, seasonYear, 'core', IMPORT_STATUS.COMPLETE);
        }

        sendLog(`✅ Core Discovery Import Complete.`, 'complete');
        res.end();
    } catch (error) {
        sendLog(`❌ Discovery Import failed: ${error.message}`, 'error');
        res.end();
    }
};

/**
 * US-207: Batch Import for newly discovered leagues
 */
export const triggerDiscoveryBatchImport = async (req, res) => {
    const { selection } = req.body; // Expects [{ leagueId, seasonYear }]
    if (!selection || !Array.isArray(selection) || selection.length === 0) {
        return res.status(400).json({ error: 'Selection array is required.' });
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Transfer-Encoding': 'chunked'
    });

    res.write(':[initial-ping]\n' + ': ' + ' '.repeat(2048) + '\n\n');
    if (res.flush) res.flush();
    else if (res.flushHeaders) res.flushHeaders();

    const sendLog = (message, type = 'info') => {
        try {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
    };
    sendLog.emit = (data) => {
        try {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
            if (res.flush) res.flush();
        } catch (e) { }
    };

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
                await runImportJob(leagueId, parseInt(seasonYear), sendLog, { forceApiId: true });

                const localLeague = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([leagueId]));
                if (localLeague) {
                    ImportStatusService.setStatus(localLeague.league_id, seasonYear, 'core', IMPORT_STATUS.COMPLETE);
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
