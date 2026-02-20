import { getPreferencesService, updatePreferencesService } from '../../services/v3/preferencesService.js';

/**
 * GET /api/v3/preferences
 * Returns the global UI preferences (favorite leagues, teams)
 */
export const getPreferences = async (req, res) => {
    try {
        const prefs = await getPreferencesService();
        res.json(prefs);
    } catch (error) {
        console.error("Error fetching preferences:", error);
        res.status(500).json({ error: "Failed to fetch preferences", details: error.message });
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
        res.json(updatedPrefs);
    } catch (error) {
        console.error("Error updating preferences:", error);
        res.status(500).json({ error: "Failed to update preferences", details: error.message });
    }
};
