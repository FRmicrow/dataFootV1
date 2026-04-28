
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResolutionServiceV4 from './ResolutionServiceV4.js';
import db from '../../config/database.js';

vi.mock('../../config/database.js', () => ({
    default: {
        get: vi.fn(),
        run: vi.fn(),
        all: vi.fn()
    }
}));

describe('ResolutionServiceV4', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('resolveTeam', () => {
        it('should return team_id if mapping exists', async () => {
            db.get.mockResolvedValueOnce({ team_id: 123 });
            
            const result = await ResolutionServiceV4.resolveTeam('fs', '456');
            
            expect(result).toBe(123);
            expect(db.get).toHaveBeenCalledWith(expect.stringContaining('v4.mapping_teams'), ['fs', '456']);
        });

        it('should resolve by name and create mapping if not in mapping table', async () => {
            db.get.mockResolvedValueOnce(undefined); // Mapping not found
            db.get.mockResolvedValueOnce({ team_id: 789 }); // Match by name found
            
            const result = await ResolutionServiceV4.resolveTeam('fs', '101', { name: 'Real Madrid' });
            
            expect(result).toBe(789);
            expect(db.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO v4.mapping_teams'), ['fs', '101', 789, 'Real Madrid']);
        });
    });

    describe('resolvePerson', () => {
        it('should resolve by heuristic (Name + BirthDate)', async () => {
            db.get.mockResolvedValueOnce(undefined); // Mapping not found
            db.get.mockResolvedValueOnce({ person_id: 555 }); // Heuristic match found
            
            const result = await ResolutionServiceV4.resolvePerson('fs', 'p1', { 
                name: 'Kylian Mbappé', 
                birthDate: '1998-12-20' 
            });
            
            expect(result).toBe(555);
            expect(db.get).toHaveBeenLastCalledWith(
                expect.stringContaining('full_name = ? AND birth_date = ?'),
                ['Kylian Mbappé', '1998-12-20']
            );
        });

        it('should create a new person if no match found', async () => {
            db.get.mockResolvedValue(undefined); // No mapping, no heuristic match
            db.run.mockResolvedValueOnce({ lastInsertRowid: 999 }); // Create person
            db.run.mockResolvedValueOnce({ changes: 1 }); // Create mapping

            const result = await ResolutionServiceV4.resolvePerson('fs', 'pNew', { name: 'New Player' });

            expect(result).toBe(999);
            // 1st call: create the person row (full_name, person_type, nationality_1, birth_date)
            expect(db.run).toHaveBeenNthCalledWith(
                1,
                expect.stringContaining('INSERT INTO v4.people'),
                ['New Player', 'player', null, null]
            );
            // 2nd call: register the mapping for subsequent cache hits
            expect(db.run).toHaveBeenNthCalledWith(
                2,
                expect.stringContaining('INSERT INTO v4.mapping_people'),
                ['fs', 'pNew', 999, 'New Player']
            );
        });
    });
});
