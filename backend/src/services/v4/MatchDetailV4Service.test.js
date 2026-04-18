import { describe, it, expect, vi, beforeEach } from 'vitest';
import MatchDetailV4Service from './MatchDetailV4Service.js';
import db from '../../config/database.js';

// Mock database
vi.mock('../../config/database.js', () => ({
    default: {
        get: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
    }
}));

// Mock mediaConstants
vi.mock('../../config/mediaConstants.js', () => ({
    DEFAULT_LOGO: 'https://example.com/logo.png',
    DEFAULT_PHOTO: 'https://example.com/photo.jpg'
}));

describe('MatchDetailV4Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFixtureTacticalStats', () => {
        it('should return match stats when data exists', async () => {
            const fixtureId = '123456';

            const mockStats = {
                home_poss_ft: 55,
                away_poss_ft: 45,
                home_shots_ft: 12,
                away_shots_ft: 8
            };

            const mockOdds = {
                odds_home: 1.95,
                odds_draw: 3.50,
                odds_away: 3.75
            };

            db.get
                .mockResolvedValueOnce(mockStats)
                .mockResolvedValueOnce(mockOdds);

            const result = await MatchDetailV4Service.getFixtureTacticalStats(fixtureId);

            // Stats should contain data structured by side (home/away)
            expect(result).toHaveProperty('stats');
            expect(result).toHaveProperty('odds');
            expect(result.stats).toBeInstanceOf(Array);
        });

        it('should return null stats and odds when neither exists', async () => {
            const fixtureId = 'no-data';

            db.get
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);

            const result = await MatchDetailV4Service.getFixtureTacticalStats(fixtureId);

            expect(result).toEqual({ stats: null, odds: null });
        });
    });

    describe('getFixturePlayerTacticalStats', () => {
        it('should return empty array (stub implementation)', async () => {
            const result = await MatchDetailV4Service.getFixturePlayerTacticalStats();

            // Stub returns empty array
            expect(result).toEqual([]);
        });
    });
});
