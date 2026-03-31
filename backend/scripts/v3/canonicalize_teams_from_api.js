import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';
import footballApi from '../../src/services/footballApi.js';
import { Mappers, ImportRepository as DB } from '../../src/services/v3/ImportService.js';

const log = logger.child({ script: 'canonicalize_teams_from_api' });

function getArgValue(flag) {
    const index = process.argv.indexOf(flag);
    return index >= 0 ? process.argv[index + 1] : null;
}

function hasFlag(flag) {
    return process.argv.includes(flag);
}

function makeBatchKey() {
    return `team_canonicalization_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function buildTargetQuery({ teamId, apiId, limit, suspiciousOnly, fromBadFixtures }) {
    const conditions = ['t.api_id IS NOT NULL'];
    const params = [];

    if (teamId) {
        params.push(teamId);
        conditions.push('t.team_id = ?');
    }

    if (apiId) {
        params.push(apiId);
        conditions.push('t.api_id = ?');
    }

    if (suspiciousOnly) {
        conditions.push("t.name ILIKE '%(Retired)%'");
    }

    if (fromBadFixtures) {
        conditions.push(`
            EXISTS (
                SELECT 1
                FROM v3_fixtures f
                WHERE f.data_source = 'api_football'
                  AND (f.home_team_id = t.team_id OR f.away_team_id = t.team_id)
                  AND (
                      EXISTS (
                          SELECT 1
                          FROM v3_fixture_lineups fl
                          WHERE fl.fixture_id = f.fixture_id
                            AND fl.team_id NOT IN (f.home_team_id, f.away_team_id)
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM v3_fixture_lineup_players lp
                          WHERE lp.fixture_id = f.fixture_id
                            AND lp.team_id NOT IN (f.home_team_id, f.away_team_id)
                      )
                      OR EXISTS (
                          SELECT 1
                          FROM v3_fixture_player_stats ps
                          WHERE ps.fixture_id = f.fixture_id
                            AND ps.team_id NOT IN (f.home_team_id, f.away_team_id)
                      )
                  )
            )
        `);
    }

    params.push(limit);

    const sql = `
        SELECT
            t.team_id,
            t.api_id,
            t.name,
            t.code,
            t.logo_url,
            (
                SELECT COUNT(*)::INT
                FROM v3_fixtures f
                WHERE f.data_source = 'api_football'
                  AND (f.home_team_id = t.team_id OR f.away_team_id = t.team_id)
            ) AS fixture_refs
        FROM v3_teams t
        WHERE ${conditions.join(' AND ')}
        ORDER BY fixture_refs DESC, t.team_id
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
        'Team canonicalization from API truth',
        backupPath
    ]);
}

