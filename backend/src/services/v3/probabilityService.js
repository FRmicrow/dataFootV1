/**
 * Implied Probability Engine (US_141)
 * Converts bookmaker odds to fair-value probabilities by removing the margin (overround).
 */

/**
 * Normalizes an array of raw probabilities to ensure they sum to 1 (100%).
 * Uses the standard normalization method (P_fair = P_raw / Sum(P_raw)).
 * 
 * @param {number[]} rawProbs 
 * @returns {number[]} fairProbs
 */
const normalize = (rawProbs) => {
    const sum = rawProbs.reduce((acc, p) => acc + p, 0);
    if (sum === 0) return rawProbs.map(() => 0);
    return rawProbs.map(p => Number.parseFloat((p / sum).toFixed(4)));
};

/**
 * Calculates fair probabilities for a variety of market structures.
 * 
 * @param {Object} odds - { home: 1.5, draw: 4.0, away: 6.0 } OR { over: 1.9, under: 1.9 }
 * @returns {Object} { probabilities: { home: 0.65, ... }, margin: 0.05 }
 */
export const calculateFairProbabilities = (odds) => {
    if (!odds || typeof odds !== 'object') return null;

    const keys = Object.keys(odds).filter(k => odds[k] != null && typeof odds[k] === 'number');
    if (keys.length === 0) return null;

    // 1. Calculate raw probabilities (1/odds)
    const rawProbsMap = {};
    keys.forEach(key => {
        rawProbsMap[key] = 1 / odds[key];
    });

    const rawValues = Object.values(rawProbsMap);
    const sum = rawValues.reduce((acc, v) => acc + v, 0);
    const margin = sum - 1;

    // 2. Normalize to get Fair Probabilities
    const fairValues = normalize(rawValues);
    const fairProbsMap = {};
    keys.forEach((key, index) => {
        fairProbsMap[key] = fairValues[index];
    });

    return {
        probabilities: fairProbsMap,
        margin: Number.parseFloat(margin.toFixed(4)),
        overround: Number.parseFloat((sum * 100).toFixed(2))
    };
};

/**
 * Specific helper for 1X2 market
 */
export const convert1X2ToProbabilities = (home, draw, away) => {
    if (!home || !draw || !away) return null;
    return calculateFairProbabilities({ home, draw, away });
};

/**
 * Specific helper for 2-way markets (O/U, BTTS)
 */
export const convert2WayToProbabilities = (val1, val2) => {
    if (!val1 || !val2) return null;
    return calculateFairProbabilities({ val1, val2 });
};

export default {
    calculateFairProbabilities,
    convert1X2ToProbabilities,
    convert2WayToProbabilities
};
