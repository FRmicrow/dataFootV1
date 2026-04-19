import { describe, it, expect } from 'vitest';

/**
 * Accordion header breakdown logic tests (V45)
 * Testing the calculation of league/cup breakdown for accordion headers
 */
describe('V4LeaguesList Accordion Header Breakdown', () => {
    /**
     * Helper function to calculate breakdown like in V4LeaguesList
     */
    const calculateBreakdown = (leagues) => {
        const leagueCount = leagues.filter(l => l.competition_type === 'league').length;
        const cupCount = leagues.filter(l => l.competition_type === 'cup').length;
        return {
            leagueCount,
            cupCount,
            text: `${leagueCount} ${leagueCount > 1 ? 'leagues' : 'league'} · ${cupCount} ${cupCount > 1 ? 'cups' : 'cup'}`,
        };
    };

    it('calculates breakdown for country with 2 leagues and 1 cup', () => {
        const leagues = [
            { competition_type: 'league' },
            { competition_type: 'league' },
            { competition_type: 'cup' },
        ];
        const breakdown = calculateBreakdown(leagues);
        expect(breakdown.leagueCount).toBe(2);
        expect(breakdown.cupCount).toBe(1);
        expect(breakdown.text).toBe('2 leagues · 1 cup');
    });

    it('calculates breakdown for country with 1 league and 0 cups', () => {
        const leagues = [
            { competition_type: 'league' },
        ];
        const breakdown = calculateBreakdown(leagues);
        expect(breakdown.leagueCount).toBe(1);
        expect(breakdown.cupCount).toBe(0);
        expect(breakdown.text).toBe('1 league · 0 cup');
    });

    it('calculates breakdown for country with 1 league and 1 cup', () => {
        const leagues = [
            { competition_type: 'league' },
            { competition_type: 'cup' },
        ];
        const breakdown = calculateBreakdown(leagues);
        expect(breakdown.leagueCount).toBe(1);
        expect(breakdown.cupCount).toBe(1);
        expect(breakdown.text).toBe('1 league · 1 cup');
    });

    it('calculates breakdown for country with 5 leagues and 3 cups', () => {
        const leagues = [
            { competition_type: 'league' },
            { competition_type: 'league' },
            { competition_type: 'league' },
            { competition_type: 'league' },
            { competition_type: 'league' },
            { competition_type: 'cup' },
            { competition_type: 'cup' },
            { competition_type: 'cup' },
        ];
        const breakdown = calculateBreakdown(leagues);
        expect(breakdown.leagueCount).toBe(5);
        expect(breakdown.cupCount).toBe(3);
        expect(breakdown.text).toBe('5 leagues · 3 cups');
    });

    it('handles super_cup type (not counted as regular cup)', () => {
        const leagues = [
            { competition_type: 'league' },
            { competition_type: 'cup' },
            { competition_type: 'super_cup' },
        ];
        const breakdown = calculateBreakdown(leagues);
        expect(breakdown.leagueCount).toBe(1);
        expect(breakdown.cupCount).toBe(1); // super_cup not counted
    });

    it('correctly filters competition types', () => {
        const leagues = [
            { competition_type: 'league', name: 'Bundesliga' },
            { competition_type: 'league', name: '2. Bundesliga' },
            { competition_type: 'cup', name: 'DFB-Pokal' },
            { competition_type: 'super_cup', name: 'DFL Super Cup' },
        ];
        const breakdown = calculateBreakdown(leagues);
        expect(breakdown.text).toBe('2 leagues · 1 cup');
    });
});
