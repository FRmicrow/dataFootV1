import mlService from '../../services/v3/mlService.js';
import dbModule from '../../config/database.js';
import axios from 'axios';
import OddsSyncService from '../../services/v3/OddsSyncService.js';
import OddsCrawlerService from '../../services/v3/OddsCrawlerService.js';
import logger from '../../utils/logger.js';

// --- Private Helpers for Evaluation & Simulation ---

const determineActualOutcome = (group) => {
    if (group.market_type === '1X2' || group.market_type === '1N2_FT') {
        if (group.goals_home > group.goals_away) return '1';
        if (group.goals_home < group.goals_away) return '2';
        return 'N';
    }
    if (group.market_type === '1N2_HT') {
        if (group.score_halftime_home > group.score_halftime_away) return '1';
        if (group.score_halftime_home < group.score_halftime_away) return '2';
        return 'N';
    }
    // Specialized markets
    if (group.market_type === 'CORNERS_OU' || group.market_type === 'CARDS_OU' || group.market_type === 'GOALS_OU') {
        const total = group.market_type === 'CORNERS_OU'
            ? parseFloat(group.total_corners || 0)
            : group.market_type === 'CARDS_OU'
                ? parseFloat(group.total_cards || 0)
                : parseFloat((group.goals_home || 0) + (group.goals_away || 0));
        const selection = String(group.selection || '').trim();
        const match = selection.match(/^(Over|Under)\s+(\d+(?:\.\d+)?)$/i);
        if (!match) return null;

        const side = match[1].toLowerCase();
        const line = parseFloat(match[2]);
        if (Number.isNaN(line)) return null;

        return side === 'over'
            ? (total > line ? selection : null)
            : (total < line ? selection : null);
    }
    return null;
};

const ROI_MARKET_SQL = `
    CASE
        WHEN ra.market_type IN ('1N2_FT', '1X2') AND ra.selection = '1' THEN mm.odds_h
        WHEN ra.market_type IN ('1N2_FT', '1X2') AND ra.selection = 'N' THEN mm.odds_d
        WHEN ra.market_type IN ('1N2_FT', '1X2') AND ra.selection = '2' THEN mm.odds_a
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'over 0.5' THEN mm.odds_o05
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'under 0.5' THEN mm.odds_u05
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'over 1.5' THEN mm.odds_o15
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'under 1.5' THEN mm.odds_u15
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'over 2.5' THEN mm.odds_o25
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'under 2.5' THEN mm.odds_u25
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'over 3.5' THEN mm.odds_o35
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'under 3.5' THEN mm.odds_u35
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'over 4.5' THEN mm.odds_o45
        WHEN ra.market_type = 'GOALS_OU' AND LOWER(ra.selection) = 'under 4.5' THEN mm.odds_u45
        ELSE NULL
    END
`;

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

const calculateLeagueSeasonStats = (matchGroups) => {
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
    return lsStats;
};

const formatSimulationResults = (lsStats) => {
    return Object.values(lsStats).map(s => ({
        league_id: s.league_id,
        league_name: s.league_name,
        league_importance_rank: s.league_importance || 999,
        country_importance_rank: s.country_importance || 999,
        season_year: s.season_year,
        global_hit_rate: s.total > 0 ? s.hits / s.total : 0,
        brier_score: s.total > 0 ? s.brier / s.total : null,
        market_1n2_ft: s.by_m['1N2_FT'] ? s.by_m['1N2_FT'].h / s.by_m['1N2_FT'].t : null,
        market_1n2_ht: s.by_m['1N2_HT'] ? s.by_m['1N2_HT'].h / s.by_m['1N2_HT'].t : null
    })).sort((a, b) =>
        a.country_importance_rank - b.country_importance_rank ||
        a.league_importance_rank - b.league_importance_rank ||
        a.league_name.localeCompare(b.league_name) ||
        b.season_year - a.season_year
    );
};

// --- Controllers ---

