import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../../src/config/database.js', () => ({
    default: {
        init: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue(null),
        all: vi.fn().mockResolvedValue([]),
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1, changes: 1 }),
    }
}));

// footballApi is called by getLeaguesV3 — mock it to avoid real HTTP calls
vi.mock('../../../src/services/footballApi.js', () => ({
    default: {
        getLeagues: vi.fn().mockResolvedValue({ response: [] }),
    }
}));

import leagueRoutes from '../../../src/routes/v3/league_routes.js';

const app = express();
app.use(express.json());
app.use('/', leagueRoutes);

describe('League API — contract tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /countries', () => {
        it('returns 200 with success wrapper', async () => {
            const res = await request(app).get('/countries');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('data is an array', async () => {
            const res = await request(app).get('/countries');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('each country has name and flag fields when data is present', async () => {
            const { default: db } = await import('../../../src/config/database.js');
            db.all.mockResolvedValueOnce([
                { name: 'England', code: 'GB', flag: 'https://flag.url/gb.svg' },
                { name: 'France', code: 'FR', flag: 'https://flag.url/fr.svg' },
            ]);

            const res = await request(app).get('/countries');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.data[0]).toHaveProperty('name', 'England');
            expect(res.body.data[0]).toHaveProperty('code');
            expect(res.body.data[0]).toHaveProperty('flag');
        });
    });

    describe('GET /leagues', () => {
        it('returns 200 with success wrapper', async () => {
            const res = await request(app).get('/leagues');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('data is an array', async () => {
            const res = await request(app).get('/leagues');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('forwards country query param to football API', async () => {
            const { default: footballApi } = await import('../../../src/services/footballApi.js');
            await request(app).get('/leagues?country=England');
            expect(footballApi.getLeagues).toHaveBeenCalledWith({ country: 'England' });
        });

        it('calls football API without params when country is absent', async () => {
            const { default: footballApi } = await import('../../../src/services/footballApi.js');
            await request(app).get('/leagues');
            expect(footballApi.getLeagues).toHaveBeenCalledWith({});
        });
    });

    describe('GET /leagues/structured', () => {
        it('returns 200', async () => {
            const res = await request(app).get('/leagues/structured');
            expect(res.status).toBe(200);
        });
    });
});
