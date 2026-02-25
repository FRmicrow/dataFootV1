/**
 * Quant Service (US_160, US_161)
 * Handles Edge Calculation, Confidence Weighting, and Risk Classification.
 */

export class QuantService {
    /**
     * Calculates the statistical edge and risk level.
     * @param {Object} modelProbs - Probabilities from ML Model { home: 0.4, ... }
     * @param {Object} marketProbs - Fair probabilities from Bookie { home: 0.38, ... }
     * @param {Object} context - { hasLineups: bool, volatility: obj, leagueHistoryCount: int }
     */
    static calculateValue(modelProbs, marketProbs, context = {}) {
        if (!modelProbs || !marketProbs) return null;

        const outcomes = ['home', 'draw', 'away'];
        const analysis = {};

        outcomes.forEach(side => {
            const mProb = modelProbs[side] || 0;
            const bProb = marketProbs[side] || 0;

            // Edge % = (Model Probability - Implied Probability) * 100
            const edge = parseFloat(((mProb - bProb) * 100).toFixed(2));

            // Expected Value (EV) = (Model Prob * (1/Bookie Prob)) - 1
            const ev = bProb > 0 ? (mProb / bProb) - 1 : 0;

            // Suggested Kelly Stake (US_160 AC 22)
            // f* = p - (q/b) = (bp - q) / b
            // where p is win prob, q is loss prob, b are odds - 1
            // simplified: Edge / (Fair Odds - 1)
            const fairOdds = bProb > 0 ? 1 / bProb : 0;
            const kelly = fairOdds > 1 ? edge / 100 / (fairOdds - 1) : 0;

            analysis[side] = {
                model_prob: mProb,
                market_prob: bProb,
                edge,
                ev: parseFloat(ev.toFixed(4)),
                kelly_stake: Math.max(0, parseFloat((kelly * 100).toFixed(2))) // as % of bankroll
            };
        });

        // ── Confidence Scoring (US_160 AC 17-20) ──
        let confidence = 40; // Base baseline (Lowered starting point for strictness)

        // 1. Data Completeness (+20)
        if (context.hasLineups) confidence += 20;

        // 2. Historical Accuracy (+30)
        // If Brier score is low (good) for this league, boost confidence
        if (context.brierScore !== undefined) {
            if (context.brierScore < 0.20) confidence += 30; // Elite accuracy
            else if (context.brierScore < 0.25) confidence += 15; // Solid accuracy
            else if (context.brierScore > 0.35) confidence -= 20; // High variance penalty
        }

        // 3. Volatility Check (-10)
        if (context.volatility?.movement?.is_steam) {
            confidence -= 10;
        }

        // 4. Sample Size Check
        if (context.leagueHistoryCount && context.leagueHistoryCount < 15) {
            confidence -= 15;
        }

        confidence = Math.max(0, Math.min(100, confidence));

        // Find best pick
        const bestOutcome = outcomes.reduce((prev, curr) =>
            (analysis[curr].edge > analysis[prev].edge) ? curr : prev,
            outcomes[0]
        );
        const bestVal = analysis[bestOutcome];

        // ── Value Bet Detection (US_160 AC 21) ──
        const isValueBet = bestVal.edge > 3 && confidence > 60;

        // ── Risk Classification (US_161) ──
        let riskLevel = 'NONE';
        const isDraw = bestOutcome === 'draw';

        // Variance Penalty (AC 21): Downgrade if low sample size
        const isLowSample = context.leagueHistoryCount && context.leagueHistoryCount < 20;

        if (bestVal.edge > 1) {
            if (bestVal.model_prob > 0.65 && bestVal.edge > 2 && confidence > 80) {
                riskLevel = 'LOW-RISK';
            } else if (bestVal.edge > 5 && confidence >= 50 && confidence <= 80) {
                riskLevel = 'MEDIUM-RISK';
            } else if (bestVal.edge > 10 || (1 / bestVal.market_prob) > 5.0 || (isDraw && confidence < 70)) {
                // Draws are generally higher risk (AC 29)
                riskLevel = 'SPECULATIVE';
            } else {
                riskLevel = 'CONSIDERABLE';
            }

            // Apply Downgrade for Low Sample (AC 21)
            if (isLowSample && riskLevel === 'LOW-RISK') riskLevel = 'MEDIUM-RISK';
            if (isLowSample && riskLevel === 'MEDIUM-RISK') riskLevel = 'CONSIDERABLE';
        }

        return {
            outcomes: analysis,
            best_pick: bestOutcome,
            edge: bestVal.edge,
            ev: bestVal.ev,
            confidence,
            is_value_bet: isValueBet,
            kelly_suggested: bestVal.kelly_stake,
            risk_level: riskLevel
        };
    }
}

export default QuantService;