export const triggerModelRetrain = async (req, res) => {
    try {
        const result = await mlService.triggerRetraining();
        res.json({ success: true, data: result });
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
        } catch (e) {
            logger.warn({ err: e }, 'ML service health check failed or timed out');
        }

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
            WITH enriched_countries AS (
                SELECT DISTINCT source_country
                FROM ml_matches
                WHERE source_country IS NOT NULL
            )
            SELECT DISTINCT
                l.league_id,
                l.name as league_name,
                f.season_year,
                c.name as country_name,
                c.flag_url
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN enriched_countries ec ON ec.source_country = c.name
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            ORDER BY c.name, l.name, f.season_year DESC
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
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability,
                   f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away,
                   l.name as league_name, ht.name as home_team, ht.logo_url as home_logo,
                   at.name as away_team, at.logo_url as away_logo, f.date,
                   SUM(fs.corner_kicks) as total_corners,
                   SUM(fs.yellow_cards + fs.red_cards) as total_cards
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            LEFT JOIN V3_Fixture_Stats fs ON f.fixture_id = fs.fixture_id AND fs.half = 'FT'
            WHERE ${whereClause}
            GROUP BY r.id, f.fixture_id, l.league_id, ht.team_id, at.team_id
            ORDER BY f.date DESC
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
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability,
                   f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away,
                   l.league_id, l.name as league_name, l.importance_rank as league_importance,
                   c.importance_rank as country_importance, f.season_year,
                   SUM(fs.corner_kicks) as total_corners,
                   SUM(fs.yellow_cards + fs.red_cards) as total_cards
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN V3_Fixture_Stats fs ON f.fixture_id = fs.fixture_id AND fs.half = 'FT'
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            GROUP BY r.id, f.fixture_id, l.league_id, c.country_id
        `);

        const matchGroups = {};
        for (const r of rows) {
            const k = `${r.fixture_id}_${r.market_type}`;
            if (!matchGroups[k]) matchGroups[k] = { ...r, predictions: [] };
            matchGroups[k].predictions.push(r);
        }

        const lsStats = calculateLeagueSeasonStats(matchGroups);
        const data = formatSimulationResults(lsStats);

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLRecommendations = async (req, res) => {
    try {
        const recommendations = await dbModule.all(`
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability, r.fair_odd, r.bookmaker_odd, r.edge, 
                   f.date, f.round, l.name as league_name, l.logo_url as league_logo, 
                   ht.name as home_team, ht.logo_url as home_logo, 
                   at.name as away_team, at.logo_url as away_logo,
                   l.importance_rank as league_importance,
                   c.importance_rank as country_importance
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id 
            JOIN V3_Leagues l ON f.league_id = l.league_id 
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id 
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE f.status_short = 'NS' AND f.date >= NOW()
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, r.ml_probability DESC
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

export const getMLClubEvaluation = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        let queryParams = [], whereClause = `f.status_short IN ('FT', 'AET', 'PEN')`;
        if (leagueId) { whereClause += ` AND l.league_id = ?`; queryParams.push(leagueId); }
        if (seasonYear) { whereClause += ` AND f.season_year = ?`; queryParams.push(seasonYear); }

        const rows = await dbModule.all(`
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability, 
                   f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away,
                   l.league_id, l.name as league_name, l.importance_rank as league_importance,
                   c.importance_rank as country_importance,
                   ht.team_id as home_id, ht.name as home_team, 
                   at.team_id as away_id, at.name as away_team, f.date,
                   SUM(fs.corner_kicks) as total_corners,
                   SUM(fs.yellow_cards + fs.red_cards) as total_cards
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id 
            JOIN V3_Leagues l ON f.league_id = l.league_id 
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id 
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            LEFT JOIN V3_Fixture_Stats fs ON f.fixture_id = fs.fixture_id AND fs.half = 'FT'
            WHERE ${whereClause} 
            GROUP BY r.id, f.fixture_id, l.league_id, c.country_id, ht.team_id, at.team_id
        `, queryParams);

        const clubStats = {};
        for (const r of rows) {
            const actual = determineActualOutcome(r);
            if (actual === null) continue;
            const isHit = r.selection === actual;

            // Update stats for both home and away clubs
            [ {id: r.home_id, name: r.home_team}, {id: r.away_id, name: r.away_team} ].forEach(c => {
                if (!clubStats[c.id]) {
                    clubStats[c.id] = { 
                        team_id: c.id, 
                        team_name: c.name, 
                        hits: 0, total: 0, by_market: {},
                        league_importance: r.league_importance || 999,
                        country_importance: r.country_importance || 999
                    };
                }
                const s = clubStats[c.id];
                s.total++; if (isHit) s.hits++;
                if (!s.by_market[r.market_type]) s.by_market[r.market_type] = { h: 0, t: 0 };
                s.by_market[r.market_type].t++; if (isHit) s.by_market[r.market_type].h++;
            });
        }

        const data = Object.values(clubStats).map(c => ({
            ...c,
            hit_rate: c.total > 0 ? c.hits / c.total : 0
        })).sort((a, b) => 
            a.country_importance - b.country_importance ||
            a.league_importance - b.league_importance ||
            b.hit_rate - a.hit_rate
        );

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getUpcomingPredictions = async (req, res) => {
    try {
        const { leagues, maxDate } = req.query;
        let queryParams = [];
        let whereClause = "f.status_short = 'NS' AND f.date >= NOW()";

        if (leagues) {
            const leagueList = leagues.split(',').map(l => l.trim());
            const leagueFilters = leagueList.map((_, i) => `l.name ILIKE $${queryParams.length + i + 1}`).join(' OR ');
            whereClause += ` AND (${leagueFilters})`;
            queryParams.push(...leagueList.map(l => `%${l}%`));
        }

        if (maxDate) {
            whereClause += ` AND f.date::date <= $${queryParams.length + 1}::date`;
            queryParams.push(maxDate);
        }

        const rows = await dbModule.all(`
            SELECT r.fixture_id, r.market_type, r.selection, r.ml_probability, r.fair_odd, r.bookmaker_odd,
                   f.date, f.round, l.league_id, l.name as league_name, l.logo_url as league_logo,
                   l.importance_rank as league_importance,
                   c.importance_rank as country_importance,
                   ht.name as home_team, ht.logo_url as home_logo,
                   at.name as away_team, at.logo_url as away_logo
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id 
            JOIN V3_Leagues l ON f.league_id = l.league_id 
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id 
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE ${whereClause}
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, f.date ASC, r.ml_probability DESC
        `, queryParams);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const syncUpcomingOdds = async (req, res) => {
    try {
        const result = await OddsSyncService.syncUpcomingOdds();
        res.json({ success: true, data: result });
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
        const statusCode = result.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !result.disabled, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getForgeBuildStatus = async (req, res) => {
    try {
        const status = await mlService.getForgeBuildStatus();
        const statusCode = status.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !status.disabled, data: status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, data: { is_building: false } });
    }
};

export const cancelForgeBuild = async (req, res) => {
    try {
        const result = await mlService.cancelForgeBuild();
        const statusCode = result.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !result.disabled, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getForgeModels = async (req, res) => {
    try {
        const result = await mlService.getForgeModels();
        const statusCode = result.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !result.disabled, data: result });
    } catch (err) {
        res.status(500).json({ success: false, data: { models: [] } });
    }
};

export const retrainModel = async (req, res) => {
    try {
        const { modelId, simulationId } = req.body;
        if (!modelId || !simulationId) return res.status(400).json({ success: false, message: 'Missing IDs' });
        const result = await mlService.retrainFromSimulation(modelId, simulationId);
        const statusCode = result.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !result.disabled, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getRetrainStatus = async (req, res) => {
    try {
        const status = await mlService.getRetrainStatus();
        const statusCode = status.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !status.disabled, data: status });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message, data: { is_retraining: false } });
    }
};

export const getEligibleHorizons = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.query;
        if (!leagueId || !seasonYear) return res.status(400).json({ success: false, message: 'Missing params' });
        const result = await mlService.getEligibleHorizons(leagueId, seasonYear);
        const statusCode = result.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !result.disabled, data: result });
    } catch (err) {
        res.status(500).json({ success: false, data: { eligible: ['FULL_HISTORICAL'] } });
    }
};

