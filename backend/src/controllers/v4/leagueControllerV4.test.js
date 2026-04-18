import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as leagueControllerV4 from './leagueControllerV4.js';
import LeagueServiceV4 from '../../services/v4/LeagueServiceV4.js';
import MatchDetailV4Service from '../../services/v4/MatchDetailV4Service.js';
import StandingsV4Service from '../../services/v4/StandingsV4Service.js';

// Mock all V4 services
vi.mock('../../services/v4/LeagueServiceV4.js', () => ({
    default: {
        getLeaguesGroupedByCountry: vi.fn(),
        getCompetitionByName: vi.fn(),
        getSeasonOverview: vi.fn(),
        getFixtureDetails: vi.fn(),
        getFixtures: vi.fn(),
        getPlayerSeasonStats: vi.fn(),
        getTeamSquad: vi.fn(),
        getSeasonPlayers: vi.fn(),
    }
}));

vi.mock('../../services/v4/MatchDetailV4Service.js', () => ({
    default: {
        getFixtureDetails: vi.fn(),
        getFixtureLineups: vi.fn(),
        getFixtureEvents: vi.fn(),
        getFixtureTacticalStats: vi.fn(),
        getFixturePlayerTacticalStats: vi.fn(),
    }
}));

vi.mock('../../services/v4/StandingsV4Service.js', () => ({
    default: {
        getSeasonStandings: vi.fn(),
    }
}));

// Mock logger to avoid console output in tests
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

describe('leagueControllerV4', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getLeaguesV4', () => {
        it('should return 200 with leagues grouped by country on success', async () => {
            const mockReq = {};
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            const mockLeagues = {
                'England': [{ competition_id: 1, name: 'Premier League' }],
                'Spain': [{ competition_id: 2, name: 'La Liga' }],
            };

            LeagueServiceV4.getLeaguesGroupedByCountry.mockResolvedValueOnce(mockLeagues);

            await leagueControllerV4.getLeaguesV4(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockLeagues
            });
        });

        it('should return 500 on service error', async () => {
            const mockReq = {};
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            LeagueServiceV4.getLeaguesGroupedByCountry.mockRejectedValueOnce(
                new Error('Database error')
            );

            await leagueControllerV4.getLeaguesV4(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Internal Server Error'
            });
        });
    });

    describe('getFixtureTacticalStatsV4', () => {
        it('should return 200 with tactical stats on success', async () => {
            const mockReq = {
                params: { id: 'fixture-123' }
            };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            const mockStats = [
                { side: 'home', possession: 55 },
                { side: 'away', possession: 45 }
            ];

            MatchDetailV4Service.getFixtureTacticalStats.mockResolvedValueOnce(mockStats);

            await leagueControllerV4.getFixtureTacticalStatsV4(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: mockStats
            });
        });

        it('should return 500 on service error', async () => {
            const mockReq = {
                params: { id: 'fixture-123' }
            };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            const testError = new Error('Service error');
            MatchDetailV4Service.getFixtureTacticalStats.mockRejectedValueOnce(testError);

            await leagueControllerV4.getFixtureTacticalStatsV4(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Internal Server Error'
            });
        });
    });

    describe('getFixturePlayerTacticalStatsV4', () => {
        it('should return 200 with player tactical stats (stub returns empty array)', async () => {
            const mockReq = {
                params: { id: 'fixture-123' }
            };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            MatchDetailV4Service.getFixturePlayerTacticalStats.mockResolvedValueOnce([]);

            await leagueControllerV4.getFixturePlayerTacticalStatsV4(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: true,
                data: []
            });
        });

        it('should return 500 on service error', async () => {
            const mockReq = {
                params: { id: 'fixture-123' }
            };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            const testError = new Error('Service error');
            MatchDetailV4Service.getFixturePlayerTacticalStats.mockRejectedValueOnce(testError);

            await leagueControllerV4.getFixturePlayerTacticalStatsV4(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'Internal Server Error'
            });
        });
    });
});
