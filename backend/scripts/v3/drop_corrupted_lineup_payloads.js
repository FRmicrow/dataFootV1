import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'drop_corrupted_lineup_payloads' });

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function makeBatchKey() {
    return `drop_corrupted_lineups_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

async function createTemporarySets(client, { leagueId, seasonYear, dataSource }) {
    const conditions = [];
    const params = [];

    if (leagueId) {
        conditions.push('f.league_id = ?');
        params.push(Number.parseInt(String(leagueId), 10));
    }

    if (seasonYear) {
        conditions.push('f.season_year = ?');
        params.push(Number.parseInt(String(seasonYear), 10));
    }

    if (dataSource) {
        conditions.push('f.data_source = ?');
        params.push(String(dataSource));
    }

    const scopeSql = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';

    await client.run(`
        CREATE TEMP TABLE tmp_bad_fixture_lineups AS
        SELECT
            fl.lineup_id,
            fl.fixture_id,
            ARRAY['team_not_in_fixture']::TEXT[] AS reason_codes
        FROM v3_fixture_lineups fl
        JOIN v3_fixtures f ON f.fixture_id = fl.fixture_id
        WHERE fl.team_id NOT IN (f.home_team_id, f.away_team_id)
        ${scopeSql}
    `, params);

    await client.run(`
        CREATE TEMP TABLE tmp_bad_fixture_lineup_players AS
        SELECT
            ABS(hashtextextended(lp.ctid::TEXT, 0)) AS record_id,
            lp.ctid::TEXT AS row_ctid,
            lp.fixture_id,
            lp.team_id,
            lp.player_id,
            ARRAY['team_not_in_fixture']::TEXT[] AS reason_codes
        FROM v3_fixture_lineup_players lp
        JOIN v3_fixtures f ON f.fixture_id = lp.fixture_id
        WHERE lp.team_id NOT IN (f.home_team_id, f.away_team_id)
        ${scopeSql}
    `, params);

    await client.run(`
        CREATE TEMP TABLE tmp_bad_fixture_player_stats AS
        SELECT
            ps.fixture_player_stats_id,
            ps.fixture_id,
            ARRAY['team_not_in_fixture']::TEXT[] AS reason_codes
        FROM v3_fixture_player_stats ps
        JOIN v3_fixtures f ON f.fixture_id = ps.fixture_id
        WHERE ps.team_id NOT IN (f.home_team_id, f.away_team_id)
        ${scopeSql}
    `, params);

    await client.exec(`
        CREATE TEMP TABLE tmp_bad_fixture_scope AS
        SELECT DISTINCT fixture_id FROM tmp_bad_fixture_lineups
        UNION
        SELECT DISTINCT fixture_id FROM tmp_bad_fixture_lineup_players
        UNION
        SELECT DISTINCT fixture_id FROM tmp_bad_fixture_player_stats
    `);

    await client.exec(`
        CREATE TEMP TABLE tmp_bad_season_scope AS
        SELECT
            x.league_id,
            x.season_year,
            BOOL_OR(x.affects_lineups) AS affects_lineups,
            BOOL_OR(x.affects_player_stats) AS affects_player_stats
        FROM (
            SELECT
                f.league_id,
                f.season_year,
                TRUE AS affects_lineups,
                FALSE AS affects_player_stats
            FROM tmp_bad_fixture_lineups t
            JOIN v3_fixtures f ON f.fixture_id = t.fixture_id

            UNION ALL

            SELECT
                f.league_id,
                f.season_year,
                TRUE AS affects_lineups,
                FALSE AS affects_player_stats
            FROM tmp_bad_fixture_lineup_players t
            JOIN v3_fixtures f ON f.fixture_id = t.fixture_id

            UNION ALL

            SELECT
                f.league_id,
                f.season_year,
                FALSE AS affects_lineups,
                TRUE AS affects_player_stats
            FROM tmp_bad_fixture_player_stats t
            JOIN v3_fixtures f ON f.fixture_id = t.fixture_id
        ) x
        GROUP BY x.league_id, x.season_year
    `);
}

async function collectSummary(client) {
    const counts = await client.get(`
        SELECT
            (SELECT COUNT(*)::INT FROM tmp_bad_fixture_scope) AS affected_fixtures,
            (SELECT COUNT(*)::INT FROM tmp_bad_fixture_lineups) AS bad_lineups,
            (SELECT COUNT(*)::INT FROM tmp_bad_fixture_lineup_players) AS bad_lineup_players,
            (SELECT COUNT(*)::INT FROM tmp_bad_fixture_player_stats) AS bad_player_stats,
            (SELECT COUNT(*)::INT FROM tmp_bad_season_scope) AS affected_seasons
    `);

    const bySource = await client.all(`
        WITH source_fixtures AS (
            SELECT
                f.data_source,
                COUNT(DISTINCT f.fixture_id)::INT AS affected_fixtures
            FROM tmp_bad_fixture_scope s
            JOIN v3_fixtures f ON f.fixture_id = s.fixture_id
            GROUP BY f.data_source
        ),
        source_lineups AS (
            SELECT
                f.data_source,
                COUNT(*)::INT AS bad_lineups
            FROM tmp_bad_fixture_lineups t
            JOIN v3_fixtures f ON f.fixture_id = t.fixture_id
            GROUP BY f.data_source
        ),
        source_lineup_players AS (
            SELECT
                f.data_source,
                COUNT(*)::INT AS bad_lineup_players
            FROM tmp_bad_fixture_lineup_players t
            JOIN v3_fixtures f ON f.fixture_id = t.fixture_id
            GROUP BY f.data_source
        ),
        source_player_stats AS (
            SELECT
                f.data_source,
                COUNT(*)::INT AS bad_player_stats
            FROM tmp_bad_fixture_player_stats t
            JOIN v3_fixtures f ON f.fixture_id = t.fixture_id
            GROUP BY f.data_source
        )
        SELECT
            sf.data_source,
            sf.affected_fixtures,
            COALESCE(sl.bad_lineups, 0) AS bad_lineups,
            COALESCE(slp.bad_lineup_players, 0) AS bad_lineup_players,
            COALESCE(sps.bad_player_stats, 0) AS bad_player_stats
        FROM source_fixtures sf
        LEFT JOIN source_lineups sl ON sl.data_source = sf.data_source
        LEFT JOIN source_lineup_players slp ON slp.data_source = sf.data_source
        LEFT JOIN source_player_stats sps ON sps.data_source = sf.data_source
        ORDER BY sf.affected_fixtures DESC, sf.data_source
    `);

    const seasons = await client.all(`
        SELECT
            f.data_source,
            ss.league_id,
            l.name AS league_name,
            ss.season_year,
            ss.affects_lineups,
            ss.affects_player_stats
        FROM tmp_bad_season_scope ss
        JOIN v3_leagues l ON l.league_id = ss.league_id
        JOIN v3_fixtures f ON f.league_id = ss.league_id AND f.season_year = ss.season_year
        GROUP BY
            f.data_source,
            ss.league_id,
            l.name,
            ss.season_year,
            ss.affects_lineups,
            ss.affects_player_stats
        ORDER BY ss.season_year DESC, l.name ASC
        LIMIT 30
    `);

    return {
        ...counts,
        bySource,
        sampleSeasons: seasons
    };
}

async function ensureBatch(client, batchKey, backupPath) {
    return client.get(`
        INSERT INTO v3_quarantine_batches (
            batch_key,
            description,
            backup_path
        )
        VALUES (?, ?, ?)
        RETURNING batch_id
    `, [
        batchKey,
        'Drop corrupted lineup payload rows (archive before delete)',
        backupPath
    ]);
}

async function archiveRows(client, batchId) {
    await client.run(`
        INSERT INTO v3_quarantine_records (
            batch_id,
            source_table,
            record_id,
            fixture_id,
            reason_codes,
            payload
        )
        SELECT
            ?,
            'v3_fixture_lineups',
            fl.lineup_id,
            fl.fixture_id,
            t.reason_codes,
            to_jsonb(fl)
        FROM v3_fixture_lineups fl
        JOIN tmp_bad_fixture_lineups t ON t.lineup_id = fl.lineup_id
        ON CONFLICT (batch_id, source_table, record_id) DO NOTHING
    `, [batchId]);

    await client.run(`
        INSERT INTO v3_quarantine_records (
            batch_id,
            source_table,
            record_id,
            fixture_id,
            reason_codes,
            payload
        )
        SELECT
            ?,
            'v3_fixture_lineup_players',
            t.record_id,
            lp.fixture_id,
            t.reason_codes,
            to_jsonb(lp)
        FROM v3_fixture_lineup_players lp
        JOIN tmp_bad_fixture_lineup_players t
          ON t.row_ctid = lp.ctid::TEXT
        ON CONFLICT (batch_id, source_table, record_id) DO NOTHING
    `, [batchId]);

    await client.run(`
        INSERT INTO v3_quarantine_records (
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
            ps.fixture_player_stats_id,
            ps.fixture_id,
            t.reason_codes,
            to_jsonb(ps)
        FROM v3_fixture_player_stats ps
        JOIN tmp_bad_fixture_player_stats t ON t.fixture_player_stats_id = ps.fixture_player_stats_id
        ON CONFLICT (batch_id, source_table, record_id) DO NOTHING
    `, [batchId]);
}

async function deleteRows(client) {
    await client.run(`
        DELETE FROM v3_fixture_lineups
        WHERE lineup_id IN (SELECT lineup_id FROM tmp_bad_fixture_lineups)
    `);

    await client.run(`
        DELETE FROM v3_fixture_lineup_players lp
        USING tmp_bad_fixture_lineup_players t
        WHERE t.row_ctid = lp.ctid::TEXT
    `);

    await client.run(`
        DELETE FROM v3_fixture_player_stats
        WHERE fixture_player_stats_id IN (
            SELECT fixture_player_stats_id FROM tmp_bad_fixture_player_stats
        )
    `);
}

async function downgradeSeasonStatuses(client) {
    await client.run(`
        INSERT INTO v3_import_status (
            league_id,
            season_year,
            pillar,
            status,
            failure_reason,
            last_checked_at,
            updated_at
        )
        SELECT
            t.league_id,
            t.season_year,
            'lineups',
            1,
            'Corrupted lineup payload rows archived and deleted on 2026-03-28; season requires reimport.',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM tmp_bad_season_scope t
        WHERE t.affects_lineups
        ON CONFLICT (league_id, season_year, pillar) DO UPDATE SET
            status = 1,
            failure_reason = EXCLUDED.failure_reason,
            last_checked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
    `);

    await client.run(`
        INSERT INTO v3_import_status (
            league_id,
            season_year,
            pillar,
            status,
            failure_reason,
            last_checked_at,
            updated_at
        )
        SELECT
            t.league_id,
            t.season_year,
            'ps',
            1,
            'Corrupted player-stat payload rows archived and deleted on 2026-03-28; season requires reimport.',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM tmp_bad_season_scope t
        WHERE t.affects_player_stats
        ON CONFLICT (league_id, season_year, pillar) DO UPDATE SET
            status = 1,
            failure_reason = EXCLUDED.failure_reason,
            last_checked_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
    `);

    await client.run(`
        UPDATE v3_league_seasons ls
        SET
            imported_lineups = CASE WHEN t.affects_lineups THEN FALSE ELSE imported_lineups END,
            imported_player_stats = CASE WHEN t.affects_player_stats THEN FALSE ELSE imported_player_stats END
        FROM tmp_bad_season_scope t
        WHERE ls.league_id = t.league_id
          AND ls.season_year = t.season_year
    `);
}

async function main() {
    const dryRun = hasFlag('--dry-run');
    const leagueId = getArgValue('--league-id') ? Number.parseInt(getArgValue('--league-id'), 10) : null;
    const seasonYear = getArgValue('--season-year') ? Number.parseInt(getArgValue('--season-year'), 10) : null;
    const dataSource = getArgValue('--data-source') || null;
    const backupPath = getArgValue('--backup-path') || null;
    const batchKey = getArgValue('--batch-key') || makeBatchKey();

    await db.init();
    const client = await db.getTransactionClient();

    try {
        await client.beginTransaction();

        await createTemporarySets(client, { leagueId, seasonYear, dataSource });
        const summary = await collectSummary(client);

        log.info({
            dryRun,
            leagueId,
            seasonYear,
            dataSource,
            batchKey,
            backupPath,
            summary
        }, 'Prepared corrupted lineup payload drop set');

        if (dryRun || summary.affected_fixtures === 0) {
            await client.rollback();
            return;
        }

        const batch = await ensureBatch(client, batchKey, backupPath);
        await archiveRows(client, batch.batch_id);
        await deleteRows(client);
        await downgradeSeasonStatuses(client);
        await client.commit();

        log.info({
            batchId: batch.batch_id,
            batchKey,
            summary
        }, 'Corrupted lineup payload drop completed');
    } catch (error) {
        await client.rollback();
        log.error({ err: error, batchKey }, 'Corrupted lineup payload drop failed');
        process.exitCode = 1;
    } finally {
        client.release();
    }
}

main().catch((error) => {
    log.error({ err: error }, 'Unexpected failure in corrupted lineup payload drop script');
    process.exitCode = 1;
});
