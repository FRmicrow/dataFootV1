import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchServiceV4 from './SearchServiceV4.js';
import db from '../../config/database.js';

vi.mock('../../config/database.js', () => ({
    default: {
        all: vi.fn(),
        get: vi.fn(),
        run: vi.fn()
    }
}));

describe('SearchServiceV4', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should perform global search across categories', async () => {
        db.all.mockResolvedValueOnce([{ id: '1', name: 'Ligue 1' }]) // Competitions
              .mockResolvedValueOnce([{ id: '10', name: 'PSG' }]) // Teams
              .mockResolvedValueOnce([{ id: '100', name: 'Mbappe' }]); // People

        const results = await SearchServiceV4.globalSearch('test');

        expect(results.competitions).toHaveLength(1);
        expect(results.teams).toHaveLength(1);
        expect(results.people).toHaveLength(1);
        expect(db.all).toHaveBeenCalledTimes(3);
    });

    it('should respect the type filter', async () => {
        db.all.mockResolvedValueOnce([{ id: '10', name: 'PSG' }]);

        const results = await SearchServiceV4.globalSearch('test', { type: 'team' });

        expect(results.competitions).toHaveLength(0);
        expect(results.teams).toHaveLength(1);
        expect(results.people).toHaveLength(0);
        expect(db.all).toHaveBeenCalledTimes(1);
    });

    it('should sort people by importance_rank', async () => {
        await SearchServiceV4.globalSearch('Messi');
        const peopleQuery = db.all.mock.calls.find(call => call[0].includes('FROM v4.people'))[0];
        expect(peopleQuery).toContain('ORDER BY p.importance_rank ASC');
    });
});
