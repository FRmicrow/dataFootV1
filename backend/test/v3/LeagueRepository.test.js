import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module before importing the repository
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
import LeagueRepository from '../../src/repositories/v3/LeagueRepository.js';

describe('LeagueRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('findByApiId', () => {
        it('should find a league by its API ID', async () => {
            db.get.mockResolvedValue({
                league_id: 500,
                api_id: 777,
                country_id: 500,
                name: 'ConsolidatedLeague',
                type: 'League',
                importance_rank: 1
            });

            const league = await LeagueRepository.findByApiId(777);

            expect(league).toBeDefined();
            expect(league.name).toBe('ConsolidatedLeague');
            expect(league.api_id).toBe(777);
            expect(db.get).toHaveBeenCalledOnce();
        });

        it('should return undefined when league does not exist', async () => {
            db.get.mockResolvedValue(undefined);

            const league = await LeagueRepository.findByApiId(99999);

            expect(league).toBeUndefined();
            expect(db.get).toHaveBeenCalledOnce();
        });
    });

    describe('getAllLeaguesWithCountry', () => {
        it('should return leagues with country names', async () => {
            db.all.mockResolvedValue([
                { league_id: 1, name: 'Ligue 1', country_name: 'France', importance_rank: 1 },
                { league_id: 2, name: 'Premier League', country_name: 'England', importance_rank: 2 }
            ]);

            const leagues = await LeagueRepository.getAllLeaguesWithCountry();

            expect(leagues).toHaveLength(2);
            expect(leagues[0].country_name).toBe('France');
            expect(leagues[1].country_name).toBe('England');
            expect(db.all).toHaveBeenCalledOnce();
        });

        it('should return empty array when no leagues exist', async () => {
            db.all.mockResolvedValue([]);

            const leagues = await LeagueRepository.getAllLeaguesWithCountry();

            expect(leagues).toHaveLength(0);
        });
    });

    describe('insert', () => {
        it('should insert a new league', async () => {
            db.run.mockResolvedValue({ lastInsertRowid: 10, changes: 1 });

            const result = await LeagueRepository.insert({
                league_id: 10,
                api_id: 888,
                country_id: 1,
                name: 'Serie A',
                type: 'League',
                importance_rank: 3
            });

            expect(result.changes).toBe(1);
            expect(db.run).toHaveBeenCalledOnce();
        });
    });

    describe('count', () => {
        it('should count all leagues', async () => {
            db.get.mockResolvedValue({ count: 42 });

            const count = await LeagueRepository.count();

            expect(count).toBe(42);
        });

        it('should count leagues with criteria', async () => {
            db.get.mockResolvedValue({ count: 5 });

            const count = await LeagueRepository.count({ type: 'Cup' });

            expect(count).toBe(5);
        });
    });
});
