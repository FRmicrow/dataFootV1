import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as mlControllerV4 from './mlControllerV4';
import db from '../../config/database.js';

// Mock the database wrapper
vi.mock('../../config/database.js', () => ({
    default: {
        get: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
        db: { query: vi.fn() }
    },
}));

describe('mlControllerV4', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getV4MLStats', () => {
        it('should return 200 and stats on success', async () => {
            const mockReq = {};
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            // Mock DB responses for the queries in getV4MLStats
            db.get.mockResolvedValueOnce({
                upcoming_with_pred: 42,
                covered_competitions: 15,
                total_predictions: 5000
            });
            db.all.mockResolvedValueOnce([
                { 
                    home_score: 2, 
                    away_score: 1, 
                    prediction_json: JSON.stringify({ ft_1x2: { home: 0.7, draw: 0.2, away: 0.1 } }),
                    competition_name: 'Ligue 1'
                }
            ]);

            await mlControllerV4.getV4MLStats(mockReq, mockRes);

            expect(mockRes.status).not.toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.any(Object)
            }));
        });

        it('should return 500 on database error', async () => {
            const mockReq = {};
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            db.get.mockRejectedValueOnce(new Error('DB Error'));

            await mlControllerV4.getV4MLStats(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: 'DB Error'
            });
        });
    });

    describe('getPredictionHistory', () => {
        it('should handle pagination and return rows', async () => {
            const mockReq = { query: { limit: '10', offset: '0' } };
            const mockRes = {
                status: vi.fn().mockReturnThis(),
                json: vi.fn(),
            };

            db.get.mockResolvedValueOnce({ total: 100 });
            db.all.mockResolvedValueOnce([
                {
                    match_id: 1,
                    home_team: 'Team A',
                    away_team: 'Team B',
                    home_score: 2,
                    away_score: 1,
                    prediction_json: JSON.stringify({ ft_1x2: { home: 0.8, draw: 0.1, away: 0.1 } })
                }
            ]);

            await mlControllerV4.getPredictionHistory(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    rows: expect.any(Array),
                    total: 100
                })
            }));
        });
    });
});
