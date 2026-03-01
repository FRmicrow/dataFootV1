import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import studioRoutes from '../../src/routes/v3/studio_routes.js';
import { setupTestDb } from '../setup.js';

vi.mock('../../src/config/database.js', () => {
    const mockDb = {
        init: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockReturnValue({}),
        all: vi.fn().mockReturnValue([]),
        prepare: vi.fn().mockReturnValue({
            all: vi.fn().mockReturnValue([]),
            get: vi.fn().mockReturnValue({}),
            run: vi.fn().mockReturnValue({ lastInsertRowid: 1 })
        }),
        run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }),
        db: {
            exec: vi.fn()
        }
    };
    return { default: mockDb };
});

const app = express();
app.use(express.json());
app.use('/api/v3', studioRoutes);

describe('Content Studio API Integration (Baseline)', () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    it('GET /api/v3/studio/meta/stats - should return stats list', async () => {
        const response = await request(app).get('/api/v3/studio/meta/stats');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/v3/studio/meta/leagues - should return leagues list', async () => {
        const response = await request(app).get('/api/v3/studio/meta/leagues');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('GET /api/v3/studio/meta/nationalities - should return nationalities list', async () => {
        const response = await request(app).get('/api/v3/studio/meta/nationalities');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });

    it('POST /api/v3/studio/query - should return timeline data', async () => {
        const response = await request(app)
            .post('/api/v3/studio/query')
            .send({
                stat: 'goals_total',
                filters: { years: [2020, 2024], leagues: [], countries: [], teams: [] },
                selection: { mode: 'top_n', value: 10 },
                options: { cumulative: true }
            });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('timeline');
    });
});
