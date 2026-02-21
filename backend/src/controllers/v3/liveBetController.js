import {
    getDailyFixturesService,
    getUpcomingByLeaguesService,
    getMatchDetailsService,
    saveMatchOddsService,
    saveCompetitionOddsService
} from '../../services/v3/liveBetService.js';

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
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) return res.status(400).json({ error: "Invalid Fixture ID" });

        const result = await saveMatchOddsService(numericId);
        res.json(result);
    } catch (error) {
        console.error(`Error saving odds for ${id}:`, error);
        res.status(500).json({ error: "Failed to save odds", details: error.message });
    }
};

/**
 * POST /api/v3/live-bet/competition/:leagueId/save-odds
 * Manually saves odds for all matches in a competition (US_016).
 */
export const saveCompetitionOdds = async (req, res) => {
    const { leagueId } = req.params;
    if (!leagueId) return res.status(400).json({ error: "League ID is required" });

    try {
        const numericId = parseInt(leagueId, 10);
        if (isNaN(numericId)) return res.status(400).json({ error: "Invalid League ID" });

        const result = await saveCompetitionOddsService(numericId);
        res.json(result);
    } catch (error) {
        console.error(`Error saving odds for league ${leagueId}:`, error);
        res.status(500).json({ error: "Failed to save competition odds", details: error.message });
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
        console.error("Critical Error in getDailyFixtures:", error);
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
        console.error("Error in getUpcomingFixtures:", error);
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
        const numericId = parseInt(id, 10);
        if (isNaN(numericId)) return res.status(400).json({ error: "Invalid Fixture ID" });

        const matchDetails = await getMatchDetailsService(numericId);
        res.json(matchDetails);
    } catch (error) {
        console.error(`Error fetching match details for ${id}:`, error);
        if (error.message === "Fixture not found") {
            return res.status(404).json({ error: "Fixture not found" });
        }
        res.status(500).json({ error: "Failed to fetch match details", details: error.message });
    }
};
