# Safe Import Workflow — How to Use the Standards

This guide shows you step-by-step how to implement a safe import endpoint using the data ingestion standards.

## Real Scenario: Import Club Players from External API

Imagine you're building an endpoint to import a club's roster:
```
POST /api/v4/admin/clubs/:clubId/import-players
Body: [ { name: "Harry Kane", position: "FWD", number: 10 }, ... ]
```

Challenge: External API has inconsistent player names. We need to:
1. Validate input
2. Match player names to existing people (or create new)
3. Link to club (without duplicates)
4. Handle partial failures (some players invalid, but continue)
5. Return summary (inserted=5, updated=2, skipped=1, errors=0)

---

## Step 1: Define Your Schema (Zod)

**File:** `backend/src/schemas/importSchemas.js`

```javascript
import { z } from 'zod';

export const ImportPlayerSchema = z.object({
  name: z.string().min(1).max(255),
  position: z.enum(['GK', 'DEF', 'MID', 'FWD']),
  number: z.number().int().min(1).max(99),
  nationality: z.string().length(2).optional(),
  birth_date: z.string().date().optional(),
});

export const ImportPlayerBatchSchema = z.array(ImportPlayerSchema);
```

---

## Step 2: Create Your Service (Safe Patterns)

**File:** `backend/src/services/v4/ClubImportServiceV4.js`

