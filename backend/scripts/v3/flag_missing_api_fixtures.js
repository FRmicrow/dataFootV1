import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';
import footballApi from '../../src/services/footballApi.js';

const log = logger.child({ script: 'flag_missing_api_fixtures' });

class ApiQuotaExceededError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ApiQuotaExceededError';
        this.code = 'api_quota_exhausted';
    }
}

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTargetQuery({ fixtureId, leagueId, seasonYear, limit, includeFlagged }) {
    const conditions = [
        "f.data_source = 'api_football'",
        'f.api_id IS NOT NULL',
        `
            EXISTS (
                SELECT 1
                FROM (
                    SELECT fl.fixture_id
                    FROM v3_fixture_lineups fl
                    JOIN v3_fixtures fx ON fx.fixture_id = fl.fixture_id
                    WHERE fl.team_id NOT IN (fx.home_team_id, fx.away_team_id)

                    UNION

                    SELECT lp.fixture_id
                    FROM v3_fixture_lineup_players lp
                    JOIN v3_fixtures fx ON fx.fixture_id = lp.fixture_id
                    WHERE lp.team_id NOT IN (fx.home_team_id, fx.away_team_id)

                    UNION

                    SELECT ps.fixture_id
                    FROM v3_fixture_player_stats ps
                    JOIN v3_fixtures fx ON fx.fixture_id = ps.fixture_id
                    WHERE ps.team_id NOT IN (fx.home_team_id, fx.away_team_id)
                ) candidates
                WHERE candidates.fixture_id = f.fixture_id
            )
        `
    ];
    const params = [];

    if (fixtureId) {
        params.push(fixtureId);
        conditions.push('f.fixture_id = ?');
    }

    if (leagueId) {
        params.push(leagueId);
        conditions.push('f.league_id = ?');
    }

    if (seasonYear) {
        params.push(seasonYear);
        conditions.push('f.season_year = ?');
    }

    if (!includeFlagged) {
        conditions.push(`
            NOT EXISTS (
                SELECT 1
                FROM v3_fixture_reimport_queue rq
                WHERE rq.fixture_id = f.fixture_id
                  AND rq.reason_code = 'missing_api_fixture'
                  AND rq.status IN ('pending', 'scheduled', 'deferred')
            )
        `);
    }

    params.push(limit);

    return {
        sql: `
            SELECT
                f.fixture_id,
                f.api_id,
                f.league_id,
                f.season_year,
                f.data_source
            FROM v3_fixtures f
            WHERE ${conditions.join(' AND ')}
            ORDER BY f.season_year DESC, f.fixture_id DESC
            LIMIT ?
        `,
        params
    };
}

async function fetchCanonicalFixture(apiFixtureId, attempts = 3) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
        const response = await footballApi.getFixtureById(apiFixtureId);
        const requestLimitError = response?.errors?.requests;

        if (requestLimitError) {
            throw new ApiQuotaExceededError(requestLimitError);
        }

        const apiFixture = response?.response?.[0];
        if (apiFixture) {
            return apiFixture;
        }

        if (attempt < attempts) {
            await sleep(300 * attempt);
        }
    }

    return null;
}

async function queueMissingFixture(target, batchKey) {
    await db.run(`
        INSERT INTO v3_fixture_reimport_queue (
            fixture_id,
            api_id,
            league_id,
            season_year,
            data_source,
            reason_code,
            status,
            notes,
            metadata,
            batch_key
        )
        VALUES (?, ?, ?, ?, ?, 'missing_api_fixture', 'pending', ?, ?::jsonb, ?)
        ON CONFLICT (fixture_id, reason_code) DO UPDATE SET
            metadata = v3_fixture_reimport_queue.metadata || EXCLUDED.metadata,
            batch_key = COALESCE(v3_fixture_reimport_queue.batch_key, EXCLUDED.batch_key),
            updated_at = CURRENT_TIMESTAMP
    `, [
        target.fixture_id,
        target.api_id,
        target.league_id,
        target.season_year,
        target.data_source,
        'Queued because API-Football returned no fixture payload during verification.',
        JSON.stringify({
            source_script: 'flag_missing_api_fixtures',
            verified_at: new Date().toISOString()
        }),
        batchKey
    ]);
}

async function main() {
    const dryRun = hasFlag('--dry-run');
    const includeFlagged = hasFlag('--include-flagged');
    const fixtureId = getArgValue('--fixture-id') ? Number.parseInt(getArgValue('--fixture-id'), 10) : null;
    const leagueId = getArgValue('--league-id') ? Number.parseInt(getArgValue('--league-id'), 10) : null;
    const seasonYear = getArgValue('--season-year') ? Number.parseInt(getArgValue('--season-year'), 10) : null;
    const limit = Number.parseInt(getArgValue('--limit') || '250', 10);
    const batchKey = getArgValue('--batch-key') || `missing_api_flag_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

    await db.init();

    const { sql, params } = buildTargetQuery({ fixtureId, leagueId, seasonYear, limit, includeFlagged });
    const targets = await db.all(sql, params);

    log.info({
        dryRun,
        includeFlagged,
        fixtureId,
        leagueId,
        seasonYear,
        limit,
        batchKey,
        selectedFixtures: targets.length
    }, 'Selected api_football fixtures for missing-api verification');

    let missingCount = 0;
    let availableCount = 0;

    for (const target of targets) {
        const apiFixture = await fetchCanonicalFixture(target.api_id);

        if (apiFixture) {
            availableCount++;
            continue;
        }

        missingCount++;

        if (!dryRun) {
            await queueMissingFixture(target, batchKey);
        }
    }

    log.info({
        batchKey,
        dryRun,
        checked: targets.length,
        missingCount,
        availableCount
    }, 'Completed missing-api fixture verification');
}

main().catch((error) => {
    log.error({ err: error }, 'Failed to flag missing API fixtures');
    process.exitCode = 1;
});
