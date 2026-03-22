import db from '../../config/database.js';

const MARKET_KEYS = ['ftResult', 'htResult', 'goalsTotal', 'cornersTotal', 'cardsTotal'];

const MODEL_NAME_BY_MARKET = {
    ftResult: 'global_1x2',
    htResult: 'global_ht_1x2',
    goalsTotal: 'global_goals_ou',
    cornersTotal: 'global_corners_ou',
    cardsTotal: 'global_cards_ou',
};

const MODEL_TYPE_BY_MARKET = {
    ftResult: 'FT_RESULT',
    htResult: 'HT_RESULT',
    goalsTotal: 'GOALS_TOTAL',
    cornersTotal: 'CORNERS_TOTAL',
    cardsTotal: 'CARDS_TOTAL',
};

const PRIMARY_LINE_BY_MARKET = {
    goalsTotal: 2.5,
    cornersTotal: 9.5,
    cardsTotal: 4.5,
};

const EXPECTED_TOTAL_KEY_BY_MARKET = {
    goalsTotal: 'expected_goals',
    cornersTotal: 'expected_corners',
    cardsTotal: 'expected_cards',
};

const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO', 'CANC', 'ABD'];
const LIVE_STATUSES = ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'INT', 'LIVE'];
const HISTORICAL_VISIBLE_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

const MARKET_TYPE_TO_KEY = {
    FT_1X2: 'ftResult',
    HT_1X2: 'htResult',
    GOALS_OU: 'goalsTotal',
    CORNERS_OU: 'cornersTotal',
    CARDS_OU: 'cardsTotal',
};

const MARKET_COVERAGE_FULL = {
    ftResult: true,
    htResult: true,
    goalsTotal: true,
    cornersTotal: true,
    cardsTotal: true,
};

const MARKET_COVERAGE_FT_GOALS = {
    ftResult: true,
    htResult: false,
    goalsTotal: true,
    cornersTotal: false,
    cardsTotal: false,
};

const V36_LEAGUE_PROFILES = [
    {
        key: 'premier_league',
        leagueIds: [2],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'la_liga',
        leagueIds: [11],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'bundesliga',
        leagueIds: [19],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'serie_a',
        leagueIds: [15],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'ligue_1',
        leagueIds: [1],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'primeira_liga',
        leagueIds: [34],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'eredivisie',
        leagueIds: [30],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'belgian_pro_league',
        leagueIds: [32],
        markets: MARKET_COVERAGE_FULL,
    },
    {
        key: 'uefa_champions_league',
        leagueIds: [1475],
        markets: MARKET_COVERAGE_FT_GOALS,
        isFeatured: true,
    },
    {
        key: 'uefa_europa_league',
        leagueIds: [1476],
        markets: MARKET_COVERAGE_FT_GOALS,
        isFeatured: true,
    },
];

const makeNotFoundError = (message) => {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
};

const makeInClause = (values) => values.map(() => '?').join(', ');

const safeJsonParse = (value) => {
    if (!value) return null;
    if (typeof value === 'object') return value;

    try {
        return JSON.parse(value);
    } catch (_) {
        return null;
    }
};

const normalizeOutcomeCode = (value) => {
    if (value === 'X') return 'N';
    return value;
};

const emptyCoverage = () => MARKET_KEYS.reduce((acc, marketKey) => {
    acc[marketKey] = false;
    return acc;
}, {});

const normalizeProbabilityMap = (probabilities = {}) => {
    return Object.entries(probabilities).reduce((acc, [key, value]) => {
        const normalizedKey = normalizeOutcomeCode(key);
        const numericValue = Number(value);

        if (normalizedKey && Number.isFinite(numericValue)) {
            acc[normalizedKey] = numericValue;
        }

        return acc;
    }, {});
};

const pickBestOutcome = (probabilities = {}) => {
    const normalized = normalizeProbabilityMap(probabilities);
    const ordered = ['1', 'N', '2']
        .filter((key) => normalized[key] != null)
        .map((key) => ({ selection: key, probability: normalized[key] }))
        .sort((a, b) => b.probability - a.probability || ['1', 'N', '2'].indexOf(a.selection) - ['1', 'N', '2'].indexOf(b.selection));

    return ordered[0] || null;
};

const buildResultLabel = (selection, homeTeamName, awayTeamName) => {
    if (selection === '1') return `${homeTeamName} gagne`;
    if (selection === '2') return `${awayTeamName} gagne`;
    return 'Match nul';
};

const parseSelectionLine = (selection) => {
    if (!selection) return null;

    const line = Number(String(selection).split(' ')[1]);
    return Number.isFinite(line) ? line : null;
};

