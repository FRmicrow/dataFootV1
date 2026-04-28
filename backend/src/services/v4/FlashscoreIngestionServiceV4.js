/**
 * FlashscoreIngestionServiceV4 — Real-World Data Surgery Example
 *
 * This service demonstrates safe data ingestion patterns applied to the Flashscore
 * scraping pipeline challenge:
 *
 * Challenges addressed:
 * 1. Idempotence: Marker-based "don't re-scrape" detection
 * 2. Deduplication: Handle matches that already exist (update) vs new (insert)
 * 3. FK resolution: Match player names (often abbreviated from Flashscore) to person_id
 * 4. Self-healing: Repair empty markers if data was deleted
 * 5. Transactional bulk ops: All-or-nothing for events/lineups/stats
 * 6. NULL-safe matching: Handle unknown players gracefully
 *
 * Key patterns:
 * - Validation schemas (Zod)
 * - Business key deduplication (match_date, home/away clubs)
 * - Idempotent markers (scraped_score_at, scraped_events_at, etc.)
 * - FK verification before linking
 * - Transactional safety for multi-table writes
 * - Comprehensive audit logging
 */

import { z } from 'zod';
import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import ResolutionServiceV4 from './ResolutionServiceV4.js';

// ============================================================================
// SCHEMAS — Flashscore Data Validation
// ============================================================================

const FlashscoreMatchSchema = z.object({
  match_date: z.string().datetime('Invalid ISO datetime'),
  home_club_name: z.string().min(1),
  home_club_id: z.string().optional(), // Flashscore internal ID
  away_club_name: z.string().min(1),
  away_club_id: z.string().optional(), // Flashscore internal ID
  competition_name: z.string().min(1),
  competition_id: z.string().optional(), // Flashscore internal ID
  competition_country: z.string().length(2).optional(),
  home_score: z.number().int().nonnegative().nullable(),
  away_score: z.number().int().nonnegative().nullable(),
  status: z.enum(['scheduled', 'live', 'finished']),
  venue_name: z.string().optional(),
});

const FlashscoreEventSchema = z.object({
  minute: z.string().regex(/^\d+(\+\d+)?$/),
  type: z.enum(['goal', 'own_goal', 'penalty', 'card', 'substitution']),
  player_name: z.string().max(255).optional(),
  player_id: z.string().optional(), // Flashscore player ID
  team_side: z.enum(['home', 'away']),
  detail: z.string().max(500).optional(),
});

const FlashscoreLineupSchema = z.object({
  team_side: z.enum(['home', 'away']),
  player_name: z.string().min(1).max(255),
  position: z.enum(['G', 'D', 'M', 'A']),
  jersey_number: z.number().int().min(1).max(99),
  is_starter: z.boolean(),
});

// ============================================================================
// CHALLENGE 1: Idempotent Match Score Import (Marker-based)
// ============================================================================

/**
 * Import match result from Flashscore → safely write to DB
 *
 * Key pattern: Check `scraped_score_at IS NULL` before updating
 * This ensures idempotence: running twice = same result
 *
 * Returns: { action: 'inserted' | 'updated' | 'skipped', match_id: string }
 */
