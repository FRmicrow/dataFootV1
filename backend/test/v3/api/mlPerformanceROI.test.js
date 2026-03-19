import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const state = {
    roiRows: [],
    leagueMeta: null,
};

vi.mock('../../../src/config/database.js', () => ({
    default: {
        init: vi.fn().mockResolvedValue(true),
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1, changes: 1 }),
        all: vi.fn(async (sql) => {
            if (sql.includes('FROM roi_candidates')) {
                return state.roiRows;
            }
            return [];
        }),
        get: vi.fn(async (sql) => {
            if (sql.includes('FROM v3_leagues l')) {
                return state.leagueMeta;
            }
            return undefined;
        }),
    },
}));

import { validateRequest } from '../../../src/middleware/validateRequest.js';
import { roiRequestSchema } from '../../../src/schemas/v3Schemas.js';
import { calculatePerformanceROI } from '../../../src/controllers/v3/mlController.js';

const app = express();
app.use(express.json());
app.post('/ml-platform/performance/roi', validateRequest(roiRequestSchema), calculatePerformanceROI);

const makeBaseRow = (overrides = {}) => ({
    fixture_id: 7001,
    market_type: 'FT_1X2',
    selection: '1',
    actual_result: '1',
    ml_probability: 0.61,
    bookmaker_odd: 2.1,
    league_id: 2,
    league_name: 'Premier League',
    season_year: 2025,
    goals_home: 2,
    goals_away: 1,
    score_halftime_home: 1,
    score_halftime_away: 0,
    date: '2026-03-18T20:00:00Z',
    home_team: 'Chelsea',
    away_team: 'Arsenal',
    total_corners: 10,
    total_cards: 4,
    ...overrides,
});

describe('ML performance ROI API', () => {
    beforeEach(() => {
        state.roiRows = [];
        state.leagueMeta = {
            league_id: 2,
            league_name: 'Premier League',
            country_name: 'England',
        };
    });

    it('returns match-by-match gains aggregated from odds and stake inputs', async () => {
        state.roiRows = [
            makeBaseRow(),
            makeBaseRow({
                market_type: 'GOALS_OU',
                selection: 'Under 2.5',
                actual_result: 'Over 2.5',
                ml_probability: 0.58,
                bookmaker_odd: 1.9,
            }),
        ];

        const res = await request(app)
            .post('/ml-platform/performance/roi')
            .send({
                portfolioSize: 1000,
                stakePerBet: 10,
                leagueId: 2,
                seasonYear: 2025,
                markets: 'all',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.totalBets).toBe(2);
        expect(res.body.data.totalMatches).toBe(1);
        expect(res.body.data.wins).toBe(1);
        expect(res.body.data.losses).toBe(1);
        expect(res.body.data.benefit).toBe(1);
        expect(res.body.data.leagueBreakdown).toHaveLength(1);
        expect(res.body.data.leagueBreakdown[0].benefit).toBe(1);
        expect(res.body.data.leagueBreakdown[0].markets.FT_1X2.benefit).toBe(11);
        expect(res.body.data.leagueBreakdown[0].markets.GOALS_OU.benefit).toBe(-10);
        expect(res.body.data.marketBreakdown).toHaveLength(2);
        expect(res.body.data.matchResults).toHaveLength(1);
        expect(res.body.data.matchResults[0].totalNetProfit).toBe(1);
        expect(res.body.data.matchResults[0].betCount).toBe(2);
        expect(res.body.data.matchResults[0].hits).toBe(1);
        expect(res.body.data.betResults[1].actualOutcome).toBe('Over 2.5');
        expect(res.body.data.betResults[1].netProfit).toBe(-10);
    });

    it('returns annual league-by-league breakdown when no leagueId is provided', async () => {
        state.roiRows = [
            makeBaseRow(),
            makeBaseRow({
                fixture_id: 7002,
                league_id: 1,
                league_name: 'Ligue 1',
                home_team: 'PSG',
                away_team: 'Monaco',
                bookmaker_odd: 1.5,
                goals_home: 1,
                goals_away: 1,
                selection: '1',
                actual_result: 'N',
            }),
            makeBaseRow({
                fixture_id: 7002,
                league_id: 1,
                league_name: 'Ligue 1',
                home_team: 'PSG',
                away_team: 'Monaco',
                market_type: 'GOALS_OU',
                selection: 'Under 2.5',
                actual_result: 'Under 2.5',
                bookmaker_odd: 1.8,
                goals_home: 1,
                goals_away: 1,
                ml_probability: 0.57,
            }),
        ];

        const res = await request(app)
            .post('/ml-platform/performance/roi')
            .send({
                portfolioSize: 1000,
                stakePerBet: 10,
                seasonYear: 2025,
                markets: 'all',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.scope.leagueId).toBeNull();
        expect(res.body.data.leagueBreakdown).toHaveLength(2);
        const ligue1 = res.body.data.leagueBreakdown.find((row) => row.leagueId === 1);
        const premierLeague = res.body.data.leagueBreakdown.find((row) => row.leagueId === 2);

        expect(ligue1.totalBets).toBe(2);
        expect(ligue1.benefit).toBe(-2);
        expect(ligue1.markets.FT_1X2.benefit).toBe(-10);
        expect(ligue1.markets.GOALS_OU.benefit).toBe(8);
        expect(premierLeague.totalBets).toBe(1);
        expect(premierLeague.benefit).toBe(11);
        expect(res.body.data.benefit).toBe(9);
    });

    it('validates required stake and portfolio inputs', async () => {
        const res = await request(app)
            .post('/ml-platform/performance/roi')
            .send({});

        expect(res.status).toBe(400);
        expect(res.body).toBeTruthy();
    });
});
