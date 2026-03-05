import mlService from '../../services/v3/mlService.js';
import dbModule from '../../config/database.js';
import axios from 'axios';
import OddsSyncService from '../../services/v3/OddsSyncService.js';
import OddsCrawlerService from '../../services/v3/OddsCrawlerService.js';

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
        // Merge ML service health check
        res.json({ success: true, data: { ...status, status: 'online' } });
    } catch (err) {
        res.status(500).json({ success: true, data: { status: 'offline', is_training: false } });
    }
};

/**
 * Machine Learning Platform V19
 */
export const getMLOrchestratorStatus = async (req, res) => {
    try {
        const rowCount = dbModule.get('SELECT COUNT(*) as count FROM V3_Risk_Analysis');

        // Proxy FastAPI health endpoint for real-time python state
        let pythonStatus = { status: 'offline', model_loaded: false, version: 'Unknown' };
        try {
            const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8008';
            const pyRes = await axios.get(`${mlServiceUrl}/health`, { timeout: 1500 });
            pythonStatus = pyRes.data;
        } catch (e) { /* Python might be down, ignore and return DB metrics */ }

        res.json({
            success: true,
            status: pythonStatus.status,
            version: pythonStatus.version,
            model_loaded: pythonStatus.model_loaded,
            training: pythonStatus.training,
            total_risk_rows: rowCount.count || 0
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLRecentAnalyses = async (req, res) => {
    try {
        const recentRows = dbModule.all(`
            SELECT 
                r.fixture_id, r.market_type, r.selection, r.ml_probability, r.fair_odd, r.analyzed_at,
                l.name as league_name,
                ht.name as home_team,
                at.name as away_team,
                f.round,
                f.date
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            ORDER BY r.analyzed_at DESC
            LIMIT 50
        `);
        res.json({ success: true, data: recentRows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};


export const getMLSimulationFilters = async (req, res) => {
    try {
        const rows = dbModule.all(`
            SELECT DISTINCT l.league_id, l.name as league_name, f.season_year
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
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
        let queryParams = [];
        let whereClause = `f.status_short IN ('FT', 'AET', 'PEN')`;

        if (leagueId) {
            whereClause += ` AND l.league_id = ?`;
            queryParams.push(leagueId);
        }
        if (seasonYear) {
            whereClause += ` AND f.season_year = ?`;
            queryParams.push(seasonYear);
        }

        const rows = dbModule.all(`
            SELECT 
                r.fixture_id, r.market_type, r.selection, r.ml_probability,
                f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away,
                l.name as league_name, ht.name as home_team, at.name as away_team, f.date
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE ${whereClause}
            ORDER BY f.date DESC
        `, queryParams);

        // Group rows to find the HIGHEST probability selection for each match/market
        const matchGroups = {};
        for (const row of rows) {
            const key = `${row.fixture_id}_${row.market_type}`;
            if (!matchGroups[key]) {
                matchGroups[key] = {
                    fixture_id: row.fixture_id,
                    market_type: row.market_type,
                    league_name: row.league_name,
                    home_team: row.home_team,
                    away_team: row.away_team,
                    goals_home: row.goals_home,
                    goals_away: row.goals_away,
                    score_halftime_home: row.score_halftime_home,
                    score_halftime_away: row.score_halftime_away,
                    date: row.date,
                    predictions: []
                };
            }
            matchGroups[key].predictions.push(row);
        }

        const stats = { overall_hit_rate: 0, by_market: {} };
        const details = [];
        let totalMatches = 0;
        let totalHits = 0;
        let brierSum = 0;

        for (const key in matchGroups) {
            const group = matchGroups[key];
            if (group.predictions.length === 0) continue;

            // best prediction is the one with highest probability
            const bestPred = group.predictions.sort((a, b) => b.ml_probability - a.ml_probability)[0];

            let actualOutcome = null;
            if (group.market_type === '1N2_FT') {
                if (group.goals_home > group.goals_away) actualOutcome = '1';
                else if (group.goals_home < group.goals_away) actualOutcome = '2';
                else actualOutcome = 'N';
            } else if (group.market_type === '1N2_HT') {
                if (group.score_halftime_home > group.score_halftime_away) actualOutcome = '1';
                else if (group.score_halftime_home < group.score_halftime_away) actualOutcome = '2';
                else actualOutcome = 'N';
            }

            if (actualOutcome !== null) {
                const isHit = bestPred.selection === actualOutcome;
                totalMatches++;
                if (isHit) totalHits++;

                if (!stats.by_market[group.market_type]) {
                    stats.by_market[group.market_type] = { hits: 0, total: 0 };
                }
                stats.by_market[group.market_type].total++;
                if (isHit) stats.by_market[group.market_type].hits++;

                const actualProb = isHit ? 1.0 : 0.0;
                brierSum += Math.pow(bestPred.ml_probability - actualProb, 2);

                details.push({
                    fixture_id: group.fixture_id,
                    date: group.date,
                    league_name: group.league_name,
                    home_team: group.home_team,
                    away_team: group.away_team,
                    market: group.market_type,
                    predicted: bestPred.selection,
                    probability: bestPred.ml_probability,
                    actual: actualOutcome,
                    is_hit: isHit
                });
            }
        }

        stats.overall_hit_rate = totalMatches > 0 ? totalHits / totalMatches : 0;
        stats.brier_score = totalMatches > 0 ? (brierSum / totalMatches) : null;

        res.json({
            success: true,
            stats,
            details: details.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 500) // limit output list
        });
    } catch (err) {
        console.error("Evaluation error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLSimulationOverview = async (req, res) => {
    try {
        const rows = dbModule.all(`
            SELECT 
                r.fixture_id, r.market_type, r.selection, r.ml_probability,
                f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away,
                l.league_id, l.name as league_name, l.importance_rank as league_importance_rank, 
                c.importance_rank as country_importance_rank, f.season_year
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
        `);

        // First find best prediction per match/market
        const matchGroups = {};
        for (const row of rows) {
            const key = `${row.fixture_id}_${row.market_type}`;
            if (!matchGroups[key]) {
                matchGroups[key] = {
                    fixture_id: row.fixture_id,
                    market_type: row.market_type,
                    league_id: row.league_id,
                    league_name: row.league_name,
                    league_importance_rank: row.league_importance_rank,
                    country_importance_rank: row.country_importance_rank,
                    season_year: row.season_year,
                    goals_home: row.goals_home,
                    goals_away: row.goals_away,
                    score_halftime_home: row.score_halftime_home,
                    score_halftime_away: row.score_halftime_away,
                    predictions: []
                };
            }
            matchGroups[key].predictions.push(row);
        }

        const leagueSeasonStats = {};

        for (const key in matchGroups) {
            const group = matchGroups[key];
            if (group.predictions.length === 0) continue;

            const bestPred = group.predictions.sort((a, b) => b.ml_probability - a.ml_probability)[0];

            let actualOutcome = null;
            if (group.market_type === '1N2_FT') {
                if (group.goals_home > group.goals_away) actualOutcome = '1';
                else if (group.goals_home < group.goals_away) actualOutcome = '2';
                else actualOutcome = 'N';
            } else if (group.market_type === '1N2_HT') {
                if (group.score_halftime_home > group.score_halftime_away) actualOutcome = '1';
                else if (group.score_halftime_home < group.score_halftime_away) actualOutcome = '2';
                else actualOutcome = 'N';
            }

            if (actualOutcome !== null) {
                const lsKey = `${group.league_id}_${group.season_year}`;
                if (!leagueSeasonStats[lsKey]) {
                    leagueSeasonStats[lsKey] = {
                        league_id: group.league_id,
                        league_name: group.league_name,
                        league_importance_rank: group.league_importance_rank,
                        country_importance_rank: group.country_importance_rank,
                        season_year: group.season_year,
                        total_matches: 0,
                        total_hits: 0,
                        brier_sum: 0,
                        by_market: {}
                    };
                }

                const statsObj = leagueSeasonStats[lsKey];
                const isHit = bestPred.selection === actualOutcome;
                statsObj.total_matches++;
                if (isHit) statsObj.total_hits++;

                if (!statsObj.by_market[group.market_type]) {
                    statsObj.by_market[group.market_type] = { hits: 0, total: 0 };
                }
                statsObj.by_market[group.market_type].total++;
                if (isHit) statsObj.by_market[group.market_type].hits++;

                const actualProb = isHit ? 1.0 : 0.0;
                statsObj.brier_sum += Math.pow(bestPred.ml_probability - actualProb, 2);
            }
        }

        const overview = Object.values(leagueSeasonStats).map(s => {
            const row = {
                league_id: s.league_id,
                league_name: s.league_name,
                league_importance_rank: s.league_importance_rank,
                country_importance_rank: s.country_importance_rank,
                season_year: s.season_year,
                global_hit_rate: s.total_matches > 0 ? (s.total_hits / s.total_matches) : 0,
                brier_score: s.total_matches > 0 ? (s.brier_sum / s.total_matches) : null,
                market_1n2_ft: null,
                market_1n2_ht: null
            };

            if (s.by_market['1N2_FT'] && s.by_market['1N2_FT'].total > 0) {
                row.market_1n2_ft = s.by_market['1N2_FT'].hits / s.by_market['1N2_FT'].total;
            }
            if (s.by_market['1N2_HT'] && s.by_market['1N2_HT'].total > 0) {
                row.market_1n2_ht = s.by_market['1N2_HT'].hits / s.by_market['1N2_HT'].total;
            }
            return row;
        });

        overview.sort((a, b) => {
            if (a.league_name < b.league_name) return -1;
            if (a.league_name > b.league_name) return 1;
            return b.season_year - a.season_year;
        });

        res.json({ success: true, data: overview });
    } catch (err) {
        console.error("Overview error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMLRecommendations = async (req, res) => {
    try {
        const recommendations = dbModule.all(`
            SELECT 
                r.fixture_id, r.market_type, r.selection, r.ml_probability, r.fair_odd, r.bookmaker_odd, r.edge,
                f.date, f.round,
                l.name as league_name, l.logo_url as league_logo,
                ht.name as home_team, ht.logo_url as home_logo,
                at.name as away_team, at.logo_url as away_logo
            FROM V3_Risk_Analysis r
            JOIN V3_Fixtures f ON r.fixture_id = f.fixture_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE f.status_short = 'NS'
            ORDER BY r.ml_probability DESC
        `);

        // Categories: 
        // 1. Top Confidence: Prob > 75%
        // 2. Value Bets: Edge > 5%
        // 3. Upcoming: Others

        const confidence = recommendations.filter(r => r.ml_probability > 0.75);
        const value = recommendations.filter(r => r.edge > 5);

        res.json({
            success: true,
            data: {
                top_confidence: confidence,
                top_value: value,
                all: recommendations
            }
        });
    } catch (err) {
        console.error("Recommendations error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const syncUpcomingOdds = async (req, res) => {
    try {
        const result = await OddsSyncService.syncUpcomingOdds();
        res.json(result);
    } catch (err) {
        console.error("Odds sync error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const syncAdvancedOdds = async (req, res) => {
    try {
        const result = await OddsCrawlerService.runUpcomingSync();
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Advanced odds sync error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const runOddsCatchup = async (req, res) => {
    try {
        const result = await OddsCrawlerService.runHistoricalCatchup();
        res.json({ success: true, ...result });
    } catch (err) {
        console.error("Odds catchup error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Forge Model Building (V8)
 */
export const buildForgeModels = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.body;
        if (!leagueId) {
            return res.status(400).json({ success: false, message: 'Missing leagueId' });
        }
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

/**
 * Adaptive Model Refinement (V8)
 */
export const retrainModel = async (req, res) => {
    try {
        const { modelId, simulationId } = req.body;
        if (!modelId || !simulationId) {
            return res.status(400).json({ success: false, message: 'Missing modelId or simulationId' });
        }
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
        if (!leagueId || !seasonYear) {
            return res.status(400).json({ success: false, message: 'Missing leagueId or seasonYear' });
        }
        const result = await mlService.getEligibleHorizons(leagueId, seasonYear);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, eligible: ['FULL_HISTORICAL'] });
    }
};

export const getLeagueModels = async (req, res) => {
    try {
        const { leagueId } = req.params;
        if (!leagueId) {
            return res.status(400).json({ success: false, message: 'Missing leagueId' });
        }
        const result = await mlService.getLeagueModels(leagueId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, models: [], has_models: false });
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
    runOddsCatchup
};
