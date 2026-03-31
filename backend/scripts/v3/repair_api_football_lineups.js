import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';
import footballApi from '../../src/services/footballApi.js';
import { Mappers, ImportRepository as DB } from '../../src/services/v3/ImportService.js';
import { fetchAndStoreEvents } from '../../src/services/v3/fixtureService.js';
import { fetchAndStoreFixtureStats } from '../../src/services/v3/tacticalStatsService.js';

const log = logger.child({ script: 'repair_api_football_lineups' });

class ApiQuotaExceededError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ApiQuotaExceededError';
        this.code = 'api_quota_exhausted';
    }
}

const ARCHIVE_DEPENDENCIES = [
    {
        table: 'ml_matches',
        fixtureColumn: 'v3_fixture_id',
        recordIdSql: "ABS(hashtextextended(CONCAT_WS('||', t.source_league::TEXT, t.source_id::TEXT), 0))"
    },
    {
        table: 'v3_fixture_events',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.id'
    },
    {
        table: 'v3_fixture_stats',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.fixture_stats_id'
    },
    {
        table: 'v3_fixture_player_stats',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.fixture_player_stats_id'
    },
    {
        table: 'v3_fixture_lineups',
        fixtureColumn: 'fixture_id',
        recordIdSql: 't.lineup_id'
    },
    {
        table: 'v3_fixture_lineup_players',
        fixtureColumn: 'fixture_id',
        recordIdSql: "ABS(hashtextextended(CONCAT_WS('||', t.fixture_id::TEXT, t.team_id::TEXT, t.player_id::TEXT), 0))"
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

function makeBatchKey() {
    return `api_lineup_repair_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildTargetQuery({ fixtureId, leagueId, seasonYear, limit, includeQueued }) {
    const conditions = [
        "f.data_source = 'api_football'",
        'f.api_id IS NOT NULL'
    ];
    const params = [];

    if (fixtureId) {
        params.push(fixtureId);
        conditions.push('f.fixture_id = ?');
    } else {
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

    if (leagueId) {
        params.push(leagueId);
        conditions.push('f.league_id = ?');
    }

    if (seasonYear) {
        params.push(seasonYear);
        conditions.push('f.season_year = ?');
    }

    if (!includeQueued) {
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

    const sql = `
        SELECT
            f.fixture_id,
            f.api_id,
            f.league_id,
            l.name AS league_name,
            f.season_year,
            f.home_team_id,
            ht.name AS current_home_team,
            ht.api_id AS current_home_api_id,
            f.away_team_id,
            at.name AS current_away_team,
            at.api_id AS current_away_api_id,
            (
                SELECT COUNT(*)::INT
                FROM v3_fixture_lineups fl
                WHERE fl.fixture_id = f.fixture_id
                  AND fl.team_id NOT IN (f.home_team_id, f.away_team_id)
            ) AS bad_lineups,
            (
                SELECT COUNT(*)::INT
                FROM v3_fixture_lineup_players lp
                WHERE lp.fixture_id = f.fixture_id
                  AND lp.team_id NOT IN (f.home_team_id, f.away_team_id)
            ) AS bad_lineup_players,
            (
                SELECT COUNT(*)::INT
                FROM v3_fixture_player_stats ps
                WHERE ps.fixture_id = f.fixture_id
                  AND ps.team_id NOT IN (f.home_team_id, f.away_team_id)
            ) AS bad_player_stats
        FROM v3_fixtures f
        JOIN v3_leagues l ON l.league_id = f.league_id
        JOIN v3_teams ht ON ht.team_id = f.home_team_id
        JOIN v3_teams at ON at.team_id = f.away_team_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY f.season_year DESC, f.fixture_id DESC
        LIMIT ?
    `;

    return { sql, params };
}

async function ensureBatch(batchKey, backupPath) {
    return db.get(`
        INSERT INTO v3_quarantine_batches (
            batch_key,
            description,
            backup_path
        )
        VALUES (?, ?, ?)
        ON CONFLICT (batch_key) DO UPDATE SET
            backup_path = COALESCE(v3_quarantine_batches.backup_path, EXCLUDED.backup_path)
        RETURNING batch_id
    `, [
        batchKey,
        'API football fixture identity + lineup rebuild',
        backupPath
    ]);
}

async function queueFixtureForReimport({
    fixtureId,
    apiId,
    leagueId,
    seasonYear,
    dataSource,
    reasonCode,
    notes,
    metadata,
    batchKey
}) {
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
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?::jsonb, ?)
        ON CONFLICT (fixture_id, reason_code) DO UPDATE SET
            notes = COALESCE(v3_fixture_reimport_queue.notes, EXCLUDED.notes),
            metadata = v3_fixture_reimport_queue.metadata || EXCLUDED.metadata,
            batch_key = COALESCE(v3_fixture_reimport_queue.batch_key, EXCLUDED.batch_key),
            updated_at = CURRENT_TIMESTAMP
    `, [
        fixtureId,
        apiId,
        leagueId,
        seasonYear,
        dataSource,
        reasonCode,
        notes,
        JSON.stringify(metadata || {}),
        batchKey
    ]);
}

async function archiveFixtureRows(client, batchId, fixtureId, reasonCode) {
    for (const dependency of ARCHIVE_DEPENDENCIES) {
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
                '${dependency.table}',
                ${dependency.recordIdSql},
                t.${dependency.fixtureColumn},
                ARRAY[?]::TEXT[],
                to_jsonb(t)
            FROM ${dependency.table} t
            WHERE t.${dependency.fixtureColumn} = ?
            ON CONFLICT (batch_id, source_table, record_id) DO NOTHING
        `, [batchId, reasonCode, fixtureId]);
    }

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
            'v3_fixtures',
            fixture_id,
            fixture_id,
            ARRAY[?]::TEXT[],
            to_jsonb(v3_fixtures)
        FROM v3_fixtures
        WHERE fixture_id = ?
        ON CONFLICT (batch_id, source_table, record_id) DO NOTHING
    `, [batchId, reasonCode, fixtureId]);
}

async function clearFixtureRows(client, fixtureId) {
    for (const dependency of ARCHIVE_DEPENDENCIES) {
        await client.run(`
            DELETE FROM ${dependency.table}
            WHERE ${dependency.fixtureColumn} = ?
        `, [fixtureId]);
    }
}

async function getLocalTeamIdByApiId(apiTeamId) {
    const localTeam = await db.get('SELECT team_id FROM v3_teams WHERE api_id = ?', [apiTeamId]);
    return localTeam?.team_id ?? null;
}

async function canonicalizeTeamByApiId(apiTeamId, fallbackTeamApi = null) {
    const teamResponse = await footballApi.getTeamById(apiTeamId);
    const apiTeam = teamResponse?.response?.[0];

    if (apiTeam?.team) {
        const venueId = apiTeam.venue?.id
            ? await DB.getOrInsertVenue(Mappers.venue(apiTeam.venue))
            : null;

        return DB.upsertTeam(Mappers.team(apiTeam.team), venueId);
    }

    const existingTeamId = await getLocalTeamIdByApiId(apiTeamId);
    if (existingTeamId) return existingTeamId;

    if (fallbackTeamApi) {
        return DB.upsertTeam(Mappers.team(fallbackTeamApi), null);
    }

    return null;
}

async function ensureLocalPlayer(playerApi) {
    if (!playerApi?.id || !playerApi?.name) return null;

    const result = await db.get(`
        INSERT INTO v3_players (api_id, name, photo_url)
        VALUES (?, ?, ?)
        ON CONFLICT (api_id) DO UPDATE SET
            name = EXCLUDED.name,
            photo_url = COALESCE(EXCLUDED.photo_url, v3_players.photo_url)
        RETURNING player_id
    `, [
        playerApi.id,
        playerApi.name,
        playerApi.photo ?? null
    ]);

    return result?.player_id ?? null;
}

async function mapLocalLeagueId(apiLeagueId) {
    const localLeague = await db.get('SELECT league_id FROM v3_leagues WHERE api_id = ?', [apiLeagueId]);
    return localLeague?.league_id ?? null;
}

async function mapVenueId(apiFixture) {
    if (!apiFixture?.fixture?.venue?.id) return null;
    return DB.getOrInsertVenue(Mappers.venue(apiFixture.fixture.venue));
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

async function updateFixtureCore(client, fixtureId, apiFixture) {
    const localLeagueId = await mapLocalLeagueId(apiFixture.league.id);
    const localHomeTeamId = await canonicalizeTeamByApiId(apiFixture.teams.home.id, apiFixture.teams.home);
    const localAwayTeamId = await canonicalizeTeamByApiId(apiFixture.teams.away.id, apiFixture.teams.away);
    const venueId = await mapVenueId(apiFixture);

    if (!localLeagueId || !localHomeTeamId || !localAwayTeamId) {
        throw new Error(`Missing local mapping for fixture ${fixtureId} (league/team)`);
    }

    await client.run(`
        UPDATE v3_fixtures SET
            api_id = ?,
            league_id = ?,
            season_year = ?,
            round = ?,
            date = ?,
            timestamp = ?,
            timezone = ?,
            venue_id = ?,
            referee = ?,
            status_long = ?,
            status_short = ?,
            elapsed = ?,
            home_team_id = ?,
            away_team_id = ?,
            goals_home = ?,
            goals_away = ?,
            score_halftime_home = ?,
            score_halftime_away = ?,
            score_fulltime_home = ?,
            score_fulltime_away = ?,
            score_extratime_home = ?,
            score_extratime_away = ?,
            score_penalty_home = ?,
            score_penalty_away = ?,
            home_logo_url = ?,
            away_logo_url = ?,
            data_source = 'api_football',
            updated_at = CURRENT_TIMESTAMP
        WHERE fixture_id = ?
    `, [
        apiFixture.fixture.id,
        localLeagueId,
        apiFixture.league.season,
        apiFixture.league.round,
        apiFixture.fixture.date,
        apiFixture.fixture.timestamp,
        apiFixture.fixture.timezone,
        venueId,
        apiFixture.fixture.referee ?? null,
        apiFixture.fixture.status.long,
        apiFixture.fixture.status.short,
        apiFixture.fixture.status.elapsed,
        localHomeTeamId,
        localAwayTeamId,
        apiFixture.goals.home,
        apiFixture.goals.away,
        apiFixture.score?.halftime?.home ?? null,
        apiFixture.score?.halftime?.away ?? null,
        apiFixture.score?.fulltime?.home ?? null,
        apiFixture.score?.fulltime?.away ?? null,
        apiFixture.score?.extratime?.home ?? null,
        apiFixture.score?.extratime?.away ?? null,
        apiFixture.score?.penalty?.home ?? null,
        apiFixture.score?.penalty?.away ?? null,
        apiFixture.teams.home.logo ?? null,
        apiFixture.teams.away.logo ?? null,
        fixtureId
    ]);

    return {
        localLeagueId,
        localHomeTeamId,
        localAwayTeamId
    };
}

async function syncLineupsFromApi(fixtureId, apiId) {
    const response = await footballApi.getFixtureLineups(apiId);
    const lineups = response?.response || [];

    if (lineups.length === 0) {
        return {
            lineupsFound: 0,
            lineupsSaved: 0,
            lineupPlayersSaved: 0
        };
    }

    const fixture = await db.get(`
        SELECT
            f.home_team_id,
            ht.api_id AS home_api_id,
            f.away_team_id,
            at.api_id AS away_api_id
        FROM v3_fixtures f
        JOIN v3_teams ht ON ht.team_id = f.home_team_id
        JOIN v3_teams at ON at.team_id = f.away_team_id
        WHERE f.fixture_id = ?
    `, [fixtureId]);

    if (!fixture) {
        throw new Error(`Fixture ${fixtureId} not found after core update`);
    }

    const teamMap = new Map([
        [fixture.home_api_id, fixture.home_team_id],
        [fixture.away_api_id, fixture.away_team_id]
    ]);

    let lineupsSaved = 0;
    let lineupPlayersSaved = 0;

    for (const teamLineup of lineups) {
        const apiTeamId = teamLineup.team?.id;
        const localTeamId = teamMap.get(apiTeamId);

        if (!localTeamId) {
            log.warn({ fixtureId, apiId, apiTeamId }, 'Skipping lineup with unmapped API team');
            continue;
        }

        await db.run(`
            INSERT INTO v3_fixture_lineups (
                fixture_id,
                team_id,
                coach_id,
                coach_name,
                coach_photo,
                formation,
                starting_xi,
                substitutes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (fixture_id, team_id) DO UPDATE SET
                coach_id = EXCLUDED.coach_id,
                coach_name = EXCLUDED.coach_name,
                coach_photo = EXCLUDED.coach_photo,
                formation = EXCLUDED.formation,
                starting_xi = EXCLUDED.starting_xi,
                substitutes = EXCLUDED.substitutes
        `, [
            fixtureId,
            localTeamId,
            teamLineup.coach?.id ?? null,
            teamLineup.coach?.name ?? null,
            teamLineup.coach?.photo ?? null,
            teamLineup.formation ?? null,
            JSON.stringify(teamLineup.startXI || []),
            JSON.stringify(teamLineup.substitutes || [])
        ]);
        lineupsSaved++;

        const saveLineupPlayer = async (entry, isStarting) => {
            const apiPlayer = entry?.player;
            const localPlayerId = await ensureLocalPlayer(apiPlayer);
            if (!localPlayerId) return;

            await db.run(`
                INSERT INTO v3_fixture_lineup_players (
                    fixture_id,
                    team_id,
                    player_id,
                    is_starting,
                    shirt_number,
                    player_name,
                    position,
                    grid,
                    sub_in_minute,
                    sub_out_minute
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (fixture_id, team_id, player_id) DO UPDATE SET
                    is_starting = EXCLUDED.is_starting,
                    shirt_number = EXCLUDED.shirt_number,
                    player_name = EXCLUDED.player_name,
                    position = EXCLUDED.position,
                    grid = EXCLUDED.grid,
                    sub_in_minute = EXCLUDED.sub_in_minute,
                    sub_out_minute = EXCLUDED.sub_out_minute
            `, [
                fixtureId,
                localTeamId,
                localPlayerId,
                isStarting ? 1 : 0,
                apiPlayer.number ?? null,
                apiPlayer.name ?? null,
                apiPlayer.pos ?? null,
                apiPlayer.grid ?? null,
                null,
                null
            ]);
            lineupPlayersSaved++;
        };

        for (const player of teamLineup.startXI || []) {
            await saveLineupPlayer(player, true);
        }

        for (const player of teamLineup.substitutes || []) {
            await saveLineupPlayer(player, false);
        }
    }

    return {
        lineupsFound: lineups.length,
        lineupsSaved,
        lineupPlayersSaved
    };
}

async function syncPlayerStatsFromApi(fixtureId, apiId) {
    const response = await footballApi.getFixturePlayerStatistics(apiId);
    const teamStats = response?.response || [];

    if (teamStats.length === 0) {
        return {
            playerStatTeamsFound: 0,
            playerStatsSaved: 0
        };
    }

    let playerStatsSaved = 0;

    for (const teamContainer of teamStats) {
        const localTeam = await db.get('SELECT team_id FROM v3_teams WHERE api_id = ?', [teamContainer.team.id]);
        if (!localTeam) {
            log.warn({
                fixtureId,
                apiId,
                apiTeamId: teamContainer.team.id
            }, 'Skipping player stats for unmapped API team');
            continue;
        }

        for (const playerStats of teamContainer.players || []) {
            await ensureLocalPlayer(playerStats.player);
            await DB.upsertFixturePlayerStats(Mappers.fixturePlayerStats(fixtureId, localTeam.team_id, playerStats));
            playerStatsSaved++;
        }
    }

    return {
        playerStatTeamsFound: teamStats.length,
        playerStatsSaved
    };
}

async function refreshFixturePayloads(fixtureId, apiId) {
    const eventsOk = await fetchAndStoreEvents(fixtureId, apiId);
    const fixtureStatsOk = await fetchAndStoreFixtureStats(fixtureId, apiId);
    const playerStats = await syncPlayerStatsFromApi(fixtureId, apiId);
    const lineups = await syncLineupsFromApi(fixtureId, apiId);

    return {
        eventsOk,
        fixtureStatsOk,
        ...playerStats,
        ...lineups
    };
}

async function remainingBadPayloadsForFixture(fixtureId) {
    return db.get(`
        SELECT
            (
                SELECT COUNT(*)::INT
                FROM v3_fixture_lineups fl
                JOIN v3_fixtures f ON f.fixture_id = fl.fixture_id
                WHERE fl.fixture_id = ?
                  AND fl.team_id NOT IN (f.home_team_id, f.away_team_id)
            ) AS bad_lineups,
            (
                SELECT COUNT(*)::INT
                FROM v3_fixture_lineup_players lp
                JOIN v3_fixtures f ON f.fixture_id = lp.fixture_id
                WHERE lp.fixture_id = ?
                  AND lp.team_id NOT IN (f.home_team_id, f.away_team_id)
            ) AS bad_lineup_players,
            (
                SELECT COUNT(*)::INT
                FROM v3_fixture_player_stats ps
                JOIN v3_fixtures f ON f.fixture_id = ps.fixture_id
                WHERE ps.fixture_id = ?
                  AND ps.team_id NOT IN (f.home_team_id, f.away_team_id)
            ) AS bad_player_stats,
            (
                SELECT COUNT(*)::INT
                FROM v3_fixture_events e
                JOIN v3_fixtures f ON f.fixture_id = e.fixture_id
                WHERE e.fixture_id = ?
                  AND e.team_id IS NOT NULL
                  AND e.team_id NOT IN (f.home_team_id, f.away_team_id)
            ) AS bad_events
    `, [fixtureId, fixtureId, fixtureId, fixtureId]);
}

async function main() {
    const dryRun = hasFlag('--dry-run');
    const includeQueued = hasFlag('--include-queued');
    const fixtureId = getArgValue('--fixture-id') ? Number.parseInt(getArgValue('--fixture-id'), 10) : null;
    const leagueId = getArgValue('--league-id') ? Number.parseInt(getArgValue('--league-id'), 10) : null;
    const seasonYear = getArgValue('--season-year') ? Number.parseInt(getArgValue('--season-year'), 10) : null;
    const limit = Number.parseInt(getArgValue('--limit') || '25', 10);
    const backupPath = getArgValue('--backup-path') || null;
    const batchKey = getArgValue('--batch-key') || makeBatchKey();
    const reasonCode = 'api_fixture_identity_rebuild';

    await db.init();

    const { sql, params } = buildTargetQuery({ fixtureId, leagueId, seasonYear, limit, includeQueued });
    const targets = await db.all(sql, params);

    log.info({
        dryRun,
        includeQueued,
        fixtureId,
        leagueId,
        seasonYear,
        limit,
        selectedFixtures: targets.length,
        batchKey
    }, 'Selected api_football lineup repair targets');

    if (targets.length === 0) {
        return;
    }

    const plan = [];
    const apiFixturesByFixtureId = new Map();

    for (const target of targets) {
        try {
            const apiFixture = await fetchCanonicalFixture(target.api_id);

            if (!apiFixture) {
                plan.push({
                    fixtureId: target.fixture_id,
                    apiId: target.api_id,
                    leagueId: target.league_id,
                    seasonYear: target.season_year,
                    status: 'missing_api_fixture'
                });
                continue;
            }

            apiFixturesByFixtureId.set(target.fixture_id, apiFixture);

            const targetLeagueId = await mapLocalLeagueId(apiFixture.league.id);
            const targetHomeTeamId = await getLocalTeamIdByApiId(apiFixture.teams.home.id);
            const targetAwayTeamId = await getLocalTeamIdByApiId(apiFixture.teams.away.id);

            plan.push({
                fixtureId: target.fixture_id,
                apiId: target.api_id,
                currentLeagueId: target.league_id,
                currentLeagueName: target.league_name,
                currentSeasonYear: target.season_year,
                currentHomeTeamId: target.home_team_id,
                currentHomeTeamName: target.current_home_team,
                currentHomeTeamApiId: target.current_home_api_id,
                currentAwayTeamId: target.away_team_id,
                currentAwayTeamName: target.current_away_team,
                currentAwayTeamApiId: target.current_away_api_id,
                badLineups: target.bad_lineups,
                badLineupPlayers: target.bad_lineup_players,
                badPlayerStats: target.bad_player_stats,
                targetLeagueId,
                targetLeagueName: apiFixture.league.name,
                targetSeasonYear: apiFixture.league.season,
                targetHomeTeamId,
                targetHomeTeamName: apiFixture.teams.home.name,
                targetHomeTeamApiId: apiFixture.teams.home.id,
                targetAwayTeamId,
                targetAwayTeamName: apiFixture.teams.away.name,
                targetAwayTeamApiId: apiFixture.teams.away.id,
                createsMissingTeams: !targetHomeTeamId || !targetAwayTeamId,
                status: targetLeagueId ? 'ready' : 'missing_mapping'
            });
        } catch (error) {
            plan.push({
                fixtureId: target.fixture_id,
                apiId: target.api_id,
                status: 'api_error',
                error: error.message
            });
            if (error.code === 'api_quota_exhausted') {
                throw error;
            }
        }
    }

    const readyItems = plan.filter(item => item.status === 'ready');
    const missingApiItems = plan.filter(item => item.status === 'missing_api_fixture');

    log.info({
        dryRun,
        batchKey,
        summary: {
            total: plan.length,
            ready: readyItems.length,
            missingMapping: plan.filter(item => item.status === 'missing_mapping').length,
            missingApiFixture: missingApiItems.length,
            apiErrors: plan.filter(item => item.status === 'api_error').length
        },
        sample: plan.slice(0, 5)
    }, 'Prepared api_football lineup repair plan');

    if (!dryRun && missingApiItems.length > 0) {
        for (const item of missingApiItems) {
            await queueFixtureForReimport({
                fixtureId: item.fixtureId,
                apiId: item.apiId,
                leagueId: item.leagueId,
                seasonYear: item.seasonYear,
                dataSource: 'api_football',
                reasonCode: 'missing_api_fixture',
                notes: 'Queued automatically because API-Football returned no fixture payload during lineup repair preflight.',
                metadata: {
                    source_script: 'repair_api_football_lineups',
                    preflight_batch_key: batchKey
                },
                batchKey
            });
        }
    }

    if (dryRun || readyItems.length === 0) {
        return;
    }

    const batch = await ensureBatch(batchKey, backupPath);
    const results = {
        repaired: 0,
        failed: 0,
        skipped: plan.length - readyItems.length,
        fixturesStillBad: 0
    };

    for (const item of readyItems) {
        const fixtureTx = await db.getTransactionClient();
        let transactionOpen = false;
        let clientReleased = false;

        try {
            const apiFixture = apiFixturesByFixtureId.get(item.fixtureId);
            if (!apiFixture) {
                throw new Error(`API fixture ${item.apiId} not available from preflight fetch`);
            }

            await fixtureTx.beginTransaction();
            transactionOpen = true;
            await archiveFixtureRows(fixtureTx, batch.batch_id, item.fixtureId, reasonCode);
            await clearFixtureRows(fixtureTx, item.fixtureId);
            await updateFixtureCore(fixtureTx, item.fixtureId, apiFixture);
            await fixtureTx.commit();
            transactionOpen = false;
            fixtureTx.release();
            clientReleased = true;

            const syncResult = await refreshFixturePayloads(item.fixtureId, item.apiId);
            const remaining = await remainingBadPayloadsForFixture(item.fixtureId);
            const stillBad = Object.values(remaining).some(value => value > 0);

            if (stillBad) {
                results.fixturesStillBad++;
                log.warn({
                    fixtureId: item.fixtureId,
                    apiId: item.apiId,
                    remaining,
                    syncResult
                }, 'Fixture rebuilt but still has payload mismatches');
            } else {
                log.info({
                    fixtureId: item.fixtureId,
                    apiId: item.apiId,
                    syncResult
                }, 'Fixture rebuilt successfully');
            }

            results.repaired++;
        } catch (error) {
            if (transactionOpen) {
                await fixtureTx.rollback();
            }
            if (!clientReleased) {
                fixtureTx.release();
            }
            results.failed++;
            log.error({
                err: error,
                fixtureId: item.fixtureId,
                apiId: item.apiId
            }, 'Failed to rebuild fixture');
        }
    }

    log.info({
        batchId: batch.batch_id,
        batchKey,
        results
    }, 'Finished api_football lineup repair pass');
}

main().then(() => process.exit()).catch((error) => {
    log.error({ err: error }, 'Fatal error in api_football lineup repair script');
    process.exit(1);
});
