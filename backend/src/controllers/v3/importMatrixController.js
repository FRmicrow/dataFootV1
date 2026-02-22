import db from '../../config/database.js';
import { performDiscoveryScan } from '../../services/v3/auditService.js';
import { runDeepSyncLeague } from '../../services/v3/deepSyncService.js';

/**
 * GET /api/v3/import/matrix-status
 * Returns all competitions and their season statuses for the Unified Import Matrix.
 */
export const getImportMatrixStatus = (req, res) => {
    try {
        const sql = `
            SELECT 
                l.league_id,
                l.api_id,
                l.name as league_name,
                l.logo_url as league_logo,
                c.name as country_name,
                c.flag_url as country_flag,
                c.importance_rank,
                s.league_season_id,
                s.season_year,
                s.imported_standings,
                s.imported_fixtures,
                s.imported_players,
                s.imported_events,
                s.imported_lineups,
                s.imported_trophies,
                s.last_sync_core,
                s.last_sync_events,
                s.last_sync_lineups,
                s.last_sync_trophies
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN V3_League_Seasons s ON l.league_id = s.league_id
            ORDER BY c.importance_rank ASC, l.name ASC, s.season_year DESC
        `;

        const rows = db.all(sql);

        // Group by league
        const matrixMap = {};
        rows.forEach(row => {
            if (!matrixMap[row.league_id]) {
                matrixMap[row.league_id] = {
                    id: row.league_id,
                    api_id: row.api_id,
                    name: row.league_name,
                    logo: row.league_logo,
                    country: row.country_name,
                    flag: row.country_flag,
                    rank: row.importance_rank,
                    seasons: []
                };
            }
            if (row.season_year) {
                matrixMap[row.league_id].seasons.push({
                    id: row.league_season_id,
                    year: row.season_year,
                    status: {
                        core: (row.imported_standings && row.imported_fixtures) ? 1 : (row.imported_fixtures ? 0.5 : 0),
                        events: row.imported_events || 0,
                        lineups: row.imported_lineups || 0,
                        trophies: row.imported_trophies || 0
                    },
                    last_sync: {
                        core: row.last_sync_core,
                        events: row.last_sync_events,
                        lineups: row.last_sync_lineups,
                        trophies: row.last_sync_trophies
                    }
                });
            }
        });

        res.json(Object.values(matrixMap));
    } catch (error) {
        console.error('Error fetching import matrix status:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/v3/import/league/:id/deep-sync
 * Triggers a full missing data sync for an entire league.
 */
export const triggerDeepSync = async (req, res) => {
    const { id } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
        await runDeepSyncLeague(parseInt(id), sendLog);
        res.end();
    } catch (error) {
        sendLog(`❌ Deep Sync Failed: ${error.message}`, 'error');
        res.end();
    }
};

/**
 * POST /api/v3/import/leagues/batch-deep-sync
 * Triggers a full missing data sync for multiple selected leagues.
 */
export const triggerBatchDeepSync = async (req, res) => {
    const { leagueIds } = req.body;

    if (!leagueIds || !Array.isArray(leagueIds) || leagueIds.length === 0) {
        return res.status(400).json({ error: 'No league IDs provided.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
        sendLog(`🚀 Starting Batch Deep Sync for ${leagueIds.length} leagues...`, 'info');

        for (let i = 0; i < leagueIds.length; i++) {
            const leagueId = leagueIds[i];
            const league = db.get("SELECT name FROM V3_Leagues WHERE league_id = ?", [leagueId]);
            const leagueName = league ? league.name : `ID ${leagueId}`;

            sendLog(`📦 [${i + 1}/${leagueIds.length}] SYNCING: ${leagueName}`, 'info');

            // Emit batch progress
            sendLog.emit({
                type: 'progress',
                step: 'batch-leagues',
                current: i + 1,
                total: leagueIds.length,
                label: `League ${i + 1}/${leagueIds.length}: ${leagueName}`
            });

            try {
                await runDeepSyncLeague(leagueId, sendLog);
            } catch (err) {
                sendLog(`⚠️ League ${leagueName} failed: ${err.message}`, 'error');
            }
        }

        sendLog(`✅ Batch Deep Sync Complete!`, 'complete');
        res.end();
    } catch (error) {
        sendLog(`❌ Batch Deep Sync Critical Failure: ${error.message}`, 'error');
        res.end();
    }
};

/**
 * POST /api/v3/import/audit-scan
 * Triggers the Discovery Scan to backfill missing flags.
 */
export const triggerAuditScan = async (req, res) => {
    try {
        const result = await performDiscoveryScan();
        res.json(result);
    } catch (error) {
        console.error('Error triggered audit scan:', error);
        res.status(500).json({ error: error.message });
    }
};
