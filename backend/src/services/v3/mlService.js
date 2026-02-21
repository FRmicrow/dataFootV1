/**
 * mlService.js — Node.js HTTP wrapper for the Python ML microservice (US_026)
 *
 * Architecture:
 *   Node (orchestrator) → POST http://localhost:5050/predict → Python (ML)
 *   Node then computes: edge, quarter-kelly, confidence classification.
 *   Node writes the prediction to V3_ML_Predictions (idempotency check first).
 *
 * Graceful degradation:
 *   If the Python service is down, ALL functions return { prediction: null, edge: null }
 *   and log a warning. The main app NEVER crashes due to ML service unavailability.
 */

import axios from 'axios';
import db from '../../config/database.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5050';
const ML_TIMEOUT_MS = 15_000; // 15 seconds — feature engineering can be slow
const EDGE_THRESHOLD_SHOW = 0.03;   // minimum edge to show any recommendation
const KELLY_MAX_STAKE = 0.05;        // hard cap: 5% of bankroll
const KELLY_FRACTION = 0.25;         // quarter-Kelly multiplier

// ── HTTP client ──────────────────────────────────────────────────────────────

const mlClient = axios.create({
    baseURL: ML_SERVICE_URL,
    timeout: ML_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
});

/** Check if the Python ML service is reachable. */
export async function checkMlServiceHealth() {
    try {
        const { data } = await mlClient.get('/health');
        return { ok: true, ...data };
    } catch {
        return { ok: false };
    }
}

/**
 * Trigger empowerment for a league in the Python service.
 */
export async function empowerLeague(leagueId, forceRebuild = false) {
    try {
        const { data } = await mlClient.post('/empower', {
            league_id: leagueId,
            force_rebuild: forceRebuild
        });
        return data;
    } catch (err) {
        throw new Error(`ML Service empowerment failed: ${err.message}`);
    }
}

/**
 * Fetch empowerment stats for a league: {processed, total, pending}
 */
export async function getLeagueEmpowermentStatus(leagueId) {
    try {
        // Query total completed matches in this league
        const totalRow = db.get(
            `SELECT COUNT(*) as count FROM V3_Fixtures 
             WHERE league_id = ? AND status_short IN ('FT', 'AET', 'PEN') AND goals_home IS NOT NULL`,
            [leagueId]
        );

        // Query already processed matches in the ML Store
        const processedRow = db.get(
            `SELECT COUNT(*) as count FROM V3_ML_Feature_Store WHERE league_id = ?`,
            [leagueId]
        );

        const total = totalRow?.count || 0;
        const processed = processedRow?.count || 0;

        return {
            league_id: leagueId,
            total,
            processed,
            pending: Math.max(0, total - processed),
            percent: total > 0 ? parseFloat(((processed / total) * 100).toFixed(1)) : 0
        };
    } catch (err) {
        console.error(`[mlService] getLeagueEmpowermentStatus error:`, err.message);
        return { league_id: leagueId, total: 0, processed: 0, pending: 0, percent: 0 };
    }
}

// ── Edge & Kelly computation (runs in Node, not Python) ───────────────────────

/**
 * Remove bookmaker margin and compute the true implied probabilities.
 * @param {number} oddsHome
 * @param {number} oddsDraw
 * @param {number} oddsAway
 * @returns {{ trueImplied: {home, draw, away}, margin: number }}
 */
function computeTrueImplied(oddsHome, oddsDraw, oddsAway) {
    const rawHome = 1 / oddsHome;
    const rawDraw = 1 / oddsDraw;
    const rawAway = 1 / oddsAway;
    const margin = rawHome + rawDraw + rawAway;
    return {
        trueImplied: {
            home: rawHome / margin,
            draw: rawDraw / margin,
            away: rawAway / margin,
        },
        margin,
    };
}

/**
 * Quarter-Kelly stake as a fraction of bankroll.
 * f* = (p*b - q) / b → /4 → capped at KELLY_MAX_STAKE.
 * @param {number} p   Model probability for the outcome
 * @param {number} b   Decimal odds - 1
 * @returns {number}   Fraction of bankroll (0 if no value)
 */