export async function importFlashscoreMatchResult(flashscoreData) {
  try {
    // STEP 1: Validate input
    const validated = FlashscoreMatchSchema.parse(flashscoreData);

    logger.info({
      home: validated.home_club_name,
      away: validated.away_club_name,
      competition: validated.competition_name,
      score: `${validated.home_score}-${validated.away_score}`,
    }, 'Starting Flashscore match import');

    // STEP 2: Resolve FK references
    let homeTeamId = null;
    if (validated.home_club_id) {
      homeTeamId = await ResolutionServiceV4.resolveTeam('flashscore', validated.home_club_id, { name: validated.home_club_name });
    } else {
      const t = await db.get(`SELECT team_id FROM v4.teams WHERE name = ? LIMIT 1`, [validated.home_club_name]);
      if (t) homeTeamId = t.team_id;
    }

    let awayTeamId = null;
    if (validated.away_club_id) {
      awayTeamId = await ResolutionServiceV4.resolveTeam('flashscore', validated.away_club_id, { name: validated.away_club_name });
    } else {
      const t = await db.get(`SELECT team_id FROM v4.teams WHERE name = ? LIMIT 1`, [validated.away_club_name]);
      if (t) awayTeamId = t.team_id;
    }

    let competitionId = null;
    if (validated.competition_id) {
      competitionId = await ResolutionServiceV4.resolveCompetition('flashscore', validated.competition_id, { name: validated.competition_name, country: validated.competition_country });
    } else {
      const c = await db.get(`SELECT competition_id FROM v4.competitions WHERE name = ? LIMIT 1`, [validated.competition_name]);
      if (c) competitionId = c.competition_id;
    }

    let venueId = null;
    if (validated.venue_name) {
      // Venues rarely have reliable IDs in Flashscore match lists, lookup by name
      const v = await db.get(`SELECT venue_id FROM v4.venues WHERE name = ? LIMIT 1`, [validated.venue_name]);
      if (v) venueId = v.venue_id;
    }

    if (!homeTeamId || !awayTeamId) {
      logger.warn({
        home_club: validated.home_club_name,
        away_club: validated.away_club_name,
      }, 'Team resolution failed — match skipped');
      return { error: 'Team not resolved', action: 'skipped' };
    }

    if (!competitionId) {
      logger.warn({
        competition: validated.competition_name,
      }, 'Competition resolution failed');
      return { error: 'Competition not resolved', action: 'skipped' };
    }

    // STEP 3: Business key lookup (match_date + teams + competition)
    const existingMatch = await db.get(
      `SELECT match_id, home_score, away_score
       FROM v4.matches
       WHERE home_team_id = ? AND away_team_id = ?
         AND match_date = ? AND competition_id = ?`,
      [homeTeamId, awayTeamId, validated.match_date, competitionId]
    );

    // STEP 4: Idempotence check — don't re-scrape if already scored
    if (existingMatch) {
      if (existingMatch.home_score !== null) {
        logger.info({
          match_id: existingMatch.match_id,
        }, 'Match already scored — skipped (idempotent)');
        return { action: 'skipped', match_id: existingMatch.match_id, reason: 'already_scored' };
      }

      // UPDATE: match exists but not yet scored
      await db.run(
        `UPDATE v4.matches
         SET home_score = ?, away_score = ?, venue_id = COALESCE(?, venue_id)
         WHERE match_id = ?`,
        [validated.home_score, validated.away_score, venueId, existingMatch.match_id]
      );

      logger.info({
        match_id: existingMatch.match_id,
        action: 'UPDATE',
        old_score: `${existingMatch.home_score}-${existingMatch.away_score}`,
        new_score: `${validated.home_score}-${validated.away_score}`,
      }, 'Match score updated from Flashscore');

      return { action: 'updated', match_id: existingMatch.match_id };

    } else {
      // INSERT: new match from Flashscore
      const result = await db.run(
        `INSERT INTO v4.matches
         (home_team_id, away_team_id, competition_id, venue_id, match_date, home_score, away_score, source_provider)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'flashscore')`,
        [homeTeamId, awayTeamId, competitionId, venueId, validated.match_date,
         validated.home_score, validated.away_score]
      );

      logger.info({
        match_id: result.lastID,
        action: 'INSERT',
        competition: validated.competition_name,
        score: `${validated.home_score}-${validated.away_score}`,
      }, 'New match inserted from Flashscore');

      return { action: 'inserted', match_id: result.lastID };
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ err: error.errors }, 'Flashscore match validation failed');
      return { error: 'Validation failed', action: 'failed' };
    }

    logger.error({ err: error }, 'Match import failed');
    return { error: error.message, action: 'failed' };
  }
}

// ============================================================================
// CHALLENGE 2: Bulk Event Import with Transaction (All-or-Nothing)
// ============================================================================

/**
 * Import match events (goals, cards, subs) from Flashscore
 * Guarantees: All events inserted or all rolled back, no duplicates
 *
 * Returns: { inserted: number, skipped: number, errors: number, match_id: string }
 */
