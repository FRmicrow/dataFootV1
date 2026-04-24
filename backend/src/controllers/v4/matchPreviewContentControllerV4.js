import MatchPreviewContentServiceV4 from '../../services/v4/MatchPreviewContentServiceV4.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/v4/content/match-preview/:matchId
 */
export const getMatchPreviewV4 = async (req, res) => {
    const { matchId } = req.params;
    try {
        const result = await MatchPreviewContentServiceV4.getMatchPreview(matchId);
        if (result.notFound) {
            return res.status(404).json({ success: false, error: 'Match not found in V4' });
        }
        return res.json({ success: true, data: result.data });
    } catch (error) {
        logger.error({ err: error, matchId }, 'getMatchPreviewV4 failed');
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

/**
 * GET /api/v4/content/match-preview/upcoming
 */
export const getUpcomingMatchesV4 = async (req, res) => {
    const { limit, fromDate, toDate, competitionId } = req.query;
    try {
        const data = await MatchPreviewContentServiceV4.getUpcomingMatches({
            limit: limit != null ? Number(limit) : undefined,
            fromDate,
            toDate,
            competitionId,
        });
        return res.json({ success: true, data });
    } catch (error) {
        logger.error({ err: error, query: req.query }, 'getUpcomingMatchesV4 failed');
        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