function kellyStake(p, b) {
    const q = 1 - p;
    const raw = (p * b - q) / b;
    if (raw <= 0) return 0;
    return Math.min(raw * KELLY_FRACTION, KELLY_MAX_STAKE);
}

/**
 * Confidence classification based on edge magnitude.
 * @param {number} edge
 * @returns {string} 'STRONG' | 'MODERATE' | 'WEAK' | 'NO_VALUE'
 */
function classifyConfidence(edge) {
    if (edge >= 0.10) return 'STRONG';
    if (edge >= 0.05) return 'MODERATE';
    if (edge >= 0.03) return 'WEAK';
    return 'NO_VALUE';
}

/**
 * Compute edge, quarter-kelly, and value bet for each outcome.
 *
 * @param {{ home: number, draw: number, away: number }} modelProbs
 * @param {{ odds_home: number, odds_draw: number, odds_away: number }} bookmaker
 * @returns {object} edge object + stakes + recommendation
 */
function computeEdgeAndKelly(modelProbs, bookmaker) {
    const { oddsHome, oddsDraw, oddsAway } = bookmaker;

    if (!oddsHome || !oddsDraw || !oddsAway) {
        return { edge: null, stakes: null };
    }

    const { trueImplied } = computeTrueImplied(oddsHome, oddsDraw, oddsAway);

    const edgeHome = parseFloat((modelProbs.home - trueImplied.home).toFixed(4));
    const edgeDraw = parseFloat((modelProbs.draw - trueImplied.draw).toFixed(4));
    const edgeAway = parseFloat((modelProbs.away - trueImplied.away).toFixed(4));

    // Find the best value bet (highest positive edge)
    const candidates = [
        { outcome: 'home', edge: edgeHome, odds: oddsHome, prob: modelProbs.home },
        { outcome: 'draw', edge: edgeDraw, odds: oddsDraw, prob: modelProbs.draw },
        { outcome: 'away', edge: edgeAway, odds: oddsAway, prob: modelProbs.away },
    ];

    const bestBet = candidates.reduce((best, c) => c.edge > best.edge ? c : best, candidates[0]);

    const hasValue = bestBet.edge > EDGE_THRESHOLD_SHOW;
    const stakeQK = hasValue ? kellyStake(bestBet.prob, bestBet.odds - 1) : 0;
    const confidence = classifyConfidence(hasValue ? bestBet.edge : 0);

    return {
        edge: {
            home: edgeHome,
            draw: edgeDraw,
            away: edgeAway,
            value_bet: hasValue ? bestBet.outcome : null,
        },
        stakes: {
            home_quarter_kelly: hasValue && bestBet.outcome === 'home' ? parseFloat(stakeQK.toFixed(4)) : 0,
            draw_quarter_kelly: hasValue && bestBet.outcome === 'draw' ? parseFloat(stakeQK.toFixed(4)) : 0,
            away_quarter_kelly: hasValue && bestBet.outcome === 'away' ? parseFloat(stakeQK.toFixed(4)) : 0,
            recommendation: stakeQK > 0

                ? `${(stakeQK * 100).toFixed(1)}% of bankroll`
                : 'No value bet detected',
        },
        confidence,
    };
}

// ── Main prediction flow ──────────────────────────────────────────────────────

/**
 * Fetch a prediction for a fixture, computing edge + quarter-kelly.
 * Stores result in V3_ML_Predictions (idempotent — if already exists, returns cached).
 *
 * @param {number} fixtureId
 * @param {{ odds_home, odds_draw, odds_away, bookmaker_source }} bookmakerOdds
 * @param {object|null} preBuiltFeatures  Optional pre-computed feature dict
 * @returns {object}  Full prediction response or null-safe fallback
 */
