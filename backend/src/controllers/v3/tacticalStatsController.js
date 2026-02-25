import {
    syncLeagueFixtureStatsService,
    syncLeaguePlayerStatsService,
    computePlayerSeasonNormalization
} from '../../services/v3/tacticalStatsService.js';

/**
 * POST /api/v3/import/fixture-stats
 */
export const triggerFixtureStatsSync = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const { leagueId, season, limit = 50 } = req.body;

    try {
        const result = await syncLeagueFixtureStatsService(parseInt(leagueId), parseInt(season), limit, sendLog);
        res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
        res.end();
    } catch (error) {
        console.error("Fixture Stats sync failed:", error);
        sendLog(`❌ sync failed: ${error.message}`, 'error');
        res.end();
    }
};

/**
 * POST /api/v3/import/player-stats
 */
export const triggerPlayerStatsSync = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };
    sendLog.emit = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    const { leagueId, season, limit = 50 } = req.body;

    try {
        const result = await syncLeaguePlayerStatsService(parseInt(leagueId), parseInt(season), limit, sendLog);
        res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
        res.end();
    } catch (error) {
        console.error("Player Stats sync failed:", error);
        sendLog(`❌ sync failed: ${error.message}`, 'error');
        res.end();
    }
};

/**
 * POST /api/v3/import/normalize
 */
export const triggerNormalization = async (req, res) => {
    const { leagueId, season } = req.body;
    try {
        await computePlayerSeasonNormalization(parseInt(leagueId), parseInt(season));
        res.json({ success: true, message: "Normalization completed." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
