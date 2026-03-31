/**
 * Final Integrity Sweep: Orphan Purge
 * 
 * Removes records from dependent tables that reference non-existent fixture_ids.
 */

import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const log = logger.child({ script: 'purge_orphans' });

const TABLES_TO_CHECK = [
    'v3_fixture_lineups',
    'v3_fixture_lineup_players',
    'v3_fixture_events',
    'v3_fixture_stats',
    'v3_fixture_player_stats',
    'v3_team_features_prematch',
    'v3_ml_feature_store_v2',
    'v3_ml_predictions',
    'v3_odds',
    'v3_odds_selections',
    'v3_risk_analysis',
    'v3_submodel_outputs',
    'v3_odds_import',
    'v3_fixture_reimport_queue'
];

async function purge() {
    try {
        await db.init();
        log.info('--- 🧹 Final Integrity Sweep: Purging Orphans ---');

        let grandTotalDeleted = 0;

        for (const table of TABLES_TO_CHECK) {
            const tx = await db.getTransactionClient();
            try {
                await tx.beginTransaction();

                // Optimized orphan deletion using NOT EXISTS
                const sql = `
                    DELETE FROM ${table} t
                    WHERE NOT EXISTS (
                        SELECT 1 FROM v3_fixtures f WHERE f.fixture_id = t.fixture_id
                    )
                `;
                
                const res = await tx.run(sql);
                
                if (res.changes > 0) {
                    log.info({ table, orphanedRecordsDeleted: res.changes }, `Cleaned up orphans in ${table}`);
                    grandTotalDeleted += res.changes;
                }

                await tx.commit();
            } catch (err) {
                await tx.rollback();
                log.error({ table, err: err.message }, 'Failed to purge orphans');
            } finally {
                tx.release();
            }
        }

        log.info({ grandTotalDeleted }, '✅ Final Integrity Sweep Complete');
        process.exit(0);
    } catch (e) {
        log.error({ err: e.message }, 'Purge failed');
        process.exit(1);
    }
}

purge();
