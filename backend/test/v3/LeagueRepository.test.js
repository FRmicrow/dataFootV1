import { describe, it, expect } from 'vitest';
import { setupTestDb } from '../setup.js';
import LeagueRepository from '../../src/repositories/v3/LeagueRepository.js';

describe('LeagueRepository Final Integration', () => {
    it('should seed and find league atomically', async () => {
        const dbWrapper = await setupTestDb();

        // Seed - USE REPLACE TO AVOID PK ERRORS
        dbWrapper.run("INSERT OR REPLACE INTO V3_Countries (country_id, name, continent, importance_rank) VALUES (500, 'ConsolidatedCountry', 'Europe', 1)");
        dbWrapper.run("INSERT OR REPLACE INTO V3_Leagues (league_id, api_id, country_id, name, type, importance_rank) VALUES (500, 777, 500, 'ConsolidatedLeague', 'League', 1)");

        // Verify via Repository
        const league = LeagueRepository.findByApiId(777);
        expect(league).toBeDefined();
        expect(league.name).toBe('ConsolidatedLeague');
    });
});
