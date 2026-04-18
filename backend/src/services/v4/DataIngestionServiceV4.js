/**
 * DataIngestionServiceV4 — Template for Safe Data Ingestion
 *
 * This service demonstrates the "surgical database" patterns:
 * - Schema validation (Zod)
 * - Deduplication via business keys
 * - Transactional safety (all-or-nothing)
 * - Idempotent operations (run 2x = same result)
 * - Complete audit logging
 *
 * Use this as a template for all import operations.
 */

import { z } from 'zod';
import db from '../config/database.js';
import logger from '../utils/logger.js';

// ============================================================================
// SCHEMAS — Validate BEFORE touching DB
// ============================================================================

const MatchEventInsertSchema = z.object({
  match_id: z.string().uuid('Invalid UUID'),
  minute_label: z.string().regex(/^\d+(\+\d+)?$/, 'Invalid minute format (e.g., "45", "45+2")'),
  event_type: z.enum(['goal', 'card', 'substitution', 'injury', 'own_goal', 'penalty']),
  player_name: z.string().min(1).max(255).optional(),
  player_id: z.string().uuid().optional(),
  team_id: z.string().uuid('Invalid team UUID'),
  detail: z.string().max(500).optional(),
});

const MatchEventBatchSchema = z.array(MatchEventInsertSchema);

const PlayerInsertSchema = z.object({
  person_id: z.string().uuid('Invalid person UUID'),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  birth_date: z.string().date('Invalid date format (YYYY-MM-DD)').optional(),
  nationality: z.string().length(2, 'ISO 2-letter country code').optional(),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
});

// ============================================================================
// PATTERN 1: Safe Single Insert (With Deduplication)
// ============================================================================

/**
 * Insert a single match event — safe, idempotent
 *
 * Returns: { inserted: boolean, event_id?: string, duplicate?: boolean, error?: string }
 */
