import db from '../../config/database.js';

function getSuggestedAction(row) {
    if ((row.pending_reimport_fixtures ?? 0) > 0 && (row.pending_reimport_fixtures ?? 0) >= row.affected_fixtures) {
        return 'ignore_for_now';
    }

    const isLowPriority = (row.importance_rank ?? 999) >= 250 || row.data_source !== 'api_football';

    if (isLowPriority) {
        return 'drop_corrupted_payload';
    }

    if (row.bad_player_stats > 0) {
        return 'repair_with_api';
    }

    return 'drop_corrupted_payload';
}

function getSuggestedReason(row, action) {
    if (action === 'ignore_for_now' && (row.pending_reimport_fixtures ?? 0) > 0) {
        return 'This whole group is already queued for a later reimport pass, so you can leave it out of the current cleanup batch.';
    }

    if (action === 'repair_with_api') {
        return 'Player-stat corruption usually indicates wrong fixture-team identity, so a scoped API rebuild is safer than a blind delete.';
    }

    if ((row.importance_rank ?? 999) >= 250 || row.data_source !== 'api_football') {
        return 'Lower-priority or non-primary sources are good drop candidates when you do not want to spend repair time on them.';
    }

    return 'The corruption is limited enough to treat as disposable payload: drop the bad lineup rows and keep the fixture shell.';
}

async function loadLeagueMetadata() {
    const rows = await db.all(`
        SELECT
            l.league_id,
            l.name AS league_name,
            l.logo_url,
            l.importance_rank,
            COALESCE(c.name, 'World') AS country_name,
            c.flag_url
        FROM v3_leagues l
        LEFT JOIN v3_countries c ON c.country_id = l.country_id
    `);

    return new Map(rows.map((row) => [row.league_id, row]));
}

async function loadFixtureCorruptionRows() {
    const queries = [
        {
            sql: `
                SELECT
                    f.fixture_id,
                    f.league_id,
                    f.season_year,
                    f.data_source,
                    COUNT(*)::INT AS bad_lineups
                FROM v3_fixture_lineups fl
                JOIN v3_fixtures f ON f.fixture_id = fl.fixture_id
                WHERE fl.team_id NOT IN (f.home_team_id, f.away_team_id)
                GROUP BY f.fixture_id, f.league_id, f.season_year, f.data_source
            `,
            countField: 'bad_lineups'
        },
        {
            sql: `
                SELECT
                    f.fixture_id,
                    f.league_id,
                    f.season_year,
                    f.data_source,
                    COUNT(*)::INT AS bad_lineup_players
                FROM v3_fixture_lineup_players lp
                JOIN v3_fixtures f ON f.fixture_id = lp.fixture_id
                WHERE lp.team_id NOT IN (f.home_team_id, f.away_team_id)
                GROUP BY f.fixture_id, f.league_id, f.season_year, f.data_source
            `,
            countField: 'bad_lineup_players'
        },
        {
            sql: `
                SELECT
                    f.fixture_id,
                    f.league_id,
                    f.season_year,
                    f.data_source,
                    COUNT(*)::INT AS bad_player_stats
                FROM v3_fixture_player_stats ps
                JOIN v3_fixtures f ON f.fixture_id = ps.fixture_id
                WHERE ps.team_id NOT IN (f.home_team_id, f.away_team_id)
                GROUP BY f.fixture_id, f.league_id, f.season_year, f.data_source
            `,
            countField: 'bad_player_stats'
        }
    ];

    const fixtureMap = new Map();

    for (const { sql, countField } of queries) {
        const rows = await db.all(sql);

        for (const row of rows) {
            const existing = fixtureMap.get(row.fixture_id) || {
                fixture_id: row.fixture_id,
                league_id: row.league_id,
                season_year: row.season_year,
                data_source: row.data_source,
                bad_lineups: 0,
                bad_lineup_players: 0,
                bad_player_stats: 0
            };

            existing[countField] = row[countField] ?? 0;
            fixtureMap.set(row.fixture_id, existing);
        }
    }

    return Array.from(fixtureMap.values());
}

async function loadReimportQueueRows() {
    return db.all(`
        SELECT
            fixture_id,
            reason_code,
            status
        FROM v3_fixture_reimport_queue
        WHERE status IN ('pending', 'scheduled', 'deferred')
    `);
}

