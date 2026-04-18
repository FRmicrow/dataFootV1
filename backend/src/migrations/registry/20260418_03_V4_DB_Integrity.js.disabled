/**
 * Migration: V4 Database Integrity
 * Date: 2026-04-18
 *
 * Purpose:
 * - Add UNIQUE constraints on business keys (prevents duplicates)
 * - Fix BIGINT PKs to have proper DEFAULT/SEQUENCE
 * - Add missing indexes for performance (N+1 prevention)
 * - Cleanup orphaned foreign key references
 *
 * CRITICAL: This migration MUST run after any existing duplicate deduplication.
 * Pre-flight check: verify no duplicates exist on v4.matches business key.
 */

import logger from '../../utils/logger.js';

export async function up(db) {
  logger.info('Starting V4 DB Integrity migration...');

  try {
    // =========================================================================
    // STEP 1: Verify no duplicates exist before adding UNIQUE constraints
    // =========================================================================

    logger.info('Verifying v4.matches for duplicates...');
    const matchDuplicates = await db.all(`
      SELECT
        home_club_id, away_club_id, competition_id, match_date,
        COUNT(*) as count,
        ARRAY_AGG(match_id) as ids
      FROM v4.matches
      GROUP BY home_club_id, away_club_id, competition_id, match_date
      HAVING COUNT(*) > 1
    `);

    if (matchDuplicates.length > 0) {
      logger.error({
        duplicateGroups: matchDuplicates.length,
        totalDuplicates: matchDuplicates.reduce((sum, g) => sum + (g.count - 1), 0),
      }, 'DUPLICATE MATCHES FOUND — run deduplication before this migration');
      throw new Error('Duplicate matches exist in v4.matches — cannot add UNIQUE constraint');
    }

    logger.info('No duplicates found in v4.matches ✓');

    // =========================================================================
    // STEP 2: Add UNIQUE constraint on v4.matches business key
    // =========================================================================
    // CRITICAL: Prevents duplicates of same match from being imported twice

    logger.info('Adding UNIQUE constraint on v4.matches business key...');
    await db.run(`
      ALTER TABLE v4.matches
      ADD CONSTRAINT uq_v4_matches_business_key
      UNIQUE (home_club_id, away_club_id, competition_id, match_date)
    `);
    logger.info('✓ v4.matches unique constraint added');

    // =========================================================================
    // STEP 3: Add UNIQUE constraint on v4.match_events
    // =========================================================================
    // Race-condition safe: handles NULL player_id via IS NOT DISTINCT FROM

    logger.info('Adding UNIQUE constraint on v4.match_events...');
    await db.run(`
      ALTER TABLE v4.match_events
      ADD CONSTRAINT uq_v4_match_events_business_key
      UNIQUE (match_id, minute_label, event_type, player_id)
    `);
    logger.info('✓ v4.match_events unique constraint added');

    // =========================================================================
    // STEP 4: Fix match_event_id — add DEFAULT sequence (was missing!)
    // =========================================================================
    // CRITICAL: match_event_id BIGINT without DEFAULT causes insert failures

    logger.info('Fixing match_event_id sequence...');

    // Create sequence if it doesn't exist (idempotent)
    await db.run(`
      CREATE SEQUENCE IF NOT EXISTS v4_match_events_match_event_id_seq
      START 1 INCREMENT 1
    `);

    // Set sequence as default (uses nextval)
    await db.run(`
      ALTER TABLE v4.match_events
      ALTER COLUMN match_event_id
      SET DEFAULT nextval('v4_match_events_match_event_id_seq'::regclass)
    `);

    logger.info('✓ match_event_id sequence configured');

    // =========================================================================
    // STEP 5: Fix ml_model_registry unique constraint (was on name only)
    // =========================================================================
    // Allows model versioning: same model name, different versions

    logger.info('Fixing ml_model_registry unique constraint...');

    // Drop old constraint
    await db.run(`
      ALTER TABLE v4.ml_model_registry
      DROP CONSTRAINT IF EXISTS ml_model_registry_name_key
    `);

    // Add new composite unique on (name, version)
    await db.run(`
      ALTER TABLE v4.ml_model_registry
      ADD CONSTRAINT uq_ml_model_registry_name_version
      UNIQUE (name, version)
    `);

    logger.info('✓ ml_model_registry unique constraint fixed');

    // =========================================================================
    // STEP 6: Add performance indexes
    // =========================================================================
    // These prevent seq scans and N+1 patterns

    logger.info('Adding performance indexes...');

    // Index on match_stats.match_id (for MatchDetailV4Service queries)
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_v4_match_stats_match_id
      ON v4.match_stats (match_id)
    `);
    logger.info('✓ Index on v4.match_stats(match_id)');

    // Index on match_odds.match_id (for odds queries)
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_v4_match_odds_match_id
      ON v4.match_odds (match_id)
    `);
    logger.info('✓ Index on v4.match_odds(match_id)');

    // Index on match_events for event_type queries (supports = instead of ILIKE)
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_v4_match_events_type
      ON v4.match_events (match_id, event_type)
    `);
    logger.info('✓ Index on v4.match_events(match_id, event_type)');

    // Index on match_lineups for player resolution
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_v4_match_lineups_player
      ON v4.match_lineups (match_id, player_id)
      WHERE player_id IS NOT NULL
    `);
    logger.info('✓ Index on v4.match_lineups(match_id, player_id)');

    // =========================================================================
    // STEP 7: Cleanup orphaned foreign key references
    // =========================================================================
    // Delete mapping rows pointing to deleted matches (no FK constraint)

    logger.info('Cleaning up orphaned references...');

    const orphanCount = await db.get(`
      DELETE FROM v4.external_match_mapping
      WHERE v4_match_id IS NULL
        AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
      RETURNING COUNT(*) as count
    `);

    logger.info({
      orphanedRowsDeleted: orphanCount?.count || 0,
    }, 'Orphaned external_match_mapping rows cleaned');

    // =========================================================================
    // STEP 8: Verify indexes were created
    // =========================================================================

    logger.info('Verifying indexes...');
    const indexes = await db.all(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'v4'
      AND indexname IN (
        'idx_v4_match_stats_match_id',
        'idx_v4_match_odds_match_id',
        'idx_v4_match_events_type',
        'idx_v4_match_lineups_player'
      )
      ORDER BY indexname
    `);

    logger.info({
      indexCount: indexes.length,
      indexes: indexes.map(i => i.indexname),
    }, 'Indexes verified');

    logger.info('✅ V4 Database Integrity migration completed successfully');

  } catch (error) {
    logger.error({ err: error }, 'Migration failed');
    throw error;
  }
}

export async function down(db) {
  logger.warn('Rolling back V4 DB Integrity migration...');

  try {
    // Drop constraints and indexes in reverse order

    await db.run(`
      ALTER TABLE v4.ml_model_registry
      DROP CONSTRAINT IF EXISTS uq_ml_model_registry_name_version
    `);

    await db.run(`
      ALTER TABLE v4.match_events
      DROP CONSTRAINT IF EXISTS uq_v4_match_events_business_key
    `);

    await db.run(`
      ALTER TABLE v4.matches
      DROP CONSTRAINT IF EXISTS uq_v4_matches_business_key
    `);

    await db.run(`
      DROP INDEX IF EXISTS idx_v4_match_stats_match_id
    `);

    await db.run(`
      DROP INDEX IF EXISTS idx_v4_match_odds_match_id
    `);

    await db.run(`
      DROP INDEX IF EXISTS idx_v4_match_events_type
    `);

    await db.run(`
      DROP INDEX IF EXISTS idx_v4_match_lineups_player
    `);

    await db.run(`
      DROP SEQUENCE IF EXISTS v4_match_events_match_event_id_seq
    `);

    logger.info('✅ Rollback completed');

  } catch (error) {
    logger.error({ err: error }, 'Rollback failed');
    throw error;
  }
}
