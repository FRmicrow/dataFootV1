# Data Ingestion Cookbook — Surgical Database Patterns

Quick reference guide with copy-paste patterns for safe data ingestion.

## Before You Start

**Read this first:**
- `.claude/rules/data-ingestion-standards.md` — Full reference with theory + anti-patterns
- `.claude/CLAUDE.md` — Hard rules section "Data Ingestion Standards"

**Example implementations:**
- `backend/src/services/v4/DataIngestionServiceV4.js` — Generic patterns (template)
- `backend/src/services/v4/FlashscoreIngestionServiceV4.js` — Real-world Flashscore example

---

## Pattern 1: Safe Single Insert (With Deduplication Check)

**Use when:** Inserting one record at a time (e.g., match event from API)

**Guarantees:** No duplicates, validated schema, audit logged

### Code Template

```javascript
import { z } from 'zod';
import db from '../config/database.js';
import logger from '../utils/logger.js';

// 1. Define schema
const MyRecordSchema = z.object({
  name: z.string().min(1),
  external_id: z.string().uuid(),
  value: z.number().optional(),
});

// 2. Implement safe insert
export async function safeInsert(data) {
  try {
    // Step 1: Validate
    const validated = MyRecordSchema.parse(data);

    // Step 2: Check for duplicate (business key)
    const existing = await db.get(
      'SELECT id FROM my_table WHERE external_id = ?',
      [validated.external_id]
    );

    if (existing) {
      logger.warn({ external_id: validated.external_id }, 'Duplicate detected');
      return { inserted: false, duplicate: true, id: existing.id };
    }

    // Step 3: Verify FKs exist
    const parent = await db.get(
      'SELECT id FROM parent_table WHERE id = ?',
      [validated.parent_id]
    );

    if (!parent) {
      throw new Error('Parent not found');
    }

    // Step 4: Insert
    const result = await db.run(
      'INSERT INTO my_table (external_id, name, value, created_at) VALUES (?, ?, ?, NOW())',
      [validated.external_id, validated.name, validated.value]
    );

    // Step 5: Log
    logger.info({
      table: 'my_table',
      record_id: result.lastID,
      external_id: validated.external_id,
    }, 'Record inserted');

    return { inserted: true, id: result.lastID };

  } catch (error) {
    logger.error({ err: error }, 'Insert failed');
    throw error;
  }
}
```

**Test it:**
```javascript
// First call → inserts
await safeInsert({ name: 'Test', external_id: '123e4567-e89b-12d3-a456-426614174000' });

// Second call with same ID → skipped (idempotent)
await safeInsert({ name: 'Test', external_id: '123e4567-e89b-12d3-a456-426614174000' });
// Returns: { inserted: false, duplicate: true, id: 1 }
```

---

## Pattern 2: Bulk Insert with Transaction (All-or-Nothing)

**Use when:** Importing 10+ records and need atomic guarantee (all succeed or all rollback)

**Guarantees:** ACID compliance, rollback on error, no partial state

### Code Template

```javascript
export async function bulkInsert(records) {
  let client;

  try {
    // Step 1: Validate all records upfront
    const validated = z.array(MyRecordSchema).parse(records);

    // Step 2: Get connection + start transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    let insertCount = 0, skipCount = 0, errorCount = 0;
    const errors = [];

    // Step 3: Process each record
    for (const record of validated) {
      try {
        // Check duplicate
        const existing = await client.query(
          'SELECT id FROM my_table WHERE external_id = $1',
          [record.external_id]
        );

        if (existing.rows.length > 0) {
          skipCount++;
          continue;
        }

        // Verify FK
        const parent = await client.query(
          'SELECT id FROM parent_table WHERE id = $1',
          [record.parent_id]
        );

        if (!parent.rows.length) {
          errors.push({ external_id: record.external_id, error: 'Parent not found' });
          errorCount++;
          continue;
        }

        // Insert
        await client.query(
          'INSERT INTO my_table (external_id, name, value, created_at) VALUES ($1, $2, $3, NOW())',
          [record.external_id, record.name, record.value]
        );

        insertCount++;

      } catch (itemError) {
        errors.push({ external_id: record.external_id, error: itemError.message });
        errorCount++;
      }
    }

    // Step 4: Commit
    await client.query('COMMIT');

    logger.info({
      total: records.length,
      inserted: insertCount,
      skipped: skipCount,
      errors: errorCount,
    }, 'Bulk insert completed');

    return { inserted: insertCount, skipped: skipCount, errors: errorCount, details: errors };

  } catch (error) {
    // Rollback on any error
    if (client) {
      await client.query('ROLLBACK');
    }

    logger.error({ err: error }, 'Bulk insert failed (rolled back)');
    return { inserted: 0, skipped: 0, errors: records.length, details: [{ error: error.message }] };

  } finally {
    if (client) {
      client.release();
    }
  }
}
```

