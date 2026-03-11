import db from '../../config/database.js';
import { getDailyFixturesService, getUpcomingByLeaguesService, getMatchDetailsService, saveMatchOddsService } from '../../services/v3/liveBetService.js';
import logger from '../../utils/logger.js';

/**
 * PUT /api/v3/live-bet/leagues/:id/monitoring
 * Toggle live monitoring state for a league (US_130).
 */
export const toggleLeagueMonitoring = async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        db.run(
            "UPDATE V3_Leagues SET is_live_enabled = ? WHERE league_id = ?",
            [enabled ? 1 : 0, id]
        );

        res.json({
            success: true,
            league_id: id,
            is_live_enabled: enabled
        });
    } catch (error) {
        logger.error({ err: error }, "Error toggling monitoring");
        res.status(500).json({ error: "Failed to toggle monitoring" });
    }
};

/**
 * GET /api/v3/live-bet/leagues/monitoring
 * Returns all leagues with their monitoring status and current live match count.
 */
export const getMonitoringLeagues = async (req, res) => {
    try {
        const sql = `
            SELECT 
                l.league_id, l.api_id, l.name, l.logo_url, c.name as country, l.is_live_enabled,
                COUNT(f.fixture_id) as live_now
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN V3_Fixtures f ON l.league_id = f.league_id 
                AND f.status_short IN ('1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE')
            GROUP BY l.league_id
            ORDER BY c.name ASC, l.name ASC
        `;
        const leagues = db.all(sql);
        res.json(leagues);
    } catch (error) {
        logger.error({ err: error }, "Error fetching monitoring leagues");
        res.status(500).json({ error: "Failed to fetch monitoring leagues" });
    }
};

/**
 * Live Bet Controller (V3)
 * Handles "Today's Bets" dashboard and match details.
 */

// ... existing code ...

/**
 * POST /api/v3/live-bet/match/:id/save-odds
 * Manually saves odds for a specific match (US_016).
 */
export const saveMatchOdds = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Fixture ID is required" });

    try {
        const numericId = Number.parseInt(id, 10);
        if (Number.isNaN(numericId)) return res.status(400).json({ error: "Invalid Fixture ID" });

        const result = await saveMatchOddsService(numericId);
        res.json(result);
    } catch (error) {
        logger.error({ err: error }, `Error saving odds for ${id}`);
        res.status(500).json({ error: "Failed to save odds", details: error.message });
    }
};

/**
 * GET /api/v3/live-bet/fixtures
 * Returns today's fixtures sorted by importance, with odds (US_010, US_011).
 */
export const getDailyFixtures = async (req, res) => {
    try {
        const { date } = req.query;
        const fixtures = await getDailyFixturesService(date);
        res.json(fixtures);
    } catch (error) {
        logger.error({ err: error }, "Critical Error in getDailyFixtures");
        res.status(500).json({ error: "Failed to fetch daily fixtures", details: error.message });
    }
};

/**
 * GET /api/v3/live-bet/upcoming
 * Returns upcoming fixtures for selected league IDs (US_022).
 * Query: ?leagues=39,140,78
 */
export const getUpcomingFixtures = async (req, res) => {
    try {
        const leagueIds = req.query.leagues
            ? req.query.leagues.split(',').map(Number).filter(Boolean)
            : [];
        const result = await getUpcomingByLeaguesService(leagueIds);
        res.json(result);
    } catch (error) {
        logger.error({ err: error }, "Error in getUpcomingFixtures");
        res.status(500).json({ error: "Failed to fetch upcoming fixtures", details: error.message });
    }
};

/**
 * GET /api/v3/live-bet/match/:id
 * Returns detailed match info including predictions, lineups, H2H, and full odds (US_012).
 */
export const getMatchDetails = async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Fixture ID is required" });

    try {
        const numericId = Number.parseInt(id, 10);
        if (Number.isNaN(numericId)) return res.status(400).json({ error: "Invalid Fixture ID" });

        const matchDetails = await getMatchDetailsService(numericId);
        res.json(matchDetails);
    } catch (error) {
        logger.error({ err: error }, `Error fetching match details for ${id}`);
        if (error.message === "Fixture not found") {
            return res.status(404).json({ error: "Fixture not found" });
        }
        res.status(500).json({ error: "Failed to fetch match details", details: error.message });
    }
};
