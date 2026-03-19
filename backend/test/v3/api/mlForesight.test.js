import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const state = {
    leagues: [],
    seasons: {},
    fixturesByLeagueSeason: {},
    completedFixturesByLeagueSeason: {},
    outputsByFixture: {},
    registryRows: [],
    seasonFixtureCountsByLeague: {},
    historicalRunRowsByLeague: {},
    latestHistoricalSimulationByLeagueSeason: {},
    historicalResultRowsBySimulation: {},
};

const getLeagueSeasonKey = (leagueId, seasonYear) => `${leagueId}:${seasonYear}`;

const defaultRegistryRows = () => ([
    { name: 'global_1x2', version: 'ft-v1', metadata_json: '{}', created_at: '2026-03-17T08:00:00Z' },
    { name: 'global_ht_1x2', version: 'ht-v1', metadata_json: '{}', created_at: '2026-03-17T08:00:00Z' },
    { name: 'global_goals_ou', version: 'goals-v1', metadata_json: '{}', created_at: '2026-03-17T08:00:00Z' },
    { name: 'global_corners_ou', version: 'corners-v1', metadata_json: '{}', created_at: '2026-03-17T08:00:00Z' },
    { name: 'global_cards_ou', version: 'cards-v1', metadata_json: '{}', created_at: '2026-03-17T08:00:00Z' },
]);

vi.mock('../../../src/config/database.js', () => ({
    default: {
        init: vi.fn().mockResolvedValue(true),
        run: vi.fn().mockResolvedValue({ lastInsertRowid: 1, changes: 1 }),
        all: vi.fn(async (sql, params = []) => {
            if (sql.includes('FROM V3_Model_Registry')) {
                return state.registryRows;
            }

            if (sql.includes('FROM V3_Leagues l')) {
                const requestedIds = new Set((params || []).map(Number));
                if (!requestedIds.size) {
                    return state.leagues;
                }
                return state.leagues.filter((league) => requestedIds.has(Number(league.league_id)));
            }

            if (sql.includes('/* ml_foresight_season_fixture_counts */')) {
                const leagueId = Number(params[params.length - 1]);
                return state.seasonFixtureCountsByLeague[leagueId] || [];
            }

            if (sql.includes('/* ml_foresight_season_runs */')) {
                const leagueId = Number(params[0]);
                return state.historicalRunRowsByLeague[leagueId] || [];
            }

            if (sql.includes('FROM V3_Risk_Analysis ra')) {
                return [];
            }

            if (sql.includes('SELECT league_id, home_team, away_team')) {
                return [];
            }

            if (sql.includes('FROM V3_Fixtures f') && sql.includes('JOIN V3_Teams ht ON f.home_team_id = ht.team_id')) {
                const [leagueId, seasonYear] = params;
                if (sql.includes('/* ml_foresight_completed_fixtures */')) {
                    return state.completedFixturesByLeagueSeason[getLeagueSeasonKey(Number(leagueId), Number(seasonYear))] || [];
                }
                return state.fixturesByLeagueSeason[getLeagueSeasonKey(Number(leagueId), Number(seasonYear))] || [];
            }

            if (sql.includes('FROM V3_Submodel_Outputs')) {
                return (params || []).flatMap((fixtureId) => state.outputsByFixture[Number(fixtureId)] || []);
            }

            if (sql.includes('/* ml_foresight_history_results */')) {
                const [simulationId, ...fixtureIds] = params.map(Number);
                const requestedFixtures = new Set(fixtureIds);
                return (state.historicalResultRowsBySimulation[simulationId] || [])
                    .filter((row) => requestedFixtures.has(Number(row.fixture_id)));
            }

            return [];
        }),
        get: vi.fn(async (sql, params = []) => {
            if (sql.includes('/* ml_foresight_latest_history_run */')) {
                const [leagueId, seasonYear] = params.map(Number);
                return state.latestHistoricalSimulationByLeagueSeason[getLeagueSeasonKey(leagueId, seasonYear)];
            }

            if (sql.includes('FROM V3_League_Seasons ls')) {
                const leagueId = Number(params[params.length - 1]);
                const seasonYear = state.seasons[leagueId];
                return seasonYear ? { season_year: seasonYear, has_upcoming: 1, is_current: 1 } : undefined;
            }

            if (sql.includes('FROM V3_Fixtures f') && sql.includes('GROUP BY f.season_year')) {
                const leagueId = Number(params[params.length - 1]);
                const seasonYear = state.seasons[leagueId];
                return seasonYear ? { season_year: seasonYear, has_upcoming: 1 } : undefined;
            }

            return undefined;
        }),
    },
}));