export const getLeagueModels = async (req, res) => {
    try {
        const { leagueId } = req.params;
        if (!leagueId) return res.status(400).json({ success: false, message: 'Missing leagueId' });
        const result = await mlService.getLeagueModels(leagueId);
        const statusCode = result.disabled ? 410 : 200;
        res.status(statusCode).json({ success: !result.disabled, data: result });
    } catch (err) {
        res.status(500).json({ success: false, data: { models: [], has_models: false } });
    }
};

export const predictFixtureAll = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await mlService.predictFixtureAll(id);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// --- Static Model Feature Catalog ---
// Defines features and example predictions per model type
const MODEL_CATALOG_STATIC = {
    FT_RESULT: {
        label: '1X2 Full Time',
        description: 'Prédit le résultat final du match (Victoire domicile / Nul / Victoire extérieur). Modèle principal, entraîné sur les formes récentes, H2H et données contextuelles.',
        features: [
            { name: 'home_form_5', description: 'Résultats sur les 5 derniers matchs à domicile', category: 'form' },
            { name: 'away_form_5', description: 'Résultats sur les 5 derniers matchs à l\'extérieur', category: 'form' },
            { name: 'h2h_home_wins', description: 'Victoires domicile lors des confrontations directes', category: 'historical' },
            { name: 'h2h_draw_rate', description: 'Taux de nuls en H2H', category: 'historical' },
            { name: 'goals_scored_avg', description: 'Moyenne de buts marqués sur la saison', category: 'form' },
            { name: 'goals_conceded_avg', description: 'Moyenne de buts encaissés sur la saison', category: 'form' },
            { name: 'home_advantage_factor', description: 'Facteur d\'avantage terrain calculé par ligue', category: 'contextual' },
            { name: 'league_phase', description: 'Phase de saison (début / mi-saison / fin)', category: 'contextual' },
            { name: 'implied_home_prob', description: 'Probabilité implicite des cotes bookmaker', category: 'odds' },
            { name: 'xg_diff_recent', description: 'Différentiel xG sur les 5 derniers matchs', category: 'advanced' },
        ],
        example: {
            fixtureLabel: 'Arsenal vs Chelsea (scénario type)',
            homeTeam: 'Arsenal', awayTeam: 'Chelsea',
            prediction: { home: 0.58, draw: 0.22, away: 0.20 },
            topFeatures: [
                { feature: 'home_form_5', impact: 'high', direction: 'positive' },
                { feature: 'xg_diff_recent', impact: 'high', direction: 'positive' },
                { feature: 'implied_home_prob', impact: 'medium', direction: 'positive' },
            ]
        }
    },
    HT_RESULT: {
        label: '1X2 Half Time',
        description: 'Prédit le résultat à la mi-temps. Plus volatile que le FT, il capture les dynamiques de début de match et les styles tactiques défensifs en première période.',
        features: [
            { name: 'ht_form_5', description: 'Résultats à la mi-temps sur les 5 derniers matchs', category: 'form' },
            { name: 'first_half_goals_avg', description: 'Moyenne de buts en première période', category: 'form' },
            { name: 'press_intensity', description: 'Intensité du pressing en 1ère période (via stats)', category: 'advanced' },
            { name: 'early_goals_rate', description: 'Taux de buts avant la 30ème minute', category: 'historical' },
            { name: 'home_ht_advantage', description: 'Avantage domicile spécifique à la mi-temps', category: 'contextual' },
            { name: 'implied_ht_prob', description: 'Probabilité implicite des cotes HT bookmaker', category: 'odds' },
        ],
        example: {
            fixtureLabel: 'Bayern vs Dortmund (scénario type)',
            homeTeam: 'Bayern München', awayTeam: 'Dortmund',
            prediction: { home: 0.51, draw: 0.31, away: 0.18 },
            topFeatures: [
                { feature: 'ht_form_5', impact: 'high', direction: 'positive' },
                { feature: 'first_half_goals_avg', impact: 'medium', direction: 'positive' },
                { feature: 'home_ht_advantage', impact: 'medium', direction: 'positive' },
            ]
        }
    },
    CORNERS_TOTAL: {
        label: 'Corners Over/Under 9.5',
        description: 'Prédit si le total de corners dépassera 9.5. S\'appuie sur les largeurs d\'attaque, les styles de jeu et les statistiques de coins historiques par équipe.',
        features: [
            { name: 'corners_avg_home', description: 'Moyenne de corners accordés à domicile', category: 'historical' },
            { name: 'corners_avg_away', description: 'Moyenne de corners accordés à l\'extérieur', category: 'historical' },
            { name: 'attack_width_home', description: 'Largeur d\'attaque (jeu sur les ailes)', category: 'advanced' },
            { name: 'clearance_rate', description: 'Taux de dégagements (génère des corners)', category: 'advanced' },
            { name: 'pressing_intensity', description: 'Intensité du pressing haut (génère des corners)', category: 'advanced' },
            { name: 'league_corners_avg', description: 'Moyenne de corners par ligue', category: 'contextual' },
        ],
        example: {
            fixtureLabel: 'Man City vs Tottenham (scénario type)',
            homeTeam: 'Manchester City', awayTeam: 'Tottenham',
            prediction: { over: 0.67, under: 0.33 },
            topFeatures: [
                { feature: 'attack_width_home', impact: 'high', direction: 'positive' },
                { feature: 'corners_avg_home', impact: 'high', direction: 'positive' },
                { feature: 'clearance_rate', impact: 'medium', direction: 'positive' },
            ]
        }
    },
    CARDS_TOTAL: {
        label: 'Cartons Over/Under 3.5',
        description: 'Prédit si le total de cartons (jaunes + rouges) dépassera 3.5. Fortement influencé par le profil de l\'arbitre et les rivalités entre clubs.',
        features: [
            { name: 'cards_avg_home', description: 'Moyenne de cartons reçus à domicile', category: 'historical' },
            { name: 'cards_avg_away', description: 'Moyenne de cartons reçus à l\'extérieur', category: 'historical' },
            { name: 'referee_strictness', description: 'Score de sévérité de l\'arbitre (historique)', category: 'contextual' },
            { name: 'rivalry_factor', description: 'Facteur de rivalité entre les deux clubs', category: 'contextual' },
            { name: 'aggression_index', description: 'Index d\'agressivité (fautes/match)', category: 'advanced' },
            { name: 'league_cards_avg', description: 'Moyenne de cartons par ligue', category: 'contextual' },
        ],
        example: {
            fixtureLabel: 'Atletico Madrid vs Real Madrid (scénario type)',
            homeTeam: 'Atletico Madrid', awayTeam: 'Real Madrid',
            prediction: { over: 0.72, under: 0.28 },
            topFeatures: [
                { feature: 'referee_strictness', impact: 'high', direction: 'positive' },
                { feature: 'rivalry_factor', impact: 'high', direction: 'positive' },
                { feature: 'aggression_index', impact: 'medium', direction: 'positive' },
            ]
        }
    },
    GOALS_TOTAL: {
        label: 'Buts Over/Under 2.5',
        description: 'Prédit si le total de buts dépassera 2.5. S\'appuie sur le volume offensif, les signaux xG récents, la qualité des occasions et le contexte de compétition.',
        features: [
            { name: 'xg_for_recent', description: 'xG offensif récent de chaque équipe', category: 'advanced' },
            { name: 'xg_against_recent', description: 'xG défensif récent concédé', category: 'advanced' },
            { name: 'shots_on_target_recent', description: 'Tirs cadrés récents', category: 'historical' },
            { name: 'competition_stage', description: 'Importance et type de compétition', category: 'contextual' },
            { name: 'style_openness', description: 'Indice d\'ouverture du match via contrôle et volume offensif', category: 'advanced' },
            { name: 'strength_gap', description: 'Asymétrie de niveau entre les équipes', category: 'contextual' },
        ],
        example: {
            fixtureLabel: 'PSG vs Chelsea (scénario type)',
            homeTeam: 'Paris SG', awayTeam: 'Chelsea',
            prediction: { over: 0.61, under: 0.39 },
            topFeatures: [
                { feature: 'xg_for_recent', impact: 'high', direction: 'positive' },
                { feature: 'shots_on_target_recent', impact: 'high', direction: 'positive' },
                { feature: 'competition_stage', impact: 'medium', direction: 'negative' },
            ]
        }
    }
};

