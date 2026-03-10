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

import db from '../../src/config/database.js';
import { ResolutionService } from '../../src/services/v3/ResolutionService.js';

describe('ResolutionService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('calculateConfidence', () => {
        it('should return 100 for exact API ID match', async () => {
            const p1 = { player_id: 1, api_id: 154, name: 'L. Messi', birth_date: '1987-06-24' };
            const p2 = { player_id: 2, api_id: 154, name: 'Lionel Messi', birth_date: '1987-06-24' };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            expect(score).toBe(100);
        });

        it('should not call DB when API IDs match', async () => {
            const p1 = { player_id: 1, api_id: 154, name: 'L. Messi', birth_date: null };
            const p2 = { player_id: 2, api_id: 154, name: 'Messi', birth_date: null };

            await ResolutionService.calculateConfidence(p1, p2);
            expect(db.get).not.toHaveBeenCalled();
        });

        it('should return high score for very similar names + DOB match + team overlap', async () => {
            db.get.mockResolvedValue({ '1': 1 }); // team history overlap found

            const p1 = { player_id: 1, api_id: 100, name: 'L. Messi', birth_date: '1987-06-24' };
            const p2 = { player_id: 2, api_id: 200, name: 'L. Messi', birth_date: '1987-06-24' };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            // name similarity = 1.0 → +50, DOB match → +30, team overlap → +20 = 99 (capped)
            expect(score).toBe(99);
        });

        it('should cap score at 99 without API ID match', async () => {
            db.get.mockResolvedValue({ '1': 1 }); // team overlap

            const p1 = { player_id: 1, api_id: 100, name: 'L. Messi', birth_date: '1987-06-24' };
            const p2 = { player_id: 2, api_id: 200, name: 'L. Messi', birth_date: '1987-06-24' };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            expect(score).toBeLessThanOrEqual(99);
        });

        it('should return 0 for completely different players', async () => {
            db.get.mockResolvedValue(undefined); // no team overlap

            const p1 = { player_id: 1, api_id: 100, name: 'L. Messi', birth_date: '1987-06-24' };
            const p2 = { player_id: 2, api_id: 200, name: 'C. Ronaldo', birth_date: '1985-02-05' };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            expect(score).toBe(0);
        });

        it('should add 30 points for DOB match without name match', async () => {
            db.get.mockResolvedValue(undefined);

            const p1 = { player_id: 1, api_id: 100, name: 'Player Alpha', birth_date: '1995-01-15' };
            const p2 = { player_id: 2, api_id: 200, name: 'Player Beta', birth_date: '1995-01-15' };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            // Names are different → 0, DOB match → +30, no overlap → 0
            expect(score).toBe(30);
        });

        it('should handle null API IDs gracefully', async () => {
            db.get.mockResolvedValue(undefined);

            const p1 = { player_id: 1, api_id: null, name: 'Test', birth_date: null };
            const p2 = { player_id: 2, api_id: null, name: 'Different', birth_date: null };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(99);
        });

        it('should handle null birth dates', async () => {
            db.get.mockResolvedValue(undefined);

            const p1 = { player_id: 1, api_id: 100, name: 'L. Messi', birth_date: null };
            const p2 = { player_id: 2, api_id: 200, name: 'L. Messi', birth_date: null };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            // Name similarity high → +50, no DOB → 0, no overlap → 0
            expect(score).toBe(50);
        });

        it('should add 20 points for team history overlap', async () => {
            db.get.mockResolvedValue({ '1': 1 }); // overlap found

            const p1 = { player_id: 1, api_id: 100, name: 'Completely Different', birth_date: null };
            const p2 = { player_id: 2, api_id: 200, name: 'Another Player', birth_date: null };

            const score = await ResolutionService.calculateConfidence(p1, p2);
            // No name match → 0, no DOB → 0, overlap → +20
            expect(score).toBe(20);
        });
    });

    describe('checkTeamHistoryOverlap', () => {
        it('should return true when players share team+season', async () => {
            db.get.mockResolvedValue({ '1': 1 });

            const result = await ResolutionService.checkTeamHistoryOverlap(1, 2);
            expect(result).toBe(true);
        });

        it('should return false when no overlap exists', async () => {
            db.get.mockResolvedValue(undefined);

            const result = await ResolutionService.checkTeamHistoryOverlap(1, 2);
            expect(result).toBe(false);
        });
    });
});
