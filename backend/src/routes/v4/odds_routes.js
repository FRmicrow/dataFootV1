import express from 'express';
import { validateRequest } from '../../middleware/validateRequest.js';
import { getMatchOddsSchema } from '../../schemas/v4Schemas.js';
import OddsV4Service from '../../services/v4/OddsV4Service.js';
import logger from '../../utils/logger.js';

const router = express.Router();

/**
 * GET /api/v4/matches/:matchId/odds
 * Returns all odds for a given v4 match.
 */
router.get(
    '/matches/:matchId/odds',
    validateRequest(getMatchOddsSchema),
    async (req, res) => {
        try {
            const { matchId } = req.params;
            const data = await OddsV4Service.getOddsByMatchId(matchId);
            res.json({ success: true, data });
        } catch (error) {
            logger.error({ err: error }, 'V4 getMatchOdds error');
            res.status(500).json({ success: false, error: 'Internal Server Error' });
        }
    }
);

export default router;
