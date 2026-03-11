import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/database.js', () => ({
    default: {
        all: vi.fn(),
        get: vi.fn(),
        run: vi.fn(),
        query: vi.fn(),
        init: vi.fn()
    }
}));

vi.mock('../../src/services/footballApi.js', () => ({
    default: {
        get: vi.fn()
    }
}));

import db from '../../src/config/database.js';
import StatsEngine from '../../src/services/v3/StatsEngine.js';

describe('StatsEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getDynamicStandings', () => {
        it('should return empty array when no matches found', async () => {
            db.all.mockResolvedValue([]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024, 1, 38);

            expect(standings).toEqual([]);
        });

        it('should return empty array when matches is null', async () => {
            db.all.mockResolvedValue(null);

            const standings = await StatsEngine.getDynamicStandings(39, 2024);

            expect(standings).toEqual([]);
        });

        it('should calculate correct points for a home win', async () => {
            db.all.mockResolvedValue([
                {
                    round: 'Regular Season - 1',
                    home_team_id: 1, away_team_id: 2,
                    goals_home: 2, goals_away: 0,
                    home_name: 'Team A', home_logo: 'a.png',
                    away_name: 'Team B', away_logo: 'b.png'
                }
            ]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024, 1, 1);

            expect(standings).toHaveLength(2);

            const teamA = standings.find(t => t.team_name === 'Team A');
            const teamB = standings.find(t => t.team_name === 'Team B');

            expect(teamA.points).toBe(3);
            expect(teamA.win).toBe(1);
            expect(teamA.goals_for).toBe(2);
            expect(teamA.goals_against).toBe(0);

            expect(teamB.points).toBe(0);
            expect(teamB.lose).toBe(1);
            expect(teamB.goals_for).toBe(0);
            expect(teamB.goals_against).toBe(2);
        });

        it('should calculate correct points for a draw', async () => {
            db.all.mockResolvedValue([
                {
                    round: 'Regular Season - 1',
                    home_team_id: 1, away_team_id: 2,
                    goals_home: 1, goals_away: 1,
                    home_name: 'Team A', home_logo: 'a.png',
                    away_name: 'Team B', away_logo: 'b.png'
                }
            ]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024, 1, 1);

            const teamA = standings.find(t => t.team_name === 'Team A');
            const teamB = standings.find(t => t.team_name === 'Team B');

            expect(teamA.points).toBe(1);
            expect(teamA.draw).toBe(1);
            expect(teamB.points).toBe(1);
            expect(teamB.draw).toBe(1);
        });

        it('should sort standings by points, then goal difference', async () => {
            db.all.mockResolvedValue([
                {
                    round: 'Regular Season - 1',
                    home_team_id: 1, away_team_id: 2,
                    goals_home: 3, goals_away: 0,
                    home_name: 'Leader', home_logo: 'l.png',
                    away_name: 'Bottom', away_logo: 'b.png'
                },
                {
                    round: 'Regular Season - 1',
                    home_team_id: 3, away_team_id: 4,
                    goals_home: 1, goals_away: 0,
                    home_name: 'Second', home_logo: 's.png',
                    away_name: 'Third', away_logo: 't.png'
                }
            ]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024, 1, 1);

            expect(standings[0].team_name).toBe('Leader');
            expect(standings[1].team_name).toBe('Second');
        });

        it('should filter by round range', async () => {
            db.all.mockResolvedValue([
                {
                    round: 'Regular Season - 1',
                    home_team_id: 1, away_team_id: 2,
                    goals_home: 1, goals_away: 0,
                    home_name: 'A', home_logo: 'a.png',
                    away_name: 'B', away_logo: 'b.png'
                },
                {
                    round: 'Regular Season - 5',
                    home_team_id: 1, away_team_id: 2,
                    goals_home: 2, goals_away: 0,
                    home_name: 'A', home_logo: 'a.png',
                    away_name: 'B', away_logo: 'b.png'
                }
            ]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024, 1, 3);

            const teamA = standings.find(t => t.team_name === 'A');
            expect(teamA.played).toBe(1);
            expect(teamA.goals_for).toBe(1);
        });

        it('should handle malformed round strings', async () => {
            db.all.mockResolvedValue([
                {
                    round: null,
                    home_team_id: 1, away_team_id: 2,
                    goals_home: 1, goals_away: 0,
                    home_name: 'A', home_logo: 'a.png',
                    away_name: 'B', away_logo: 'b.png'
                }
            ]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024);
            expect(standings).toEqual([]);
        });

        it('should aggregate multiple matches for the same team', async () => {
            db.all.mockResolvedValue([
                {
                    round: 'Regular Season - 1',
                    home_team_id: 1, away_team_id: 2,
                    goals_home: 2, goals_away: 1,
                    home_name: 'A', home_logo: 'a.png',
                    away_name: 'B', away_logo: 'b.png'
                },
                {
                    round: 'Regular Season - 2',
                    home_team_id: 2, away_team_id: 1,
                    goals_home: 0, goals_away: 3,
                    home_name: 'B', home_logo: 'b.png',
                    away_name: 'A', away_logo: 'a.png'
                }
            ]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024, 1, 2);

            const teamA = standings.find(t => t.team_name === 'A');
            expect(teamA.played).toBe(2);
            expect(teamA.win).toBe(2);
            expect(teamA.points).toBe(6);
            expect(teamA.goals_for).toBe(5);
            expect(teamA.goals_against).toBe(1);
        });

        it('should build form string from last 5 matches', async () => {
            db.all.mockResolvedValue([
                { round: 'Regular Season - 1', home_team_id: 1, away_team_id: 2, goals_home: 1, goals_away: 0, home_name: 'A', home_logo: 'a.png', away_name: 'B', away_logo: 'b.png' },
                { round: 'Regular Season - 2', home_team_id: 1, away_team_id: 2, goals_home: 1, goals_away: 1, home_name: 'A', home_logo: 'a.png', away_name: 'B', away_logo: 'b.png' },
                { round: 'Regular Season - 3', home_team_id: 1, away_team_id: 2, goals_home: 0, goals_away: 1, home_name: 'A', home_logo: 'a.png', away_name: 'B', away_logo: 'b.png' }
            ]);

            const standings = await StatsEngine.getDynamicStandings(39, 2024, 1, 3);
            const teamA = standings.find(t => t.team_name === 'A');

            expect(teamA.form).toBe('WDL');
        });
    });
});
