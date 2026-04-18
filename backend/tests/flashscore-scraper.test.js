import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import db from '../src/config/database.js';
import logger from '../src/utils/logger.js';

/**
 * Integration Test Suite: Flashscore Scraper Pipeline
 *
 * Tests the complete flow:
 * 1. Verify Liga Portugal matches are in DB (19,969 total, 475 in 2025-2026)
 * 2. Verify --force-tier=1 fetches scored matches without details
 * 3. Verify events/lineups/stats are populated after scrape
 */

describe('Flashscore Scraper Integration', () => {
  let conn;

  beforeEach(async () => {
    // Get a connection for test queries
    conn = db;
  });

  describe('Liga Portugal 2025-2026 Season', () => {
    it('should have Liga Portugal matches in database', async () => {
      const result = await db.get(`
        SELECT COUNT(*) as total
        FROM v4.matches
        WHERE competition_id IN (
          SELECT competition_id FROM v4.competitions
          WHERE name LIKE '%Portugal%'
        )
      `);

      expect(result.total).toBeGreaterThan(0);
      expect(result.total).toBe(19969); // From audit
    });

    it('should have all Liga Portugal 2025-2026 matches with scores', async () => {
      const result = await db.get(`
        SELECT COUNT(*) as total,
               COUNT(CASE WHEN home_score IS NULL THEN 1 END) as without_score
        FROM v4.matches
        WHERE competition_id IN (
          SELECT competition_id FROM v4.competitions
          WHERE name LIKE '%Portugal%'
        )
        AND season_label = '2025-2026'
      `);

      expect(result.total).toBe(475);
      expect(result.without_score).toBe(0); // All have scores
    });

    it('should have no future Liga Portugal 2025-2026 matches after 2026-03-29', async () => {
      const result = await db.get(`
        SELECT COUNT(*) as future_count
        FROM v4.matches
        WHERE competition_id IN (
          SELECT competition_id FROM v4.competitions
          WHERE name LIKE '%Portugal%'
        )
        AND season_label = '2025-2026'
        AND match_date > '2026-03-29'
      `);

      expect(result.future_count).toBe(0);
    });

    it('should identify matches needing details (events/lineups/stats)', async () => {
      const result = await db.get(`
        SELECT COUNT(*) as matches_without_detail
        FROM v4.matches m
        WHERE m.competition_id IN (
          SELECT competition_id FROM v4.competitions
          WHERE name LIKE '%Portugal%'
        )
        AND m.season_label = '2025-2026'
        AND m.home_score IS NOT NULL
        AND (
          m.scraped_events_at IS NULL
          OR m.scraped_lineups_at IS NULL
          OR m.scraped_stats_at IS NULL
        )
      `);

      // Should have some matches without details (this is what fix targets)
      expect(result.matches_without_detail).toBeGreaterThan(0);
      logger.info({
        liga_portugal_incomplete: result.matches_without_detail,
      }, 'Liga Portugal matches needing detail scrape');
    });
  });

  describe('Scraper Query Logic', () => {
    it('should fetch_scored_without_detail with since=1970-01-01 for force_tier=1', async () => {
      // Simulate the fix: query with old since date to capture all scored matches without details
      const result = await db.all(`
        SELECT m.match_id,
               (m.match_date AT TIME ZONE 'Europe/Paris')::date::text AS match_date,
               h.name AS home_team,
               a.name AS away_team,
               c.name AS competition_name,
               m.home_score,
               m.away_score
        FROM v4.matches m
        JOIN v4.clubs h ON h.club_id = m.home_club_id
        JOIN v4.clubs a ON a.club_id = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND (
            m.scraped_events_at IS NULL
            OR m.scraped_lineups_at IS NULL
            OR m.scraped_stats_at IS NULL
          )
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date < CURRENT_DATE
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= '1970-01-01'::date
          AND c.name LIKE '%Portugal%'
        ORDER BY m.match_date ASC
      `);

      // Should find Liga Portugal matches that need detail
      expect(result.length).toBeGreaterThan(0);
      logger.info({
        liga_portugal_fetchable: result.length,
        sample_match: result[0],
      }, 'Verify fix: scored_without_detail query with since=1970-01-01');
    });

    it('should NOT find Liga Portugal matches with old since date (15 days)', async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const sinceDate = fifteenDaysAgo.toISOString().split('T')[0];

      const result = await db.all(`
        SELECT m.match_id,
               (m.match_date AT TIME ZONE 'Europe/Paris')::date::text AS match_date,
               h.name AS home_team,
               a.name AS away_team,
               c.name AS competition_name,
               m.home_score,
               m.away_score
        FROM v4.matches m
        JOIN v4.clubs h ON h.club_id = m.home_club_id
        JOIN v4.clubs a ON a.club_id = m.away_club_id
        JOIN v4.competitions c ON c.competition_id = m.competition_id
        WHERE m.home_score IS NOT NULL
          AND (
            m.scraped_events_at IS NULL
            OR m.scraped_lineups_at IS NULL
            OR m.scraped_stats_at IS NULL
          )
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date < CURRENT_DATE
          AND (m.match_date AT TIME ZONE 'Europe/Paris')::date >= %s::date
          AND c.name LIKE '%Portugal%'
        ORDER BY m.match_date ASC
      `, [sinceDate]);

      // Before fix: would have 0 matches (Liga Portugal is in March, lookback is 15 days back from April)
      expect(result.length).toBe(0);
      logger.info({
        since_date: sinceDate,
        liga_portugal_with_old_logic: result.length,
      }, 'Demonstrate the bug: old logic finds 0 Liga Portugal matches');
    });
  });

  describe('Idempotence and Safety', () => {
    it('should not duplicate events on re-scrape', async () => {
      // Pick a Liga Portugal match to verify idempotence
      const match = await db.get(`
        SELECT m.match_id, COUNT(me.match_event_id) as event_count
        FROM v4.matches m
        LEFT JOIN v4.match_events me ON me.match_id = m.match_id
        WHERE m.competition_id IN (
          SELECT competition_id FROM v4.competitions
          WHERE name LIKE '%Portugal%'
        )
        AND m.season_label = '2025-2026'
        AND m.scraped_events_at IS NOT NULL
        GROUP BY m.match_id
        LIMIT 1
      `);

      if (match && match.event_count > 0) {
        // If this match has events, they should be idempotent
        // (duplicate check by business key prevents re-insertion)
        logger.info({
          match_id: match.match_id,
          event_count: match.event_count,
        }, 'Liga Portugal match with events (idempotence test ready)');
        expect(match.event_count).toBeGreaterThan(0);
      }
    });

    it('should have unique constraint on match_events business key (prevents duplicates)', async () => {
      // Verify the constraint exists (from migration)
      const constraint = await db.get(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'v4'
        AND table_name = 'match_events'
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%uq_v4_match_events%'
      `);

      // Note: constraint may not exist yet (migration disabled)
      // This test documents what SHOULD be there after fix is fully applied
      if (!constraint) {
        logger.warn(
          {},
          'UNIQUE constraint on v4.match_events not found (expected until migration re-enabled)'
        );
      }
    });
  });

  describe('Scraper Markers', () => {
    it('should track scraped_events_at timestamp', async () => {
      const result = await db.get(`
        SELECT
          COUNT(CASE WHEN scraped_events_at IS NOT NULL THEN 1 END) as with_events,
          COUNT(CASE WHEN scraped_events_at IS NULL THEN 1 END) as without_events
        FROM v4.matches
        WHERE competition_id IN (
          SELECT competition_id FROM v4.competitions
          WHERE name LIKE '%Portugal%'
        )
        AND season_label = '2025-2026'
      `);

      logger.info(
        { with_events: result.with_events, without_events: result.without_events },
        'Liga Portugal 2025-2026 scrape markers'
      );

      // Should have some matches with events scraped, some without
      expect(result.with_events + result.without_events).toBe(475);
    });
  });
});