import { validateRequest } from '../../../src/middleware/validateRequest.js';
import { foresightLeagueDetailSchema } from '../../../src/schemas/v3Schemas.js';
import {
    getMLForesightLeague,
    getMLForesightLeagues,
} from '../../../src/controllers/v3/mlForesightController.js';

const app = express();
app.use(express.json());
app.get('/ml-platform/foresight/leagues', getMLForesightLeagues);
app.get('/ml-platform/foresight/league/:leagueId', validateRequest(foresightLeagueDetailSchema), getMLForesightLeague);

const makeLeagueRow = (league_id, league_name, country = 'Europe', api_id = null) => ({
    league_id,
    api_id,
    league_name,
    logo: `${league_name}.png`,
    country,
    importance_rank: 1,
    country_importance_rank: 1,
});

const makeFixture = ({ fixtureId, leagueId, seasonYear, home, away, date = '2026-03-20T20:00:00Z', round = 'Round of 16' }) => ({
    fixture_id: fixtureId,
    league_id: leagueId,
    season_year: seasonYear,
    date,
    round,
    status_short: 'NS',
    home_team_id: fixtureId + 100,
    home_team_name: home,
    home_team_logo: `${home}.png`,
    away_team_id: fixtureId + 200,
    away_team_name: away,
    away_team_logo: `${away}.png`,
});

const makeCompletedFixture = ({
    fixtureId,
    leagueId,
    seasonYear,
    home,
    away,
    date = '2025-03-20T20:00:00Z',
    round = 'Round of 16',
    goalsHome = 2,
    goalsAway = 1,
    htGoalsHome = 1,
    htGoalsAway = 0,
}) => ({
    ...makeFixture({ fixtureId, leagueId, seasonYear, home, away, date, round }),
    status_short: 'FT',
    goals_home: goalsHome,
    goals_away: goalsAway,
    score_halftime_home: htGoalsHome,
    score_halftime_away: htGoalsAway,
});

const makeOutputRow = (fixtureId, modelType, prediction, calculatedAt = '2026-03-17T09:00:00Z') => ({
    fixture_id: fixtureId,
    model_type: modelType,
    prediction_json: JSON.stringify(prediction),
    calculated_at: calculatedAt,
});

const makeHistoricalRunRow = ({
    simulationId,
    seasonYear,
    horizonType = 'FULL_HISTORICAL',
    resultRowCount = 0,
    modeledFixtureCount = 0,
    marketTypes = [],
}) => ({
    simulation_id: simulationId,
    season_year: seasonYear,
    horizon_type: horizonType,
    result_row_count: resultRowCount,
    modeled_fixture_count: modeledFixtureCount,
    market_types: marketTypes.join(', '),
});

const makeHistoricalResultRow = ({
    fixtureId,
    marketType,
    predictedOutcome,
    actualResult,
    primaryProbability = 0.61,
    expectedTotal = null,
    actualNumericValue = null,
    isCorrect = 1,
    modelVersion = 'run-v1',
}) => ({
    fixture_id: fixtureId,
    market_type: marketType,
    market_label: marketType,
    model_version: modelVersion,
    predicted_outcome: predictedOutcome,
    actual_result: actualResult,
    primary_probability: primaryProbability,
    alternate_outcome: null,
    alternate_probability: null,
    actual_numeric_value: actualNumericValue,
    expected_total: expectedTotal,
    is_correct: isCorrect,
});

