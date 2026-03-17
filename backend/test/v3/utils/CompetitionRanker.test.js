import { describe, it, expect } from 'vitest';
import { CompetitionRanker } from '../../../src/utils/v3/CompetitionRanker.js';

describe('CompetitionRanker GIS Logic', () => {
    describe('detectType', () => {
        it('should detect League for standard names', () => {
            expect(CompetitionRanker.detectType({ name: 'Premier League' })).toBe('League');
            expect(CompetitionRanker.detectType({ name: 'Ligue 1' })).toBe('League');
            expect(CompetitionRanker.detectType({ name: 'Bundesliga' })).toBe('League');
        });

        it('should detect Cup for cup names', () => {
            expect(CompetitionRanker.detectType({ name: 'FA Cup' })).toBe('Cup');
            expect(CompetitionRanker.detectType({ name: 'Copa del Rey' })).toBe('Cup');
            expect(CompetitionRanker.detectType({ name: 'DFB Pokal' })).toBe('Cup');
            expect(CompetitionRanker.detectType({ name: 'KNVB Beker' })).toBe('Cup');
        });

        it('should detect Cup for localized or secondary cup terms', () => {
            expect(CompetitionRanker.detectType({ name: 'EFL Trophy' })).toBe('Cup');
            expect(CompetitionRanker.detectType({ name: 'Community Shield' })).toBe('Cup');
        });
    });

    describe('calculateGlobalScore', () => {
        it('should rank major countries better than minor ones', () => {
            // England (Rank 1) PL vs Bangladesh (Rank 150) PL
            const englandPL = CompetitionRanker.calculateGlobalScore(1, 1, 'Premier League', false);
            const bangladeshPL = CompetitionRanker.calculateGlobalScore(150, 1, 'Ligue 1', false);
            
            expect(englandPL).toBeLessThan(bangladeshPL);
            expect(englandPL).toBe(110); // (1*100) + (1*10)
            expect(bangladeshPL).toBe(15010); // (150*100) + (1*10)
        });

        it('should rank tiered leagues correctly within same country', () => {
            const englandPL = CompetitionRanker.calculateGlobalScore(1, 1, 'Premier League', false);
            const englandChamp = CompetitionRanker.calculateGlobalScore(1, 2, 'Championship', false);
            
            expect(englandPL).toBeLessThan(englandChamp);
            expect(englandChamp).toBe(120);
        });

        it('should apply penalties for playoffs and qualifications', () => {
            const league = CompetitionRanker.calculateGlobalScore(1, 1, 'Premier League', false);
            const playoff = CompetitionRanker.calculateGlobalScore(1, 1, 'Premier League - Play-offs', false);
            const qualif = CompetitionRanker.calculateGlobalScore(1, 1, 'UCL Qualification', false);
            
            expect(league).toBeLessThan(playoff);
            expect(playoff).toBeLessThan(qualif);
        });

        it('should rank leagues better than cups of same tier', () => {
            const engLeague = CompetitionRanker.calculateGlobalScore(1, 1, 'Premier League', false);
            const engCup = CompetitionRanker.calculateGlobalScore(1, 1, 'FA Cup', true);
            
            expect(engLeague).toBeLessThan(engCup);
            expect(engCup).toBe(115); // 110 + 5
        });
    });
});
