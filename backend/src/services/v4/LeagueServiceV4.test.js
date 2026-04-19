import { describe, it, expect, vi, beforeEach } from 'vitest';
import LeagueServiceV4 from './LeagueServiceV4.js';
import StandingsV4Service from './StandingsV4Service.js';

// Mock database
vi.mock('../../config/database.js', () => ({
    default: {
        all: vi.fn(),
        get: vi.fn(),
    }
}));

// Mock logger
vi.mock('../../utils/logger.js', async () => {
    const actual = await vi.importActual('../../utils/logger.js');
    return {
        default: {
            error: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
        }
    }
});

// Mock StandingsV4Service
vi.mock('./StandingsV4Service.js', () => ({
    default: {
        calculateStandings: vi.fn(),
    }
}));

describe('LeagueServiceV4', () => {
    let mockDb;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockDb = (await import('../../config/database.js')).default;
    });

    describe('getLeaguesGroupedByCountry', () => {
        it('should return leagues grouped by country with progression data for league', async () => {
            const mockLeagueRows = [
                {
                    league_id: '1',
                    name: 'Bundesliga',
                    competition_type: 'league',
                    logo_url: 'https://example.com/bundesliga.png',
                    country_name: 'Germany',
                    country_flag: 'https://example.com/de.png',
                    country_rank: '1',
                    seasons_count: '5',
                    latest_season: '2024/2025',
                    competition_rank: '1',
                    current_matchday: '32',
                    total_matchdays: '34',
                    latest_round_label: 'Matchday 32',
                },
                {
                    league_id: '2',
                    name: '2. Bundesliga',
                    competition_type: 'league',
                    logo_url: 'https://example.com/2bundesliga.png',
                    country_name: 'Germany',
                    country_flag: 'https://example.com/de.png',
                    country_rank: '1',
                    seasons_count: '3',
                    latest_season: '2024/2025',
                    competition_rank: '2',
                    current_matchday: '30',
                    total_matchdays: '34',
                    latest_round_label: 'Matchday 30',
                },
                {
                    league_id: '3',
                    name: 'DFB-Pokal',
                    competition_type: 'cup',
                    logo_url: 'https://example.com/dfb-pokal.png',
                    country_name: 'Germany',
                    country_flag: 'https://example.com/de.png',
                    country_rank: '1',
                    seasons_count: '2',
                    latest_season: '2024/2025',
                    competition_rank: '5',
                    current_matchday: null,
                    total_matchdays: null,
                    latest_round_label: 'Quarter-finals',
                },
            ];

            mockDb.all.mockResolvedValueOnce(mockLeagueRows);

            // Mock standings for leagues (not for cup)
            StandingsV4Service.calculateStandings
                .mockResolvedValueOnce([
                    {
                        team_id: '101',
                        team_name: 'Bayern München',
                        team_logo: 'https://example.com/bayern.png',
                        points: 85,
                        rank: 1,
                    }
                ])
                .mockResolvedValueOnce([
                    {
                        team_id: '102',
                        team_name: 'FC Köln',
                        team_logo: 'https://example.com/koeln.png',
                        points: 40,
                        rank: 1,
                    }
                ]);

            const result = await LeagueServiceV4.getLeaguesGroupedByCountry();

            expect(result).toHaveLength(1);
            expect(result[0].country_name).toBe('Germany');
            expect(result[0].leagues).toHaveLength(3);

            // Check Bundesliga (league with data)
            const bundesliga = result[0].leagues[0];
            expect(bundesliga.name).toBe('Bundesliga');
            expect(bundesliga.competition_type).toBe('league');
            expect(bundesliga.current_matchday).toBe(32);
            expect(bundesliga.total_matchdays).toBe(34);
            expect(bundesliga.latest_round_label).toBe('Matchday 32');
            expect(bundesliga.leader).toEqual({
                club_id: '101',
                name: 'Bayern München',
                logo_url: 'https://example.com/bayern.png',
            });

            // Check 2. Bundesliga
            const bundesliga2 = result[0].leagues[1];
            expect(bundesliga2.name).toBe('2. Bundesliga');
            expect(bundesliga2.current_matchday).toBe(30);
            expect(bundesliga2.leader).toEqual({
                club_id: '102',
                name: 'FC Köln',
                logo_url: 'https://example.com/koeln.png',
            });

            // Check DFB-Pokal (cup - no leader)
            const dfbPokal = result[0].leagues[2];
            expect(dfbPokal.name).toBe('DFB-Pokal');
            expect(dfbPokal.competition_type).toBe('cup');
            expect(dfbPokal.current_matchday).toBeNull();
            expect(dfbPokal.total_matchdays).toBeNull();
            expect(dfbPokal.latest_round_label).toBe('Quarter-finals');
            expect(dfbPokal.leader).toBeNull();

            // Verify StandingsV4Service was called 2 times (one per league, not for cup)
            expect(StandingsV4Service.calculateStandings).toHaveBeenCalledTimes(2);
            expect(StandingsV4Service.calculateStandings).toHaveBeenCalledWith(
                BigInt('1'),
                '2024/2025'
            );
            expect(StandingsV4Service.calculateStandings).toHaveBeenCalledWith(
                BigInt('2'),
                '2024/2025'
            );
        });

        it('should handle standings calculation error gracefully', async () => {
            const mockLeagueRows = [
                {
                    league_id: '1',
                    name: 'Bundesliga',
                    competition_type: 'league',
                    logo_url: 'https://example.com/bundesliga.png',
                    country_name: 'Germany',
                    country_flag: 'https://example.com/de.png',
                    country_rank: '1',
                    seasons_count: '5',
                    latest_season: '2024/2025',
                    competition_rank: '1',
                    current_matchday: '32',
                    total_matchdays: '34',
                    latest_round_label: 'Matchday 32',
                },
            ];

            mockDb.all.mockResolvedValueOnce(mockLeagueRows);
            StandingsV4Service.calculateStandings.mockRejectedValueOnce(
                new Error('Standings calculation failed')
            );

            const result = await LeagueServiceV4.getLeaguesGroupedByCountry();

            expect(result).toHaveLength(1);
            const bundesliga = result[0].leagues[0];
            expect(bundesliga.leader).toBeNull(); // Should gracefully handle error
        });

        it('should not calculate standings for leagues without latest_season', async () => {
            const mockLeagueRows = [
                {
                    league_id: '1',
                    name: 'Old League',
                    competition_type: 'league',
                    logo_url: 'https://example.com/old.png',
                    country_name: 'Germany',
                    country_flag: 'https://example.com/de.png',
                    country_rank: '1',
                    seasons_count: '0',
                    latest_season: null,
                    competition_rank: '999',
                    current_matchday: null,
                    total_matchdays: null,
                    latest_round_label: null,
                },
            ];

            mockDb.all.mockResolvedValueOnce(mockLeagueRows);

            const result = await LeagueServiceV4.getLeaguesGroupedByCountry();

            expect(result).toHaveLength(1);
            const oldLeague = result[0].leagues[0];
            expect(oldLeague.leader).toBeNull();
            expect(StandingsV4Service.calculateStandings).not.toHaveBeenCalled();
        });
    });
});