**Test it:**
```javascript
const records = [
  { name: 'A', external_id: '123e...' },
  { name: 'B', external_id: '456e...' },
  { name: 'C', external_id: '789e...' },  // This one has invalid parent_id
];

const result = await bulkInsert(records);
console.log(result);
// { inserted: 2, skipped: 0, errors: 1, details: [{ error: 'Parent not found' }] }

// After fix, call again
const result2 = await bulkInsert([{ name: 'C', external_id: '789e...', parent_id: 'valid-id' }]);
// { inserted: 1, skipped: 0, errors: 0, details: [] }
```

---

## Pattern 3: Upsert (Insert or Update)

**Use when:** Same data imported 2x should merge (update) not duplicate

**Guarantees:** Idempotent (run 10x = same result as 1x)

### Code Template

```javascript
export async function upsertRecord(data) {
  try {
    // Step 1: Validate
    const validated = MyRecordSchema.parse(data);

    // Step 2: Business key lookup
    const existing = await db.get(
      'SELECT id FROM my_table WHERE business_key_field = ?',
      [validated.business_key_field]
    );

    if (existing) {
      // UPDATE path
      await db.run(
        'UPDATE my_table SET name = ?, value = ?, updated_at = NOW() WHERE id = ?',
        [validated.name, validated.value, existing.id]
      );

      logger.info({ id: existing.id }, 'Record updated');
      return { status: 'updated', id: existing.id };

    } else {
      // INSERT path
      const result = await db.run(
        'INSERT INTO my_table (business_key_field, name, value, created_at) VALUES (?, ?, ?, NOW())',
        [validated.business_key_field, validated.name, validated.value]
      );

      logger.info({ id: result.lastID }, 'Record created');
      return { status: 'inserted', id: result.lastID };
    }

  } catch (error) {
    logger.error({ err: error }, 'Upsert failed');
    throw error;
  }
}
```

**Test it:**
```javascript
// First call → inserts
await upsertRecord({ business_key_field: 'unique-key', name: 'Original', value: 10 });
// { status: 'inserted', id: 1 }

// Second call with same business key → updates
await upsertRecord({ business_key_field: 'unique-key', name: 'Updated', value: 20 });
// { status: 'updated', id: 1 }

// Check database → only one record, value = 20
```

---

## Pattern 4: FK Resolution (Matching External Names to DB IDs)

**Use when:** External data has names (Flashscore: "Haaland") but need person_id

**Challenge:** Names are often abbreviated, misspelled, or missing

### Code Template

```javascript
async function resolvePlayerByName(externalName) {
  if (!externalName) return null;

  // Strategy 1: Exact match
  let player = await db.get(
    'SELECT id FROM v4.people WHERE CONCAT(first_name, \' \', last_name) ILIKE ?',
    [`%${externalName}%`]
  );

  if (player) return player.id;

  // Strategy 2: Abbreviated (e.g., "Haaland E." → Erling Haaland)
  const match = externalName.match(/^(.+)\s+([A-Z])\.?$/);
  if (match) {
    const [, lastName, initial] = match;
    player = await db.get(
      'SELECT id FROM v4.people WHERE last_name ILIKE ? AND first_name LIKE ?',
      [lastName, `${initial}%`]
    );

    if (player) return player.id;
  }

  // Strategy 3: Last name only
  player = await db.get(
    'SELECT id FROM v4.people WHERE last_name ILIKE ?',
    [externalName]
  );

  if (player) return player.id;

  // Not found → NULL (handle gracefully)
  logger.debug({ player_name: externalName }, 'Player not resolved');
  return null;
}
```

