import { z } from 'zod';
import {
    syncLeagueFixtureStatsService,
    syncLeaguePlayerStatsService,
    computePlayerSeasonNormalization
} from '../../services/v3/tacticalStatsService.js';
import logger from '../../utils/logger.js';

const syncSchema = z.object({
    leagueId: z.union([z.string(), z.number()]).transform(v => Number.parseInt(v)),
    season: z.union([z.string(), z.number()]).transform(v => Number.parseInt(v)),
    limit: z.union([z.string(), z.number()]).optional().transform(v => v ? Number.parseInt(v) : 50)
});

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

    const validation = syncSchema.safeParse(req.body);
    if (!validation.success) {
        sendLog(`❌ Validation failed: ${validation.error.errors[0].message}`, 'error');
        res.end();
        return;
    }

    const { leagueId, season, limit } = validation.data;

    try {
        const result = await syncLeagueFixtureStatsService(leagueId, season, limit, sendLog);
        res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
        res.end();
    } catch (error) {
        logger.error({ err: error, leagueId, season }, 'Fixture Stats sync failed');
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

    const validation = syncSchema.safeParse(req.body);
    if (!validation.success) {
        sendLog(`❌ Validation failed: ${validation.error.errors[0].message}`, 'error');
        res.end();
        return;
    }

    const { leagueId, season, limit } = validation.data;

    try {
        const result = await syncLeaguePlayerStatsService(leagueId, season, limit, sendLog);
        res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
        res.end();
    } catch (error) {
        logger.error({ err: error, leagueId, season }, 'Player Stats sync failed');
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
        await computePlayerSeasonNormalization(Number.parseInt(leagueId), Number.parseInt(season));
        res.json({ success: true, data: { message: "Normalization completed." } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
