import PlayerRepository from '../../repositories/v3/PlayerRepository.js';
import logger from '../../utils/logger.js';

/**
 * US_V3-PLAYER-001: Comprehensive Player Profile
 */
export const getPlayerProfileV3 = async (req, res) => {
    try {
        const { id } = req.params;
        const player = await PlayerRepository.getPlayerProfile(id);

        if (!player) {
            return res.status(404).json({ success: false, error: 'Player not found' });
        }

        const career = await PlayerRepository.getPlayerStats(id);
        const trophies = await PlayerRepository.getPlayerTrophies(id);
        const careerTotals = await PlayerRepository.getCareerTotals(id);
        const currentContext = await PlayerRepository.getCurrentContext(id);

        res.json({
            success: true,
            data: {
                player,
                career,
                careerTotals,
                currentContext,
                trophies
            }
        });
    } catch (error) {
        logger.error({ err: error, playerId: req.params.id }, 'V3 Player Profile Error');
        res.status(500).json({ success: false, error: 'Failed to fetch player profile' });
    }
};
