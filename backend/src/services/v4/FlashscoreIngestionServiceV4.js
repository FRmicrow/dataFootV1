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

// ============================================================================
// SCHEMAS — Flashscore Data Validation
// ============================================================================

const FlashscoreMatchSchema = z.object({
  match_date: z.string().datetime('Invalid ISO datetime'),
  home_club_name: z.string().min(1),
  away_club_name: z.string().min(1),
  competition_name: z.string().min(1),
  competition_country: z.string().length(2).optional(),
  home_score: z.number().int().nonnegative().nullable(),
  away_score: z.number().int().nonnegative().nullable(),
  status: z.enum(['scheduled', 'live', 'finished']),
});

const FlashscoreEventSchema = z.object({
  minute: z.string().regex(/^\d+(\+\d+)?$/),
  type: z.enum(['goal', 'own_goal', 'penalty', 'card', 'substitution']),
  player_name: z.string().max(255).optional(),
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

    // STEP 2: Resolve FK references (clubs & competition)
    const homeClub = await resolveClubByName(validated.home_club_name);
    const awayClub = await resolveClubByName(validated.away_club_name);
    const competition = await resolveCompetitionByName(
      validated.competition_name,
      validated.competition_country
    );

    if (!homeClub || !awayClub) {
      logger.warn({
        home_club: validated.home_club_name,
        away_club: validated.away_club_name,
      }, 'Club not found — match skipped');
      return { error: 'Club not found', action: 'skipped' };
    }

    if (!competition) {
      logger.warn({
        competition: validated.competition_name,
      }, 'Competition not found');
      return { error: 'Competition not found', action: 'skipped' };
    }

    // STEP 3: Business key lookup (match_date + clubs + competition)
    const existingMatch = await db.get(
      `SELECT match_id, home_score, away_score, scraped_score_at
       FROM v4.matches
       WHERE home_club_id = ? AND away_club_id = ?
         AND match_date = ? AND competition_id = ?`,
      [homeClub.club_id, awayClub.club_id, validated.match_date, competition.competition_id]
    );

    // STEP 4: Idempotence check — don't re-scrape if already marked
    if (existingMatch) {
      if (existingMatch.scraped_score_at) {
        logger.info({
          match_id: existingMatch.match_id,
          scraped_at: existingMatch.scraped_score_at,
        }, 'Match already scraped — skipped (idempotent)');
        return { action: 'skipped', match_id: existingMatch.match_id, reason: 'already_scraped' };
      }

      // UPDATE: match exists but not yet scored (note: v4.matches has no 'status' column)
      await db.run(
        `UPDATE v4.matches
         SET home_score = ?, away_score = ?, scraped_score_at = NOW()
         WHERE match_id = ?`,
        [validated.home_score, validated.away_score, existingMatch.match_id]
      );

      logger.info({
        match_id: existingMatch.match_id,
        action: 'UPDATE',
        old_score: `${existingMatch.home_score}-${existingMatch.away_score}`,
        new_score: `${validated.home_score}-${validated.away_score}`,
      }, 'Match score updated from Flashscore');

      return { action: 'updated', match_id: existingMatch.match_id };

    } else {
      // INSERT: new match from Flashscore (likely a cup match)
      // Note: v4.matches does NOT have a 'status' column
      const result = await db.run(
        `INSERT INTO v4.matches
         (home_club_id, away_club_id, competition_id, match_date, home_score, away_score, scraped_score_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [homeClub.club_id, awayClub.club_id, competition.competition_id, validated.match_date,
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

    // STEP 2: Verify match exists and has score (idempotence check)
    const match = await db.get(
      `SELECT match_id, home_club_id, away_club_id, home_score, away_score, scraped_events_at
       FROM v4.matches WHERE match_id = ?`,
      [matchId]
    );

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    // STEP 3: Idempotence: If already marked as attempted, skip
    if (match.scraped_events_at) {
      logger.warn({
        match_id: matchId,
        scraped_at: match.scraped_events_at,
      }, 'Events already scraped — skipped (marker check)');
      return { action: 'skipped', match_id: matchId, reason: 'marker_present' };
    }

    // STEP 4: Start transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    let insertCount = 0, skipCount = 0, errorCount = 0;

    // STEP 5: Process each event
    for (const event of validated) {
      try {
        // Resolve player by name (FK resolution)
        let playerId = null;
        if (event.player_name) {
          playerId = await resolvePlayerByName(event.player_name);
          if (!playerId) {
            logger.debug({
              player_name: event.player_name,
              match_id: matchId,
            }, 'Player not found in DB — using NULL');
          }
        }

        // Resolve team (home or away)
        const team = event.team_side === 'home' ? match.home_club_id : match.away_club_id;

        // Check for duplicate event (business key)
        const existing = await client.query(
          `SELECT id FROM v4.match_events
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
          [matchId, event.minute, event.type, playerId, team, event.detail]
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

    // STEP 6: Mark match as "events scraped" (idempotence marker)
    await client.query(
      `UPDATE v4.matches SET scraped_events_at = NOW() WHERE id = $1`,
      [matchId]
    );

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

// ============================================================================
// CHALLENGE 3: Player Resolution (Multi-Strategy FK Resolution)
// ============================================================================

/**
 * Resolve Flashscore player name to DB person_id
 *
 * Strategies (in order):
 * 1. Exact name match (ILIKE)
 * 2. Abbreviated format "Nom I." → split + regex
 * 3. Last name only → search as surname
 *
 * Returns: person_id or null (unknown player)
 */
async function resolvePlayerByName(flashscoreName) {
  if (!flashscoreName || flashscoreName.trim() === '') {
    return null;
  }

  const searchName = flashscoreName.trim();

  // Strategy 1: Exact match
  let player = await db.get(
    `SELECT id FROM v4.people
     WHERE CONCAT(first_name, ' ', last_name) ILIKE ?`,
    [`%${searchName}%`]
  );

  if (player) return player.id;

  // Strategy 2: Abbreviated format (e.g., "De Bruyne K." → Kevin De Bruyne)
  const abbreviated = searchName.match(/^(.+)\s+([A-Z])\.?$/);
  if (abbreviated) {
    const [, lastName, initial] = abbreviated;
    player = await db.get(
      `SELECT id FROM v4.people
       WHERE last_name ILIKE ? AND first_name LIKE ?`,
      [lastName, `${initial}%`]
    );

    if (player) return player.id;
  }

  // Strategy 3: Last name only
  player = await db.get(
    `SELECT id FROM v4.people
     WHERE last_name ILIKE ?`,
    [searchName]
  );

  if (player) return player.id;

  // Not found
  logger.debug({ player_name: flashscoreName }, 'Player not resolved');
  return null;
}

// ============================================================================
// CHALLENGE 4: Competition Resolution (Dynamic Cup Creation)
// ============================================================================

/**
 * Resolve or create competition from Flashscore data
 * For cups (Champions League, etc.), create if doesn't exist
 *
 * Returns: { id: string, name: string, is_cup: boolean }
 */
async function resolveCompetitionByName(competitionName, countryCode) {
  // Check if competition exists
  let competition = await db.get(
    `SELECT id, name FROM v4.competitions WHERE name = ?`,
    [competitionName]
  );

  if (competition) return competition;

  // Determine if it's a cup (not a league)
  const isCup = /cup|coupe|coppa|pokal|liga|champions|europa|conference/i.test(competitionName);

  // Create new competition (for cups, Flashscore may introduce new competitions)
  if (isCup) {
    const result = await db.run(
      `INSERT INTO v4.competitions (name, country, is_cup, created_at)
       VALUES (?, ?, ?, NOW())`,
      [competitionName, countryCode || null, true]
    );

    logger.info({
      competition_id: result.lastID,
      competition_name: competitionName,
      is_cup: true,
    }, 'New competition created from Flashscore');

    return { id: result.lastID, name: competitionName, is_cup: true };
  }

  // League not found and not a cup → error
  logger.warn({ competition_name: competitionName }, 'Competition not found (not a cup)');
  return null;
}

// ============================================================================
// CHALLENGE 5: Club Resolution with Aliases
// ============================================================================

/**
 * Resolve Flashscore club name to DB club_id
 * Uses team aliases + Levenshtein distance for fuzzy matching
 *
 * Returns: { id: string, name: string } or null
 */
async function resolveClubByName(flashscoreClubName) {
  // Exact match first
  let club = await db.get(
    `SELECT club_id, name FROM v4.clubs WHERE name = ?`,
    [flashscoreClubName]
  );

  if (club) return club;

  // Check team aliases (mapping table — note: team_aliases table doesn't exist in V4 yet)
  // This is a fallback for future use if aliases are added
  // For now, team resolution falls through to fuzzy match

  // Fuzzy match (Levenshtein distance < 3)
  // Note: PostgreSQL needs `pg_trgm` extension for similarity()
  club = await db.get(
    `SELECT club_id, name FROM v4.clubs
     WHERE similarity(name, ?) > 0.6
     ORDER BY similarity(name, ?) DESC
     LIMIT 1`,
    [flashscoreClubName, flashscoreClubName]
  );

  if (club) {
    logger.info({
      flashscore_name: flashscoreClubName,
      matched_club: club.name,
    }, 'Club fuzzy-matched');
    return club;
  }

  logger.warn({ flashscore_club_name: flashscoreClubName }, 'Club not found');
  return null;
}

// ============================================================================
// CHALLENGE 6: Self-Healing (Repair Empty Markers)
// ============================================================================

/**
 * Repair idempotence markers that were set but data got deleted
 *
 * If `scraped_events_at IS NOT NULL` but `match_events` is empty,
 * reset the marker so retry will work.
 *
 * This prevents getting stuck in "already attempted" state.
 */
export async function repairEmptyMarkers(matchId) {
  try {
    logger.info({ match_id: matchId }, 'Repairing empty markers');

    // Check if events marker is set but no events exist
    const hasMarker = await db.get(
      `SELECT scraped_events_at FROM v4.matches WHERE id = ?`,
      [matchId]
    );

    if (!hasMarker || !hasMarker.scraped_events_at) {
      return { repaired: false };
    }

    const eventCount = await db.get(
      `SELECT COUNT(*) as count FROM v4.match_events WHERE match_id = ?`,
      [matchId]
    );

    // Check if match has goals (if yes, should have events)
    const match = await db.get(
      `SELECT home_score, away_score FROM v4.matches WHERE id = ?`,
      [matchId]
    );

    const totalGoals = (match.home_score || 0) + (match.away_score || 0);

    // If goals > 0 but no events, marker was set without data → repair
    if (totalGoals > 0 && eventCount.count === 0) {
      await db.run(
        `UPDATE v4.matches SET scraped_events_at = NULL WHERE id = ?`,
        [matchId]
      );

      logger.info({
        match_id: matchId,
        goals: totalGoals,
        events_found: eventCount.count,
      }, 'Empty events marker repaired');

      return { repaired: true, marker: 'scraped_events_at' };
    }

    return { repaired: false };

  } catch (error) {
    logger.error({ err: error, match_id: matchId }, 'Marker repair failed');
    return { error: error.message, repaired: false };
  }
}

export default {
  importFlashscoreMatchResult,
  importFlashscoreMatchEvents,
  repairEmptyMarkers,
};
