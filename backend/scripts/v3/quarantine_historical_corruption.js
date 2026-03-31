import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'quarantine_historical_corruption' });

const FIXTURE_DEPENDENCY_TABLES = [
    {
        table: 'ml_matches',
        fixtureColumn: 'v3_fixture_id',
        recordIdSql: "ABS(hashtextextended(CONCAT_WS('||', t.source_league::TEXT, t.source_id::TEXT), 0))"
    },
    {
        table: 'v3_fixture_stats',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.fixture_stats_id'
    },
    {
        table: 'v3_fixture_lineup_players',
        fixtureColumn: 'fixture_id',
        recordIdSql: "ABS(hashtextextended(CONCAT_WS('||', t.fixture_id::TEXT, t.team_id::TEXT, t.player_id::TEXT), 0))"
    },
    {
        table: 'v3_fixture_lineups',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.lineup_id'
    },
    {
        table: 'v3_team_features_prematch',
        fixtureColumn: 'fixture_id',
        recordIdSql: "ABS(hashtextextended(CONCAT_WS('||', t.fixture_id::TEXT, t.team_id::TEXT, t.feature_set_id::TEXT, t.horizon_type), 0))"
    },
    {
        table: 'v3_submodel_outputs',
        fixtureColumn: 'fixture_id',
        recordIdSql: "ABS(hashtextextended(CONCAT_WS('||', t.fixture_id::TEXT, t.team_id::TEXT, t.model_type), 0))"
    },
    {
        table: 'v3_risk_analysis',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.id'
    },
    {
        table: 'v3_odds_import',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.id'
    }
];

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function createBatchKey() {
    return `historical_quarantine_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

async function createTemporaryQuarantineSets(client, includeTeamMismatch) {
    await client.exec(`
        CREATE TEMP TABLE tmp_quarantine_fixtures AS
        SELECT
            f.fixture_id,
            array_remove(ARRAY[
                CASE
                    WHEN f.data_source = 'transfermarkt' AND f.tm_match_id IS NULL
                    THEN 'tm_missing_tm_match_id'
                END,
                CASE
                    WHEN f.data_source = 'transfermarkt'
                     AND f.date IS NOT NULL
                     AND (f.date AT TIME ZONE 'UTC')::date = make_date(f.season_year, 8, 1)
                    THEN 'tm_placeholder_aug1_date'
                END,
                CASE
                    WHEN f.home_team_id = f.away_team_id
                    THEN 'same_home_away_team'
                END,
                CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM v3_teams t WHERE t.team_id = f.home_team_id
                    )
                    THEN 'missing_home_team_ref'
                END,
                CASE
                    WHEN NOT EXISTS (
                        SELECT 1 FROM v3_teams t WHERE t.team_id = f.away_team_id
                    )
                    THEN 'missing_away_team_ref'
                END
            ], NULL)::TEXT[] AS reason_codes
        FROM v3_fixtures f
        WHERE (f.data_source = 'transfermarkt' AND f.tm_match_id IS NULL)
           OR f.home_team_id = f.away_team_id
           OR NOT EXISTS (
                SELECT 1 FROM v3_teams t WHERE t.team_id = f.home_team_id
           )
           OR NOT EXISTS (
                SELECT 1 FROM v3_teams t WHERE t.team_id = f.away_team_id
           )
    `);

    await client.exec(`
        CREATE TEMP TABLE tmp_quarantine_event_candidates AS
        SELECT
            e.id AS event_id,
            e.fixture_id,
            'fixture_quarantined'::TEXT AS reason_code
        FROM v3_fixture_events e
        JOIN tmp_quarantine_fixtures qf ON qf.fixture_id = e.fixture_id

        UNION ALL

        SELECT
            e.id AS event_id,
            e.fixture_id,
            'orphan_fixture_ref'::TEXT AS reason_code
        FROM v3_fixture_events e
        WHERE NOT EXISTS (
            SELECT 1 FROM v3_fixtures f WHERE f.fixture_id = e.fixture_id
        )
    `);

    if (includeTeamMismatch) {
        await client.exec(`
            INSERT INTO tmp_quarantine_event_candidates (event_id, fixture_id, reason_code)
            SELECT
                e.id AS event_id,
                e.fixture_id,
                'team_not_in_fixture'::TEXT AS reason_code
            FROM v3_fixture_events e
            JOIN v3_fixtures f ON f.fixture_id = e.fixture_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM tmp_quarantine_fixtures qf
                WHERE qf.fixture_id = e.fixture_id
            )
              AND e.team_id IS NOT NULL
              AND e.team_id NOT IN (f.home_team_id, f.away_team_id)
        `);
    }

    await client.exec(`
        CREATE TEMP TABLE tmp_quarantine_events AS
        SELECT
            event_id,
            fixture_id,
            ARRAY_AGG(DISTINCT reason_code ORDER BY reason_code)::TEXT[] AS reason_codes
        FROM tmp_quarantine_event_candidates
        GROUP BY event_id, fixture_id
    `);

    await client.exec(`
        CREATE TEMP TABLE tmp_quarantine_lineup_candidates AS
        SELECT
            s.fixture_player_stats_id,
            s.fixture_id,
            'fixture_quarantined'::TEXT AS reason_code
        FROM v3_fixture_player_stats s
        JOIN tmp_quarantine_fixtures qf ON qf.fixture_id = s.fixture_id
    `);

    if (includeTeamMismatch) {
        await client.exec(`
            INSERT INTO tmp_quarantine_lineup_candidates (fixture_player_stats_id, fixture_id, reason_code)
            SELECT
                s.fixture_player_stats_id,
                s.fixture_id,
                'team_not_in_fixture'::TEXT AS reason_code
            FROM v3_fixture_player_stats s
            JOIN v3_fixtures f ON f.fixture_id = s.fixture_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM tmp_quarantine_fixtures qf
                WHERE qf.fixture_id = s.fixture_id
            )
              AND s.team_id NOT IN (f.home_team_id, f.away_team_id)
        `);
    }

    await client.exec(`
        CREATE TEMP TABLE tmp_quarantine_lineups AS
        SELECT
            fixture_player_stats_id,
            fixture_id,
            ARRAY_AGG(DISTINCT reason_code ORDER BY reason_code)::TEXT[] AS reason_codes
        FROM tmp_quarantine_lineup_candidates
        GROUP BY fixture_player_stats_id, fixture_id
    `);
}

async function collectSummary(client) {
    const fixtures = await client.get(`
        SELECT COUNT(*)::INT AS count FROM tmp_quarantine_fixtures
    `);
    const events = await client.get(`
        SELECT COUNT(*)::INT AS count FROM tmp_quarantine_events
    `);
    const lineups = await client.get(`
        SELECT COUNT(*)::INT AS count FROM tmp_quarantine_lineups
    `);
    const fixtureBreakdown = await client.all(`
        SELECT
            reason,
            COUNT(*)::INT AS count
        FROM (
            SELECT UNNEST(reason_codes) AS reason
            FROM tmp_quarantine_fixtures
        ) r
        GROUP BY reason
        ORDER BY count DESC, reason
    `);
    const eventBreakdown = await client.all(`
        SELECT
            reason,
            COUNT(*)::INT AS count
        FROM (
            SELECT UNNEST(reason_codes) AS reason
            FROM tmp_quarantine_events
        ) r
        GROUP BY reason
        ORDER BY count DESC, reason
    `);
    const lineupBreakdown = await client.all(`
        SELECT
            reason,
            COUNT(*)::INT AS count
        FROM (
            SELECT UNNEST(reason_codes) AS reason
            FROM tmp_quarantine_lineups
        ) r
        GROUP BY reason
        ORDER BY count DESC, reason
    `);
    const dependencyBreakdown = [];

    for (const dependency of FIXTURE_DEPENDENCY_TABLES) {
        const row = await client.get(`
            SELECT COUNT(*)::INT AS count
            FROM ${dependency.table} t
            WHERE t.${dependency.fixtureColumn} IN (
                SELECT fixture_id FROM tmp_quarantine_fixtures
            )
        `);
        dependencyBreakdown.push({
            table: dependency.table,
            count: row.count
        });
    }

    return {
        fixtures: fixtures.count,
        events: events.count,
        lineups: lineups.count,
        fixtureBreakdown,
        eventBreakdown,
        lineupBreakdown,
        dependencyBreakdown
    };
}

async function archiveAndDelete(client, batchId) {
    await client.run(`
        INSERT INTO V3_Quarantine_Records (
            batch_id,
            source_table,
            record_id,
            fixture_id,
            reason_codes,
            payload
        )
        SELECT
            ?,
            'v3_fixture_events',
            e.id,
            e.fixture_id,
            q.reason_codes,
            to_jsonb(e)
        FROM v3_fixture_events e
        JOIN tmp_quarantine_events q ON q.event_id = e.id
    `, [batchId]);

    await client.run(`
        INSERT INTO V3_Quarantine_Records (
            batch_id,
            source_table,
            record_id,
            fixture_id,
            reason_codes,
            payload
        )
        SELECT
            ?,
            'v3_fixture_player_stats',
            s.fixture_player_stats_id,
            s.fixture_id,
            q.reason_codes,
            to_jsonb(s)
        FROM v3_fixture_player_stats s
        JOIN tmp_quarantine_lineups q ON q.fixture_player_stats_id = s.fixture_player_stats_id
    `, [batchId]);

    for (const dependency of FIXTURE_DEPENDENCY_TABLES) {
        await client.run(`
            INSERT INTO V3_Quarantine_Records (
                batch_id,
                source_table,
                record_id,
                fixture_id,
                reason_codes,
                payload
            )
            SELECT
                ?,
                '${dependency.table}',
                ${dependency.recordIdSql},
                t.${dependency.fixtureColumn},
                ARRAY['fixture_quarantined']::TEXT[],
                to_jsonb(t)
            FROM ${dependency.table} t
            WHERE t.${dependency.fixtureColumn} IN (
                SELECT fixture_id FROM tmp_quarantine_fixtures
            )
        `, [batchId]);
    }

    await client.run(`
        INSERT INTO V3_Quarantine_Records (
            batch_id,
            source_table,
            record_id,
            fixture_id,
            reason_codes,
            payload
        )
        SELECT
            ?,
            'v3_fixtures',
            f.fixture_id,
            f.fixture_id,
            q.reason_codes,
            to_jsonb(f)
        FROM v3_fixtures f
        JOIN tmp_quarantine_fixtures q ON q.fixture_id = f.fixture_id
    `, [batchId]);

    await client.run(`
        DELETE FROM v3_fixture_events
        WHERE id IN (SELECT event_id FROM tmp_quarantine_events)
    `);

    await client.run(`
        DELETE FROM v3_fixture_player_stats
        WHERE fixture_player_stats_id IN (
            SELECT fixture_player_stats_id FROM tmp_quarantine_lineups
        )
    `);

    for (const dependency of FIXTURE_DEPENDENCY_TABLES) {
        await client.run(`
            DELETE FROM ${dependency.table} t
            WHERE t.${dependency.fixtureColumn} IN (
                SELECT fixture_id FROM tmp_quarantine_fixtures
            )
        `);
    }

    await client.run(`
        DELETE FROM v3_fixtures
        WHERE fixture_id IN (SELECT fixture_id FROM tmp_quarantine_fixtures)
    `);
}

async function main() {
    const dryRun = hasFlag('--dry-run');
    const includeTeamMismatch = hasFlag('--include-team-mismatch');
    const backupPath = getArgValue('--backup-path');
    const batchKey = getArgValue('--batch-key') || createBatchKey();
    const description = includeTeamMismatch
        ? 'Historical corruption quarantine: fixtures, orphan events, team mismatch rows'
        : 'Historical corruption quarantine: fixtures and orphan events';

    await db.init();
    const client = await db.getTransactionClient();

    try {
        await client.beginTransaction();

        await createTemporaryQuarantineSets(client, includeTeamMismatch);
        const summary = await collectSummary(client);

        log.info({
            dryRun,
            includeTeamMismatch,
            backupPath,
            batchKey,
            summary
        }, 'Prepared quarantine set');

        if (dryRun) {
            await client.rollback();
            return;
        }

        const batch = await client.get(`
            INSERT INTO V3_Quarantine_Batches (
                batch_key,
                description,
                backup_path
            )
            VALUES (?, ?, ?)
            RETURNING batch_id
        `, [batchKey, description, backupPath]);

        await archiveAndDelete(client, batch.batch_id);
        await client.commit();

        log.info({
            batchId: batch.batch_id,
            batchKey,
            backupPath,
            summary
        }, 'Quarantine completed successfully');
    } catch (error) {
        await client.rollback();
        log.error({ err: error, batchKey }, 'Quarantine failed');
        process.exitCode = 1;
    } finally {
        client.release();
        process.exit();
    }
}

main();
