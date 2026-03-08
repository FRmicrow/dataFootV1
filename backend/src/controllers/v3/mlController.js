import mlService from '../../services/v3/mlService.js';
import dbModule from '../../config/database.js';
import axios from 'axios';
import OddsSyncService from '../../services/v3/OddsSyncService.js';
import OddsCrawlerService from '../../services/v3/OddsCrawlerService.js';

// --- Private Helpers for Evaluation & Simulation ---

const determineActualOutcome = (group) => {
    if (group.market_type === '1N2_FT') {
        if (group.goals_home > group.goals_away) return '1';
        if (group.goals_home < group.goals_away) return '2';
        return 'N';
    }
    if (group.market_type === '1N2_HT') {
        if (group.score_halftime_home > group.score_halftime_away) return '1';
        if (group.score_halftime_home < group.score_halftime_away) return '2';
        return 'N';
    }
    return null;
};

const calculateGroupStats = (matchGroups) => {
    const stats = { overall_hit_rate: 0, by_market: {}, totalMatches: 0, totalHits: 0, brierSum: 0 };
    const details = [];

    for (const key in matchGroups) {
        const group = matchGroups[key];
        if (!group.predictions.length) continue;

        const bestPred = group.predictions.sort((a, b) => b.ml_probability - a.ml_probability)[0];
        const actual = determineActualOutcome(group);
        if (actual === null) continue;

        const isHit = bestPred.selection === actual;
        stats.totalMatches++;
        if (isHit) stats.totalHits++;

        if (!stats.by_market[group.market_type]) stats.by_market[group.market_type] = { hits: 0, total: 0 };
        stats.by_market[group.market_type].total++;
        if (isHit) stats.by_market[group.market_type].hits++;

        stats.brierSum += Math.pow(bestPred.ml_probability - (isHit ? 1.0 : 0.0), 2);
        details.push({
            fixture_id: group.fixture_id,
            date: group.date,
            league_name: group.league_name,
            home_team: group.home_team,
            away_team: group.away_team,
            market: group.market_type,
            predicted: bestPred.selection,
            probability: bestPred.ml_probability,
            actual,
            is_hit: isHit
        });
    }
    return { stats, details };
};

// --- Controllers ---

