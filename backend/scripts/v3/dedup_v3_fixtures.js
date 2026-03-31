/**
 * Phase 11: Transactional Fixture Deduplication (Architectural Restoration)
 *
 * This script identifies and prunes redundant fixture records from the V3 database.
 * It handles 15+ foreign key dependencies across ML, Features, and Stats tables.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'dedup_v3_fixtures' });

async function scrub() {
    try {
        await db.init();
        log.info('--- 🧹 Global Fixture Deduplication (Transactional) ---');

        // 1. Identify potential duplicates (same teams, league, season)
        const duplicates = await db.all(`
            SELECT league_id, season_year, home_team_id, away_team_id, count(*) as dupe_count
            FROM V3_Fixtures
            GROUP BY league_id, season_year, home_team_id, away_team_id
            HAVING count(*) > 1
        `);

        log.info({ groupCount: duplicates.length }, 'Found potential duplicate groups');

        let totalDeleted = 0;

        for (const grp of duplicates) {
            const candidates = await db.all(`
                SELECT 
                    f.fixture_id, 
                    f.tm_match_id, 
                    f.data_source, 
                    f.date,
                    (SELECT count(*) FROM V3_Fixture_Events e WHERE e.fixture_id = f.fixture_id) as event_count,
                    (SELECT count(*) FROM V3_Fixture_Lineups l WHERE l.fixture_id = f.fixture_id) as lineup_count
                FROM V3_Fixtures f
                WHERE f.league_id = $1 
                  AND f.season_year = $2 
                  AND f.home_team_id = $3 
                  AND f.away_team_id = $4
            `, [grp.league_id, grp.season_year, grp.home_team_id, grp.away_team_id]);

            if (candidates.length <= 1) continue;

            // Score: Prioritize Transfermarkt Master and data-rich records
            candidates.forEach(c => {
                let score = 0;
                if (c.tm_match_id) score += 1000;
                if (c.data_source === 'transfermarkt_master') score += 500;
                if (c.event_count > 0) score += 100;
                if (c.lineup_count > 0) score += 50;
                c._score = score;
            });

            candidates.sort((a, b) => b._score - a._score);
            const winner = candidates[0];
            const toDelete = candidates.slice(1);

            for (const loser of toDelete) {
                const tx = await db.getTransactionClient();
                try {
                    await tx.beginTransaction();

                    // 1. Migrate ML Matches
                    await tx.run(`UPDATE ml_matches SET v3_fixture_id = $1 WHERE v3_fixture_id = $2 AND NOT EXISTS (SELECT 1 FROM ml_matches WHERE v3_fixture_id = $1)`, [winner.fixture_id, loser.fixture_id]);
                    await tx.run(`DELETE FROM ml_matches WHERE v3_fixture_id = $1`, [loser.fixture_id]);

                    // 2. Prune Dependent Tables
                    const tables = [
                        'v3_fixture_lineups', 'v3_fixture_lineup_players', 'v3_team_features_prematch',
                        'v3_submodel_outputs', 'v3_ml_feature_store_v2', 'v3_ml_predictions',
                        'v3_odds_selections', 'v3_risk_analysis', 'v3_fixture_events',
                        'v3_fixture_stats', 'v3_fixture_player_stats', 'v3_odds_import',
                        'v3_fixture_reimport_queue', 'v3_odds'
                    ];

                    for (const table of tables) {
                        await tx.run(`DELETE FROM ${table} WHERE fixture_id = $1`, [loser.fixture_id]);
                    }

                    // 3. Final Prune
                    await tx.run(`DELETE FROM V3_Fixtures WHERE fixture_id = $1`, [loser.fixture_id]);

                    await tx.commit();
                    totalDeleted++;
                } catch (err) {
                    await tx.rollback();
                    log.error({ loser: loser.fixture_id, err: err.message }, 'Failed to delete fixture');
                } finally {
                    tx.release();
                }
            }
        }

        log.info({ totalDeleted }, '✅ Global Fixture Scrubbing Complete');
        process.exit(0);

    } catch (e) {
        log.error({ err: e.message }, 'Scrubbing failed');
        process.exit(1);
    }
}

scrub();