async function archiveTeamRow(client, batchId, teamId, reasonCode) {
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
            'v3_teams',
            team_id,
            NULL,
            ARRAY[?]::TEXT[],
            to_jsonb(v3_teams)
        FROM v3_teams
        WHERE team_id = ?
        ON CONFLICT (batch_id, source_table, record_id) DO NOTHING
    `, [batchId, reasonCode, teamId]);
}

async function fetchCanonicalTeam(teamApiId) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await footballApi.getTeamById(teamApiId);
        const payload = response?.response?.[0];

        if (!payload?.team) {
            if (attempt < 3) {
                await sleep(300 * attempt);
                continue;
            }
            return null;
        }

        const venueId = payload.venue?.id
            ? await DB.getOrInsertVenue(Mappers.venue(payload.venue))
            : null;

        return {
            team: Mappers.team(payload.team),
            venueId
        };
    }
}

async function applyCanonicalTeamUpdate(client, localTeamId, canonical) {
    await client.run(`
        UPDATE v3_teams SET
            api_id = ?,
            name = ?,
            code = ?,
            country = ?,
            founded = ?,
            national = ?,
            is_national_team = ?,
            logo_url = ?,
            venue_id = COALESCE(?, venue_id),
            data_source = 'api-sports'
        WHERE team_id = ?
    `, [
        canonical.team.api_id,
        canonical.team.name,
        canonical.team.code,
        canonical.team.country,
        canonical.team.founded,
        canonical.team.national,
        canonical.team.is_national_team,
        canonical.team.logo_url,
        canonical.venueId,
        localTeamId
    ]);

    if (canonical.team.logo_url) {
        await client.run(`
            UPDATE v3_fixtures
            SET home_logo_url = ?
            WHERE home_team_id = ?
        `, [canonical.team.logo_url, localTeamId]);

        await client.run(`
            UPDATE v3_fixtures
            SET away_logo_url = ?
            WHERE away_team_id = ?
        `, [canonical.team.logo_url, localTeamId]);
    }
}

async function main() {
    const dryRun = hasFlag('--dry-run');
    const teamId = getArgValue('--team-id') ? Number.parseInt(getArgValue('--team-id'), 10) : null;
    const apiId = getArgValue('--api-id') ? Number.parseInt(getArgValue('--api-id'), 10) : null;
    const limit = Number.parseInt(getArgValue('--limit') || '100', 10);
    const batchKey = getArgValue('--batch-key') || makeBatchKey();
    const backupPath = getArgValue('--backup-path') || null;
    const suspiciousOnly = hasFlag('--all')
        ? false
        : hasFlag('--suspicious-only') || (!teamId && !apiId && !hasFlag('--from-bad-fixtures'));
    const fromBadFixtures = hasFlag('--from-bad-fixtures');
    const reasonCode = 'canonicalize_team_api_truth';

    await db.init();

    const { sql, params } = buildTargetQuery({
        teamId,
        apiId,
        limit,
        suspiciousOnly,
        fromBadFixtures
    });
    const targets = await db.all(sql, params);

    log.info({
        dryRun,
        teamId,
        apiId,
        limit,
        suspiciousOnly,
        fromBadFixtures,
        selectedTeams: targets.length,
        batchKey
    }, 'Selected team canonicalization targets');

    if (targets.length === 0) {
        return;
    }

    const plan = [];
    const canonicalByTeamId = new Map();

    for (const target of targets) {
        try {
            const canonical = await fetchCanonicalTeam(target.api_id);
            if (!canonical) {
                plan.push({
                    teamId: target.team_id,
                    apiId: target.api_id,
                    currentName: target.name,
                    status: 'missing_api_team'
                });
                continue;
            }

            canonicalByTeamId.set(target.team_id, canonical);

            plan.push({
                teamId: target.team_id,
                apiId: target.api_id,
                currentName: target.name,
                targetName: canonical.team.name,
                fixtureRefs: target.fixture_refs,
                changed: target.name !== canonical.team.name
                    || (target.code ?? null) !== (canonical.team.code ?? null)
                    || (target.logo_url ?? null) !== (canonical.team.logo_url ?? null),
                status: 'ready'
            });
        } catch (error) {
            plan.push({
                teamId: target.team_id,
                apiId: target.api_id,
                currentName: target.name,
                status: 'api_error',
                error: error.message
            });
        }
    }

    const readyItems = plan.filter(item => item.status === 'ready');

    log.info({
        dryRun,
        batchKey,
        summary: {
            total: plan.length,
            ready: readyItems.length,
            changed: readyItems.filter(item => item.changed).length,
            unchanged: readyItems.filter(item => !item.changed).length,
            missingApiTeam: plan.filter(item => item.status === 'missing_api_team').length,
            apiErrors: plan.filter(item => item.status === 'api_error').length
        },
        sample: plan.slice(0, 5)
    }, 'Prepared team canonicalization plan');

    if (dryRun || readyItems.length === 0) {
        return;
    }

    const batch = await ensureBatch(batchKey, backupPath);
    const results = {
        updated: 0,
        unchanged: 0,
        failed: 0
    };

    for (const item of readyItems) {
        const client = await db.getTransactionClient();
        let transactionOpen = false;
        let clientReleased = false;

        try {
            const canonical = canonicalByTeamId.get(item.teamId);
            if (!canonical) {
                throw new Error(`API team ${item.apiId} not available from preflight fetch`);
            }

            await client.beginTransaction();
            transactionOpen = true;
            await archiveTeamRow(client, batch.batch_id, item.teamId, reasonCode);
            await applyCanonicalTeamUpdate(client, item.teamId, canonical);
            await client.commit();
            transactionOpen = false;
            client.release();
            clientReleased = true;

            if (item.changed) {
                results.updated++;
            } else {
                results.unchanged++;
            }

            log.info({
                teamId: item.teamId,
                apiId: item.apiId,
                previousName: item.currentName,
                currentName: canonical.team.name
            }, 'Canonicalized team row from API');
        } catch (error) {
            if (transactionOpen) {
                await client.rollback();
            }
            if (!clientReleased) {
                client.release();
            }
            results.failed++;
            log.error({
                err: error,
                teamId: item.teamId,
                apiId: item.apiId
            }, 'Failed to canonicalize team row');
        }
    }

    log.info({
        batchId: batch.batch_id,
        batchKey,
        results
    }, 'Finished team canonicalization pass');
}

main().then(() => process.exit()).catch((error) => {
    log.error({ err: error }, 'Fatal error in team canonicalization script');
    process.exit(1);
});