export const triggerModelRetrain = async (req, res) => {
    try {
        const result = await mlService.triggerRetraining();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getModelStatus = async (req, res) => {
    try {
        const status = await mlService.getTrainingStatus();
        res.json({ success: true, data: { ...status, status: 'online' } });
    } catch (err) {
        res.status(500).json({ success: true, data: { status: 'offline', is_training: false } });
    }
};

export const getMLOrchestratorStatus = async (req, res) => {
    try {
        const rowCount = await dbModule.get('SELECT COUNT(*) as count FROM V3_Risk_Analysis');
        let pythonStatus = { status: 'offline', model_loaded: false, version: 'Unknown' };
        try {
            const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8008';
            const pyRes = await axios.get(`${mlServiceUrl}/health`, { timeout: 1500 });
            pythonStatus = pyRes.data;
        } catch (e) { }

        res.json({
            success: true,
            data: {
                status: pythonStatus.status,
                version: pythonStatus.version,
                model_loaded: pythonStatus.model_loaded,
                training: pythonStatus.training,
                total_risk_rows: rowCount.count || 0
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLRecentAnalyses = async (req, res) => {
    try {
        const recentRows = await dbModule.all(`
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability, r.fair_odd, r.analyzed_at, l.name as league_name, ht.name as home_team, at.name as away_team, f.round, f.date
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id JOIN V3_Leagues l ON f.league_id = l.league_id JOIN V3_Countries c ON l.country_id = c.country_id JOIN V3_Teams ht ON f.home_team_id = ht.team_id JOIN V3_Teams at ON f.away_team_id = at.team_id
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, r.analyzed_at DESC LIMIT 50
        `);
        res.json({ success: true, data: recentRows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLSimulationFilters = async (req, res) => {
    try {
        const rows = await dbModule.all(`
            SELECT DISTINCT l.league_id, l.name as league_name, f.season_year
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id JOIN V3_Leagues l ON f.league_id = l.league_id
            ORDER BY l.name, f.season_year DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLModelEvaluation = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        let queryParams = [], whereClause = `f.status_short IN ('FT', 'AET', 'PEN')`;
        if (leagueId) { whereClause += ` AND l.league_id = ?`; queryParams.push(leagueId); }
        if (seasonYear) { whereClause += ` AND f.season_year = ?`; queryParams.push(seasonYear); }

        const rows = await dbModule.all(`
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability, f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away, l.name as league_name, ht.name as home_team, ht.logo_url as home_logo, at.name as away_team, at.logo_url as away_logo, f.date
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id JOIN V3_Leagues l ON f.league_id = l.league_id JOIN V3_Teams ht ON f.home_team_id = ht.team_id JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE ${whereClause} ORDER BY f.date DESC
        `, queryParams);

        const matchGroups = {};
        for (const r of rows) {
            const k = `${r.fixture_id}_${r.market_type}`;
            if (!matchGroups[k]) matchGroups[k] = { ...r, predictions: [] };
            matchGroups[k].predictions.push(r);
        }

        const { stats: s, details: d } = calculateGroupStats(matchGroups);
        res.json({
            success: true,
            stats: { overall_hit_rate: s.totalMatches > 0 ? s.totalHits / s.totalMatches : 0, brier_score: s.totalMatches > 0 ? s.brierSum / s.totalMatches : null, by_market: s.by_market },
            details: d.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 500)
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLSimulationOverview = async (req, res) => {
    try {
        const rows = await dbModule.all(`
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability, f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away, l.league_id, l.name as league_name, l.importance_rank as league_importance, c.importance_rank as country_importance, f.season_year
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id JOIN V3_Leagues l ON f.league_id = l.league_id LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
        `);

        const matchGroups = {};
        for (const r of rows) {
            const k = `${r.fixture_id}_${r.market_type}`;
            if (!matchGroups[k]) matchGroups[k] = { ...r, predictions: [] };
            matchGroups[k].predictions.push(r);
        }

        const lsStats = {};
        for (const k in matchGroups) {
            const g = matchGroups[k];
            const best = g.predictions.sort((a, b) => b.ml_probability - a.ml_probability)[0];
            const act = determineActualOutcome(g);
            if (act === null) continue;

            const lsKey = `${g.league_id}_${g.season_year}`;
            if (!lsStats[lsKey]) lsStats[lsKey] = { ...g, total: 0, hits: 0, brier: 0, by_m: {} };
            const s = lsStats[lsKey];
            const hit = best.selection === act;
            s.total++; if (hit) s.hits++;
            if (!s.by_m[g.market_type]) s.by_m[g.market_type] = { h: 0, t: 0 };
            s.by_m[g.market_type].t++; if (hit) s.by_m[g.market_type].h++;
            s.brier += Math.pow(best.ml_probability - (hit ? 1 : 0), 2);
        }

        const data = Object.values(lsStats).map(s => ({
            league_id: s.league_id, league_name: s.league_name, league_importance_rank: s.league_importance, country_importance_rank: s.country_importance, season_year: s.season_year,
            global_hit_rate: s.total > 0 ? s.hits / s.total : 0, brier_score: s.total > 0 ? s.brier / s.total : null,
            market_1n2_ft: s.by_m['1N2_FT'] ? s.by_m['1N2_FT'].h / s.by_m['1N2_FT'].t : null,
            market_1n2_ht: s.by_m['1N2_HT'] ? s.by_m['1N2_HT'].h / s.by_m['1N2_HT'].t : null
        })).sort((a, b) => a.country_importance_rank - b.country_importance_rank || a.league_importance_rank - b.league_importance_rank || a.league_name.localeCompare(b.league_name) || b.season_year - a.season_year);

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLRecommendations = async (req, res) => {
    try {
        const recommendations = await dbModule.all(`
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability, r.fair_odd, r.bookmaker_odd, r.edge, f.date, f.round, l.name as league_name, l.logo_url as league_logo, ht.name as home_team, ht.logo_url as home_logo, at.name as away_team, at.logo_url as away_logo
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id JOIN V3_Leagues l ON f.league_id = l.league_id JOIN V3_Teams ht ON f.home_team_id = ht.team_id JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE f.status_short = 'NS' ORDER BY r.ml_probability DESC
        `);
        res.json({
            success: true,
            data: {
                top_confidence: recommendations.filter(r => r.ml_probability > 0.75),
                top_value: recommendations.filter(r => r.edge > 5),
                all: recommendations
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const syncUpcomingOdds = async (req, res) => {
    try {
        const result = await OddsSyncService.syncUpcomingOdds();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const syncAdvancedOdds = async (req, res) => {
    try {
        const result = await OddsCrawlerService.runUpcomingSync();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const runOddsCatchup = async (req, res) => {
    try {
        const result = await OddsCrawlerService.runHistoricalCatchup();
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const buildForgeModels = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.body;
        if (!leagueId) return res.status(400).json({ success: false, message: 'Missing leagueId' });
        const result = await mlService.buildForgeModels(leagueId, seasonYear);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getForgeBuildStatus = async (req, res) => {
    try {
        const status = await mlService.getForgeBuildStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ is_building: false, error: err.message });
    }
};

export const cancelForgeBuild = async (req, res) => {
    try {
        const result = await mlService.cancelForgeBuild();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getForgeModels = async (req, res) => {
    try {
        const result = await mlService.getForgeModels();
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, models: [] });
    }
};

export const retrainModel = async (req, res) => {
    try {
        const { modelId, simulationId } = req.body;
        if (!modelId || !simulationId) return res.status(400).json({ success: false, message: 'Missing IDs' });
        const result = await mlService.retrainFromSimulation(modelId, simulationId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getRetrainStatus = async (req, res) => {
    try {
        const status = await mlService.getRetrainStatus();
        res.json(status);
    } catch (err) {
        res.status(500).json({ is_retraining: false, error: err.message });
    }
};

export const getEligibleHorizons = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        if (!leagueId || !seasonYear) return res.status(400).json({ success: false, message: 'Missing params' });
        const result = await mlService.getEligibleHorizons(leagueId, seasonYear);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, eligible: ['FULL_HISTORICAL'] });
    }
};

export const getLeagueModels = async (req, res) => {
    try {
        const { leagueId } = req.params;
        if (!leagueId) return res.status(400).json({ success: false, message: 'Missing leagueId' });
        const result = await mlService.getLeagueModels(leagueId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, models: [], has_models: false });
    }
};

export const predictFixtureAll = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await mlService.predictFixtureAll(id);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export default {
    triggerModelRetrain,
    getModelStatus,
    getMLOrchestratorStatus,
    getMLRecentAnalyses,
    getMLSimulationFilters,
    getMLModelEvaluation,
    getMLSimulationOverview,
    getMLRecommendations,
    syncUpcomingOdds,
    buildForgeModels,
    getForgeBuildStatus,
    cancelForgeBuild,
    getForgeModels,
    retrainModel,
    getRetrainStatus,
    getEligibleHorizons,
    getLeagueModels,
    syncAdvancedOdds,
    runOddsCatchup,
    predictFixtureAll
};