const buildScoreLabel = (homeScore, awayScore) => {
    if (homeScore == null || awayScore == null) return null;
    return `${homeScore}-${awayScore}`;
};

const getActualResultSelectionFromFixture = (fixture) => {
    if (fixture.goals_home == null || fixture.goals_away == null) return null;
    if (Number(fixture.goals_home) > Number(fixture.goals_away)) return '1';
    if (Number(fixture.goals_home) < Number(fixture.goals_away)) return '2';
    return 'N';
};

const extractLineProbabilities = (probabilities = {}) => {
    const lineMap = new Map();

    Object.entries(probabilities).forEach(([label, rawProbability]) => {
        const match = String(label).match(/^(Over|Under)\s+(\d+(?:\.\d+)?)$/i);
        const probability = Number(rawProbability);
        if (!match || !Number.isFinite(probability)) return;

        const side = match[1].toLowerCase();
        const line = Number(match[2]);
        const existing = lineMap.get(line) || { line };
        existing[side] = probability;
        lineMap.set(line, existing);
    });

    return [...lineMap.values()];
};

const pickLinePair = (marketKey, probabilities = {}) => {
    const preferredLine = PRIMARY_LINE_BY_MARKET[marketKey];
    const pairs = extractLineProbabilities(probabilities);
    if (!pairs.length) return null;

    const exactMatch = pairs.find((pair) => pair.line === preferredLine && pair.over != null && pair.under != null);
    if (exactMatch) return exactMatch;

    return pairs
        .filter((pair) => pair.over != null && pair.under != null)
        .sort((a, b) => {
            const aDistance = preferredLine != null ? Math.abs(a.line - preferredLine) : 999;
            const bDistance = preferredLine != null ? Math.abs(b.line - preferredLine) : 999;
            const aBest = Math.max(a.over, a.under);
            const bBest = Math.max(b.over, b.under);
            return aDistance - bDistance || bBest - aBest;
        })[0] || null;
};

const buildMarketsShape = () => ({
    ftResult: null,
    htResult: null,
    goalsTotal: null,
    cornersTotal: null,
    cardsTotal: null,
});

const findLeagueProfile = (leagueRow) => {
    if (!leagueRow) return null;

    const leagueId = Number(leagueRow.league_id);

    return V36_LEAGUE_PROFILES.find((profile) => {
        return Number.isFinite(leagueId) && profile.leagueIds.includes(leagueId);
    }) || null;
};

const getStaticCoverageForLeague = (leagueRow) => {
    const profile = findLeagueProfile(leagueRow);
    return profile ? { ...profile.markets } : emptyCoverage();
};

const getRuntimeCoverageForLeague = (leagueRow, registryEntries) => {
    const staticCoverage = getStaticCoverageForLeague(leagueRow);

    return MARKET_KEYS.reduce((acc, marketKey) => {
        acc[marketKey] = Boolean(staticCoverage[marketKey] && registryEntries[MODEL_NAME_BY_MARKET[marketKey]]);
        return acc;
    }, {});
};

const isLeagueCovered = (leagueRow) => Boolean(findLeagueProfile(leagueRow));

const getActiveRegistryEntries = async () => {
    const names = Object.values(MODEL_NAME_BY_MARKET);
    const rows = await db.all(`
        SELECT name, version, path, metadata_json, created_at
        FROM V3_Model_Registry
        WHERE is_active = 1
          AND name IN (${makeInClause(names)})
        ORDER BY created_at DESC
    `, names);

    return rows.reduce((acc, row) => {
        if (!acc[row.name]) {
            acc[row.name] = {
                ...row,
                metadata: safeJsonParse(row.metadata_json),
            };
        }
        return acc;
    }, {});
};

const getCoveredLeagueRows = async (leagueIds = null) => {
    const params = [];
    const whereClause = Array.isArray(leagueIds) && leagueIds.length
        ? `WHERE l.league_id IN (${makeInClause(leagueIds)})`
        : '';

    if (whereClause) {
        params.push(...leagueIds);
    }

    const rows = await db.all(`
        SELECT
            l.league_id,
            l.api_id,
            l.name AS league_name,
            l.logo_url AS logo,
            c.name AS country,
            COALESCE(l.importance_rank, 99) AS importance_rank,
            COALESCE(c.importance_rank, 99) AS country_importance_rank
        FROM V3_Leagues l
        LEFT JOIN V3_Countries c ON l.country_id = c.country_id
        ${whereClause}
        ORDER BY
            COALESCE(l.global_importance_rank, 9999) ASC,
            COALESCE(c.importance_rank, 99) ASC,
            COALESCE(l.importance_rank, 99) ASC,
            l.name ASC
    `, params);

    return rows.filter((row) => isLeagueCovered(row));
};

