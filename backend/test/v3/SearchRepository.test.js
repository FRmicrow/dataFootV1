import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../setup.js';
import SearchRepository from '../../src/repositories/v3/SearchRepository.js';

describe('SearchRepository V3 Integration', () => {
    let dbWrapper;

    beforeEach(async () => {
        dbWrapper = await setupTestDb();

        // Seed mock data
        dbWrapper.run(`
            INSERT OR REPLACE INTO V3_Countries (country_id, name, continent, importance_rank) VALUES 
            (1, 'Argentina', 'South America', 24),
            (2, 'France', 'Europe', 5);
        `);

        dbWrapper.run(`
            INSERT OR REPLACE INTO V3_Players (player_id, api_id, name, firstname, lastname, nationality, age, scout_rank) VALUES 
            (1, 154, 'L. Messi', 'Lionel Andrés', 'Messi Cuccittini', 'Argentina', 38, 1543.0),
            (2, 29862, 'M. Bouli', 'Raphaël Éric', 'Messi Bouli', 'Cameroon', 33, 20.0),
            (3, 354676, 'J. Messi', 'Joaquín Silvio', 'Messi', 'Argentina', 23, 500.0);
        `);

        dbWrapper.run(`
            INSERT OR REPLACE INTO V3_Teams (team_id, api_id, name, country, scout_rank) VALUES 
            (1, 10, 'Messina', 'Italy', 50.0),
            (2, 20, 'Barcelona', 'Spain', 2000.0);
        `);

    });

    it('should prioritize exact name match followed by scout_rank', () => {
        const results = SearchRepository.globalSearch('Messi');

        // Players verification
        expect(results.players).toBeDefined();
        expect(results.players.length).toBeGreaterThan(0);

        // L. Messi should be first because of relevance_priority (lastname match via ' %') and high scout_rank
        // Wait, J. Messi has exact lastname 'Messi'. 
        // In my logic: 
        // WHEN LOWER(p.name) = LOWER(?) THEN 0
        // WHEN LOWER(p.lastname) = LOWER(?) THEN 1
        // WHEN LOWER(p.lastname) LIKE LOWER(?) || ' %' THEN 1

        // So J. Messi (lastname 'Messi') and L. Messi (lastname 'Messi Cuccittini') both have priority 1.
        // Then sorted by scout_rank DESC.
        // L. Messi (1543) > J. Messi (10).

        expect(results.players[0].name).toBe('L. Messi');
        expect(results.players[1].name).toBe('J. Messi');
    });

    it('should include country flags in results', () => {
        const results = SearchRepository.globalSearch('Messi');
        const lMessi = results.players.find(p => p.api_id === 154);
        expect(lMessi.nationality_flag).toBeDefined();
    });

    it('should search for teams', () => {
        const results = SearchRepository.globalSearch('Messi');
        expect(results.clubs).toBeDefined();
        const messina = results.clubs.find(c => c.name === 'Messina');
        expect(messina).toBeDefined();
        expect(messina.scout_rank).toBeUndefined(); // Should be mapped out by repository
    });
});