**Test it:**
```javascript
await resolvePlayerByName('Erling Haaland');     // → person_id (exact)
await resolvePlayerByName('Haaland E.');         // → person_id (abbrev)
await resolvePlayerByName('Haaland');            // → person_id (last name)
await resolvePlayerByName('UnknownPlayer');      // → null (graceful)
```

---

## Pattern 5: Self-Healing (Repair Idempotence Markers)

**Use when:** Import marked a record as "done" but data got deleted → need to retry

**Flashscore example:** `scraped_events_at IS NOT NULL` but `match_events` table is empty

### Code Template

```javascript
export async function repairEmptyMarkers(matchId) {
  try {
    // Check if marker is set
    const match = await db.get(
      'SELECT scraped_events_at, home_score, away_score FROM v4.matches WHERE id = ?',
      [matchId]
    );

    if (!match.scraped_events_at) {
      return { repaired: false }; // No marker, nothing to repair
    }

    // Check if actual data exists
    const eventCount = await db.get(
      'SELECT COUNT(*) as count FROM v4.match_events WHERE match_id = ?',
      [matchId]
    );

    const totalGoals = (match.home_score || 0) + (match.away_score || 0);

    // If marker set + goals exist + no events → repair
    if (totalGoals > 0 && eventCount.count === 0) {
      await db.run(
        'UPDATE v4.matches SET scraped_events_at = NULL WHERE id = ?',
        [matchId]
      );

      logger.info({
        match_id: matchId,
        goals: totalGoals,
        events_found: eventCount.count,
      }, 'Empty marker repaired');

      return { repaired: true };
    }

    return { repaired: false };

  } catch (error) {
    logger.error({ err: error }, 'Repair failed');
    throw error;
  }
}
```

---

## Pattern 6: Find & Merge Duplicates (Admin Operation)

**Use when:** Data quality check reveals duplicates → consolidate

**Scenario:** Two "Manchester City" records with different IDs

### Code Template

```javascript
// Step 1: Find duplicates
export async function findDuplicates() {
  return db.all(
    `SELECT name, country, COUNT(*) as count, ARRAY_AGG(id) as ids
     FROM v4.clubs
     GROUP BY name, country
     HAVING COUNT(*) > 1`
  );
}

// Step 2: Merge (keep oldest, delete rest)
export async function mergeDuplicates(keepId, deleteIds) {
  let client;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');

    // Redirect all FKs to keepId
    await client.query(
      'UPDATE v4.matches SET home_club_id = $1 WHERE home_club_id IN (' + 
      deleteIds.map((_, i) => `$${i + 2}`).join(',') + ')',
      [keepId, ...deleteIds]
    );

    // Delete duplicates
    const placeholders = deleteIds.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `DELETE FROM v4.clubs WHERE id IN (${placeholders})`,
      deleteIds
    );

    await client.query('COMMIT');

    logger.info({
      kept_id: keepId,
      deleted: deleteIds.length,
    }, 'Duplicates merged');

    return { merged: deleteIds.length };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

**Use it:**
```bash
# Find duplicates
const dupes = await findDuplicates();
// [
//   { name: 'Manchester City', country: 'England', count: 2, ids: ['uuid1', 'uuid2'] }
// ]