export async function getPredictionForFixture(fixtureId, bookmakerOdds = {}, preBuiltFeatures = null) {
    try {
        // ── Idempotency check: return cached prediction if exists ─────────
        const existing = db.get(
            `SELECT * FROM V3_ML_Predictions
             WHERE fixture_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [fixtureId],
        );

        if (existing) {
            const modelProbs = {
                home: existing.prob_home,
                draw: existing.prob_draw,
                away: existing.prob_away,
            };
            const { edge, stakes, confidence } = computeEdgeAndKelly(modelProbs, {
                oddsHome: bookmakerOdds.odds_home,
                oddsDraw: bookmakerOdds.odds_draw,
                oddsAway: bookmakerOdds.odds_away,
            });

            return _formatResponse(fixtureId, existing.model_version, modelProbs, edge, stakes, confidence, bookmakerOdds, null);
        }

        // ── Call Python ML service ─────────────────────────────────────────
        const payload = { fixture_id: fixtureId, target: '1x2' };
        if (preBuiltFeatures) {
            payload.features = preBuiltFeatures;
        }

        const { data: mlResult } = await mlClient.post('/predict', payload);

        const modelProbs = mlResult.probabilities;
        const { edge, stakes, confidence } = computeEdgeAndKelly(modelProbs, {
            oddsHome: bookmakerOdds.odds_home,
            oddsDraw: bookmakerOdds.odds_draw,
            oddsAway: bookmakerOdds.odds_away,
        });

        // ── Persist prediction (US_026 Technical Notes) ───────────────────
        try {
            db.run(
                `INSERT INTO V3_ML_Predictions
                 (fixture_id, model_version, prob_home, prob_draw, prob_away,
                  edge_home, edge_draw, edge_away, value_bet, quarter_kelly, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    fixtureId,
                    mlResult.model_version,
                    modelProbs.home,
                    modelProbs.draw,
                    modelProbs.away,
                    edge?.home ?? null,
                    edge?.draw ?? null,
                    edge?.away ?? null,
                    edge?.value_bet ?? null,
                    stakes?.home_quarter_kelly || stakes?.draw_quarter_kelly || stakes?.away_quarter_kelly || 0,
                ],
            );
        } catch (dbErr) {
            // DB write failure should never crash the response
            console.warn('[mlService] Failed to persist prediction:', dbErr.message);
        }

        return _formatResponse(
            fixtureId,
            mlResult.model_version,
            modelProbs,
            edge,
            stakes,
            confidence,
            bookmakerOdds,
            mlResult.top_features,
        );
    } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.response?.status >= 500) {
            console.warn(`[mlService] ML service unavailable for fixture ${fixtureId}: ${err.message}`);
        } else {
            console.error(`[mlService] Unexpected error for fixture ${fixtureId}:`, err.message);
        }
        // Graceful fallback — never crash the main app
        return { prediction: null, edge: null };
    }
}

/**
 * Assemble the final response shape for React (US_026 AC 5).
 */
function _formatResponse(fixtureId, modelVersion, probs, edge, stakes, confidence, bookmaker, topFeatures) {
    const topMarket = Object.entries(probs).reduce(
        (best, [k, v]) => (v > best[1] ? [k, v] : best),
        ['home', 0],
    )[0];

    return {
        fixture_id: fixtureId,
        prediction: {
            model_version: modelVersion,
            probabilities: probs,
            top_market: topMarket,
            confidence,
            top_features: topFeatures || [],
        },
        edge,
        stakes,
        bookmaker: {
            odds_home: bookmaker.odds_home,
            odds_draw: bookmaker.odds_draw,
            odds_away: bookmaker.odds_away,
            source: bookmaker.bookmaker_source || 'unknown',
        },
    };
}

/**
 * Fetch model performance stats for a league (used by React track record widget).
 * Queries V3_ML_Predictions joined with V3_Fixtures on league_id.
 *
 * @param {number} leagueId
 * @returns {object}
 */
