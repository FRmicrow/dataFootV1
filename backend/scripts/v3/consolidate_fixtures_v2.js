/**
 * Global High-Precision Fixture Consolidation (V2)
 * 
 * Identifies and merges duplicate fixtures regardless of season_year mapping.
 * Transfers rich data (lineups, events, stats) from losers to winners.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'consolidate_fixtures_v2' });

const TABLES_WITH_UNIQUE_CONSTRAINTS = [
    { table: 'v3_fixture_lineups', keys: ['team_id'] },
    { table: 'v3_fixture_stats', keys: ['team_id', 'half'] },
    { table: 'v3_fixture_player_stats', keys: ['player_id'] },
    { table: 'v3_team_features_prematch', keys: ['team_id'] },
    { table: 'v3_ml_feature_store_v2', keys: [] }, // Usually unique per fixture
    { table: 'v3_ml_predictions', keys: ['model_id'] }, // Assuming model_id exists
    { table: 'v3_odds', keys: ['bookmaker_id'] },
    { table: 'v3_risk_analysis', keys: [] }
];

const TABLES_WITHOUT_UNIQUE_CONSTRAINTS = [
    'v3_fixture_events',
    'v3_fixture_lineup_players',
    'v3_submodel_outputs',
    'v3_odds_selections',
    'v3_odds_import',
    'v3_fixture_reimport_queue'
];

async function consolidate() {
    try {
        await db.init();
        log.info('--- 🧹 Global High-Precision Fixture Consolidation ---');

        // 1. Identify potential duplicates (same teams, date, league)
        // Ignoring season_year to catch cross-season anomalies
        const duplicates = await db.all(`
            SELECT date, league_id, home_team_id, away_team_id, count(*) as dupe_count
            FROM V3_Fixtures
            GROUP BY date, league_id, home_team_id, away_team_id
            HAVING count(*) > 1
        `);

        log.info({ groupCount: duplicates.length }, 'Found potential duplicate groups (date-based)');

        let totalDeleted = 0;
        let totalMergedData = 0;

        for (const grp of duplicates) {
            const candidates = await db.all(`
                SELECT 
                    f.fixture_id, 
                    f.tm_match_id, 
                    f.data_source, 
                    f.season_year,
                    (SELECT count(*) FROM V3_Fixture_Events e WHERE e.fixture_id = f.fixture_id) as event_count,
                    (SELECT count(*) FROM V3_Fixture_Lineups l WHERE l.fixture_id = f.fixture_id) as lineup_count
                FROM V3_Fixtures f
                WHERE f.date = $1 
                  AND f.league_id = $2 
                  AND f.home_team_id = $3 
                  AND f.away_team_id = $4
            `, [grp.date, grp.league_id, grp.home_team_id, grp.away_team_id]);

            if (candidates.length <= 1) continue;

            // Score: Prioritize Transfermarkt Master and data-rich records
            candidates.forEach(c => {
                let score = 0;
                if (c.tm_match_id) score += 1000;
                if (c.data_source === 'transfermarkt_master') score += 500;
                if (c.lineup_count > 0) score += 100;
                if (c.event_count > 0) score += 50;
                c._score = score;
            });

            candidates.sort((a, b) => b._score - a._score);
            const winner = candidates[0];
            const toDelete = candidates.slice(1);

            for (const loser of toDelete) {
                const tx = await db.getTransactionClient();
                try {
                    await tx.beginTransaction();

                    log.info({ 
                        winner: winner.fixture_id, 
                        loser: loser.fixture_id,
                        winnerSeason: winner.season_year,
                        loserSeason: loser.season_year
                    }, 'Merging fixture');

                    // 1. Handle Tables WITHOUT Unique Constraints (Safe to just move)
                    for (const table of TABLES_WITHOUT_UNIQUE_CONSTRAINTS) {
                        try {
                            const res = await tx.run(`UPDATE ${table} SET fixture_id = ? WHERE fixture_id = ?`, [winner.fixture_id, loser.fixture_id]);
                            if (res.changes > 0) totalMergedData++;
                        } catch (e) {
                            log.warn({ table, winner: winner.fixture_id, loser: loser.fixture_id, err: e.message }, 'Failed to merge table (non-unique)');
                        }
                    }

                    // 2. Handle Tables WITH Unique Constraints (Check before moving)
                    for (const { table, keys } of TABLES_WITH_UNIQUE_CONSTRAINTS) {
                        try {
                            if (keys.length === 0) {
                                const winnerHas = await tx.get(`SELECT 1 FROM ${table} WHERE fixture_id = ? LIMIT 1`, [winner.fixture_id]);
                                if (!winnerHas) {
                                    await tx.run(`UPDATE ${table} SET fixture_id = ? WHERE fixture_id = ?`, [winner.fixture_id, loser.fixture_id]);
                                    totalMergedData++;
                                } else {
                                    await tx.run(`DELETE FROM ${table} WHERE fixture_id = ?`, [loser.fixture_id]);
                                }
                            } else {
                                const loserRecords = await tx.all(`SELECT * FROM ${table} WHERE fixture_id = ?`, [loser.fixture_id]);
                                for (const rec of loserRecords) {
                                    const checkSql = `SELECT 1 FROM ${table} WHERE fixture_id = ? AND ${keys.map(k => `${k} = ?`).join(' AND ')}`;
                                    const checkParams = [winner.fixture_id, ...keys.map(k => rec[k])];
                                    const winnerHas = await tx.get(checkSql, checkParams);
                                    
                                    if (!winnerHas) {
                                        const updateSql = `UPDATE ${table} SET fixture_id = ? WHERE fixture_id = ? AND ${keys.map(k => `${k} = ?`).join(' AND ')}`;
                                        const updateParams = [winner.fixture_id, loser.fixture_id, ...keys.map(k => rec[k])];
                                        await tx.run(updateSql, updateParams);
                                        totalMergedData++;
                                    } else {
                                        const deleteSql = `DELETE FROM ${table} WHERE fixture_id = ? AND ${keys.map(k => `${k} = ?`).join(' AND ')}`;
                                        const deleteParams = [loser.fixture_id, ...keys.map(k => rec[k])];
                                        await tx.run(deleteSql, deleteParams);
                                    }
                                }
                            }
                        } catch (e) {
                            log.warn({ table, err: e.message }, 'Failed to merge table (unique)');
                        }
                    }

                    // 3. Special Case: ML Matches (External table)
                    await tx.run(`UPDATE ml_matches SET v3_fixture_id = ? WHERE v3_fixture_id = ? AND NOT EXISTS (SELECT 1 FROM ml_matches WHERE v3_fixture_id = ?)`, [winner.fixture_id, loser.fixture_id, winner.fixture_id]);
                    await tx.run(`DELETE FROM ml_matches WHERE v3_fixture_id = ?`, [loser.fixture_id]);

                    // 4. Final Prune
                    await tx.run(`DELETE FROM V3_Fixtures WHERE fixture_id = ?`, [loser.fixture_id]);

                    await tx.commit();
                    totalDeleted++;
                } catch (err) {
                    await tx.rollback();
                    log.error({ loser: loser.fixture_id, err: err.message }, 'Failed to consolidate fixture');
                } finally {
                    tx.release();
                }
            }
        }

        log.info({ totalDeleted, totalMergedData }, '✅ Global Consolidation Complete');
        
        // Final Sweep: Cleanup any fixtures that might have been orphaned but didn't meet the date criteria
        // (Optional pass of the original intra-season dedup could go here)

        process.exit(0);

    } catch (e) {
        log.error({ err: e.message }, 'Consolidation failed');
        process.exit(1);
    }
}

consolidate();
