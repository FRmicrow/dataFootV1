import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the database before any imports that depend on it
vi.mock('../../../src/config/database.js', () => ({
    default: {
        init: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue({ count: '0' }),
        all: vi.fn().mockResolvedValue([]),
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1, changes: 1 }),
    }
}));

// Mock HealthIntelligenceService since it has deep dependencies
vi.mock('../../../src/services/v3/HealthIntelligenceService.js', () => ({
    HealthIntelligenceService: {
        calculateScore: vi.fn().mockResolvedValue({
            score: 85,
            coverage_percent: 92,
            details: { orphans: 3, missing_fixture_seasons: 1 }
        })
    }
}));

import dashboardRoutes from '../../../src/routes/v3/dashboard_routes.js';

const app = express();
app.use(express.json());
app.use('/', dashboardRoutes);

describe('Dashboard API — contract tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /stats', () => {
        it('returns 200 with success wrapper', async () => {
            const res = await request(app).get('/stats');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('response data contains expected top-level keys', async () => {
            const res = await request(app).get('/stats');
            expect(res.body.data).toHaveProperty('volumetrics');
            expect(res.body.data).toHaveProperty('distribution');
            expect(res.body.data).toHaveProperty('players_by_country');
            expect(res.body.data).toHaveProperty('fixture_trends');
            expect(res.body.data).toHaveProperty('health_summary');
        });

        it('health_summary contains required fields', async () => {
            const res = await request(app).get('/stats');
            const { health_summary } = res.body.data;
            expect(health_summary).toHaveProperty('score');
            expect(health_summary).toHaveProperty('coverage_percent');
            expect(health_summary).toHaveProperty('orphans');
            expect(health_summary).toHaveProperty('partial_seasons');
        });
    });

    describe('GET /leagues/imported', () => {
        it('returns 200 with success wrapper and data array', async () => {
            const res = await request(app).get('/leagues/imported');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('each league item has required fields', async () => {
            const { default: db } = await import('../../../src/config/database.js');
            db.all.mockResolvedValueOnce([
                { league_id: 1, api_id: 39, name: 'Premier League', league_type: 'League',
                  logo_url: null, country_name: 'England', importance_rank: 1, flag_url: null, years_csv: '2023,2022' }
            ]);

            const res = await request(app).get('/leagues/imported');
            expect(res.body.data[0]).toHaveProperty('league_id');
            expect(res.body.data[0]).toHaveProperty('name');
            expect(res.body.data[0]).toHaveProperty('years_imported');
            expect(Array.isArray(res.body.data[0].years_imported)).toBe(true);
        });
    });

    describe('GET /leagues/discovered', () => {
        it('returns 200 with success wrapper and data array', async () => {
            const res = await request(app).get('/leagues/discovered');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });
});