```javascript
import { z } from 'zod';
import db from '../config/database.js';
import logger from '../utils/logger.js';
import { ImportPlayerBatchSchema } from '../schemas/importSchemas.js';

export async function importClubPlayers(clubId, playersData) {
  let client;

  try {
    // STEP 1: Validate all records upfront
    const validated = ImportPlayerBatchSchema.parse(playersData);

    logger.info({
      club_id: clubId,
      player_count: validated.length,
    }, 'Starting club player import');

    // STEP 2: Verify club exists (FK check)
    const club = await db.get(
      'SELECT id FROM v4.clubs WHERE id = ?',
      [clubId]
    );

    if (!club) {
      throw new Error(`Club ${clubId} not found`);
    }

    // STEP 3: Get database connection for transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    let insertedCount = 0, updatedCount = 0, skippedCount = 0, errorCount = 0;
    const errors = [];

    // STEP 4: Process each player
    for (const player of validated) {
      try {
        // A. Try to find existing player by name (FK resolution)
        let person = await client.query(
          `SELECT id FROM v4.people
           WHERE LOWER(CONCAT(first_name, ' ', last_name)) = LOWER(?)`,
          [player.name]
        );

        let personId;

        if (person.rows.length > 0) {
          // Player exists
          personId = person.rows[0].id;
        } else {
          // Player doesn't exist → create (with parts from name)
          const [firstName, ...lastNameParts] = player.name.split(' ');
          const lastName = lastNameParts.join(' ') || firstName;

          const result = await client.query(
            `INSERT INTO v4.people 
             (first_name, last_name, nationality, birth_date, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [firstName, lastName, player.nationality, player.birth_date]
          );

          personId = result.rows[0].id; // Assuming RETURNING clause
          insertedCount++; // Count person creation
          logger.info({ name: player.name }, 'New player created');
        }

        // B. Check if player already in club (deduplication)
        const existing = await client.query(
          `SELECT id FROM v4.club_players 
           WHERE club_id = $1 AND person_id = $2`,
          [clubId, personId]
        );

        if (existing.rows.length > 0) {
          // Update: player already in club
          await client.query(
            `UPDATE v4.club_players
             SET position = $1, jersey_number = $2, updated_at = NOW()
             WHERE club_id = $3 AND person_id = $4`,
            [player.position, player.number, clubId, personId]
          );
          updatedCount++;
          logger.info({ person_id: personId }, 'Club player updated');

        } else {
          // Insert: new player-club link
          await client.query(
            `INSERT INTO v4.club_players
             (club_id, person_id, position, jersey_number, season, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [clubId, personId, player.position, player.number, new Date().getFullYear()]
          );
          insertedCount++;
          logger.info({ person_id: personId }, 'Club player linked');
        }

      } catch (itemError) {
        errors.push({
          player_name: player.name,
          error: itemError.message,
        });
        errorCount++;
        logger.warn({ err: itemError, player: player.name }, 'Player import failed');
      }
    }

    // STEP 5: Commit transaction
    await client.query('COMMIT');

    // STEP 6: Audit log
    logger.info({
      operation: 'BULK_IMPORT_PLAYERS',
      club_id: clubId,
      total_processed: validated.length,
      inserted: insertedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    }, 'Club player import completed (transaction committed)');

    return {
      success: true,
      data: {
        club_id: clubId,
        inserted: insertedCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: errorCount,
        error_details: errors,
      },
    };

  } catch (error) {
    // Rollback on error
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error({ err: rollbackError }, 'Rollback failed');
      }
    }

    // Handle validation error
    if (error instanceof z.ZodError) {
      logger.error({ err: error.errors }, 'Batch validation failed');
      return {
        success: false,
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
      };
    }

    // Handle other errors
    logger.error({ err: error, club_id: clubId }, 'Import failed (rolled back)');
    return {
      success: false,
      error: error.message,
    };

  } finally {
    if (client) {
      client.release();
    }
  }
}

export default { importClubPlayers };
```

---

## Step 3: Create Your Controller (Validate Input)

**File:** `backend/src/controllers/v4/clubImportControllerV4.js`

```javascript
import { z } from 'zod';
import { importClubPlayers } from '../../services/v4/ClubImportServiceV4.js';
import logger from '../../utils/logger.js';

export async function importPlayers(req, res) {
  try {
    const { clubId } = req.params;
    const { players } = req.body;

    // Validate route params
    if (!clubId || !z.string().uuid().safeParse(clubId).success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid club ID format',
      });
    }

    // Validate body
    if (!Array.isArray(players)) {
      return res.status(400).json({
        success: false,
        error: 'Players must be an array',
      });
    }

    // Call service
    const result = await importClubPlayers(clubId, players);

    // Return result (service already handles success/error format)
    return res.status(result.success ? 200 : 400).json(result);

  } catch (error) {
    logger.error({ err: error }, 'Import controller error');
    return res.status(500).json({
      success: false,
      error: 'Import failed',
    });
  }
}
```

---

## Step 4: Wire Up Routes

**File:** `backend/src/routes/v4/club_routes.js`

```javascript
import express from 'express';
import { importPlayers } from '../../controllers/v4/clubImportControllerV4.js';
import { requireAdminKey } from '../../middleware/requireAdminKey.js';

const router = express.Router();

// Protected endpoint (admin only)
router.post(
  '/:clubId/import-players',
  requireAdminKey,  // Security: X-Admin-Key header required
  importPlayers
);

export default router;
```

---

## Step 5: Test It (Unit Test)

**File:** `backend/src/services/v4/ClubImportServiceV4.test.js`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from './ClubImportServiceV4.js';

describe('ClubImportServiceV4', () => {
  it('imports new players successfully', async () => {
    const result = await service.importClubPlayers('club-123', [
      { name: 'Harry Kane', position: 'FWD', number: 10 },
      { name: 'Son Heung-min', position: 'MID', number: 7 },
    ]);

    expect(result.success).toBe(true);
    expect(result.data.inserted).toBeGreaterThan(0);
  });

  it('handles duplicate players (update, not insert)', async () => {
    // First import
    await service.importClubPlayers('club-123', [
      { name: 'Harry Kane', position: 'FWD', number: 10 },
    ]);

    // Second import with same player (different number)
    const result = await service.importClubPlayers('club-123', [
      { name: 'Harry Kane', position: 'FWD', number: 11 }, // Different number
    ]);

    expect(result.data.updated).toBe(1); // Updated, not inserted
    expect(result.data.inserted).toBe(0);
  });

  it('validates input schema', async () => {
    const result = await service.importClubPlayers('club-123', [
      { name: 'Valid Player', position: 'FWD', number: 10 },
      { name: 'Invalid', position: 'INVALID_POS', number: 10 }, // Bad position
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Validation error');
  });

  it('handles non-existent club gracefully', async () => {
    const result = await service.importClubPlayers('non-existent-id', [
      { name: 'Player', position: 'FWD', number: 10 },
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
```

---

## Step 6: Manual Testing (cURL)

```bash
# 1. Get a real club ID
curl -s http://localhost:3001/api/v4/clubs | jq '.[0].id'

CLUB_ID="<the-id-from-above>"

# 2. Import players
curl -X POST \
  -H "X-Admin-Key: 2a3e17d67ca8294e928854dfdd0f848e" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/v4/clubs/$CLUB_ID/import-players \
  -d '{
    "players": [
      { "name": "Harry Kane", "position": "FWD", "number": 10 },
      { "name": "Son Heung-min", "position": "MID", "number": 7 },
      { "name": "Eric Dier", "position": "DEF", "number": 15 }
    ]
  }'

# Expected response:
{
  "success": true,
  "data": {
    "club_id": "...",
    "inserted": 3,
    "updated": 0,
    "skipped": 0,
    "errors": 0,
    "error_details": []
  }
}

# 3. Run again (idempotent test)
curl -X POST ... (same request)

# Expected: inserted=0, updated=3, errors=0 (all matched, all updated)
```

---

## Step 7: Code Review Checklist

Before merging, verify:

- [ ] **Input validation:** Zod schema on all user input
- [ ] **FK verification:** Parent records exist before linking
- [ ] **Deduplication:** Check for existing before INSERT
- [ ] **Transactions:** Multi-step operations in BEGIN...COMMIT
- [ ] **Rollback:** Error handling with ROLLBACK
- [ ] **Idempotence test:** Run endpoint 2x, same result
- [ ] **Audit logging:** Every operation logged
- [ ] **Error format:** Response is `{ success, data/error }`
- [ ] **Summary:** Returns `{ inserted, updated, skipped, errors }`
- [ ] **Security:** Protected route has requireAdminKey middleware

---

## Step 8: Monitor in Production

After deployment, monitor:

```sql
-- Check logs for errors
SELECT * FROM logs WHERE operation LIKE 'BULK_IMPORT%' ORDER BY timestamp DESC LIMIT 10;

-- Verify data imported correctly
SELECT COUNT(*) FROM v4.club_players WHERE club_id = '...' AND created_at > NOW() - INTERVAL '1 day';

-- Check for duplicates (should be 0)
SELECT COUNT(*) FROM (
  SELECT club_id, person_id, COUNT(*) FROM v4.club_players
  GROUP BY club_id, person_id HAVING COUNT(*) > 1
);

-- Verify no orphaned records (FK integrity)
SELECT COUNT(*) FROM v4.club_players 
WHERE person_id NOT IN (SELECT id FROM v4.people);
```

---

## Common Patterns by Import Type

### Pattern A: Simple Insert (Leagues)
→ Use `DataIngestionServiceV4.insertMatchEvent()` pattern

### Pattern B: Bulk with Dedup (Match Events)
→ Use `DataIngestionServiceV4.importMatchEventsBatch()` pattern

### Pattern C: Upsert (Players)
→ Use `DataIngestionServiceV4.upsertPlayer()` pattern

### Pattern D: Dynamic Creation (Competitions)
→ Use `FlashscoreIngestionServiceV4.resolveCompetitionByName()` pattern

### Pattern E: Name Resolution (Flashscore Players)
→ Use `FlashscoreIngestionServiceV4.resolvePlayerByName()` pattern with multi-strategy

---

## When Something Goes Wrong

### Problem: Import failed, some data inserted
**Why:** No transaction, or ROLLBACK didn't work
**Fix:** Verify transaction scope (BEGIN at start, COMMIT/ROLLBACK at end)

### Problem: Duplicates created after 2nd import
**Why:** Missing dedup check
**Fix:** Add FK check before INSERT
```javascript
const existing = await db.get('SELECT id FROM table WHERE business_key = ?');
if (existing) return { skipped: true };
```

### Problem: Players imported but jersey numbers wrong
**Why:** Not using UPDATE for existing
**Fix:** Check existing, use UPDATE instead of INSERT
```javascript
if (existing) {
  await db.run('UPDATE ... SET jersey_number = ? WHERE id = ?', [newNumber, existing.id]);
} else {
  await db.run('INSERT ...');
}
```

### Problem: Import marked as done but data empty
**Why:** Marker set without data
**Fix:** Use self-healing repair
```javascript
if (marker_set && data_empty) {
  reset_marker();  // Allow retry
}
```

---

## Quick Reference Commands

```bash
# 1. Read standards
cat .claude/rules/data-ingestion-standards.md

# 2. Copy template
cp backend/src/services/v4/DataIngestionServiceV4.js \
   backend/src/services/v4/MyEntityImportServiceV4.js

# 3. Adapt for your entity
# - Change schema
# - Change table names
# - Change business key logic

# 4. Create controller + route

# 5. Write test

# 6. Test locally
npm test

# 7. Manual test with cURL

# 8. Code review (use checklist above)

# 9. Commit
git commit -m "feat(import): safe import for entity X"
```

---

**This workflow ensures every import is safe, verified, and reversible.**

Last Updated: 2026-04-18