export async function getLineupCorruptionSummary() {
    const [fixtureRows, leagueMeta, queuedRows] = await Promise.all([
        loadFixtureCorruptionRows(),
        loadLeagueMetadata(),
        loadReimportQueueRows()
    ]);

    const groups = new Map();
    const queuedByFixtureId = queuedRows.reduce((acc, row) => {
        const existing = acc.get(row.fixture_id) || {
            pending_reimport: false,
            missing_api_fixture_flag: false
        };

        existing.pending_reimport = true;
        if (row.reason_code === 'missing_api_fixture') {
            existing.missing_api_fixture_flag = true;
        }

        acc.set(row.fixture_id, existing);
        return acc;
    }, new Map());

    for (const fixture of fixtureRows) {
        const key = `${fixture.league_id}:${fixture.season_year}:${fixture.data_source}`;
        const league = leagueMeta.get(fixture.league_id) || {
            league_name: `League #${fixture.league_id}`,
            logo_url: null,
            importance_rank: 999,
            country_name: 'World',
            flag_url: null
        };

        const group = groups.get(key) || {
            league_id: fixture.league_id,
            league_name: league.league_name,
            logo_url: league.logo_url,
            importance_rank: league.importance_rank,
            country_name: league.country_name,
            flag_url: league.flag_url,
            season_year: fixture.season_year,
            data_source: fixture.data_source,
            affected_fixtures: 0,
            bad_lineups: 0,
            bad_lineup_players: 0,
            bad_player_stats: 0,
            fixtures_with_bad_lineups: 0,
            fixtures_with_bad_lineup_players: 0,
            fixtures_with_bad_player_stats: 0,
            pending_reimport_fixtures: 0,
            missing_api_fixture_flags: 0,
            sample_fixture_ids: []
        };

        group.affected_fixtures += 1;
        group.bad_lineups += fixture.bad_lineups;
        group.bad_lineup_players += fixture.bad_lineup_players;
        group.bad_player_stats += fixture.bad_player_stats;

        if (fixture.bad_lineups > 0) {
            group.fixtures_with_bad_lineups += 1;
        }

        if (fixture.bad_lineup_players > 0) {
            group.fixtures_with_bad_lineup_players += 1;
        }

        if (fixture.bad_player_stats > 0) {
            group.fixtures_with_bad_player_stats += 1;
        }

        const queuedState = queuedByFixtureId.get(fixture.fixture_id);
        if (queuedState?.pending_reimport) {
            group.pending_reimport_fixtures += 1;
        }

        if (queuedState?.missing_api_fixture_flag) {
            group.missing_api_fixture_flags += 1;
        }

        group.sample_fixture_ids.push(fixture.fixture_id);
        groups.set(key, group);
    }

    return Array.from(groups.values())
        .map((row) => {
            const sample_fixture_ids = row.sample_fixture_ids
                .sort((a, b) => b - a)
                .slice(0, 3);

            const suggested_action = getSuggestedAction(row);

            return {
                ...row,
                sample_fixture_ids,
                is_low_priority: (row.importance_rank ?? 999) >= 250,
                suggested_action,
                suggested_reason: getSuggestedReason(row, suggested_action)
            };
        })
        .sort((a, b) => {
            const aPlayerStatsPriority = a.bad_player_stats > 0 ? 0 : 1;
            const bPlayerStatsPriority = b.bad_player_stats > 0 ? 0 : 1;

            if (aPlayerStatsPriority !== bPlayerStatsPriority) {
                return aPlayerStatsPriority - bPlayerStatsPriority;
            }

            if (a.affected_fixtures !== b.affected_fixtures) {
                return b.affected_fixtures - a.affected_fixtures;
            }

            if ((a.importance_rank ?? 999) !== (b.importance_rank ?? 999)) {
                return (a.importance_rank ?? 999) - (b.importance_rank ?? 999);
            }

            if ((a.country_name || 'World') !== (b.country_name || 'World')) {
                return (a.country_name || 'World').localeCompare(b.country_name || 'World');
            }

            if ((a.league_name || '') !== (b.league_name || '')) {
                return (a.league_name || '').localeCompare(b.league_name || '');
            }

            return (b.season_year ?? 0) - (a.season_year ?? 0);
        });
}
