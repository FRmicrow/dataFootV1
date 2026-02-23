import db from '../../config/database.js';

/**
 * Simulation & Backtesting Service (US_170, US_171)
 * Validates model profitability and statistical calibration.
 */
export class SimulationService {
    /**
     * Run a Strategy Simulation (US_170)
     * Calculates ROI and Drawdown for a specific configuration.
     */
    static runBacktest(options = {}) {
        const {
            leagueId = null,
            minEdge = 3.0,
            minConfidence = 60,
            dateRange = null, // [start, end]
            stakeType = 'flat', // 'flat' or 'kelly'
            flatStake = 100,
            pickFilter = null // '1', 'X', '2'
        } = options;

        let query = `
            SELECT 
                p.*,
                v.res_1n2,
                v.odds_home, v.odds_draw, v.odds_away
            FROM V3_Predictions p
            JOIN v_market_settlements v ON p.fixture_id = v.fixture_id
            WHERE p.edge_value >= ? AND p.confidence_score >= ?
        `;
        const params = [minEdge, minConfidence];

        if (leagueId) {
            query += " AND p.league_id = ?";
            params.push(leagueId);
        }

        if (dateRange && dateRange.length === 2) {
            query += " AND v.date BETWEEN ? AND ?";
            params.push(dateRange[0], dateRange[1]);
        }

        const matches = db.all(query, params);

        let bankroll = 0;
        let totalStake = 0;
        let totalReturn = 0;
        let wins = 0;
        let maxBankroll = 0;
        let maxDrawdown = 0;
        const equityCurve = [];

        matches.forEach(m => {
            // Robust Parsing (Handle "0.45", "45", or "45%")
            const parseProb = (p) => {
                if (!p) return 0;
                let val = parseFloat(p.toString().replace('%', ''));
                if (val > 1) val = val / 100; // Assume it was 45 format
                return val;
            };

            const pH = parseProb(m.prob_home);
            const pD = parseProb(m.prob_draw);
            const pA = parseProb(m.prob_away);

            // Derive best pick (AC 16: Strategy Definition)
            // In a more advanced version, we'd filter based on the 'options' passed.
            const modelProbs = { home: pH, draw: pD, away: pA };
            const marketProbs = {
                home: m.odds_home ? 1 / m.odds_home : 0,
                draw: m.odds_draw ? 1 / m.odds_draw : 0,
                away: m.odds_away ? 1 / m.odds_away : 0
            };

            // Use QuantService to find the actual edge-based pick
            const outcomes = ['home', 'draw', 'away'];
            let bestPick = '1';
            let maxEdge = -999;
            let finalOdd = 0;

            outcomes.forEach(side => {
                const edge = (modelProbs[side] - marketProbs[side]) * 100;
                if (edge > maxEdge) {
                    maxEdge = edge;
                    bestPick = side === 'home' ? '1' : (side === 'draw' ? 'X' : '2');
                    finalOdd = side === 'home' ? m.odds_home : (side === 'draw' ? m.odds_draw : m.odds_away);
                }
            });

            if (!finalOdd || finalOdd <= 1) return; // Skip if no valid odds (AC 33)
            if (pickFilter && bestPick !== pickFilter) return; // Strategy Filter (AC 16)

            const stake = flatStake;
            totalStake += stake;

            const isWin = m.res_1n2 === bestPick;
            const result = isWin ? (stake * finalOdd) - stake : -stake;

            totalReturn += (isWin ? (stake * finalOdd) : 0);
            bankroll += result;
            if (isWin) wins++;

            // Drawdown tracking (AC 18)
            if (bankroll > maxBankroll) maxBankroll = bankroll;
            const drawdown = maxBankroll - bankroll;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;

            equityCurve.push({
                fixture_id: m.fixture_id,
                date: m.date,
                balance: parseFloat(bankroll.toFixed(2)),
                result: isWin ? 'WON' : 'LOST'
            });
        });

        const roi = totalStake > 0 ? (bankroll / totalStake) : 0;
        const winRate = equityCurve.length > 0 ? (wins / equityCurve.length) : 0;

        return {
            total_bets: equityCurve.length,
            win_rate: parseFloat((winRate * 100).toFixed(2)),
            roi: parseFloat((roi * 100).toFixed(2)),
            net_profit: parseFloat(bankroll.toFixed(2)),
            max_drawdown: parseFloat(maxDrawdown.toFixed(2)),
            equity_curve: equityCurve
        };
    }

