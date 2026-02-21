/**
 * mlController.js — Node controller for ML prediction endpoints (US_026)
 *
 * Routes served:
 *   GET  /api/v3/live-bet/match/:id/prediction   → prediction + edge + kelly
 *   GET  /api/v3/model/performance               → historical accuracy for a league
 *   GET  /api/v3/model/health                    → python service liveness
 */

import db from '../../config/database.js';
import {
    getPredictionForFixture,
    getModelPerformance,
    checkMlServiceHealth,
    scanMlOpportunities,
    triggerTraining,
    getTrainingStatus,
    getTrainingLogs,
    stopTraining,
    empowerLeague,
    getLeagueEmpowermentStatus
} from '../../services/v3/mlService.js';

/**
 * GET /api/v3/live-bet/match/:id/prediction
 *
 * 1. Fetch fixture + bookmaker odds from DB.
 * 2. Call Python service via mlService.
 * 3. Return full prediction response to React.
 */
export const getMatchPrediction = async (req, res) => {
    const fixtureId = parseInt(req.params.id, 10);
    if (isNaN(fixtureId)) {
        return res.status(400).json({ error: 'Invalid fixture ID' });
    }

    try {
        // Resolve API ID to Internal ID
        const internalFix = db.get("SELECT fixture_id, api_id FROM V3_Fixtures WHERE api_id = ?", [fixtureId]);
        if (!internalFix) {
            return res.status(404).json({ error: 'Fixture not found in local database' });
        }
        const realInternalId = internalFix.fixture_id;

        // Fetch the best available odds for this fixture (1X2 market) using INTERNAL ID
        const oddsRow = db.get(
            `SELECT
                value_home_over  AS odds_home,
                value_draw       AS odds_draw,
                value_away_under AS odds_away,
                o.bookmaker_id
             FROM V3_Odds o
             WHERE o.fixture_id = ?
               AND o.market_id  = 1
             ORDER BY o.id ASC
             LIMIT 1`,
            [realInternalId],
        );

        const bookmakerOdds = oddsRow ? {
            ...oddsRow,
            bookmaker_source: oddsRow.bookmaker_id === 52 ? 'Winamax' : (oddsRow.bookmaker_id === 11 ? 'Unibet' : 'Unknown')
        } : {};

        // Call the ML service using the INTERNAL ID (which the Python service uses for DB lookups)
        const result = await getPredictionForFixture(realInternalId, bookmakerOdds);
        res.json(result);
    } catch (err) {
        console.error(`[mlController] getMatchPrediction error for fixture ${fixtureId}:`, err.message);
        // Return null safely — React handles { prediction: null }
        res.json({ prediction: null, edge: null, fixture_id: fixtureId });
    }
};

/**
 * GET /api/v3/model/performance?league=39
 *
 * Returns historical model accuracy stats for a given league (US_028 AC 4).
 */
export const getLeagueModelPerformance = async (req, res) => {
    const leagueId = parseInt(req.query.league, 10);
    if (isNaN(leagueId)) {
        return res.status(400).json({ error: 'league query param required (integer)' });
    }

    try {
        const stats = await getModelPerformance(leagueId);
        res.json(stats);
    } catch (err) {
        console.error('[mlController] getLeagueModelPerformance error:', err.message);
        res.status(500).json({ error: 'Failed to fetch model performance' });
    }
};

/**
 * GET /api/v3/model/health
 *
 * Proxy health check to Python ML service.
 */
export const getMlServiceHealth = async (req, res) => {
    try {
        const health = await checkMlServiceHealth();
        const statusCode = health.ok ? 200 : 503;
        res.status(statusCode).json(health);
    } catch (err) {
        res.status(503).json({ ok: false, error: err.message });
    }
};

/**
 * POST /api/v3/ml/empower/:id
 */
export const empowerLeagueController = async (req, res) => {
    const leagueId = parseInt(req.params.id, 10);
    const { force_rebuild } = req.body;

    if (isNaN(leagueId)) {
        return res.status(400).json({ error: 'Invalid league ID' });
    }

    try {
        const result = await empowerLeague(leagueId, !!force_rebuild);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/v3/ml/inventory
 * 
 * Returns all leagues that have fixtures, along with their empowerment status (processed/total).
 */
export const getLeagueEmpowermentInventory = async (req, res) => {
    try {
        // Find all leagues that have at least one completed fixture
        const leagues = db.all(`
            SELECT DISTINCT l.league_id as id, l.name, l.logo, l.country
            FROM V3_Leagues l
            JOIN V3_Fixtures f ON f.league_id = l.league_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND f.goals_home IS NOT NULL
            ORDER BY l.name ASC
        `);

        // Get status for each
        const inventory = await Promise.all(leagues.map(async (l) => {
            const status = await getLeagueEmpowermentStatus(l.id);
            return {
                ...l,
                ...status
            };
        }));

        res.json(inventory);
    } catch (err) {
        console.error('[mlController] getLeagueEmpowermentInventory error:', err.message);
        res.status(500).json({ error: 'Failed to fetch league inventory' });
    }
};

/**
 * GET /api/v3/ml/predictions
 * 
 * Returns all internal model predictions, joined with fixture/team metadata.
 */
export const getMLPredictions = async (req, res) => {
    try {
        const rows = db.all(`
            SELECT 
                p.*,
                f.date AS match_date, f.api_id, f.status_short,
                th.name AS home_team, th.logo_url AS home_logo,
                ta.name AS away_team, ta.logo_url AS away_logo,
                l.name AS league_name, l.logo_url AS league_logo,
                c.flag_url AS country_flag
            FROM V3_ML_Predictions p
            JOIN V3_Fixtures f ON p.fixture_id = f.fixture_id
            JOIN V3_Teams th ON f.home_team_id = th.team_id
            JOIN V3_Teams ta ON f.away_team_id = ta.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Countries c ON l.country_id = c.country_id
            ORDER BY p.created_at DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        console.error('[mlController] getMLPredictions error:', err.message);
        res.status(500).json({ error: 'Failed to fetch ML predictions' });
    }
};

/**
 * POST /api/v3/ml/scan
 * 
 * Manually trigger scanning of upcoming matches to pre-populate ML predictions.
 */
export const triggerMLScan = async (req, res) => {
    try {
        const result = await scanMlOpportunities();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/v3/ml/train
 */
export const startTraining = async (req, res) => {
    try {
        const { target, limit } = req.body;
        const result = await triggerTraining(target, limit);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/v3/ml/train/status
 */
export const getStatus = async (req, res) => {
    try {
        const status = await getTrainingStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * GET /api/v3/ml/train/logs
 */
export const getLogs = async (req, res) => {
    try {
        const lines = parseInt(req.query.lines, 10) || 50;
        const logs = await getTrainingLogs(lines);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /api/v3/ml/train/stop
 */
export const stopTracking = async (req, res) => {
    try {
        const result = await stopTraining();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
