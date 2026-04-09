/**
 * migrate_odds_v3_to_v4.js
 *
 * Migrates odds from V3_Odds to v4.odds using v4.fixture_match_mapping.
 * Only migrates fixtures with HIGH or MEDIUM confidence in the mapping table.
 *
 * Idempotent: ON CONFLICT DO NOTHING — safe to re-run.
 *
 * Usage:
 *   cd backend && node scripts/migrate_odds_v3_to_v4.js
 *
 * Prerequisites:
 *   - run_migrations.js applied (v4.fixture_match_mapping and v4.odds exist)
 *   - build_fixture_match_mapping.js run and report validated
 */

import 'dotenv/config';
import db from '../src/config/database.js';
import { createChildLogger } from '../src/utils/logger.js';

const logger = createChildLogger('OddsMigrationScript');

async function main() {
    await db.init();
    logger.info('Starting V3_Odds → v4.odds migration...');

    // Check prerequisites
    const mappingCount = await db.get(
        `SELECT COUNT(*) AS cnt FROM v4.fixture_match_mapping WHERE confidence IN ('HIGH', 'MEDIUM')`
    );
    if (!mappingCount || parseInt(mappingCount.cnt, 10) === 0) {
        logger.error('No HIGH/MEDIUM fixtures in mapping table. Run build_fixture_match_mapping.js first.');
        process.exit(1);
    }

    logger.info({ eligible_fixtures: mappingCount.cnt }, 'Eligible mapped fixtures found');

    // Migrate odds — batch via INSERT ... SELECT
    const result = await db.run(`
        INSERT INTO v4.odds
            (match_id, bookmaker_id, market_id, market_type, value_home, value_draw, value_away, handicap_value, captured_at)
        SELECT
            fmm.v4_match_id,
            vo.bookmaker_id,
            vo.market_id,
            'FT_1X2'              AS market_type,
            vo.value_home_over    AS value_home,
            vo.value_draw,
            vo.value_away_under   AS value_away,
            vo.handicap_value,
            NOW()                 AS captured_at
        FROM V3_Odds vo
        JOIN v4.fixture_match_mapping fmm
            ON fmm.v3_fixture_id = vo.fixture_id
           AND fmm.v4_match_id IS NOT NULL
           AND fmm.confidence IN ('HIGH', 'MEDIUM')
        ON CONFLICT (match_id, bookmaker_id, market_id, handicap_value) DO NOTHING
    `);

    const inserted = result.changes ?? 0;

    // Count skipped (LOW/NONE confidence fixtures with odds)
    const skipped = await db.get(`
        SELECT COUNT(DISTINCT vo.fixture_id) AS cnt
        FROM V3_Odds vo
        JOIN v4.fixture_match_mapping fmm ON fmm.v3_fixture_id = vo.fixture_id
        WHERE fmm.confidence NOT IN ('HIGH', 'MEDIUM')
           OR fmm.v4_match_id IS NULL
    `);

    const unmapped = await db.get(`
        SELECT COUNT(DISTINCT vo.fixture_id) AS cnt
        FROM V3_Odds vo
        WHERE vo.fixture_id NOT IN (SELECT v3_fixture_id FROM v4.fixture_match_mapping)
    `);

    logger.info({
        inserted,
        skipped_low_confidence: parseInt(skipped?.cnt ?? 0, 10),
        unmapped_fixtures: parseInt(unmapped?.cnt ?? 0, 10),
    }, '=== ODDS MIGRATION REPORT ===');

    logger.info('Migration complete. Verify with: SELECT COUNT(*) FROM v4.odds;');
    process.exit(0);
}

main().catch(err => {
    logger.error({ err }, 'Fatal error in migrate_odds_v3_to_v4');
    process.exit(1);
});
