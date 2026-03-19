import mlForesightService from '../../services/v3/mlForesightService.js';
import logger from '../../utils/logger.js';

export const getMLForesightLeagues = async (_req, res) => {
    try {
        const data = await mlForesightService.getCoveredLeaguesSummary();
        res.json({ success: true, data });
    } catch (error) {
        logger.error({ err: error }, 'Failed to load ML foresight leagues');
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getMLForesightLeague = async (req, res) => {
    try {
        const data = await mlForesightService.getLeagueForesight(
            req.params.leagueId,
            req.query.seasonYear,
        );

        res.json({ success: true, data });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) {
            logger.error({ err: error, leagueId: req.params.leagueId }, 'Failed to load ML foresight league detail');
        }
        res.status(status).json({ success: false, message: error.message });
    }
};

export default {
    getMLForesightLeagues,
    getMLForesightLeague,
};
