import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import { getCompetitionSeasonXgSchema, getLeagueSeasonTeamXgSchema } from '../../schemas/v4Schemas.js';
import XgV4Service from '../../services/v4/XgV4Service.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/v4/competitions/:competitionId/season/:season/xg
 * Returns xG stats for all clubs in a competition/season.
 * season format: "2023/2024"
 */
router.get(
    '/competitions/:competitionId/season/:season/xg',
    validateRequest(getCompetitionSeasonXgSchema),
    async (req, res) => {
        try {
            const { competitionId, season } = req.params;
            const data = await XgV4Service.getXgByCompetitionSeason(competitionId, season);
            res.json({ success: true, data });
        } catch (error) {
            logger.error({ err: error }, 'V4 getCompetitionSeasonXg error');
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
);

/**
 * GET /api/v4/league/:league/season/:season/team-xg
 * Returns UnderStat team-season xG stats (xG, NPxG, xGA, ppda, xPTS…)
 * season format: "2022-2023"
 */
router.get(
    '/league/:league/season/:season/team-xg',
    validateRequest(getLeagueSeasonTeamXgSchema),
    async (req, res) => {
        try {
            const { league, season } = req.params;
            const data = await XgV4Service.getTeamSeasonXg(league, season);
            res.json({ success: true, data });
        } catch (error) {
            logger.error({ err: error }, 'V4 getTeamSeasonXg error');
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
);

export default router;
