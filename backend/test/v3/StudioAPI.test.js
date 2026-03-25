import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import studioRoutes from '../../src/routes/v3/studio_routes.js';

vi.mock('../../src/config/database.js', () => {
    const mockDb = {
        init: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue({}),
        all: vi.fn().mockResolvedValue([]),
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1, changes: 1 }),
        query: vi.fn().mockResolvedValue([])
    };
    return { default: mockDb };
});

const app = express();
app.use(express.json());
app.use('/api/v3', studioRoutes);

describe('Content Studio API Integration (Baseline)', () => {

    it('GET /api/v3/studio/meta/stats - should return stats list', async () => {
        const response = await request(app).get('/api/v3/studio/meta/stats');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/v3/studio/meta/leagues - should return leagues list', async () => {
        const response = await request(app).get('/api/v3/studio/meta/leagues');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('GET /api/v3/studio/meta/nationalities - should return nationalities list', async () => {
        const response = await request(app).get('/api/v3/studio/meta/nationalities');
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
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
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('timeline');
    });
});
