import { describe, it, expect } from 'vitest';
import { levenshteinDistance, calculateSimilarity } from '../../src/utils/fuzzy.js';

describe('fuzzy utilities', () => {
    describe('levenshteinDistance', () => {
        it('should return 0 for identical strings', () => {
            expect(levenshteinDistance('hello', 'hello')).toBe(0);
        });

        it('should return string length when compared to empty string', () => {
            expect(levenshteinDistance('hello', '')).toBe(5);
            expect(levenshteinDistance('', 'hello')).toBe(5);
        });

        it('should return 0 for two empty strings', () => {
            expect(levenshteinDistance('', '')).toBe(0);
        });

        it('should handle single character difference', () => {
            expect(levenshteinDistance('cat', 'bat')).toBe(1);
        });

        it('should handle insertion', () => {
            expect(levenshteinDistance('cat', 'cats')).toBe(1);
        });

        it('should handle deletion', () => {
            expect(levenshteinDistance('cats', 'cat')).toBe(1);
        });

        it('should handle completely different strings', () => {
            expect(levenshteinDistance('abc', 'xyz')).toBe(3);
        });

        it('should handle player name variants', () => {
            // Typical football name variations
            expect(levenshteinDistance('Messi', 'Mesi')).toBe(1);
            expect(levenshteinDistance('Ronaldo', 'Ronaldu')).toBe(1);
        });
    });

    describe('calculateSimilarity', () => {
        it('should return 1.0 for identical strings', () => {
            expect(calculateSimilarity('Messi', 'Messi')).toBe(1.0);
        });

        it('should return 1.0 for case-insensitive identical strings', () => {
            expect(calculateSimilarity('MESSI', 'messi')).toBe(1.0);
        });

        it('should return 1.0 for two null values', () => {
            expect(calculateSimilarity(null, null)).toBe(1.0);
        });

        it('should return 1.0 for two empty strings', () => {
            expect(calculateSimilarity('', '')).toBe(1.0);
        });

        it('should handle null gracefully', () => {
            const result = calculateSimilarity(null, 'Messi');
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeLessThanOrEqual(1);
        });

        it('should return high similarity for close names', () => {
            expect(calculateSimilarity('L. Messi', 'L. Mesi')).toBeGreaterThan(0.8);
        });

        it('should return low similarity for different names', () => {
            expect(calculateSimilarity('Messi', 'Ronaldo')).toBeLessThan(0.5);
        });

        it('should return a score between 0 and 1', () => {
            const score = calculateSimilarity('abc', 'xyz');
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(1);
        });

        it('should be symmetric', () => {
            expect(calculateSimilarity('Messi', 'Ronaldo'))
                .toBe(calculateSimilarity('Ronaldo', 'Messi'));
        });
    });
});