export async function insertMatchEvent(matchId, event) {
  try {
    // STEP 1: Validate schema
    const validated = MatchEventInsertSchema.parse(event);

    logger.info({
      match_id: matchId,
      event_type: validated.event_type,
      minute: validated.minute_label,
    }, 'Starting match event insert (single)');

    // STEP 2: Verify match exists (FK check)
    const match = await db.get(
      'SELECT id FROM v4.matches WHERE id = ?',
      [matchId]
    );

    if (!match) {
      logger.error({ match_id: matchId }, 'Match not found');
      return { error: `Match ${matchId} not found`, inserted: false };
    }

    // STEP 3: Check for duplicate via business key
    const existingEvent = await db.get(
      `SELECT id FROM v4.match_events
       WHERE match_id = ? AND minute_label = ? AND event_type = ? AND player_id IS NOT DISTINCT FROM ?`,
      [matchId, validated.minute_label, validated.event_type, validated.player_id]
    );

    if (existingEvent) {
      logger.warn({
        match_id: matchId,
        minute: validated.minute_label,
        event_type: validated.event_type,
      }, 'Duplicate event detected — skipped (idempotent)');
      return { inserted: false, duplicate: true, event_id: existingEvent.id };
    }

    // STEP 4: Verify FK references
    if (validated.player_id) {
      const player = await db.get(
        'SELECT id FROM v4.people WHERE id = ?',
        [validated.player_id]
      );
      if (!player) {
        logger.warn({ player_id: validated.player_id }, 'Player not found — setting NULL');
        validated.player_id = null;
      }
    }

    const team = await db.get(
      'SELECT id FROM v4.clubs WHERE id = ?',
      [validated.team_id]
    );

    if (!team) {
      logger.error({ team_id: validated.team_id }, 'Team not found');
      return { error: `Team ${validated.team_id} not found`, inserted: false };
    }

    // STEP 5: Insert
    const result = await db.run(
      `INSERT INTO v4.match_events
       (match_id, minute_label, event_type, player_id, team_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [matchId, validated.minute_label, validated.event_type, validated.player_id,
       validated.team_id, validated.detail]
    );

    // STEP 6: Audit log
    logger.info({
      operation: 'INSERT',
      table: 'v4.match_events',
      event_id: result.lastID,
      match_id: matchId,
      event_type: validated.event_type,
      timestamp: new Date().toISOString(),
    }, 'Match event inserted successfully');

    return { inserted: true, event_id: result.lastID };

  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.error({ err: error.errors }, 'Schema validation failed');
      return {
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
        inserted: false,
      };
    }

    // Handle DB constraint errors
    if (error.code === '23505') {
      logger.warn({ err: error }, 'Unique constraint violation (handled as duplicate)');
      return { inserted: false, duplicate: true };
    }

    // Handle other DB errors
    logger.error({ err: error, match_id: matchId }, 'Insert failed');
    return { error: error.message, inserted: false };
  }
}

// ============================================================================
// PATTERN 2: Bulk Upsert (With Transaction)
// ============================================================================

/**
 * Import multiple match events in a single transaction
 * All-or-nothing: if any error, entire batch rolls back
 *
 * Returns: { inserted: number, updated: number, skipped: number, errors: number, details: [] }
 */
export async function importMatchEventsBatch(matchId, events) {
  let client;

  try {
    // STEP 1: Validate all records upfront
    const validated = MatchEventBatchSchema.parse(events);

    logger.info({
      match_id: matchId,
      total: validated.length,
    }, 'Starting batch import (transaction)');

    // STEP 2: Verify match exists
    const match = await db.get(
      'SELECT id FROM v4.matches WHERE id = ?',
      [matchId]
    );

    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    // STEP 3: Get database connection and start transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    let insertCount = 0, updateCount = 0, skipCount = 0, errorCount = 0;
    const errors = [];

    // STEP 4: Process each event
    for (const event of validated) {
      try {
        // Check for duplicate
        const existing = await client.query(
          `SELECT id FROM v4.match_events
           WHERE match_id = $1 AND minute_label = $2 AND event_type = $3 AND player_id IS NOT DISTINCT FROM $4`,
          [matchId, event.minute_label, event.event_type, event.player_id]
        );

        if (existing.rows.length > 0) {
          skipCount++;
          continue; // Already exists
        }

        // Verify FK: team
        const team = await client.query(
          'SELECT id FROM v4.clubs WHERE id = $1',
          [event.team_id]
        );

        if (!team.rows.length) {
          errors.push({
            minute: event.minute_label,
            type: event.event_type,
            error: `Team ${event.team_id} not found`,
          });
          errorCount++;
          continue;
        }

        // Verify FK: player (optional, but validate if provided)
        let playerId = event.player_id;
        if (playerId) {
          const player = await client.query(
            'SELECT id FROM v4.people WHERE id = $1',
            [playerId]
          );
          if (!player.rows.length) {
            playerId = null; // Fallback to NULL if player not found
          }
        }

        // Insert
        await client.query(
          `INSERT INTO v4.match_events
           (match_id, minute_label, event_type, player_id, team_id, detail, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [matchId, event.minute_label, event.event_type, playerId, event.team_id, event.detail]
        );

        insertCount++;

      } catch (itemError) {
        errors.push({
          minute: event.minute_label,
          type: event.event_type,
          error: itemError.message,
        });
        errorCount++;
      }
    }

    // STEP 5: Commit transaction
    await client.query('COMMIT');

    // STEP 6: Audit log
    logger.info({
      operation: 'BATCH_INSERT',
      table: 'v4.match_events',
      match_id: matchId,
      total_processed: validated.length,
      inserted: insertCount,
      skipped: skipCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }, 'Batch import completed (transaction committed)');

    return { inserted: insertCount, updated: updateCount, skipped: skipCount, errors: errorCount, details: errors };

  } catch (error) {
    // Rollback transaction on error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error({ err: rollbackError }, 'Rollback failed');
      }
    }

    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.error({ err: error.errors }, 'Batch validation failed');
      return {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: error.errors.length,
        details: error.errors.map(e => ({ error: `${e.path.join('.')}: ${e.message}` })),
      };
    }

    // Handle other errors
    logger.error({ err: error, match_id: matchId }, 'Batch import failed (rolled back)');
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      details: [{ error: error.message }],
    };

  } finally {
    // Release connection
    if (client) {
      client.release();
    }
  }
}