const getCoveredLeagueRow = async (leagueId) => {
    const rows = await getCoveredLeagueRows([leagueId]);
    return rows[0] || null;
};

const resolveSeasonYear = async (leagueId, explicitSeasonYear) => {
    if (explicitSeasonYear) return Number(explicitSeasonYear);

    const seasonRow = await db.get(`
        SELECT
            ls.season_year,
            COALESCE(MAX(CASE
                WHEN (
                    COALESCE(f.status_short, 'NS') IN (${makeInClause(LIVE_STATUSES)})
                    OR (f.date >= NOW() AND COALESCE(f.status_short, 'NS') NOT IN (${makeInClause(FINISHED_STATUSES)}))
                ) THEN 1 ELSE 0
            END), 0) AS has_upcoming,
            COUNT(f.fixture_id) AS fixture_count,
            COALESCE(ls.is_current, false) AS is_current
        FROM V3_League_Seasons ls
        LEFT JOIN V3_Fixtures f
            ON f.league_id = ls.league_id
           AND f.season_year = ls.season_year
        WHERE ls.league_id = ?
        GROUP BY ls.season_year, COALESCE(ls.is_current, false)
        ORDER BY
            has_upcoming DESC,
            is_current DESC,
            ls.season_year DESC
        LIMIT 1
    `, [...LIVE_STATUSES, ...FINISHED_STATUSES, leagueId]);

    if (seasonRow?.season_year) {
        return Number(seasonRow.season_year);
    }

    const fallbackRow = await db.get(`
        SELECT
            f.season_year,
            COALESCE(MAX(CASE
                WHEN (
                    COALESCE(f.status_short, 'NS') IN (${makeInClause(LIVE_STATUSES)})
                    OR (f.date >= NOW() AND COALESCE(f.status_short, 'NS') NOT IN (${makeInClause(FINISHED_STATUSES)}))
                ) THEN 1 ELSE 0
            END), 0) AS has_upcoming
        FROM V3_Fixtures f
        WHERE f.league_id = ?
        GROUP BY f.season_year
        ORDER BY has_upcoming DESC, f.season_year DESC
        LIMIT 1
    `, [...LIVE_STATUSES, ...FINISHED_STATUSES, leagueId]);

    return fallbackRow?.season_year ? Number(fallbackRow.season_year) : null;
};

const getUpcomingFixtures = async (leagueId, seasonYear) => {
    if (!seasonYear) return [];

    return db.all(`
        SELECT
            f.fixture_id,
            f.league_id,
            f.season_year,
            f.date,
            f.round,
            f.status_short,
            ht.team_id AS home_team_id,
            ht.name AS home_team_name,
            ht.logo_url AS home_team_logo,
            at.team_id AS away_team_id,
            at.name AS away_team_name,
            at.logo_url AS away_team_logo
        FROM V3_Fixtures f
        JOIN V3_Teams ht ON f.home_team_id = ht.team_id
        JOIN V3_Teams at ON f.away_team_id = at.team_id
        WHERE f.league_id = ?
          AND f.season_year = ?
          AND (
              COALESCE(f.status_short, 'NS') IN (${makeInClause(LIVE_STATUSES)})
              OR (f.date >= NOW() AND COALESCE(f.status_short, 'NS') NOT IN (${makeInClause(FINISHED_STATUSES)}))
          )
        ORDER BY f.date ASC, f.fixture_id ASC
    `, [leagueId, seasonYear, ...LIVE_STATUSES, ...FINISHED_STATUSES]);
};

const getCompletedFixtures = async (leagueId, seasonYear) => {
    if (!seasonYear) return [];

    return db.all(`
        /* ml_foresight_completed_fixtures */
        SELECT
            f.fixture_id,
            f.league_id,
            f.season_year,
            f.date,
            f.round,
            f.status_short,
            f.goals_home,
            f.goals_away,
            f.score_halftime_home,
            f.score_halftime_away,
            ht.team_id AS home_team_id,
            ht.name AS home_team_name,
            ht.logo_url AS home_team_logo,
            at.team_id AS away_team_id,
            at.name AS away_team_name,
            at.logo_url AS away_team_logo
        FROM V3_Fixtures f
        JOIN V3_Teams ht ON f.home_team_id = ht.team_id
        JOIN V3_Teams at ON f.away_team_id = at.team_id
        WHERE f.league_id = ?
          AND f.season_year = ?
          AND COALESCE(f.status_short, 'NS') IN (${makeInClause(HISTORICAL_VISIBLE_STATUSES)})
        ORDER BY f.date DESC, f.fixture_id DESC
    `, [leagueId, seasonYear, ...HISTORICAL_VISIBLE_STATUSES]);
};