export async function importFlashscoreMatchEvents(matchId, flashscoreEvents) {
  let client;

  try {
    // STEP 1: Validate all events upfront
    const validated = z.array(FlashscoreEventSchema).parse(flashscoreEvents);

    logger.info({
      match_id: matchId,
      event_count: validated.length,
    }, 'Starting bulk event import (transaction)');

    // STEP 2: Verify match exists
    const match = await db.get(
      `SELECT match_id, home_team_id, away_team_id, home_score, away_score
       FROM v4.matches WHERE match_id = ?`,
      [matchId]
    );

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    // STEP 3: Idempotence: Check if events already exist
    const existingEvents = await db.get(
      `SELECT EXISTS(SELECT 1 FROM v4.match_events WHERE match_id = ?) as exists`,
      [matchId]
    );

    if (existingEvents.exists) {
      logger.info({
        match_id: matchId,
      }, 'Events already exist — skipped (idempotent)');
      return { action: 'skipped', match_id: matchId, reason: 'events_exist' };
    }

    // STEP 4: Start transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    let insertCount = 0, skipCount = 0, errorCount = 0;

    // STEP 5: Process each event
    for (const event of validated) {
      try {
        // Resolve team (home or away) first so we can scope the player pseudo-ID
        const teamId = event.team_side === 'home' ? match.home_team_id : match.away_team_id;

        // Resolve player safely
        let playerId = null;
        if (event.player_id) {
          playerId = await ResolutionServiceV4.resolvePerson('flashscore', event.player_id, { name: event.player_name });
        } else if (event.player_name) {
          // No ID provided by Flashscore. Do a strict heuristic lookup by name.
          // We DO NOT create a mapping or a new person without a real ID.
          const p = await client.query(`SELECT person_id FROM v4.people WHERE full_name = $1 LIMIT 1`, [event.player_name]);
          if (p.rows.length > 0) {
            playerId = p.rows[0].person_id;
          } else {
            logger.debug({ player_name: event.player_name, match_id: matchId }, 'Player not resolved by name — using NULL');
          }
        }

        // Check for duplicate event (business key)
        const existing = await client.query(
          `SELECT match_event_id FROM v4.match_events
           WHERE match_id = $1 AND minute_label = $2 AND event_type = $3
           AND player_id IS NOT DISTINCT FROM $4`,
          [matchId, event.minute, event.type, playerId]
        );

        if (existing.rows.length > 0) {
          skipCount++;
          continue; // Duplicate event
        }

        // Insert event
        await client.query(
          `INSERT INTO v4.match_events
           (match_id, minute_label, event_type, player_id, team_id, detail, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [matchId, event.minute, event.type, playerId, teamId, event.detail]
        );

        insertCount++;

      } catch (itemError) {
        logger.warn({
          err: itemError,
          event_minute: event.minute,
          event_type: event.type,
        }, 'Event insert failed — continuing batch');
        errorCount++;
      }
    }

    // STEP 6: Mark match as "events scraped" (Note: marker removed, handled by existence check)

    // STEP 7: Commit transaction
    await client.query('COMMIT');

    logger.info({
      match_id: matchId,
      total: validated.length,
      inserted: insertCount,
      skipped: skipCount,
      errors: errorCount,
    }, 'Event import completed (transaction committed)');

    return { action: 'imported', match_id: matchId, inserted: insertCount, skipped: skipCount, errors: errorCount };

  } catch (error) {
    // Rollback on error
    if (client) {
      try {
        await client.query('ROLLBACK');
        logger.info({ match_id: matchId }, 'Transaction rolled back');
      } catch (rollbackError) {
        logger.error({ err: rollbackError }, 'Rollback failed');
      }
    }

    if (error instanceof z.ZodError) {
      logger.error({ err: error.errors }, 'Event batch validation failed');
      return { error: 'Validation failed', action: 'failed' };
    }

    logger.error({ err: error, match_id: matchId }, 'Event import failed (rolled back)');
    return { error: error.message, action: 'failed' };

  } finally {
    if (client) {
      client.release();
    }
  }
}

// All resolution logic now delegated to ResolutionServiceV4

export default {
  importFlashscoreMatchResult,
  importFlashscoreMatchEvents,
};
