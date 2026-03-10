import { describe, it, expect } from 'vitest';
import {
    calculateFairProbabilities,
    convert1X2ToProbabilities,
    convert2WayToProbabilities,
} from '../../src/services/v3/probabilityService.js';

// ---------------------------------------------------------------------------
// calculateFairProbabilities
// ---------------------------------------------------------------------------
describe('calculateFairProbabilities', () => {
    it('returns null for null input', () => {
        expect(calculateFairProbabilities(null)).toBeNull();
    });

    it('returns null for non-object input', () => {
        expect(calculateFairProbabilities('odds')).toBeNull();
        expect(calculateFairProbabilities(42)).toBeNull();
    });

    it('returns null for empty object', () => {
        expect(calculateFairProbabilities({})).toBeNull();
    });

    it('returns null for object with no numeric values', () => {
        expect(calculateFairProbabilities({ home: null, draw: null, away: null })).toBeNull();
    });

    it('computes fair probabilities for a standard 1X2 market', () => {
        const result = calculateFairProbabilities({ home: 2.0, draw: 3.5, away: 4.0 });
        expect(result).not.toBeNull();
        expect(result.probabilities).toHaveProperty('home');
        expect(result.probabilities).toHaveProperty('draw');
        expect(result.probabilities).toHaveProperty('away');
    });

    it('fair probabilities sum to 1.0 (±0.001)', () => {
        const result = calculateFairProbabilities({ home: 1.8, draw: 3.6, away: 4.5 });
        const sum = Object.values(result.probabilities).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
    });

    it('calculates a positive margin for a typical bookmaker market', () => {
        // Overround book: raw probs sum > 1
        const result = calculateFairProbabilities({ home: 1.8, draw: 3.5, away: 4.2 });
        expect(result.margin).toBeGreaterThan(0);
        expect(result.overround).toBeGreaterThan(100);
    });

    it('margin is ~0 for a fair (break-even) market', () => {
        // Exact break-even: 1/2 + 1/2 = 1.0
        const result = calculateFairProbabilities({ yes: 2.0, no: 2.0 });
        expect(result.margin).toBeCloseTo(0, 3);
        expect(result.overround).toBeCloseTo(100, 1);
    });

    it('handles an O/U 2-way market', () => {
        const result = calculateFairProbabilities({ over: 1.9, under: 1.9 });
        expect(result).not.toBeNull();
        expect(result.probabilities.over).toBeCloseTo(0.5, 2);
        expect(result.probabilities.under).toBeCloseTo(0.5, 2);
    });

    it('ignores keys with null values', () => {
        // Only numeric keys should be included
        const result = calculateFairProbabilities({ home: 2.0, draw: null, away: 4.0 });
        expect(result.probabilities).not.toHaveProperty('draw');
        expect(result.probabilities).toHaveProperty('home');
        expect(result.probabilities).toHaveProperty('away');
    });

    it('returns probabilities as 4-decimal floats', () => {
        const result = calculateFairProbabilities({ home: 1.5, draw: 4.0, away: 7.0 });
        Object.values(result.probabilities).forEach(p => {
            const decimals = (p.toString().split('.')[1] || '').length;
            expect(decimals).toBeLessThanOrEqual(4);
        });
    });
});

// ---------------------------------------------------------------------------
// convert1X2ToProbabilities
// ---------------------------------------------------------------------------
describe('convert1X2ToProbabilities', () => {
    it('returns null when any argument is falsy', () => {
        expect(convert1X2ToProbabilities(0, 3.5, 4.0)).toBeNull();
        expect(convert1X2ToProbabilities(2.0, null, 4.0)).toBeNull();
        expect(convert1X2ToProbabilities(2.0, 3.5, undefined)).toBeNull();
    });

    it('returns a valid result for a standard 1X2 market', () => {
        const result = convert1X2ToProbabilities(2.0, 3.5, 4.0);
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('probabilities');
        expect(result).toHaveProperty('margin');
        expect(result).toHaveProperty('overround');
    });

    it('fair probabilities from 1X2 helper sum to 1.0', () => {
        const result = convert1X2ToProbabilities(1.5, 4.5, 7.0);
        const sum = Object.values(result.probabilities).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
    });

    it('produces higher probability for the favourite (lower odds)', () => {
        const result = convert1X2ToProbabilities(1.4, 5.0, 9.0);
        expect(result.probabilities.home).toBeGreaterThan(result.probabilities.draw);
        expect(result.probabilities.draw).toBeGreaterThan(result.probabilities.away);
    });
});

// ---------------------------------------------------------------------------
// convert2WayToProbabilities
// ---------------------------------------------------------------------------
describe('convert2WayToProbabilities', () => {
    it('returns null when any argument is falsy', () => {
        expect(convert2WayToProbabilities(0, 1.9)).toBeNull();
        expect(convert2WayToProbabilities(1.9, null)).toBeNull();
        expect(convert2WayToProbabilities(undefined, undefined)).toBeNull();
    });

    it('returns a valid result for a balanced O/U market', () => {
        const result = convert2WayToProbabilities(1.9, 1.9);
        expect(result).not.toBeNull();
        expect(result.probabilities.val1).toBeCloseTo(0.5, 2);
        expect(result.probabilities.val2).toBeCloseTo(0.5, 2);
    });

    it('fair probabilities from 2-way helper sum to 1.0', () => {
        const result = convert2WayToProbabilities(1.7, 2.1);
        const sum = Object.values(result.probabilities).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 2);
    });

    it('calculates a positive margin for typical bookmaker 2-way odds', () => {
        // 1/1.9 + 1/1.9 ≈ 1.053 → positive margin
        const result = convert2WayToProbabilities(1.9, 1.9);
        expect(result.margin).toBeGreaterThan(0);
    });
});