const getSeasonFixtureCounts = async (leagueId) => {
    return db.all(`
        /* ml_foresight_season_fixture_counts */
        SELECT
            f.season_year,
            COUNT(*) FILTER (
                WHERE COALESCE(f.status_short, 'NS') IN (${makeInClause(HISTORICAL_VISIBLE_STATUSES)})
            ) AS completed_fixture_count,
            COUNT(*) FILTER (
                WHERE (
                    COALESCE(f.status_short, 'NS') IN (${makeInClause(LIVE_STATUSES)})
                    OR (f.date >= NOW() AND COALESCE(f.status_short, 'NS') NOT IN (${makeInClause(FINISHED_STATUSES)}))
                )
            ) AS upcoming_fixture_count
        FROM V3_Fixtures f
        WHERE f.league_id = ?
        GROUP BY f.season_year
        ORDER BY f.season_year DESC
    `, [...HISTORICAL_VISIBLE_STATUSES, ...LIVE_STATUSES, ...FINISHED_STATUSES, leagueId]);
};

const getHistoricalSeasonRuns = async (leagueId) => {
    const rows = await db.all(`
        /* ml_foresight_season_runs */
        SELECT
            s.id AS simulation_id,
            s.season_year,
            COALESCE(s.horizon_type, 'FULL_HISTORICAL') AS horizon_type,
            COUNT(r.id) AS result_row_count,
            COUNT(DISTINCT r.fixture_id) AS modeled_fixture_count,
            STRING_AGG(DISTINCT r.market_type, ', ' ORDER BY r.market_type) AS market_types
        FROM V3_Forge_Simulations s
        JOIN V3_Forge_Results r
            ON r.simulation_id = s.id
           AND r.market_type IS NOT NULL
        WHERE s.status = 'COMPLETED'
          AND s.league_id = ?
        GROUP BY s.id, s.season_year, COALESCE(s.horizon_type, 'FULL_HISTORICAL')
        ORDER BY s.season_year DESC, s.id DESC
    `, [leagueId]);

    const seenSeasons = new Set();

    return rows.filter((row) => {
        const seasonYear = Number(row.season_year);
        if (seenSeasons.has(seasonYear)) return false;
        seenSeasons.add(seasonYear);
        return true;
    }).map((row) => ({
        simulationId: Number(row.simulation_id),
        seasonYear: Number(row.season_year),
        horizonType: row.horizon_type || 'FULL_HISTORICAL',
        resultRowCount: Number(row.result_row_count || 0),
        modeledFixtureCount: Number(row.modeled_fixture_count || 0),
        marketTypes: String(row.market_types || '')
            .split(',')
            .map((marketType) => marketType.trim())
            .filter(Boolean),
    }));
};

const getLatestHistoricalSimulation = async (leagueId, seasonYear) => {
    const row = await db.get(`
        /* ml_foresight_latest_history_run */
        SELECT
            s.id AS simulation_id,
            COALESCE(s.horizon_type, 'FULL_HISTORICAL') AS horizon_type
        FROM V3_Forge_Simulations s
        WHERE s.status = 'COMPLETED'
          AND s.league_id = ?
          AND s.season_year = ?
          AND EXISTS (
              SELECT 1
              FROM V3_Forge_Results r
              WHERE r.simulation_id = s.id
                AND r.market_type IS NOT NULL
          )
        ORDER BY s.id DESC
        LIMIT 1
    `, [leagueId, seasonYear]);

    if (!row) return null;

    return {
        simulationId: Number(row.simulation_id),
        horizonType: row.horizon_type || 'FULL_HISTORICAL',
    };
};

const getHistoricalFixtureResults = async (simulationId, fixtureIds) => {
    if (!simulationId || !fixtureIds.length) return new Map();

    const rows = await db.all(`
        /* ml_foresight_history_results */
        SELECT
            r.fixture_id,
            r.market_type,
            r.market_label,
            r.model_version,
            r.predicted_outcome,
            r.actual_result,
            r.primary_probability,
            r.alternate_outcome,
            r.alternate_probability,
            r.actual_numeric_value,
            r.expected_total,
            r.is_correct
        FROM V3_Forge_Results r
        WHERE r.simulation_id = ?
          AND r.fixture_id IN (${makeInClause(fixtureIds)})
          AND r.market_type IS NOT NULL
    `, [simulationId, ...fixtureIds]);

    return rows.reduce((acc, row) => {
        const fixtureId = Number(row.fixture_id);
        const marketKey = MARKET_TYPE_TO_KEY[row.market_type];
        if (!marketKey) return acc;

        if (!acc.has(fixtureId)) {
            acc.set(fixtureId, {});
        }

        acc.get(fixtureId)[marketKey] = row;
        return acc;
    }, new Map());
};