    /**
     * Calibration Audit (US_171)
     * Calculates Brier Score and Log Loss.
     */
    static runCalibrationAudit(leagueId = null) {
        let query = `
            SELECT 
                p.prob_home, p.prob_draw, p.prob_away,
                v.outcome_1n2_class
            FROM V3_Predictions p
            JOIN v_market_settlements v ON p.fixture_id = v.fixture_id
        `;
        const params = [];

        if (leagueId) {
            query += " WHERE p.league_id = ?";
            params.push(leagueId);
        }

        const predictions = db.all(query, params);
        if (predictions.length === 0) return { total_predictions: 0, health: 'NO_DATA' };

        const parseProb = (p) => {
            if (!p) return 0;
            let val = parseFloat(p.toString().replace('%', ''));
            if (val > 1) val = val / 100;
            return val;
        };

        let brierSum = 0;
        let logLossSum = 0;

        predictions.forEach(p => {
            const probs = [
                parseProb(p.prob_home),
                parseProb(p.prob_draw),
                parseProb(p.prob_away)
            ];

            // Normalize just in case
            const sum = probs[0] + probs[1] + probs[2];
            if (sum > 0) {
                probs[0] /= sum;
                probs[1] /= sum;
                probs[2] /= sum;
            }

            // Map outcome_1n2_class: 1=Home, 0=Draw, 2=Away
            const actualIndices = { 1: 0, 0: 1, 2: 2 };
            const actualIdx = actualIndices[p.outcome_1n2_class];

            // Brier Score = 1/N * sum((pi - oi)^2)
            // Multiclass Brier: sum over categories
            for (let i = 0; i < 3; i++) {
                const oi = (i === actualIdx) ? 1 : 0;
                brierSum += Math.pow(probs[i] - oi, 2);
            }

            // Log Loss = -1/N * sum(ln(p_actual))
            const pActual = Math.max(0.0001, probs[actualIdx]); // Avoid ln(0)
            logLossSum -= Math.log(pActual);
        });

        const brierScore = brierSum / predictions.length;
        const logLoss = logLossSum / predictions.length;

        // ── Drift Detection (US_171 AC 18) ──
        let driftDetected = false;
        let driftMessage = null;

        if (leagueId) {
            const globalAudit = this.runCalibrationAudit(null); // Run global for baseline
            if (globalAudit && globalAudit.total_predictions > 100) {
                const deviation = (brierScore - globalAudit.brier_score) / globalAudit.brier_score;
                if (Math.abs(deviation) > 0.15) {
                    driftDetected = true;
                    driftMessage = `Calibration drift detected: League ${leagueId} Brier Score is ${Math.round(deviation * 100)}% ${deviation > 0 ? 'worse' : 'better'} than global average.`;
                }
            }
        }

        // Persist metric (US_171 AC 24)
        if (leagueId) {
            db.run(`
                INSERT INTO V3_Backtest_Results (league_id, total_bets, brier_score, roi, created_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [leagueId, predictions.length, brierScore, 0]); // ROI 0 for now as audit is different from simulation
        }

        return {
            total_predictions: predictions.length,
            brier_score: parseFloat(brierScore.toFixed(4)),
            log_loss: parseFloat(logLoss.toFixed(4)),
            health: brierScore < 0.25 ? 'EXCELLENT' : (brierScore < 0.35 ? 'GOOD' : 'NEEDS_RETRAINING'),
            drift: {
                detected: driftDetected,
                message: driftMessage
            }
        };
    }
}

export default SimulationService;