# Merge (keep uuid1, delete uuid2)
await mergeDuplicates('uuid1', ['uuid2']);
```

---

## Checklist: Before Importing Data

- [ ] **Schema Validation:** Zod schema defined + validated before DB touch
- [ ] **Business Key:** Identified unique constraint (e.g., `name + country` for leagues)
- [ ] **Deduplication:** Check for existing record before INSERT
- [ ] **FK Verification:** Verify parent records exist before linking
- [ ] **Transactions:** Bulk ops in `BEGIN...COMMIT` block with ROLLBACK on error
- [ ] **Idempotence:** Test: run import 2x, verify same result
- [ ] **Audit Logging:** Every insert/update logged with timestamp + context
- [ ] **Error Handling:** Graceful handling of missing data (NULL vs error)
- [ ] **Summary Report:** Return `{ inserted: X, updated: Y, skipped: Z, errors: 0 }`

---

## Common Mistakes

### ❌ No Deduplication Check
```js
// WRONG: Will create duplicates if run 2x
db.run('INSERT INTO leagues (name, country) VALUES (?, ?)', ['PL', 'England']);
```

### ✅ With Deduplication
```js
// CORRECT: Idempotent
const exists = db.get('SELECT id FROM leagues WHERE name = ? AND country = ?', ['PL', 'England']);
if (!exists) {
  db.run('INSERT INTO leagues (name, country) VALUES (?, ?)', ['PL', 'England']);
}
```

---

### ❌ String Interpolation in SQL
```js
// WRONG: SQL injection risk
db.run(`INSERT INTO matches (name) VALUES ('${name}')`);
```

### ✅ Parameterized Queries
```js
// CORRECT: Safe from injection
db.run('INSERT INTO matches (name) VALUES (?)', [name]);
```

---

### ❌ Bulk Op Without Transaction
```js
// WRONG: If error at record 500/1000, partial state left
for (const record of records) {
  db.run('INSERT INTO events (...) VALUES (...)', [...]);
}
```

### ✅ Bulk Op with Transaction
```js
// CORRECT: All succeed or all rollback
const client = await db.pool.connect();
try {
  await client.query('BEGIN');
  for (const record of records) {
    await client.query('INSERT INTO events (...) VALUES (...)', [...]);
  }
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

---

## Real-World Example: Flashscore Match Import

See: `backend/src/services/v4/FlashscoreIngestionServiceV4.js`

Demonstrates:
1. ✅ Schema validation (FlashscoreMatchSchema)
2. ✅ Business key deduplication (match_date + clubs)
3. ✅ Idempotence markers (scraped_score_at)
4. ✅ FK resolution (resolve clubs, competitions)
5. ✅ Bulk events with transaction
6. ✅ Player name resolution (multi-strategy)
7. ✅ Self-healing empty markers
8. ✅ Complete audit logging

---

## Quick Reference: Function Signatures

### Single Insert
```javascript
async function insertRecord(data): Promise<{ inserted: boolean, id?: string, error?: string }>
```

### Bulk Insert
```javascript
async function bulkInsert(records[]): Promise<{ inserted: number, skipped: number, errors: number, details: any[] }>
```

### Upsert
```javascript
async function upsertRecord(data): Promise<{ status: 'inserted' | 'updated', id: string }>
```

### Bulk Upsert
```javascript
async function bulkUpsert(records[]): Promise<{ inserted: number, updated: number, skipped: number, errors: number }>
```

### FK Resolution
```javascript
async function resolveById(externalId): Promise<string | null>
```

### Find Duplicates
```javascript
async function findDuplicates(): Promise<{ name: string, count: number, ids: string[] }[]>
```

### Merge Duplicates
```javascript
async function mergeDuplicates(keepId: string, deleteIds: string[]): Promise<{ merged: number }>
```

---

## Performance Tips

1. **Batch FK lookups:** Get all FKs in one query, cache in memory
   ```javascript
   const clubs = await db.all('SELECT id, name FROM v4.clubs'); // Cache this
   const clubMap = new Map(clubs.map(c => [c.name, c.id]));
   ```

2. **Use UPSERT clause (INSERT ... ON CONFLICT)** if PostgreSQL 9.5+
   ```sql
   INSERT INTO my_table (name, value) VALUES (?, ?)
   ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value
   ```

3. **Batch inserts:** `INSERT INTO ... VALUES (a,b), (c,d), (e,f)` instead of 3 separate queries

4. **Avoid N+1:** Don't loop `select parent for each child` — use JOIN instead

---

**Last Updated:** 2026-04-18  
**For questions:** See `.claude/rules/data-ingestion-standards.md`
