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
import SearchRepository from '../../src/repositories/v3/SearchRepository.js';

describe('SearchRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('globalSearch', () => {
        it('should prioritize exact name match followed by scout_rank', async () => {
            // Mock players query — db.all is called twice (players + teams)
            db.all
                .mockResolvedValueOnce([
                    // Players — already sorted by relevance_priority ASC, scout_rank DESC
                    {
                        player_id: 1, api_id: 154, name: 'L. Messi',
                        firstname: 'Lionel Andrés', lastname: 'Messi Cuccittini',
                        nationality: 'Argentina', nationality_flag: '🇦🇷',
                        photo_url: null, age: 38,
                        relevance_priority: 0, scout_rank: 1543.0, country_importance: 24
                    },
                    {
                        player_id: 3, api_id: 354676, name: 'J. Messi',
                        firstname: 'Joaquín Silvio', lastname: 'Messi',
                        nationality: 'Argentina', nationality_flag: '🇦🇷',
                        photo_url: null, age: 23,
                        relevance_priority: 1, scout_rank: 500.0, country_importance: 24
                    },
                    {
                        player_id: 2, api_id: 29862, name: 'M. Bouli',
                        firstname: 'Raphaël Éric', lastname: 'Messi Bouli',
                        nationality: 'Cameroon', nationality_flag: '🇨🇲',
                        photo_url: null, age: 33,
                        relevance_priority: 2, scout_rank: 20.0, country_importance: 999
                    }
                ])
                .mockResolvedValueOnce([
                    // Teams
                    {
                        team_id: 1, api_id: 10, name: 'Messina',
                        logo_url: null, country: 'Italy', country_flag: '🇮🇹',
                        relevance_priority: 1, scout_rank: 50.0, country_importance: 5
                    }
                ]);

            const results = await SearchRepository.globalSearch('Messi');

            // Players verification
            expect(results.players).toBeDefined();
            expect(results.players.length).toBe(3);

            // L. Messi should be first (relevance 0 + highest scout_rank)
            expect(results.players[0].name).toBe('L. Messi');
            expect(results.players[1].name).toBe('J. Messi');

            // Internal fields should be stripped
            expect(results.players[0].relevance_priority).toBeUndefined();
            expect(results.players[0].scout_rank).toBeUndefined();
            expect(results.players[0].country_importance).toBeUndefined();
        });

        it('should include country flags in results', async () => {
            db.all
                .mockResolvedValueOnce([
                    {
                        player_id: 1, api_id: 154, name: 'L. Messi',
                        firstname: 'Lionel', lastname: 'Messi',
                        nationality: 'Argentina', nationality_flag: '🇦🇷',
                        photo_url: null, age: 38,
                        relevance_priority: 0, scout_rank: 1543, country_importance: 24
                    }
                ])
                .mockResolvedValueOnce([]);

            const results = await SearchRepository.globalSearch('Messi');
            const lMessi = results.players.find(p => p.api_id === 154);

            expect(lMessi).toBeDefined();
            expect(lMessi.nationality_flag).toBe('🇦🇷');
        });

        it('should search for teams and strip internal fields', async () => {
            db.all
                .mockResolvedValueOnce([]) // players
                .mockResolvedValueOnce([
                    {
                        team_id: 1, api_id: 10, name: 'Messina',
                        logo_url: null, country: 'Italy', country_flag: '🇮🇹',
                        relevance_priority: 1, scout_rank: 50.0, country_importance: 5
                    },
                    {
                        team_id: 2, api_id: 20, name: 'Barcelona',
                        logo_url: null, country: 'Spain', country_flag: '🇪🇸',
                        relevance_priority: 1, scout_rank: 2000.0, country_importance: 3
                    }
                ]);

            const results = await SearchRepository.globalSearch('Messi');

            expect(results.clubs).toBeDefined();
            const messina = results.clubs.find(c => c.name === 'Messina');
            expect(messina).toBeDefined();

            // Internal ranking fields should be stripped
            expect(messina.scout_rank).toBeUndefined();
            expect(messina.relevance_priority).toBeUndefined();
            expect(messina.country_importance).toBeUndefined();
        });

        it('should return empty results when no matches found', async () => {
            db.all
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const results = await SearchRepository.globalSearch('xyznonexistent');

            expect(results.players).toEqual([]);
            expect(results.clubs).toEqual([]);
        });

        it('should pass correct parameters to the query', async () => {
            db.all
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            await SearchRepository.globalSearch('Messi', 25);

            // Both calls should have been made with the search params
            expect(db.all).toHaveBeenCalledTimes(2);

            // Verify the params include the query, searchTerm, and limit
            const firstCallParams = db.all.mock.calls[0][1];
            expect(firstCallParams).toContain('Messi');
            expect(firstCallParams).toContain('%Messi%');
            expect(firstCallParams).toContain(25);
        });
    });

    describe('getSearchCountries', () => {
        it('should return distinct countries with flags', async () => {
            db.all.mockResolvedValue([
                { name: 'Argentina', flag_url: '🇦🇷', importance_rank: 24 },
                { name: 'France', flag_url: '🇫🇷', importance_rank: 5 }
            ]);

            const countries = await SearchRepository.getSearchCountries();

            expect(countries).toHaveLength(2);
            expect(countries[0].name).toBe('Argentina');
            expect(countries[1].name).toBe('France');
        });
    });
});