const getFixtureOutputs = async (fixtureIds) => {
    if (!fixtureIds.length) return new Map();

    const rows = await db.all(`
        SELECT fixture_id, model_type, prediction_json, calculated_at
        FROM V3_Submodel_Outputs
        WHERE fixture_id IN (${makeInClause(fixtureIds)})
    `, fixtureIds);

    return rows.reduce((acc, row) => {
        const fixtureKey = Number(row.fixture_id);
        const prediction = safeJsonParse(row.prediction_json);
        if (!prediction) return acc;

        if (!acc.has(fixtureKey)) {
            acc.set(fixtureKey, new Map());
        }

        const fixtureMap = acc.get(fixtureKey);
        const currentRow = fixtureMap.get(row.model_type);
        if (!currentRow || new Date(row.calculated_at || 0) > new Date(currentRow.calculated_at || 0)) {
            fixtureMap.set(row.model_type, {
                ...row,
                prediction,
            });
        }

        return acc;
    }, new Map());
};

const normalize1X2Market = (predictionRow, fixture) => {
    if (!predictionRow?.prediction) return null;
    if (predictionRow.prediction.prediction_status !== 'success_model' || predictionRow.prediction.is_fallback) {
        return null;
    }

    const bestOutcome = pickBestOutcome(predictionRow.prediction.probabilities_1n2);
    if (!bestOutcome) return null;

    return {
        selection: bestOutcome.selection,
        selectionLabel: buildResultLabel(bestOutcome.selection, fixture.home_team_name, fixture.away_team_name),
        probability: bestOutcome.probability,
        probabilities: normalizeProbabilityMap(predictionRow.prediction.probabilities_1n2),
        modelVersion: predictionRow.prediction.model_version || null,
        modelScope: predictionRow.prediction.model_scope || null,
        predictionStatus: predictionRow.prediction.prediction_status || null,
        isFallback: Boolean(predictionRow.prediction.is_fallback),
        calculatedAt: predictionRow.calculated_at || null,
    };
};

const normalizeTotalMarket = (marketKey, predictionRow) => {
    if (!predictionRow?.prediction) return null;
    if (predictionRow.prediction.prediction_status !== 'success_model' || predictionRow.prediction.is_fallback) {
        return null;
    }

    const probabilityPair = pickLinePair(marketKey, predictionRow.prediction.over_under_probabilities);
    const expectedKey = EXPECTED_TOTAL_KEY_BY_MARKET[marketKey];
    const expected = predictionRow.prediction[expectedKey] || {};

    if (!probabilityPair) return null;

    const primarySelection = probabilityPair.over >= probabilityPair.under
        ? `Over ${probabilityPair.line}`
        : `Under ${probabilityPair.line}`;

    return {
        line: probabilityPair.line,
        selection: primarySelection,
        probability: Math.max(probabilityPair.over, probabilityPair.under),
        overProbability: probabilityPair.over,
        underProbability: probabilityPair.under,
        expectedTotal: Number.isFinite(Number(expected.total)) ? Number(expected.total) : null,
        expectedHome: Number.isFinite(Number(expected.home)) ? Number(expected.home) : null,
        expectedAway: Number.isFinite(Number(expected.away)) ? Number(expected.away) : null,
        probabilities: predictionRow.prediction.over_under_probabilities || {},
        modelVersion: predictionRow.prediction.model_version || null,
        modelScope: predictionRow.prediction.model_scope || null,
        predictionStatus: predictionRow.prediction.prediction_status || null,
        isFallback: Boolean(predictionRow.prediction.is_fallback),
        calculatedAt: predictionRow.calculated_at || null,
    };
};

const normalizeHistorical1X2Market = (row, fixture) => {
    if (!row) return null;

    const selection = normalizeOutcomeCode(row.predicted_outcome);
    const actualSelection = normalizeOutcomeCode(row.actual_result);

    return {
        selection,
        selectionLabel: buildResultLabel(selection, fixture.home_team_name, fixture.away_team_name),
        probability: Number.isFinite(Number(row.primary_probability)) ? Number(row.primary_probability) : null,
        actualSelection,
        actualLabel: actualSelection ? buildResultLabel(actualSelection, fixture.home_team_name, fixture.away_team_name) : null,
        isCorrect: row.is_correct == null ? null : Boolean(Number(row.is_correct)),
        modelVersion: row.model_version || null,
    };
};

