import db from '../../config/database.js';
import axios from 'axios';
import logger from '../../utils/logger.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml-service:8008';

/**
 * GET /v4/match/:matchId/prediction
 *
 * Returns stored ML prediction for a V4 match.
 * Priority: v4.ml_predictions (new V4 pipeline) → V3 bridge fallback.
 */
export const getMatchPrediction = async (req, res) => {
    const { matchId } = req.params;

    try {
        // 1. Check v4.ml_predictions first (V4 pipeline)
        const v4Pred = await db.get(
            `SELECT prediction_json, confidence_score, model_name, created_at
             FROM v4.ml_predictions
             WHERE match_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [matchId]
        );

        // 2. Match context
        const match = await db.get(
            `SELECT m.home_score, m.away_score, m.match_date,
                    hc.name AS home_team, hc.current_logo_url AS home_logo,
                    ac.name AS away_team, ac.current_logo_url AS away_logo,
                    comp.name AS competition_name
             FROM v4.matches m
             JOIN v4.clubs hc ON m.home_club_id = hc.club_id
             JOIN v4.clubs ac ON m.away_club_id = ac.club_id
             LEFT JOIN v4.competitions comp ON m.competition_id = comp.competition_id
             WHERE m.match_id = $1`,
            [matchId]
        );

        // 3. Odds
        const odds = await db.get(
            `SELECT value_home AS odds_home, value_draw AS odds_away, value_away AS odds_away
             FROM v4.match_odds
             WHERE match_id = $1 AND market_type = 'FT_1X2'
             ORDER BY captured_at DESC LIMIT 1`,
            [matchId]
        );

        // 4. Actual outcome
        let actualOutcome = null;
        if (match?.home_score !== null && match?.away_score !== null) {
            if (match.home_score > match.away_score) actualOutcome = '1';
            else if (match.home_score < match.away_score) actualOutcome = '2';
            else actualOutcome = 'N';
        }

        let predictionData = null;
        let predictionMeta = null;
        let source = null;

        if (v4Pred) {
            // V4 prediction available
            try {
                predictionData = typeof v4Pred.prediction_json === 'string'
                    ? JSON.parse(v4Pred.prediction_json)
                    : v4Pred.prediction_json;
            } catch {
                logger.warn({ matchId }, 'Failed to parse v4.ml_predictions prediction_json');
            }
            predictionMeta = {
                confidence_score: v4Pred.confidence_score,
                model_name: v4Pred.model_name,
                created_at: v4Pred.created_at
            };
            source = 'v4';
        } else {
            // Fallback: V3 bridge (for historical matches with mapping)
            const mapping = await db.get(
                `SELECT v3_fixture_id FROM v4.fixture_match_mapping
                 WHERE v4_match_id = $1 AND confidence IN ('HIGH', 'MEDIUM')`,
                [matchId]
            );
            if (mapping?.v3_fixture_id) {
                const v3Pred = await db.get(
                    `SELECT prediction_json, confidence_score, created_at
                     FROM V3_ML_Predictions
                     WHERE fixture_id = $1 AND is_valid = 1
                     ORDER BY created_at DESC LIMIT 1`,
                    [mapping.v3_fixture_id]
                );
                if (v3Pred) {
                    try { predictionData = JSON.parse(v3Pred.prediction_json); } catch { /* ignore */ }
                    predictionMeta = { confidence_score: v3Pred.confidence_score, created_at: v3Pred.created_at };
                    source = 'v3_bridge';
                }
            }
        }

        return res.json({
            success: true,
            data: {
                match_id: Number(matchId),
                source,
                match: match || null,
                prediction: predictionData,
                prediction_meta: predictionMeta,
                actual_outcome: actualOutcome,
                odds: odds || null
            }
        });
    } catch (err) {
        logger.error({ err, matchId }, 'getMatchPrediction error');
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /v4/ml/predictions/history
 *
 * Returns historical V4 match predictions from v4.ml_predictions,
 * enriched with actual result and whether the prediction was correct.
 *
 * Query params:
 *   - competition_id (optional)
 *   - season_label   (optional, e.g. "2024-2025")
 *   - limit          (default 50, max 200)
 *   - offset         (default 0)
 */
export const getPredictionHistory = async (req, res) => {
    const { competition_id, season_label, limit = 50, offset = 0 } = req.query;
    const safeLimit  = Math.min(parseInt(limit, 10)  || 50,  200);
    const safeOffset = parseInt(offset, 10) || 0;

    try {
        const conditions = [`m.home_score IS NOT NULL`, `p.model_name = 'v4_global_1x2'`];
        const params = [];

        if (competition_id) {
            params.push(competition_id);
            conditions.push(`m.competition_id = $${params.length}`);
        }
        if (season_label) {
            params.push(season_label);
            conditions.push(`m.season_label = $${params.length}`);
        }

        params.push(safeLimit, safeOffset);
        const limitIdx  = params.length - 1;
        const offsetIdx = params.length;

        const rows = await db.all(
            `SELECT
                m.match_id,
                m.match_date,
                m.season_label,
                m.home_score,
                m.away_score,
                hc.name              AS home_team,
                hc.current_logo_url  AS home_logo,
                ac.name              AS away_team,
                ac.current_logo_url  AS away_logo,
                comp.name            AS competition_name,
                comp.competition_id,
                p.prediction_json,
                p.confidence_score,
                p.model_name,
                p.created_at         AS predicted_at
             FROM v4.ml_predictions p
             JOIN v4.matches m      ON m.match_id       = p.match_id
             JOIN v4.clubs hc       ON m.home_club_id   = hc.club_id
             JOIN v4.clubs ac       ON m.away_club_id   = ac.club_id
             LEFT JOIN v4.competitions comp ON m.competition_id = comp.competition_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY m.match_date DESC
             LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
            params
        );

        const enriched = rows.map((row) => {
            let predData = null;
            try {
                predData = typeof row.prediction_json === 'string'
                    ? JSON.parse(row.prediction_json)
                    : row.prediction_json;
            } catch { /* ignore */ }

            const actualOutcome = row.home_score > row.away_score ? '1'
                : row.home_score < row.away_score ? '2' : 'N';

            let predictedOutcome = null;
            let probHome = null, probDraw = null, probAway = null;

            if (predData) {
                // V4 predictions store { ft_1x2: { home, draw, away }, ... }
                const probs = predData.ft_1x2 || predData.probabilities || predData;
                probHome = parseFloat(probs.home ?? 0);
                probDraw = parseFloat(probs.draw ?? 0);
                probAway = parseFloat(probs.away ?? 0);

                if (probHome >= probDraw && probHome >= probAway) predictedOutcome = '1';
                else if (probDraw >= probHome && probDraw >= probAway) predictedOutcome = 'N';
                else predictedOutcome = '2';
            }

            return {
                match_id:         Number(row.match_id),
                match_date:       row.match_date,
                season_label:     row.season_label,
                competition_id:   row.competition_id,
                competition_name: row.competition_name,
                home_team:        row.home_team,
                home_logo:        row.home_logo,
                away_team:        row.away_team,
                away_logo:        row.away_logo,
                actual_home:      row.home_score,
                actual_away:      row.away_score,
                actual_outcome:   actualOutcome,
                prob_home:        probHome,
                prob_draw:        probDraw,
                prob_away:        probAway,
                predicted_outcome: predictedOutcome,
                was_correct:      predictedOutcome !== null && predictedOutcome === actualOutcome,
                confidence_score: row.confidence_score,
                model_name:       row.model_name,
                predicted_at:     row.predicted_at
            };
        });

        return res.json({ success: true, data: enriched, total: enriched.length });
    } catch (err) {
        logger.error({ err }, 'getPredictionHistory error');
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * POST /v4/match/:matchId/predict
 *
 * Triggers live inference for a V4 match via ml-service /predict/v4.
 * ml-service stores result in v4.ml_predictions automatically (via predictor_v4.py).
 */
export const predictV4Match = async (req, res) => {
    const { matchId } = req.params;

    try {
        const mlResponse = await axios.post(
            `${ML_SERVICE_URL}/predict/v4`,
            { match_id: Number(matchId) },
            { timeout: 30000 }
        );

        const prediction = mlResponse.data;

        if (!prediction?.success) {
            return res.status(422).json({
                success: false,
                error: prediction?.detail || 'ML service returned failure',
                match_id: Number(matchId)
            });
        }

        // V4 predictor stores in v4.ml_predictions directly — no V3 bridge needed
        const ft1x2 = prediction.predictions?.ft_1x2 || prediction.probabilities || null;

        return res.json({
            success: true,
            data: {
                match_id:     Number(matchId),
                source:       prediction.source || 'v4',
                model_name:   prediction.model_name || 'v4_global_1x2',
                probabilities: ft1x2,
                predictions:  prediction.predictions || null,
                top_features: prediction.top_features || [],
                latency_ms:   prediction.latency_ms
            }
        });
    } catch (err) {
        if (err.response?.status === 404) {
            return res.status(404).json({ success: false, error: `Match ${matchId} not found in V4` });
        }
        logger.error({ err, matchId }, 'predictV4Match error');
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /v4/ml/foresight/competitions
 *
 * Returns V4 competitions that have upcoming matches (home_score IS NULL, match_date >= today).
 * Used to populate the league/competition picker in MLForesightHub.
 */
export const getV4ForesightCompetitions = async (_req, res) => {
    try {
        const rows = await db.all(
            `SELECT
                comp.competition_id,
                comp.name AS competition_name,
                comp.competition_type,
                comp.current_logo_url AS logo,
                COUNT(m.match_id) AS upcoming_count
             FROM v4.matches m
             JOIN v4.competitions comp ON m.competition_id = comp.competition_id
             WHERE m.home_score IS NULL
               AND m.match_date >= CURRENT_DATE
             GROUP BY comp.competition_id, comp.name, comp.competition_type, comp.current_logo_url
             HAVING COUNT(m.match_id) > 0
             ORDER BY COUNT(m.match_id) DESC`
        );

        return res.json({
            success: true,
            data: rows.map((r) => ({
                competitionId: String(r.competition_id),
                competitionName: r.competition_name,
                competitionType: r.competition_type,
                logo: r.logo || null,
                upcomingCount: Number(r.upcoming_count)
            }))
        });
    } catch (err) {
        logger.error({ err }, 'getV4ForesightCompetitions error');
        res.status(500).json({ success: false, error: err.message });
    }
};

/**
 * GET /v4/ml/foresight/competition/:competitionId
 *
 * Returns upcoming V4 matches for a competition, enriched with ML predictions
 * (via v4.fixture_match_mapping → V3_Submodel_Outputs when available).
 *
 * Shape is compatible with ForesightFixtureCard.
 */
export const getV4ForesightMatches = async (req, res) => {
    const { competitionId } = req.params;
    const { season } = req.query;

    try {
        // 1. Build WHERE clause
        const conditions = [
            `m.competition_id = $1`,
            `m.home_score IS NULL`,
            `m.match_date >= CURRENT_DATE`
        ];
        const params = [competitionId];

        if (season) {
            params.push(season);
            conditions.push(`m.season_label = $${params.length}`);
        }

        const matches = await db.all(
            `SELECT
                m.match_id,
                m.match_date,
                m.season_label,
                m.home_club_id,
                m.away_club_id,
                m.round_label,
                hc.name              AS home_team_name,
                hc.current_logo_url  AS home_team_logo,
                ac.name              AS away_team_name,
                ac.current_logo_url  AS away_team_logo,
                comp.name            AS competition_name,
                fmm.v3_fixture_id,
                fmm.confidence       AS mapping_confidence
             FROM v4.matches m
             JOIN v4.clubs hc  ON m.home_club_id  = hc.club_id
             JOIN v4.clubs ac  ON m.away_club_id  = ac.club_id
             JOIN v4.competitions comp ON m.competition_id = comp.competition_id
             LEFT JOIN v4.fixture_match_mapping fmm
                ON fmm.v4_match_id = m.match_id
               AND fmm.confidence IN ('HIGH', 'MEDIUM')
             WHERE ${conditions.join(' AND ')}
             ORDER BY m.match_date ASC
             LIMIT 50`,
            params
        );

        if (!matches.length) {
            return res.json({ success: true, data: [] });
        }

        // 2. Fetch ML predictions via ml-service /predict/v4/batch
        // match_ids are BigInt from pg — normalize to Number for JSON serialization
        // (all V4 match_ids are within Number.MAX_SAFE_INTEGER range)
        const matchIds = matches.map((m) => Number(m.match_id));
        const predictionMap = new Map(); // String(match_id) → { home, draw, away }

        try {
            const mlResponse = await axios.post(
                `${ML_SERVICE_URL}/predict/v4/batch`,
                { match_ids: matchIds },
                { timeout: 30000 }
            );

            const results = mlResponse.data?.results || [];
            results.forEach((r) => {
                if (r.success && r.probabilities) {
                    predictionMap.set(String(r.match_id), r.probabilities);
                }
            });
        } catch (mlErr) {
            // ml-service unavailable — proceed without predictions
            logger.warn({ err: mlErr.message }, 'ml-service batch prediction unavailable for V4 foresight');
        }

        // 3. Build response payload compatible with ForesightFixtureCard
        const data = matches.map((m) => {
            const probs = predictionMap.get(String(m.match_id)) || null;
            // probs shape: { home, draw, away } → convert to 1N2 keys for projectedResult logic
            const probs1N2 = probs ? { '1': probs.home, 'N': probs.draw, '2': probs.away } : null;

            // Derive projected result from 1N2 probs
            let projectedResult = null;
            if (probs1N2) {
                const best = Object.entries(probs1N2).sort((a, b) => b[1] - a[1])[0];
                if (best) {
                    const labelMap = { '1': 'Victoire domicile', 'N': 'Nul', '2': 'Victoire extérieur' };
                    projectedResult = {
                        selection: best[0],
                        label: labelMap[best[0]] ?? best[0],
                        probability: best[1]
                    };
                }
            }

            const predictionStatus = projectedResult ? 'ready' : 'missing';

            return {
                fixtureId: m.match_id,
                matchId: m.match_id,
                v3FixtureId: m.v3_fixture_id || null,
                leagueName: m.competition_name,
                date: m.match_date,
                round: m.round_label || '',
                status: 'NS',
                matchState: 'upcoming',
                homeTeam: {
                    teamId: m.home_club_id,
                    name: m.home_team_name,
                    logo: m.home_team_logo || null
                },
                awayTeam: {
                    teamId: m.away_club_id,
                    name: m.away_team_name,
                    logo: m.away_team_logo || null
                },
                actualScore: null,
                actualResult: null,
                verdict: null,
                predictionStatus,
                projectedResult,
                markets: {
                    ftResult: probs1N2 ? {
                        selection: projectedResult?.selection,
                        selectionLabel: projectedResult?.label,
                        probability: projectedResult?.probability,
                        probabilities: probs1N2
                    } : null
                }
            };
        });

        return res.json({ success: true, data });
    } catch (err) {
        logger.error({ err, competitionId }, 'getV4ForesightMatches error');
        res.status(500).json({ success: false, error: err.message });
    }
};