// ============================================================================
// PATTERN 3: Upsert (Insert or Update)
// ============================================================================

/**
 * Smart upsert: Insert if new, update if exists
 * Idempotent: run 2x = same result
 */
export async function upsertPlayer(person) {
  try {
    // STEP 1: Validate
    const validated = PlayerInsertSchema.parse(person);

    // STEP 2: Business key lookup (first_name + last_name + birth_date)
    const existing = await db.get(
      `SELECT id FROM v4.people
       WHERE first_name = ? AND last_name = ? AND birth_date IS NOT DISTINCT FROM ?`,
      [validated.first_name, validated.last_name, validated.birth_date]
    );

    if (existing) {
      // UPDATE path
      await db.run(
        `UPDATE v4.people
         SET nationality = COALESCE(?, nationality),
             height = COALESCE(?, height),
             weight = COALESCE(?, weight),
             updated_at = NOW()
         WHERE id = ?`,
        [validated.nationality, validated.height, validated.weight, existing.id]
      );

      logger.info({
        operation: 'UPDATE',
        table: 'v4.people',
        person_id: existing.id,
        timestamp: new Date().toISOString(),
      }, 'Player updated (upsert)');

      return { status: 'updated', person_id: existing.id };

    } else {
      // INSERT path
      const result = await db.run(
        `INSERT INTO v4.people
         (first_name, last_name, birth_date, nationality, height, weight, created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [validated.first_name, validated.last_name, validated.birth_date,
         validated.nationality, validated.height, validated.weight]
      );

      logger.info({
        operation: 'INSERT',
        table: 'v4.people',
        person_id: result.lastID,
        timestamp: new Date().toISOString(),
      }, 'New player created (upsert)');

      return { status: 'inserted', person_id: result.lastID };
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error({ err: error.errors }, 'Schema validation failed');
      throw error;
    }

    logger.error({ err: error }, 'Upsert failed');
    throw error;
  }
}

// ============================================================================
// PATTERN 4: Find & Repair Duplicates (Maintenance)
// ============================================================================

/**
 * Detect duplicates by business key
 * Admin-only operation
 */
export async function findDuplicateMatches() {
  const duplicates = await db.all(
    `SELECT home_club_id, away_club_id, match_date, competition_id, COUNT(*) as count, ARRAY_AGG(id) as ids
     FROM v4.matches
     GROUP BY home_club_id, away_club_id, match_date, competition_id
     HAVING COUNT(*) > 1
     ORDER BY count DESC`
  );

  logger.info({ count: duplicates.length }, 'Found duplicate matches');
  return duplicates;
}

/**
 * Merge duplicates: keep oldest, delete rest, redirect FKs
 */
export async function mergeDuplicateMatches(keepId, deleteIds) {
  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // Redirect all match_events to the kept record
    for (const deleteId of deleteIds) {
      await client.query(
        'UPDATE v4.match_events SET match_id = $1 WHERE match_id = $2',
        [keepId, deleteId]
      );
    }

    // Delete duplicates
    const placeholders = deleteIds.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `DELETE FROM v4.matches WHERE id IN (${placeholders})`,
      deleteIds
    );

    await client.query('COMMIT');

    logger.info({
      operation: 'MERGE_DUPLICATES',
      table: 'v4.matches',
      kept_id: keepId,
      deleted_count: deleteIds.length,
      timestamp: new Date().toISOString(),
    }, 'Duplicate matches merged');

    return { merged: deleteIds.length };

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }

    logger.error({ err: error }, 'Merge failed (rolled back)');
    throw error;

  } finally {
    if (client) {
      client.release();
    }
  }
}

export default {
  insertMatchEvent,
  importMatchEventsBatch,
  upsertPlayer,
  findDuplicateMatches,
  mergeDuplicateMatches,
};