const normalizeHistoricalTotalMarket = (marketKey, row) => {
    if (!row) return null;

    const selection = row.predicted_outcome || null;
    const actualSelection = row.actual_result || null;
    const explicitLine = parseSelectionLine(selection);
    const actualNumericValue = Number.isFinite(Number(row.actual_numeric_value)) ? Number(row.actual_numeric_value) : null;
    const expectedTotal = Number.isFinite(Number(row.expected_total)) ? Number(row.expected_total) : null;

    return {
        line: explicitLine ?? PRIMARY_LINE_BY_MARKET[marketKey] ?? null,
        selection,
        probability: Number.isFinite(Number(row.primary_probability)) ? Number(row.primary_probability) : null,
        actualSelection,
        actualNumericValue,
        expectedTotal,
        isCorrect: row.is_correct == null ? null : Boolean(Number(row.is_correct)),
        modelVersion: row.model_version || null,
    };
};

const computePredictionStatus = (markets, coverage) => {
    const coveredMarketKeys = MARKET_KEYS.filter((marketKey) => coverage[marketKey]);
    const readyMarkets = coveredMarketKeys.filter((marketKey) => markets[marketKey]);

    if (!readyMarkets.length) return 'missing';
    if (readyMarkets.length === coveredMarketKeys.length) return 'ready';
    return 'partial';
};

const buildFixturePayload = (fixture, outputsByFixture, coverage, leagueName) => {
    const outputMap = outputsByFixture.get(Number(fixture.fixture_id)) || new Map();
    const markets = buildMarketsShape();

    if (coverage.ftResult) {
        markets.ftResult = normalize1X2Market(outputMap.get(MODEL_TYPE_BY_MARKET.ftResult), fixture);
    }
    if (coverage.htResult) {
        markets.htResult = normalize1X2Market(outputMap.get(MODEL_TYPE_BY_MARKET.htResult), fixture);
    }
    if (coverage.goalsTotal) {
        markets.goalsTotal = normalizeTotalMarket('goalsTotal', outputMap.get(MODEL_TYPE_BY_MARKET.goalsTotal));
    }
    if (coverage.cornersTotal) {
        markets.cornersTotal = normalizeTotalMarket('cornersTotal', outputMap.get(MODEL_TYPE_BY_MARKET.cornersTotal));
    }
    if (coverage.cardsTotal) {
        markets.cardsTotal = normalizeTotalMarket('cardsTotal', outputMap.get(MODEL_TYPE_BY_MARKET.cardsTotal));
    }

    const projectedResult = markets.ftResult
        ? {
            selection: markets.ftResult.selection,
            label: markets.ftResult.selectionLabel,
            probability: markets.ftResult.probability,
        }
        : null;

    return {
        fixtureId: Number(fixture.fixture_id),
        leagueId: Number(fixture.league_id),
        seasonYear: Number(fixture.season_year),
        leagueName,
        date: fixture.date,
        round: fixture.round || '',
        status: fixture.status_short || 'NS',
        matchState: 'upcoming',
        homeTeam: {
            teamId: Number(fixture.home_team_id),
            name: fixture.home_team_name,
            logo: fixture.home_team_logo || null,
        },
        awayTeam: {
            teamId: Number(fixture.away_team_id),
            name: fixture.away_team_name,
            logo: fixture.away_team_logo || null,
        },
        actualScore: null,
        actualHalfTimeScore: null,
        actualResult: null,
        verdict: null,
        predictionStatus: computePredictionStatus(markets, coverage),
        projectedResult,
        markets,
    };
};