export async function getModelPerformance(leagueId) {
    try {
        const rows = db.all(
            `SELECT
                p.prob_home, p.prob_draw, p.prob_away,
                p.value_bet, p.edge_home, p.edge_draw, p.edge_away,
                f.goals_home, f.goals_away
             FROM V3_ML_Predictions p
             JOIN V3_Fixtures f ON f.fixture_id = p.fixture_id
             WHERE f.league_id = ?
               AND f.goals_home IS NOT NULL
             ORDER BY p.created_at DESC`,
            [leagueId],
        );

        if (!rows.length) return { total: 0, won: 0, roi: 0, accuracy: 0 };

        let roi = 0;
        let won = 0;
        let total = 0;

        for (const row of rows) {
            if (!row.value_bet) continue;
            total++;

            const gh = row.goals_home;
            const ga = row.goals_away;
            const actual = gh > ga ? 'home' : gh < ga ? 'away' : 'draw';

            if (actual === row.value_bet) {
                won++;
                // Approximate ROI using implied quarter-kelly stake
                const stake = 0.025; // 2.5% avg stake per bet
                roi += stake; // simplified ROI tracking (full calc needs odds at bet time)
            } else {
                roi -= 0.025;
            }
        }

        const accuracy = total > 0 ? ((won / total) * 100).toFixed(1) : '0.0';
        const roiPct = total > 0 ? ((roi / total) * 100).toFixed(1) : '0.0';

        return {
            total,
            won,
            lost: total - won,
            accuracy: parseFloat(accuracy),
            roi: parseFloat(roiPct),
        };
    } catch (err) {
        console.error('[mlService] getModelPerformance error:', err.message);
        return { total: 0, won: 0, roi: 0, accuracy: 0 };
    }
}
/**
 * Background scanner to pre-calculate ML predictions for all upcoming matches.
 * Useful to populate the 'AI Augmented' matches dashboard.
 */
export async function scanMlOpportunities() {
    try {
        // 1. Get upcoming NS matches for tracked leagues
        // We look ahead 3 days
        const fixtures = db.all(`
            SELECT f.fixture_id, f.api_id, f.league_id 
            FROM V3_Fixtures f
            WHERE f.status_short = 'NS' 
            AND date(f.date) BETWEEN date('now') AND date('now', '+3 days')
            LIMIT 50
        `);

        if (!fixtures.length) return { processed: 0, message: 'No upcoming fixtures to scan' };

        console.log(`🧠 ML Scanner: Analyzing ${fixtures.length} upcoming matches...`);

        let processed = 0;
        for (const fix of fixtures) {
            // Fetch odds if available
            const oddsRow = db.get(
                `SELECT value_home_over AS odds_home, value_draw AS odds_draw, value_away_under AS odds_away, bookmaker_id
                 FROM V3_Odds WHERE fixture_id = ? AND market_id = 1 LIMIT 1`,
                [fix.fixture_id]
            );

            const bookOdds = oddsRow ? {
                odds_home: oddsRow.odds_home,
                odds_draw: oddsRow.odds_draw,
                odds_away: oddsRow.odds_away,
                bookmaker_source: oddsRow.bookmaker_id === 52 ? 'Winamax' : 'Bookmaker'
            } : {};

            // getPredictionForFixture handles idempotency and model call
            await getPredictionForFixture(fix.fixture_id, bookOdds);
            processed++;

            // Tiny throttle to not overwhelm the ML service
            await new Promise(r => setTimeout(r, 100));
        }

        return { success: true, processed };
    } catch (err) {
        console.error('[mlService] scanMlOpportunities error:', err.message);
        return { success: false, error: err.message };
    }
}
/**
 * Trigger model training.
 */
export async function triggerTraining(target = 'all', limit = 10000, leagueIds = null) {
    try {
        const { data } = await mlClient.post('/train', { target, limit, league_ids: leagueIds });
        return data;
    } catch (err) {
        console.error('[mlService] triggerTraining error:', err.message);
        throw err;
    }
}

/**
 * Get current training status.
 */
export async function getTrainingStatus() {
    try {
        const { data } = await mlClient.get('/model/train/status');
        return data;
    } catch {
        return { status: 'offline' };
    }
}

/**
 * Get training logs.
 */
export async function getTrainingLogs(lines = 50) {
    try {
        const { data } = await mlClient.get(`/model/train/logs?lines=${lines}`);
        return data;
    } catch {
        return { logs: ['Error fetching logs'] };
    }
}

/**
 * Stop running training.
 */
export async function stopTraining() {
    try {
        const { data } = await mlClient.post('/model/train/stop');
        return data;
    } catch (err) {
        throw err;
    }
}
