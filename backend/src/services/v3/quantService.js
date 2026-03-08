export class QuantService {
    /**
     * Calculates the statistical edge and risk level.
     */
    static calculateValue(modelProbs, marketProbs, context = {}) {
        if (!modelProbs || !marketProbs) return null;

        const outcomes = ['home', 'draw', 'away'];
        const analysis = {};

        outcomes.forEach(side => {
            const mProb = modelProbs[side] || 0;
            const bProb = marketProbs[side] || 0;
            const edge = Number.parseFloat(((mProb - bProb) * 100).toFixed(2));
            const ev = bProb > 0 ? (mProb / bProb) - 1 : 0;
            const fairOdds = bProb > 0 ? 1 / bProb : 0;
            const kelly = fairOdds > 1 ? edge / 100 / (fairOdds - 1) : 0;

            analysis[side] = {
                model_prob: mProb,
                market_prob: bProb,
                edge,
                ev: Number.parseFloat(ev.toFixed(4)),
                kelly_stake: Math.max(0, Number.parseFloat((kelly * 100).toFixed(2)))
            };
        });

        const bestOutcome = outcomes.reduce((prev, curr) => (analysis[curr].edge > analysis[prev].edge) ? curr : prev, outcomes[0]);
        const bestVal = analysis[bestOutcome];
        const confidence = this.calculateConfidence(context);

        return {
            outcomes: analysis,
            best_pick: bestOutcome,
            edge: bestVal.edge,
            ev: bestVal.ev,
            confidence,
            is_value_bet: bestVal.edge > 3 && confidence > 60,
            kelly_suggested: bestVal.kelly_stake,
            risk_level: this.determineRiskLevel(bestVal, bestOutcome, confidence, context)
        };
    }

    /**
     * US_160: Confidence Scoring Logic
     */
    static calculateConfidence(context) {
        let score = 40;
        if (context.hasLineups) score += 20;
        if (context.brierScore !== undefined) {
            if (context.brierScore < 0.20) score += 30;
            else if (context.brierScore < 0.25) score += 15;
            else if (context.brierScore > 0.35) score -= 20;
        }
        if (context.volatility?.movement?.is_steam) score -= 10;
        if (context.leagueHistoryCount && context.leagueHistoryCount < 15) score -= 15;
        return Math.max(0, Math.min(100, score));
    }

    /**
     * US_161: Risk Classification Logic
     */
    static determineRiskLevel(bestVal, outcome, confidence, context) {
        if (bestVal.edge <= 1) return 'NONE';

        let level = 'CONSIDERABLE';
        const odds = 1 / bestVal.market_prob;

        if (bestVal.model_prob > 0.65 && bestVal.edge > 2 && confidence > 80) {
            level = 'LOW-RISK';
        } else if (bestVal.edge > 5 && confidence >= 50 && confidence <= 80) {
            level = 'MEDIUM-RISK';
        } else if (bestVal.edge > 10 || odds > 5.0 || (outcome === 'draw' && confidence < 70)) {
            level = 'SPECULATIVE';
        }

        // Apply Downgrade for Low Sample
        const isLowSample = context.leagueHistoryCount && context.leagueHistoryCount < 20;
        if (isLowSample) {
            if (level === 'LOW-RISK') return 'MEDIUM-RISK';
            if (level === 'MEDIUM-RISK') return 'CONSIDERABLE';
        }
        return level;
    }
}

export default QuantService;