// Importance rank map for leagues (used to sort catalog output)
const LEAGUE_IMPORTANCE_MAP = {
    39: 1,   // Premier League
    140: 2,  // La Liga
    135: 3,  // Serie A
    78:  4,  // Bundesliga
    61:  5,  // Ligue 1
    94:  6,  // Primeira Liga
    88:  7,  // Eredivisie
    203: 8,  // Süper Lig
};

// --- New V37 Controllers ---

export const getModelsCatalog = async (req, res) => {
    try {
        const { leagueId } = req.query;
        const leagueFilter = leagueId ? 'AND f.league_id = $1' : '';
        const leagueParams = leagueId ? [leagueId] : [];

        // Leagues with completed simulations
        const simLeagues = await dbModule.all(`
            SELECT
                   f.league_id,
                   l.name as league_name,
                   l.logo_url,
                   COALESCE(l.importance_rank, 99) as league_importance,
                   COALESCE(c.importance_rank, 99) as country_importance,
                   co.name as country_name
            FROM V3_Forge_Simulations fs
            JOIN V3_Fixtures f ON fs.league_id = f.league_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            LEFT JOIN V3_Countries co ON l.country_id = co.country_id
            WHERE fs.status = 'COMPLETED' ${leagueFilter}
            GROUP BY
                f.league_id,
                l.name,
                l.logo_url,
                COALESCE(l.importance_rank, 99),
                COALESCE(c.importance_rank, 99),
                co.name
            ORDER BY
                COALESCE(c.importance_rank, 99) ASC,
                COALESCE(l.importance_rank, 99) ASC,
                l.name ASC
        `, leagueParams);

        if (!simLeagues.length) {
            return res.json({ success: true, data: [] });
        }

        // Per-league real metrics from V3_Risk_Analysis (completed fixtures)
        const metricsRows = await dbModule.all(`
            SELECT f.league_id, ra.market_type,
                   COUNT(*) as total,
                   SUM(CASE WHEN ra.selection = (
                       CASE
                           WHEN ra.market_type IN ('1N2_FT','1X2') THEN
                               CASE WHEN f.goals_home > f.goals_away THEN '1'
                                    WHEN f.goals_home < f.goals_away THEN '2' ELSE 'N' END
                           WHEN ra.market_type = '1N2_HT' THEN
                               CASE WHEN f.score_halftime_home > f.score_halftime_away THEN '1'
                                    WHEN f.score_halftime_home < f.score_halftime_away THEN '2' ELSE 'N' END
                           ELSE NULL END
                   ) THEN 1 ELSE 0 END) as hits,
                   AVG(POWER(ra.ml_probability - CASE WHEN ra.selection = (
                       CASE
                           WHEN ra.market_type IN ('1N2_FT','1X2') THEN
                               CASE WHEN f.goals_home > f.goals_away THEN '1'
                                    WHEN f.goals_home < f.goals_away THEN '2' ELSE 'N' END
                           WHEN ra.market_type = '1N2_HT' THEN
                               CASE WHEN f.score_halftime_home > f.score_halftime_away THEN '1'
                                    WHEN f.score_halftime_home < f.score_halftime_away THEN '2' ELSE 'N' END
                           ELSE NULL END
                   ) THEN 1.0 ELSE 0.0 END, 2)) as brier_score,
                   MIN(f.season_year) as season_min,
                   MAX(f.season_year) as season_max,
                   MAX(ra.analyzed_at) as last_trained_at
            FROM V3_Risk_Analysis ra
            JOIN V3_Fixtures f ON ra.fixture_id = f.fixture_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
              AND ra.market_type IN ('1N2_FT','1N2_HT')
            GROUP BY f.league_id, ra.market_type
        `);

        // Per-league sample team names for relevant example predictions
        const teamRows = await dbModule.all(`
            SELECT league_id, home_team, away_team
            FROM (
                SELECT
                    f.league_id,
                    ht.name as home_team,
                    at.name as away_team,
                    ROW_NUMBER() OVER (PARTITION BY f.league_id ORDER BY f.date DESC, f.fixture_id DESC) as row_num
                FROM V3_Fixtures f
                JOIN V3_Teams ht ON f.home_team_id = ht.team_id
                JOIN V3_Teams at ON f.away_team_id = at.team_id
                WHERE f.status_short IN ('FT','AET','PEN')
            ) ranked
            WHERE row_num = 1
        `);

        // Index metrics by leagueId+marketType
        const metricsMap = {};
        for (const m of metricsRows) {
            metricsMap[`${m.league_id}_${m.market_type}`] = m;
        }
        // Index one team pair per league
        const teamMap = {};
        for (const t of teamRows) {
            if (!teamMap[t.league_id]) teamMap[t.league_id] = { homeTeam: t.home_team, awayTeam: t.away_team };
        }

        const catalog = simLeagues.map(league => {
            const lid = league.league_id;
            const teams = teamMap[lid] ?? { homeTeam: 'Domicile', awayTeam: 'Extérieur' };
            const metFT = metricsMap[`${lid}_1N2_FT`];
            const seasonRange = metFT ? `${metFT.season_min}–${metFT.season_max}` : '—';
            const lastTrained = metFT?.last_trained_at ?? null;

            return {
                leagueId: lid,
                leagueName: league.league_name,
                leagueLogo: league.logo_url,
                country: league.country_name,
                importanceRank: LEAGUE_IMPORTANCE_MAP[lid] || league.league_importance,
                models: Object.entries(MODEL_CATALOG_STATIC).map(([type, info]) => {
                    const mKey = type === 'FT_RESULT' ? `${lid}_1N2_FT`
                               : type === 'HT_RESULT' ? `${lid}_1N2_HT` : null;
                    const m = mKey ? metricsMap[mKey] : null;
                    const hitRate = m && m.total > 0 ? m.hits / m.total : null;
                    const brier = m && m.total > 0 ? m.brier_score : null;
                    return {
                        type,
                        label: info.label,
                        version: 'v1.0',
                        isActive: true,
                        description: info.description,
                        trainingFeatures: info.features,
                        trainingDataSummary: {
                            samplesCount: m ? parseInt(m.total) : null,
                            seasonsRange: seasonRange,
                            lastTrainedAt: lastTrained
                        },
                        metrics: {
                            accuracy: hitRate != null ? Math.round(hitRate * 1000) / 1000 : null,
                            brierScore: brier != null ? Math.round(brier * 10000) / 10000 : null
                        },
                        examplePrediction: {
                            ...info.example,
                            fixtureLabel: `${teams.homeTeam} vs ${teams.awayTeam} (scénario type)`,
                            homeTeam: teams.homeTeam,
                            awayTeam: teams.awayTeam
                        }
                    };
                })
            };
        }).sort((a, b) => a.importanceRank - b.importanceRank);

        res.json({ success: true, data: catalog });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const calculatePerformanceROI = async (req, res) => {
    try {
        const { portfolioSize, stakePerBet, leagueId, seasonYear, markets } = req.body;

        let whereClause = `f.status_short IN ('FT', 'AET', 'PEN') AND mm.v3_fixture_id IS NOT NULL`;
        const params = [];
        if (leagueId) { whereClause += ` AND f.league_id = $${params.length + 1}`; params.push(leagueId); }
        if (seasonYear) { whereClause += ` AND f.season_year = $${params.length + 1}`; params.push(seasonYear); }
        if (markets && markets !== 'all') {
            const marketList = Array.isArray(markets) ? markets : markets.split(',').map(m => m.trim());
            if (marketList.length === 1) {
                whereClause += ` AND ra.market_type = $${params.length + 1}`; params.push(marketList[0]);
            } else if (marketList.length > 1) {
                const placeholders = marketList.map((_, i) => `$${params.length + i + 1}`).join(', ');
                whereClause += ` AND ra.market_type IN (${placeholders})`; params.push(...marketList);
            }
        }

        const rows = await dbModule.all(`
            WITH roi_candidates AS (
                SELECT
                    ra.fixture_id,
                    ra.market_type,
                    ra.selection,
                    ra.ml_probability,
                    ${ROI_MARKET_SQL} AS bookmaker_odd,
                    f.league_id,
                    l.name AS league_name,
                    f.season_year,
                    f.goals_home,
                    f.goals_away,
                    f.score_halftime_home,
                    f.score_halftime_away,
                    f.date,
                    COALESCE(mm.h_corners_ft, 0) + COALESCE(mm.a_corners_ft, 0) AS total_corners,
                    COALESCE(mm.h_yc_ft, 0) + COALESCE(mm.a_yc_ft, 0) AS total_cards
                FROM v3_risk_analysis ra
                JOIN v3_fixtures f ON ra.fixture_id = f.fixture_id
                JOIN v3_leagues l ON f.league_id = l.league_id
                JOIN ml_matches mm ON mm.v3_fixture_id = f.fixture_id
                WHERE ${whereClause}
            )
            SELECT *
            FROM roi_candidates
            WHERE bookmaker_odd IS NOT NULL
            ORDER BY date ASC
        `, params);

        // Group by fixture+market (take highest probability prediction per group)
        const groups = {};
        for (const r of rows) {
            const k = `${r.fixture_id}_${r.market_type}`;
            if (!groups[k] || r.ml_probability > groups[k].ml_probability) groups[k] = r;
        }

        const leagueMeta = leagueId ? await dbModule.get(`
            SELECT l.league_id, l.name AS league_name, c.name AS country_name
            FROM v3_leagues l
            LEFT JOIN v3_countries c ON l.country_id = c.country_id
            WHERE l.league_id = $1
        `, [leagueId]) : null;

        // Simulate bets
        let portfolio = portfolioSize;
        let wins = 0, losses = 0, bestStreak = 0, worstStreak = 0;
        let currentStreak = 0;
        const equityCurve = [{ betIndex: 0, portfolio }];
        let maxPortfolio = portfolioSize;
        let maxDrawdown = 0;

        for (const row of Object.values(groups)) {
            const actual = determineActualOutcome(row);
            if (actual === null) continue;
            const isHit = row.selection === actual;

            if (isHit) {
                const profit = stakePerBet * (row.bookmaker_odd - 1);
                portfolio += profit;
                wins++;
                currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
                if (currentStreak > bestStreak) bestStreak = currentStreak;
            } else {
                portfolio -= stakePerBet;
                losses++;
                currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
                if (Math.abs(currentStreak) > worstStreak) worstStreak = Math.abs(currentStreak);
            }

            if (portfolio > maxPortfolio) maxPortfolio = portfolio;
            const drawdown = maxPortfolio > 0 ? ((maxPortfolio - portfolio) / maxPortfolio) * 100 : 0;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;

            equityCurve.push({ betIndex: wins + losses, portfolio: Math.round(portfolio * 100) / 100 });
        }

        const totalBets = wins + losses;
        const totalStaked = totalBets * stakePerBet;
        const profit = portfolio - portfolioSize;
        const marketCoverage = Object.values(groups).reduce((acc, row) => {
            acc[row.market_type] = (acc[row.market_type] || 0) + 1;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                scope: {
                    leagueId: leagueId || null,
                    leagueName: leagueMeta?.league_name || null,
                    countryName: leagueMeta?.country_name || null,
                    seasonYear: seasonYear || null,
                    oddsSource: 'ml_matches',
                    availableMarkets: Object.keys(marketCoverage),
                    marketCoverage,
                },
                totalBets,
                wins,
                losses,
                hitRate: totalBets > 0 ? Math.round((wins / totalBets) * 1000) / 1000 : 0,
                totalStaked: Math.round(totalStaked * 100) / 100,
                totalReturned: Math.round(portfolio * 100) / 100,
                profit: Math.round(profit * 100) / 100,
                benefit: Math.round(profit * 100) / 100,
                roi: totalStaked > 0 ? Math.round((profit / totalStaked) * 10000) / 100 : 0,
                maxDrawdown: Math.round(maxDrawdown * 100) / 100,
                bestStreak,
                worstStreak,
                stakeTooHigh: stakePerBet > portfolioSize * 0.5,
                equityCurve
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getTopEdges = async (req, res) => {
    try {
        const minEdge = parseFloat(req.query.minEdge ?? 5);
        const minConfidence = parseFloat(req.query.minConfidence ?? 50) / 100;
        const limit = parseInt(req.query.limit ?? 30);
        const leagueId = req.query.leagueId ? parseInt(req.query.leagueId) : null;
        const markets = req.query.markets ? req.query.markets.split(',').map(m => m.trim()) : null;

        let whereClause = `f.status_short = 'NS' AND f.date >= NOW() AND ra.edge IS NOT NULL AND ra.edge >= $1 AND ra.ml_probability >= $2`;
        const params = [minEdge, minConfidence];

        if (leagueId) { whereClause += ` AND f.league_id = $${params.length + 1}`; params.push(leagueId); }
        if (markets && markets.length > 0) {
            const placeholders = markets.map((_, i) => `$${params.length + i + 1}`).join(', ');
            whereClause += ` AND ra.market_type IN (${placeholders})`;
            params.push(...markets);
        }

        const rows = await dbModule.all(`
            SELECT ra.fixture_id, ra.market_type, ra.selection, ra.ml_probability,
                   ra.bookmaker_odd, ra.fair_odd, ra.edge,
                   f.date as match_date, f.league_id,
                   ht.name as home_team, ht.logo_url as home_logo,
                   at.name as away_team, at.logo_url as away_logo,
                   l.name as league_name, l.logo_url as league_logo,
                   COALESCE(l.importance_rank, 99) as league_importance,
                   COALESCE(c.importance_rank, 99) as country_importance
            FROM V3_Risk_Analysis ra
            JOIN V3_Fixtures f ON ra.fixture_id = f.fixture_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE ${whereClause}
            ORDER BY ra.edge DESC
            LIMIT $${params.length + 1}
        `, [...params, limit]);

        const data = rows.map(r => {
            const impliedProb = r.bookmaker_odd > 0 ? 1 / r.bookmaker_odd : 0;
            const powerScore = Math.min(100, Math.round(r.edge * r.ml_probability));
            let powerLevel = 'weak';
            if (powerScore >= 80) powerLevel = 'elite';
            else if (powerScore >= 60) powerLevel = 'strong';
            else if (powerScore >= 40) powerLevel = 'moderate';

            return {
                fixtureId: r.fixture_id,
                homeTeam: r.home_team,
                homeLogo: r.home_logo,
                awayTeam: r.away_team,
                awayLogo: r.away_logo,
                leagueName: r.league_name,
                leagueLogo: r.league_logo,
                leagueId: r.league_id,
                matchDate: r.match_date,
                market: r.market_type,
                selection: r.selection,
                mlProbability: Math.round(r.ml_probability * 1000) / 1000,
                impliedProbability: Math.round(impliedProb * 1000) / 1000,
                edge: Math.round(r.edge * 100) / 100,
                confidence: Math.round(r.ml_probability * 100),
                powerScore,
                powerLevel,
                bestOdds: r.bookmaker_odd
            };
        });

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getSubmodels = async (_req, res) => {
    try {
        const rows = await dbModule.all(`
            SELECT sm.*, l.name as league_name, l.logo_url as league_logo
            FROM V3_Custom_Submodels sm
            LEFT JOIN V3_Leagues l ON sm.league_id = l.league_id
            WHERE sm.is_active = true OR sm.status != 'deleted'
            ORDER BY sm.created_at DESC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const createSubmodel = async (req, res) => {
    try {
        const { displayName, description, baseModelType, leagueId, seasonYear, horizonType, trainNow } = req.body;

        const result = await dbModule.run(`
            INSERT INTO V3_Custom_Submodels (display_name, description, base_model_type, league_id, season_year, horizon_type, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'draft')
            RETURNING id
        `, [displayName, description || null, baseModelType, leagueId || null, seasonYear || null, horizonType || 'FULL_HISTORICAL']);

        const submodelId = result.rows?.[0]?.id || result.lastID;

        if (trainNow && leagueId) {
            await dbModule.run(
                `UPDATE V3_Custom_Submodels SET status = 'training' WHERE id = $1`,
                [submodelId]
            );
            // Trigger forge build asynchronously
            const mlService = (await import('../../services/v3/mlService.js')).default;
            mlService.buildForgeModels(leagueId, seasonYear).catch(() => {
                dbModule.run(`UPDATE V3_Custom_Submodels SET status = 'failed' WHERE id = $1`, [submodelId]);
            }).then(() => {
                dbModule.run(
                    `UPDATE V3_Custom_Submodels SET status = 'trained', last_trained_at = NOW() WHERE id = $1`,
                    [submodelId]
                );
            });
        }

        const submodel = await dbModule.get(
            `SELECT sm.*, l.name as league_name FROM V3_Custom_Submodels sm LEFT JOIN V3_Leagues l ON sm.league_id = l.league_id WHERE sm.id = $1`,
            [submodelId]
        );

        res.json({ success: true, data: submodel });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const getLeaguesWithOdds = async (_req, res) => {
    try {
        const rows = await dbModule.all(`
            SELECT
                f.league_id,
                l.name AS league_name,
                l.logo_url,
                c.name AS country_name,
                f.season_year,
                COUNT(DISTINCT mm.v3_fixture_id)::int AS odds_count,
                COUNT(DISTINCT CASE WHEN mm.odds_h IS NOT NULL AND mm.odds_d IS NOT NULL AND mm.odds_a IS NOT NULL THEN mm.v3_fixture_id END)::int AS ft_1x2_count,
                COUNT(DISTINCT CASE WHEN mm.odds_o25 IS NOT NULL AND mm.odds_u25 IS NOT NULL THEN mm.v3_fixture_id END)::int AS goals_ou_count
            FROM ml_matches mm
            JOIN v3_fixtures f ON mm.v3_fixture_id = f.fixture_id
            JOIN v3_leagues l ON f.league_id = l.league_id
            LEFT JOIN v3_countries c ON l.country_id = c.country_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            GROUP BY f.league_id, l.name, l.logo_url, c.name, f.season_year
            HAVING COUNT(DISTINCT mm.v3_fixture_id) > 0
            ORDER BY l.name ASC, f.season_year DESC
        `);

        // Group by league
        const byLeague = {};
        for (const r of rows) {
            if (!byLeague[r.league_id]) {
                byLeague[r.league_id] = {
                    leagueId: r.league_id,
                    leagueName: r.league_name,
                    leagueLogo: r.logo_url,
                    countryName: r.country_name || null,
                    seasons: []
                };
            }
            const availableMarkets = [];
            if (parseInt(r.ft_1x2_count, 10) > 0) availableMarkets.push('1N2_FT');
            if (parseInt(r.goals_ou_count, 10) > 0) availableMarkets.push('GOALS_OU');
            byLeague[r.league_id].seasons.push({
                year: r.season_year,
                oddsCount: parseInt(r.odds_count, 10),
                availableMarkets,
                marketCounts: {
                    ft_1x2: parseInt(r.ft_1x2_count, 10),
                    goals_ou: parseInt(r.goals_ou_count, 10),
                }
            });
        }
        res.json({ success: true, data: Object.values(byLeague) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export const deleteSubmodel = async (req, res) => {
    try {
        const { id } = req.params;
        await dbModule.run(
            `UPDATE V3_Custom_Submodels SET is_active = false, status = 'deleted' WHERE id = $1`,
            [id]
        );
        res.json({ success: true, data: { id: parseInt(id) } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
    predictFixtureAll,
    getMLClubEvaluation,
    getUpcomingPredictions,
    getModelsCatalog,
    calculatePerformanceROI,
    getTopEdges,
    getSubmodels,
    createSubmodel,
    deleteSubmodel,
    getLeaguesWithOdds
};
