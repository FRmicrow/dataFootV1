import { getPreferencesService, updatePreferencesService } from '../../services/v3/preferencesService.js';
import logger from '../../utils/logger.js';

/**
 * GET /api/v3/preferences
 * Returns the global UI preferences (favorite leagues, teams)
 */
export const getPreferences = async (req, res) => {
    try {
        const prefs = await getPreferencesService();
        res.json({ success: true, data: prefs });
    } catch (error) {
        logger.error({ err: error }, 'Error fetching preferences');
        res.status(500).json({ success: false, error: "Failed to fetch preferences", details: error.message });
    }
};

/**
 * PUT /api/v3/preferences
 * Updates the global UI preferences
 * Body: { favorite_leagues: [ids], favorite_teams: [ids] }
 */
export const updatePreferences = async (req, res) => {
    try {
        const { favorite_leagues, favorite_teams, tracked_leagues } = req.body;
        const updatedPrefs = await updatePreferencesService(favorite_leagues, favorite_teams, tracked_leagues);
        res.json({ success: true, data: updatedPrefs });
    } catch (error) {
        logger.error({ err: error }, 'Error updating preferences');
        res.status(500).json({ success: false, error: "Failed to update preferences", details: error.message });
    }
};