const buildHistoricalFixturePayload = (fixture, resultsByFixture, coverage, leagueName, sourceRun) => {
    const resultRows = resultsByFixture.get(Number(fixture.fixture_id)) || {};
    const markets = buildMarketsShape();

    if (coverage.ftResult) {
        markets.ftResult = normalizeHistorical1X2Market(resultRows.ftResult, fixture);
    }
    if (coverage.htResult) {
        markets.htResult = normalizeHistorical1X2Market(resultRows.htResult, fixture);
    }
    if (coverage.goalsTotal) {
        markets.goalsTotal = normalizeHistoricalTotalMarket('goalsTotal', resultRows.goalsTotal);
    }
    if (coverage.cornersTotal) {
        markets.cornersTotal = normalizeHistoricalTotalMarket('cornersTotal', resultRows.cornersTotal);
    }
    if (coverage.cardsTotal) {
        markets.cardsTotal = normalizeHistoricalTotalMarket('cardsTotal', resultRows.cardsTotal);
    }

    const projectedResult = markets.ftResult
        ? {
            selection: markets.ftResult.selection,
            label: markets.ftResult.selectionLabel,
            probability: markets.ftResult.probability,
        }
        : null;
    const actualFtSelection = markets.ftResult?.actualSelection || getActualResultSelectionFromFixture(fixture);
    const actualResult = actualFtSelection
        ? {
            selection: actualFtSelection,
            label: buildResultLabel(actualFtSelection, fixture.home_team_name, fixture.away_team_name),
        }
        : null;
    const ftVerdict = markets.ftResult?.isCorrect;

    return {
        fixtureId: Number(fixture.fixture_id),
        leagueId: Number(fixture.league_id),
        seasonYear: Number(fixture.season_year),
        leagueName,
        date: fixture.date,
        round: fixture.round || '',
        status: fixture.status_short || 'FT',
        matchState: 'completed',
        homeTeam: {
            teamId: Number(fixture.home_team_id),
            name: fixture.home_team_name,
            logo: fixture.home_team_logo || null,
        },
        awayTeam: {
            teamId: Number(fixture.away_team_id),
            name: fixture.away_team_name,
            logo: fixture.away_team_logo || null,
        },
        actualScore: buildScoreLabel(fixture.goals_home, fixture.goals_away),
        actualHalfTimeScore: buildScoreLabel(fixture.score_halftime_home, fixture.score_halftime_away),
        actualResult,
        verdict: ftVerdict == null ? null : (ftVerdict ? 'hit' : 'miss'),
        predictionStatus: computePredictionStatus(markets, coverage),
        projectedResult,
        markets,
        sourceRun,
    };
};

const buildSeasonOptions = ({
    currentSeasonYear,
    seasonFixtureCounts,
    historicalRuns,
}) => {
    const fixtureCountMap = new Map(
        seasonFixtureCounts.map((row) => [
            Number(row.season_year),
            {
                completedFixtureCount: Number(row.completed_fixture_count || 0),
                upcomingFixtureCount: Number(row.upcoming_fixture_count || 0),
            },
        ]),
    );
    const runMap = new Map(historicalRuns.map((run) => [Number(run.seasonYear), run]));
    const seasonYears = new Set([
        ...fixtureCountMap.keys(),
        ...runMap.keys(),
        ...(currentSeasonYear ? [Number(currentSeasonYear)] : []),
    ]);

    return [...seasonYears]
        .sort((a, b) => b - a)
        .map((seasonYear) => {
            const fixtureCounts = fixtureCountMap.get(seasonYear) || {
                completedFixtureCount: 0,
                upcomingFixtureCount: 0,
            };
            const run = runMap.get(seasonYear);

            return {
                seasonYear,
                isCurrent: Number(currentSeasonYear) === seasonYear,
                hasHistoricalRun: Boolean(run),
                latestSimulationId: run?.simulationId || null,
                horizonType: run?.horizonType || null,
                completedFixtureCount: fixtureCounts.completedFixtureCount,
                upcomingFixtureCount: fixtureCounts.upcomingFixtureCount,
                modeledFixtureCount: run?.modeledFixtureCount || 0,
                marketTypes: run?.marketTypes || [],
            };
        })
        .filter((season) => season.hasHistoricalRun || season.upcomingFixtureCount > 0 || season.isCurrent);
};