describe('ML foresight API', () => {
    beforeEach(() => {
        state.registryRows = defaultRegistryRows();
        state.leagues = [
            makeLeagueRow(1475, 'UEFA Champions League', 'Europe', 2),
            makeLeagueRow(2, 'Premier League', 'England', 39),
            makeLeagueRow(34, 'Primeira Liga', 'Portugal', 94),
        ];
        state.seasons = {
            1475: 2025,
            2: 2025,
            34: 2025,
        };
        state.fixturesByLeagueSeason = {};
        state.completedFixturesByLeagueSeason = {};
        state.outputsByFixture = {};
        state.seasonFixtureCountsByLeague = {
            1475: [{ season_year: 2025, completed_fixture_count: 0, upcoming_fixture_count: 1 }],
            2: [{ season_year: 2025, completed_fixture_count: 0, upcoming_fixture_count: 0 }],
            34: [{ season_year: 2025, completed_fixture_count: 0, upcoming_fixture_count: 0 }],
        };
        state.historicalRunRowsByLeague = {};
        state.latestHistoricalSimulationByLeagueSeason = {};
        state.historicalResultRowsBySimulation = {};
    });

    it('returns covered leagues with upcoming and ready counts', async () => {
        const uclFixture = makeFixture({ fixtureId: 9001, leagueId: 1475, seasonYear: 2025, home: 'Sporting', away: 'PSG' });
        const plFixture = makeFixture({ fixtureId: 9002, leagueId: 2, seasonYear: 2025, home: 'Chelsea', away: 'Arsenal' });

        state.fixturesByLeagueSeason[getLeagueSeasonKey(1475, 2025)] = [uclFixture];
        state.fixturesByLeagueSeason[getLeagueSeasonKey(2, 2025)] = [plFixture];
        state.outputsByFixture[9001] = [
            makeOutputRow(9001, 'FT_RESULT', {
                probabilities_1n2: { '1': 0.31, N: 0.27, '2': 0.42 },
                model_version: 'ft-v1',
                model_scope: 'global',
                prediction_status: 'success_model',
                is_fallback: false,
            }),
            makeOutputRow(9001, 'GOALS_TOTAL', {
                expected_goals: { home: 1.1, away: 1.6, total: 2.7 },
                over_under_probabilities: { 'Over 2.5': 0.58, 'Under 2.5': 0.42 },
                model_version: 'goals-v1',
                model_scope: 'global',
                prediction_status: 'success_model',
                is_fallback: false,
            }),
        ];
        state.outputsByFixture[9002] = [
            makeOutputRow(9002, 'FT_RESULT', {
                probabilities_1n2: { '1': 0.44, N: 0.26, '2': 0.30 },
                model_version: 'ft-v1',
                model_scope: 'global',
                prediction_status: 'success_model',
                is_fallback: false,
            }),
        ];
        state.historicalRunRowsByLeague[1475] = [
            makeHistoricalRunRow({ simulationId: 701, seasonYear: 2025, resultRowCount: 2, modeledFixtureCount: 1, marketTypes: ['FT_1X2', 'GOALS_OU'] }),
        ];
        state.historicalRunRowsByLeague[2] = [
            makeHistoricalRunRow({ simulationId: 801, seasonYear: 2025, resultRowCount: 1, modeledFixtureCount: 1, marketTypes: ['FT_1X2'] }),
        ];

        const res = await request(app).get('/ml-platform/foresight/leagues');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const ucl = res.body.data.find((league) => league.leagueId === 1475);
        const pl = res.body.data.find((league) => league.leagueId === 2);
        expect(ucl.upcomingFixtureCount).toBe(1);
        expect(ucl.predictionReadyCount).toBe(1);
        expect(ucl.modeledSeasonYears).toEqual([2025]);
        expect(ucl.markets.ftResult).toBe(true);
        expect(ucl.markets.goalsTotal).toBe(true);
        expect(ucl.markets.htResult).toBe(false);
        expect(pl.predictionReadyCount).toBe(0);
    });

    it('returns ready upcoming fixtures with normalized projected result', async () => {
        const fixture = makeFixture({ fixtureId: 9101, leagueId: 1475, seasonYear: 2025, home: 'Sporting', away: 'PSG' });
        state.fixturesByLeagueSeason[getLeagueSeasonKey(1475, 2025)] = [fixture];
        state.outputsByFixture[9101] = [
            makeOutputRow(9101, 'FT_RESULT', {
                probabilities_1n2: { '1': 0.22, N: 0.25, '2': 0.53 },
                model_version: 'ft-v1',
                model_scope: 'global',
                prediction_status: 'success_model',
                is_fallback: false,
            }),
            makeOutputRow(9101, 'GOALS_TOTAL', {
                expected_goals: { home: 1.0, away: 1.8, total: 2.8 },
                over_under_probabilities: { 'Over 2.5': 0.61, 'Under 2.5': 0.39 },
                model_version: 'goals-v1',
                model_scope: 'global',
                prediction_status: 'success_model',
                is_fallback: false,
            }),
        ];

        const res = await request(app).get('/ml-platform/foresight/league/1475');

        expect(res.status).toBe(200);
        expect(res.body.data.league.seasonYear).toBe(2025);
        expect(res.body.data.fixtures).toHaveLength(1);
        expect(res.body.data.fixtures[0].fixtureId).toBe(9101);
        expect(res.body.data.fixtures[0].predictionStatus).toBe('ready');
        expect(res.body.data.fixtures[0].projectedResult.label).toBe('PSG gagne');
        expect(res.body.data.fixtures[0].markets.ftResult.selection).toBe('2');
        expect(res.body.data.fixtures[0].markets.goalsTotal.line).toBe(2.5);
        expect(res.body.data.upcomingFixtures).toHaveLength(1);
        expect(res.body.data.historicalFixtures).toEqual([]);
    });

    it('returns partial when only some covered markets are persisted', async () => {
        const fixture = makeFixture({ fixtureId: 9201, leagueId: 2, seasonYear: 2025, home: 'Chelsea', away: 'Arsenal' });
        state.fixturesByLeagueSeason[getLeagueSeasonKey(2, 2025)] = [fixture];
        state.outputsByFixture[9201] = [
            makeOutputRow(9201, 'FT_RESULT', {
                probabilities_1n2: { '1': 0.46, N: 0.24, '2': 0.30 },
                model_version: 'ft-v1',
                model_scope: 'global',
                prediction_status: 'success_model',
                is_fallback: false,
            }),
        ];

        const res = await request(app).get('/ml-platform/foresight/league/2');

        expect(res.status).toBe(200);
        expect(res.body.data.coverage.htResult).toBe(true);
        expect(res.body.data.fixtures[0].predictionStatus).toBe('partial');
        expect(res.body.data.fixtures[0].markets.ftResult).not.toBeNull();
        expect(res.body.data.fixtures[0].markets.htResult).toBeNull();
        expect(res.body.data.fixtures[0].markets.cardsTotal).toBeNull();
    });

    it('returns missing when upcoming fixtures have no predictions yet', async () => {
        const fixture = makeFixture({ fixtureId: 9301, leagueId: 2, seasonYear: 2025, home: 'Liverpool', away: 'Tottenham' });
        state.fixturesByLeagueSeason[getLeagueSeasonKey(2, 2025)] = [fixture];

        const res = await request(app).get('/ml-platform/foresight/league/2');

        expect(res.status).toBe(200);
        expect(res.body.data.fixtures[0].predictionStatus).toBe('missing');
        expect(res.body.data.fixtures[0].projectedResult).toBeNull();
        expect(res.body.data.fixtures.map((item) => item.fixtureId)).toEqual([9301]);
    });

    it('honors explicit seasonYear override and supports empty upcoming state', async () => {
        state.fixturesByLeagueSeason[getLeagueSeasonKey(1475, 2024)] = [
            makeFixture({ fixtureId: 9401, leagueId: 1475, seasonYear: 2024, home: 'Bodo/Glimt', away: 'Chelsea', round: 'Quarter-finals' }),
        ];
        state.fixturesByLeagueSeason[getLeagueSeasonKey(34, 2025)] = [];
        state.seasonFixtureCountsByLeague[1475] = [
            { season_year: 2025, completed_fixture_count: 0, upcoming_fixture_count: 0 },
            { season_year: 2024, completed_fixture_count: 0, upcoming_fixture_count: 1 },
        ];
        state.historicalRunRowsByLeague[1475] = [
            makeHistoricalRunRow({ simulationId: 100, seasonYear: 2024, resultRowCount: 0, modeledFixtureCount: 0, marketTypes: ['FT_1X2'] }),
        ];

        const seasonOverride = await request(app).get('/ml-platform/foresight/league/1475?seasonYear=2024');
        const emptyLeague = await request(app).get('/ml-platform/foresight/league/34');

        expect(seasonOverride.status).toBe(200);
        expect(seasonOverride.body.data.league.seasonYear).toBe(2024);
        expect(seasonOverride.body.data.fixtures[0].fixtureId).toBe(9401);
        expect(seasonOverride.body.data.seasonOptions[0].seasonYear).toBe(2025);

        expect(emptyLeague.status).toBe(200);
        expect(emptyLeague.body.data.fixtures).toEqual([]);
    });

    it('returns all completed fixtures for modeled historical seasons', async () => {
        state.seasonFixtureCountsByLeague[2] = [
            { season_year: 2025, completed_fixture_count: 1, upcoming_fixture_count: 1 },
            { season_year: 2024, completed_fixture_count: 2, upcoming_fixture_count: 0 },
        ];
        state.historicalRunRowsByLeague[2] = [
            makeHistoricalRunRow({ simulationId: 852, seasonYear: 2025, resultRowCount: 2, modeledFixtureCount: 1, marketTypes: ['FT_1X2', 'GOALS_OU'] }),
            makeHistoricalRunRow({ simulationId: 851, seasonYear: 2024, resultRowCount: 4, modeledFixtureCount: 2, marketTypes: ['FT_1X2', 'GOALS_OU'] }),
        ];
        state.latestHistoricalSimulationByLeagueSeason[getLeagueSeasonKey(2, 2024)] = {
            simulation_id: 851,
            horizon_type: 'FULL_HISTORICAL',
        };
        state.completedFixturesByLeagueSeason[getLeagueSeasonKey(2, 2024)] = [
            makeCompletedFixture({ fixtureId: 9501, leagueId: 2, seasonYear: 2024, home: 'Chelsea', away: 'Arsenal', goalsHome: 2, goalsAway: 1 }),
            makeCompletedFixture({ fixtureId: 9502, leagueId: 2, seasonYear: 2024, home: 'Liverpool', away: 'Tottenham', goalsHome: 0, goalsAway: 0, htGoalsHome: 0, htGoalsAway: 0 }),
        ];
        state.historicalResultRowsBySimulation[851] = [
            makeHistoricalResultRow({ fixtureId: 9501, marketType: 'FT_1X2', predictedOutcome: '1', actualResult: '1', isCorrect: 1 }),
            makeHistoricalResultRow({ fixtureId: 9501, marketType: 'GOALS_OU', predictedOutcome: 'Over 2.5', actualResult: 'Over 2.5', actualNumericValue: 3, expectedTotal: 2.9, isCorrect: 1 }),
            makeHistoricalResultRow({ fixtureId: 9502, marketType: 'FT_1X2', predictedOutcome: '1', actualResult: 'N', isCorrect: 0 }),
            makeHistoricalResultRow({ fixtureId: 9502, marketType: 'GOALS_OU', predictedOutcome: 'Over 2.5', actualResult: 'Under 2.5', actualNumericValue: 0, expectedTotal: 2.6, isCorrect: 0 }),
        ];

        const res = await request(app).get('/ml-platform/foresight/league/2?seasonYear=2024');

        expect(res.status).toBe(200);
        expect(res.body.data.league.seasonYear).toBe(2024);
        expect(res.body.data.upcomingFixtures).toEqual([]);
        expect(res.body.data.historicalFixtures).toHaveLength(2);
        const drawFixture = res.body.data.historicalFixtures.find((fixture) => fixture.fixtureId === 9502);
        const winFixture = res.body.data.historicalFixtures.find((fixture) => fixture.fixtureId === 9501);

        expect(drawFixture.matchState).toBe('completed');
        expect(drawFixture.actualScore).toBe('0-0');
        expect(drawFixture.markets.ftResult.actualSelection).toBe('N');
        expect(drawFixture.verdict).toBe('miss');
        expect(winFixture.markets.goalsTotal.actualNumericValue).toBe(3);
        expect(res.body.data.seasonOptions.map((season) => season.seasonYear)).toEqual([2025, 2024]);
    });

    it('returns 404 for leagues outside the ML Hub coverage', async () => {
        const res = await request(app).get('/ml-platform/foresight/league/999');

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
    });
});
