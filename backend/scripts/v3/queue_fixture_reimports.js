import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'queue_fixture_reimports' });

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function buildTargetQuery({ fixtureId, leagueId, seasonYear, dataSource, limit, onlyCorrupted, excludeQueued }) {
    const conditions = ['f.api_id IS NOT NULL'];
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

    if (dataSource) {
        params.push(dataSource);
        conditions.push('f.data_source = ?');
    }

    if (onlyCorrupted) {
        conditions.push(`
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
        `);
    }

    if (excludeQueued) {
        conditions.push(`
            NOT EXISTS (
                SELECT 1
                FROM v3_fixture_reimport_queue rq
                WHERE rq.fixture_id = f.fixture_id
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

async function queueFixtures(fixtures, { reasonCode, status, notes, batchKey, metadata }) {
    const client = await db.getTransactionClient();
    let queuedCount = 0;

    try {
        await client.beginTransaction();

        for (const fixture of fixtures) {
            const result = await client.run(`
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?)
                ON CONFLICT (fixture_id, reason_code) DO UPDATE SET
                    status = EXCLUDED.status,
                    notes = COALESCE(v3_fixture_reimport_queue.notes, EXCLUDED.notes),
                    metadata = v3_fixture_reimport_queue.metadata || EXCLUDED.metadata,
                    batch_key = COALESCE(v3_fixture_reimport_queue.batch_key, EXCLUDED.batch_key),
                    updated_at = CURRENT_TIMESTAMP
            `, [
                fixture.fixture_id,
                fixture.api_id,
                fixture.league_id,
                fixture.season_year,
                fixture.data_source,
                reasonCode,
                status,
                notes,
                JSON.stringify(metadata),
                batchKey
            ]);

            queuedCount += result.changes;
        }

        await client.commit();
        return queuedCount;
    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        client.release();
    }
}

async function main() {
    const dryRun = hasFlag('--dry-run');
    const fixtureId = getArgValue('--fixture-id') ? Number.parseInt(getArgValue('--fixture-id'), 10) : null;
    const leagueId = getArgValue('--league-id') ? Number.parseInt(getArgValue('--league-id'), 10) : null;
    const seasonYear = getArgValue('--season-year') ? Number.parseInt(getArgValue('--season-year'), 10) : null;
    const dataSource = getArgValue('--data-source') || 'api_football';
    const reasonCode = getArgValue('--reason-code') || 'manual_reimport_queue';
    const status = getArgValue('--status') || 'pending';
    const notes = getArgValue('--notes') || null;
    const batchKey = getArgValue('--batch-key') || `reimport_queue_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
    const limit = Number.parseInt(getArgValue('--limit') || '5000', 10);
    const onlyCorrupted = !hasFlag('--all-fixtures');
    const excludeQueued = !hasFlag('--include-already-queued');

    await db.init();

    const { sql, params } = buildTargetQuery({
        fixtureId,
        leagueId,
        seasonYear,
        dataSource,
        limit,
        onlyCorrupted,
        excludeQueued
    });

    const targets = await db.all(sql, params);

    log.info({
        dryRun,
        fixtureId,
        leagueId,
        seasonYear,
        dataSource,
        reasonCode,
        status,
        batchKey,
        onlyCorrupted,
        excludeQueued,
        selectedFixtures: targets.length
    }, 'Selected fixtures for reimport queue');

    if (targets.length === 0 || dryRun) {
        return;
    }

    const queuedCount = await queueFixtures(targets, {
        reasonCode,
        status,
        notes,
        batchKey,
        metadata: {
            queued_by_script: 'queue_fixture_reimports',
            only_corrupted: onlyCorrupted
        }
    });

    log.info({
        queuedCount,
        batchKey,
        reasonCode,
        status
    }, 'Queued fixtures for future reimport');
}

main().catch(async (error) => {
    log.error({ err: error }, 'Failed to queue fixtures for reimport');
    process.exitCode = 1;
});