const buildLeagueForesight = async (leagueRow, explicitSeasonYear, registryEntries, options = {}) => {
    const profile = findLeagueProfile(leagueRow);
    if (!profile) {
        throw makeNotFoundError(`League ${leagueRow?.league_id ?? 'unknown'} is not covered by ML Hub.`);
    }

    const includeHistory = options.includeHistory !== false;
    const leagueId = Number(leagueRow.league_id);
    const coverage = getRuntimeCoverageForLeague(leagueRow, registryEntries);
    const defaultSeasonYear = await resolveSeasonYear(leagueId, null);
    const seasonFixtureCounts = await getSeasonFixtureCounts(leagueId);
    const historicalRuns = await getHistoricalSeasonRuns(leagueId);
    const seasonOptions = buildSeasonOptions({
        currentSeasonYear: defaultSeasonYear,
        seasonFixtureCounts,
        historicalRuns,
    });
    const availableSeasonYears = new Set(seasonOptions.map((season) => Number(season.seasonYear)));
    const requestedSeasonYear = explicitSeasonYear ? Number(explicitSeasonYear) : null;
    const seasonYear = requestedSeasonYear && availableSeasonYears.has(requestedSeasonYear)
        ? requestedSeasonYear
        : Number(defaultSeasonYear ?? seasonOptions[0]?.seasonYear ?? requestedSeasonYear ?? 0) || null;
    const upcomingFixtures = await getUpcomingFixtures(leagueId, seasonYear);
    const outputsByFixture = await getFixtureOutputs(upcomingFixtures.map((fixture) => Number(fixture.fixture_id)));
    const upcomingPayloads = upcomingFixtures.map((fixture) => buildFixturePayload(fixture, outputsByFixture, coverage, leagueRow.league_name));
    const selectedSeasonMeta = seasonOptions.find((season) => Number(season.seasonYear) === Number(seasonYear)) || null;
    const historicalPayloads = includeHistory
        ? await (async () => {
            const completedFixtures = await getCompletedFixtures(leagueId, seasonYear);
            const latestHistoricalSimulation = await getLatestHistoricalSimulation(leagueId, seasonYear);
            const historicalResultsByFixture = latestHistoricalSimulation
                ? await getHistoricalFixtureResults(
                    latestHistoricalSimulation.simulationId,
                    completedFixtures.map((fixture) => Number(fixture.fixture_id)),
                )
                : new Map();

            return completedFixtures.map((fixture) => buildHistoricalFixturePayload(
                fixture,
                historicalResultsByFixture,
                coverage,
                leagueRow.league_name,
                latestHistoricalSimulation,
            ));
        })()
        : [];

    return {
        league: {
            leagueId,
            leagueName: leagueRow.league_name,
            country: leagueRow.country || '',
            logo: leagueRow.logo || null,
            seasonYear,
            importanceRank: Number(leagueRow.importance_rank ?? 99),
            countryImportanceRank: Number(leagueRow.country_importance_rank ?? 99),
            isFeatured: Boolean(profile.isFeatured),
        },
        coverage,
        seasonOptions,
        summary: {
            selectedSeasonYear: seasonYear,
            historicalFixtureCount: includeHistory
                ? historicalPayloads.length
                : Number(selectedSeasonMeta?.completedFixtureCount || 0),
            upcomingFixtureCount: upcomingPayloads.length,
            predictionReadyCount: upcomingPayloads.filter((fixture) => fixture.predictionStatus === 'ready').length,
            projectedResultCount: upcomingPayloads.filter((fixture) => fixture.projectedResult).length,
        },
        fixtures: upcomingPayloads,
        upcomingFixtures: upcomingPayloads,
        historicalFixtures: historicalPayloads,
    };
};

const getCoveredLeaguesSummary = async () => {
    const registryEntries = await getActiveRegistryEntries();
    const leagues = await getCoveredLeagueRows();
    const details = await Promise.all(leagues.map((leagueRow) => buildLeagueForesight(leagueRow, null, registryEntries, { includeHistory: false })));

    return details.map(({ league, coverage, fixtures, seasonOptions, summary }) => ({
        leagueId: league.leagueId,
        leagueName: league.leagueName,
        country: league.country,
        logo: league.logo,
        seasonYear: league.seasonYear,
        upcomingFixtureCount: fixtures.length,
        predictionReadyCount: fixtures.filter((fixture) => fixture.predictionStatus === 'ready').length,
        historicalFixtureCount: summary?.historicalFixtureCount || 0,
        modeledSeasonYears: (seasonOptions || [])
            .filter((season) => season.hasHistoricalRun)
            .map((season) => season.seasonYear),
        markets: coverage,
        isFeatured: league.isFeatured,
        importanceRank: league.importanceRank,
        countryImportanceRank: league.countryImportanceRank,
    }));
};

const getLeagueForesight = async (leagueId, seasonYear) => {
    const leagueRow = await getCoveredLeagueRow(Number(leagueId));
    if (!leagueRow) {
        throw makeNotFoundError(`League ${leagueId} is not covered by ML Hub.`);
    }

    const registryEntries = await getActiveRegistryEntries();
    return buildLeagueForesight(leagueRow, seasonYear, registryEntries);
};

const getModelCatalogVersions = async () => {
    const registryEntries = await getActiveRegistryEntries();

    return MARKET_KEYS.reduce((acc, marketKey) => {
        const entry = registryEntries[MODEL_NAME_BY_MARKET[marketKey]];
        acc[marketKey] = entry?.version || null;
        return acc;
    }, {});
};

export {
    V36_LEAGUE_PROFILES,
    MODEL_NAME_BY_MARKET,
    findLeagueProfile,
    getActiveRegistryEntries,
    getCoveredLeaguesSummary,
    getLeagueForesight,
    getModelCatalogVersions,
    getRuntimeCoverageForLeague,
    getStaticCoverageForLeague,
    isLeagueCovered,
};

export default {
    getActiveRegistryEntries,
    getCoveredLeaguesSummary,
    getLeagueForesight,
    getModelCatalogVersions,
    getRuntimeCoverageForLeague,
    getStaticCoverageForLeague,
    isLeagueCovered,
};
