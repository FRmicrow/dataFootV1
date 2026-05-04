# The 13 Antipatterns — Prevention Guide

**Status**: CRITICAL  
**Applies to**: All data ingestion operations (Phase 1 and beyond)  
**Enforcement**: DDL constraints + middleware guards + code review checklist

---

## 1. DUPLICATES — No UNIQUE Constraints at DDL Level

### The Problem
```sql
-- ❌ WRONG: No business key constraint
CREATE TABLE teams (
  team_id SERIAL PRIMARY KEY,
  name TEXT,
  country_id INT
);

-- Result: INSERT team (name='Manchester City', country_id=1) twice
-- → Two Manchester City records with different team_ids
-- → FKs point to random one; stats duplicated
```

### Root Cause
- Business key uniqueness enforced only in application code
- Database accepts duplicates if query check is missed
- No self-healing after duplicate is inserted

### Solution in New Model
✅ **DDL defines business keys with UNIQUE constraints**:
```sql
CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id BIGINT NOT NULL,
  ...
  UNIQUE(name, country_id)  -- ← Enforced at database level
);
```

### How DDL Prevents This
- Database rejects INSERT/UPDATE that violates `UNIQUE(name, country_id)`
- Application never sees duplicate state; constraint catches it upfront
- Migration roll-forward cannot accidentally recreate duplicates

### Code Review Checklist
- [ ] Every table has a documented business key
- [ ] Business key is a UNIQUE constraint (or unique index)
- [ ] Cannot insert/update to duplicate business key
- [ ] UNIQUE constraint indexed for performance

---

## 2. External Source IDs in Canonical Tables

### The Problem
```sql
-- ❌ WRONG: Source IDs stored in canonical table
CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT,
  flashscore_id TEXT,  -- ← External ID in canonical table
  transfermarkt_id TEXT,  -- ← Another external ID
  whoscored_id TEXT
);

-- Now business logic does: SELECT * FROM dev.teams WHERE flashscore_id = '...'
-- If Flashscore reshuffles IDs, you must update canonical table
-- Multiple sources fight over "which ID is authoritative"
```

### Root Cause
- External IDs treated as first-class columns in canonical schema
- Queries go directly to external IDs, bypassing mapping layer
- Schema couples application logic to external provider APIs

### Solution in New Model
✅ **Mapping tables own all external IDs**:
```sql
-- Canonical table (dev.*)
CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id BIGINT NOT NULL,
  ... -- NO external ID columns
  UNIQUE(name, country_id)
);

-- Mapping table (mapping.*)
CREATE TABLE mapping.teams (
  mapping_id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('flashscore', 'transfermarkt', ...)),
  source_id TEXT NOT NULL,
  team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE CASCADE,
  confidence_score NUMERIC(4,3),
  ...
  UNIQUE(source, source_id)  -- ← One source ID maps to exactly one canonical team
);
```

### How Mapping Isolation Prevents This
- External IDs are ephemeral data; they can change without schema modifications
- Mapping table absorbs the change: update `(source, source_id) → new_team_id`
- All queries go through mapping: `JOIN mapping.teams ON (source, source_id) = ...`
- If source reshuffles IDs, only mapping table needs updates; canonical is untouched

### Code Review Checklist
- [ ] Canonical tables (`dev.*`) contain NO external ID columns
- [ ] All external IDs stored in `mapping.*` tables only
- [ ] FK reference from mapping → canonical is correct
- [ ] Queries resolve ID via mapping table, not direct lookup
- [ ] No `source_*` columns in canonical tables

---

## 3. Idempotence Markers Without Self-Healing

### The Problem
```sql
-- ❌ WRONG: Marker set but data may be incomplete
UPDATE dev.matches SET scraped_events_at = NOW() WHERE match_id = 123;
-- If INSERT events fails partway, marker is set but events are incomplete
-- Retry logic sees marker and skips re-scrape
-- Result: match has score but no events

-- ❌ No verification before marking done
if (import_success) {
  await db.run('UPDATE dev.matches SET scraped_events_at = ?', [now]);
  // But what if DELETE left the table empty after marker was set?
}
```

### Root Cause
- Marker is set without verifying underlying data integrity
- No mechanism to detect "marker set but data missing"
- Stale markers can't be reset; manual cleanup required

### Solution in New Model
✅ **Verify data exists BEFORE marking done**:
```js
// Phase 1: Import events
const eventCount = await importMatchEvents(matchId, events);

// Phase 2: Verify at least expected minimum
const actualCount = await db.get(
  'SELECT COUNT(*) as count FROM dev.match_events WHERE match_id = ?',
  [matchId]
);

// Phase 3: Only mark done if verified
if (actualCount.count >= expectedEventCount) {
  await db.run(
    'UPDATE audit_metadata SET scraped_events_at = ? WHERE match_id = ?',
    [now, matchId]
  );
} else {
  logger.warn({ matchId, expected: expectedEventCount, actual: actualCount.count },
    'Event count mismatch; not marking done');
  return { error: 'Incomplete event scrape' };
}

// Phase 4: Self-healing on retry
if (auditData.scraped_events_at && actualCount.count === 0) {
  logger.info({ matchId }, 'Data deleted after marker; resetting marker');
  await db.run('UPDATE audit_metadata SET scraped_events_at = NULL WHERE match_id = ?', [matchId]);
  // Retry will now scrape again
}
```

### How Self-Healing Prevents This
- Marker only set after verification (no false positives)
- Markers timestamped for debugging ("when did this complete?")
- Self-healing detects marker + missing data, resets marker for re-import
- Stale markers auto-detect and don't block re-import

### Code Review Checklist
- [ ] Before marking "done", verify data count matches expected
- [ ] Markers include timestamp (for audit trail)
- [ ] Self-healing logic detects marker + missing data
- [ ] Tests verify: mark → delete data → retry logic resets marker
- [ ] Logging captures marker state transitions

---

## 4. Partial Inserts Without Transactions

### The Problem
```js
// ❌ WRONG: Loop without transaction
const events = [...1000 events...];
let insertCount = 0;

for (const event of events) {
  try {
    await db.run(
      'INSERT INTO dev.match_events (match_id, event_order, ...) VALUES (?, ?, ...)',
      [matchId, event.order, ...]
    );
    insertCount++;
  } catch (err) {
    logger.error(err);
    // Error at event 500 → events 1-499 inserted, 500-1000 missing
    // Database is in partial state; no way to recover atomically
  }
}

return { inserted: insertCount };  // Misleading: says success, but incomplete
```

### Root Cause
- No `BEGIN...COMMIT/ROLLBACK` wrapper
- Each INSERT is independent transaction
- Error mid-import leaves database in inconsistent state
- No clear failure signal to retry logic

### Solution in New Model
✅ **Wrap all bulk ops in transactions**:
```js
export async function importMatchEventsBatch(matchId, events) {
  let client;
  try {
    // 1. Validate all upfront (before transaction)
    const validated = MatchEventBatchSchema.parse(events);

    // 2. Start transaction
    client = await db.pool.connect();
    await client.query('BEGIN');

    let insertCount = 0;
    let skipCount = 0;
    const errors = [];

    // 3. Process each event
    for (const event of validated) {
      try {
        // Check FK exists
        const match = await client.query(
          'SELECT match_id FROM dev.matches WHERE match_id = $1',
          [matchId]
        );
        if (!match.rows.length) {
          errors.push({ order: event.order, error: 'Match not found' });
          continue;
        }

        // Check duplicate
        const existing = await client.query(
          'SELECT event_id FROM dev.match_events WHERE match_id = $1 AND event_order = $2',
          [matchId, event.order]
        );
        if (existing.rows.length > 0) {
          skipCount++;
          continue;
        }

        // Insert
        await client.query(
          `INSERT INTO dev.match_events (match_id, event_order, minute_event, ...)
           VALUES ($1, $2, $3, ...)`,
          [matchId, event.order, event.minute_event, ...]
        );
        insertCount++;

      } catch (itemError) {
        errors.push({ order: event.order, error: itemError.message });
      }
    }

    // 4. Commit on success
    await client.query('COMMIT');

    logger.info({
      match_id: matchId,
      inserted: insertCount,
      skipped: skipCount,
      errors: errors.length
    }, 'Batch import committed');

    return {
      inserted: insertCount,
      skipped: skipCount,
      errors: errors.length,
      details: errors,
      rolled_back: false  // ← Clear signal of success
    };

  } catch (error) {
    // 5. Rollback on error
    if (client) {
      await client.query('ROLLBACK');
    }

    logger.error({ err: error }, 'Batch import failed (rolled back)');

    return {
      inserted: 0,
      skipped: 0,
      errors: 1,
      details: [{ error: error.message }],
      rolled_back: true  // ← Clear signal of rollback
    };

  } finally {
    if (client) {
      client.release();
    }
  }
}
```

### How Transactions Prevent This
- All-or-nothing: either all events inserted or none
- On error, ROLLBACK clears any partial work
- Retry logic sees `rolled_back: true` and knows to retry
- No inconsistent database state left behind

### Code Review Checklist
- [ ] All bulk ops (10+) wrapped in `BEGIN...COMMIT/ROLLBACK`
- [ ] Validation happens BEFORE `BEGIN` (don't waste transaction)
- [ ] Return value includes `rolled_back` flag (success/failure signal)
- [ ] Error counts in return value
- [ ] Tests verify: error at event N → all N-1 rolled back, not committed
- [ ] Logging captures commit/rollback decisively

---

## 5. FK Resolution That Auto-Creates Records

### The Problem
```js
// ❌ WRONG: Permissive mode auto-creates
async function resolveTeam(sourceId, sourceName, options) {
  const existing = await db.get(
    'SELECT team_id FROM mapping.teams WHERE source = ? AND source_id = ?',
    ['flashscore', sourceId]
  );
  if (existing) return existing.team_id;

  // If not found, auto-create (WRONG!)
  if (options?.createIfMissing ?? true) {  // Default true!
    const teamId = await db.run(
      'INSERT INTO dev.teams (name, country_id) VALUES (?, 1)',  // ← Default country!
      [sourceName]
    );
    return teamId;  // Created new team for this source ID
  }
}

// Later, another source also has sourceName (slightly misspelled)
// → resolveTeam() creates ANOTHER team instead of reusing first
// Result: "Manchester City" and "Manchester City FC" both exist
```

### Root Cause
- Auto-create enabled by default (`createIfMissing: true`)
- No secondary checks (country, league tier, active status)
- Each import job independently decides to create teams
- No audit of created vs. matched IDs

### Solution in New Model
✅ **Strict mode (no-create) by default; manual review queue for unknowns**:
```js
async function resolveTeam(source, sourceId, context = {}) {
  // 1. Exact: check mapping table
  const mapping = await db.get(
    'SELECT team_id FROM mapping.teams WHERE source = ? AND source_id = ?',
    [source, sourceId]
  );
  if (mapping) return mapping.team_id;

  // 2. Heuristic: fuzzy match with evidence
  if (context.name && context.country) {
    const candidate = await db.get(
      'SELECT team_id FROM dev.teams WHERE name ILIKE ? AND country_id = ?',
      [context.name, context.country]
    );
    if (candidate) {
      // High confidence; create mapping
      await db.run(
        'INSERT INTO mapping.teams (source, source_id, team_id, ...) VALUES (?, ?, ?, ...)',
        [source, sourceId, candidate.team_id, ...]
      );
      return candidate.team_id;
    }
  }

  // 3. Not found; add to staging for manual review (NEVER auto-create)
  const candidateId = await db.run(
    `INSERT INTO stg.mapping_candidates
     (entity_type, source, source_id, source_name, status, import_batch_id, matching_evidence)
     VALUES (?, ?, ?, ?, 'manual_review', ?, ?)`,
    [
      'team',
      source,
      sourceId,
      context.name,
      context.import_batch_id,
      JSON.stringify({ searched_for: context.name, country: context.country })
    ]
  );

  logger.warn(
    { source, sourceId, sourceName: context.name, candidateId },
    'Team not resolved; queued for manual review'
  );

  return null;  // ← Return null, don't create
}
```

### How Strict Mode Prevents This
- Default behavior: resolve or fail, never create
- Unresolved IDs isolated in `stg.mapping_candidates` (manual review queue)
- Confidence score (if heuristic matched) guides approval
- Admin must explicitly approve new creation; audit logged

### Code Review Checklist
- [ ] Strict mode is default (createIfMissing: false)
- [ ] Auto-create only with explicit authorization
- [ ] Unresolved IDs go to staging table, not auto-created
- [ ] Manual review queue has confidence score and evidence
- [ ] Logging shows exact reason for non-resolution
- [ ] Tests verify: unresolved → staging, not created

---

## 6. Schema Validation Only at App Level

### The Problem
```js
// ❌ WRONG: App validation is source of truth
const schema = z.object({
  birth_date: z.string().date(),  // "1990-05-15" format
  height: z.number().min(150).max(250)
});

const person = schema.parse({
  birth_date: "1990-05-15",
  height: 182
});

await db.run(
  'INSERT INTO dev.people (birth_date, height) VALUES (?, ?)',
  [person.birth_date, person.height]
);

// But database column is VARCHAR, not DATE
// If query bypasses Zod validation (raw SQL, direct DB access), invalid data sneaks in
// Later queries fail: "cannot cast varchar to date"
```

### Root Cause
- Constraints only in application code (Zod, TypeScript, ORM)
- Database column types don't enforce types
- Direct DB access (CLI, admin tools) bypasses app validation
- Type coercion hides schema mismatches

### Solution in New Model
✅ **Database is source of truth; constraints at SQL level**:
```sql
-- ✅ CORRECT: DDL enforces types and ranges
CREATE TABLE dev.people (
  person_id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,  -- ← SQL enforces DATE type, not VARCHAR
  height_cm SMALLINT CHECK(height_cm > 100 AND height_cm < 250 OR height_cm IS NULL),
  preferred_foot TEXT CHECK(preferred_foot IN ('left', 'right') OR preferred_foot IS NULL),
  position_code VARCHAR(3),
  person_role TEXT CHECK(person_role IN ('player', 'coach', 'referee')),
  ...
);
```

Application validation is **first line of defense**:
```js
// App-level validation still happens (catch errors early)
const PersonSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  birth_date: z.coerce.date().optional(),
  height_cm: z.number().int().min(100).max(250).optional(),
  preferred_foot: z.enum(['left', 'right']).optional(),
  position_code: z.string().length(3).optional(),
  person_role: z.enum(['player', 'coach', 'referee'])
});

const validated = PersonSchema.parse(raw);

// Insert (database will reject if validation is bypassed)
await db.run(
  `INSERT INTO dev.people (first_name, last_name, birth_date, height_cm, preferred_foot, position_code, person_role)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [validated.first_name, validated.last_name, validated.birth_date, ...]
);
```

### How DDL Prevents This
- `DATE` column rejects non-dates (e.g., "not a date" fails)
- `CHECK` constraints reject out-of-range values at INSERT time
- `NOT NULL` enforces required fields
- Direct DB access (raw SQL, CLI) inherits all constraints
- Type safety is always-on, not optional

### Code Review Checklist
- [ ] Column types match schema (TEXT ↔ string, DATE ↔ date, INT ↔ number)
- [ ] CHECK constraints for enums and ranges (no free-text columns for controlled vocabularies)
- [ ] NOT NULL on required fields
- [ ] Application validation BEFORE DB (Zod, TypeScript)
- [ ] Tests verify: invalid data rejected at DB level, not app level
- [ ] Raw SQL queries respect column types

---

## 7. Duplicate Source IDs in Import Files

### The Problem
```csv
-- ❌ WRONG: CSV has Flashscore ID assigned to multiple teams
source_id,name,country
Wtn9Stg0,Manchester City,England
Wtn9Stg0,Chester City,England
Wtn9Stg0,Lancaster City FC,Wales

-- Importer blindly creates mappings for all three
-- mapping.teams now has (source='flashscore', source_id='Wtn9Stg0') → 3 different team_ids
-- Business logic: which one is the "real" Manchester City?
```

### Root Cause
- No validation of incoming CSV for duplicate source IDs
- Importer assumes external file is clean
- No staging phase to catch errors before canonical import

### Solution in New Model
✅ **Staging → Validate → Audit → Approve → Import pipeline**:
```js
// STEP 1: Accept (raw CSV → stg table)
async function stageTeamsFromCSV(csvPath, importBatchId) {
  const records = await readCsv(csvPath);
  
  for (const row of records) {
    await db.run(
      `INSERT INTO stg.mapping_candidates
       (entity_type, source, source_id, source_name, import_batch_id, raw_row)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['team', 'flashscore', row.source_id, row.name, importBatchId, JSON.stringify(row)]
    );
  }
  
  return { staged: records.length };
}

// STEP 2: Validate (detect duplicates, conflicts, missing fields)
async function validateStagedMapping(importBatchId) {
  // Detect duplicate source IDs
  const duplicates = await db.all(
    `SELECT source, source_id, COUNT(*) as count
     FROM stg.mapping_candidates
     WHERE import_batch_id = ? AND entity_type = 'team'
     GROUP BY source, source_id
     HAVING count > 1`,
    [importBatchId]
  );

  for (const dup of duplicates) {
    logger.error(
      { source: dup.source, source_id: dup.source_id, count: dup.count },
      'Duplicate source ID in import file'
    );
    
    // Mark all but first for rejection
    await db.run(
      `UPDATE stg.mapping_candidates
       SET status = 'rejected', reject_reason = 'duplicate_source_id'
       WHERE import_batch_id = ? AND source = ? AND source_id = ?
       LIMIT ? OFFSET 1`,
      [importBatchId, dup.source, dup.source_id, dup.count - 1]
    );
  }

  return { duplicates: duplicates.length };
}

// STEP 3: Evidence collection (fetch source page, verify data)
async function collectEvidenceForCandidates(importBatchId) {
  const candidates = await db.all(
    `SELECT * FROM stg.mapping_candidates
     WHERE import_batch_id = ? AND status = 'pending'
     LIMIT 100`,
    [importBatchId]
  );

  for (const candidate of candidates) {
    const evidence = await fetchFlashscoreData(candidate.source_id);
    
    await db.run(
      `UPDATE stg.mapping_candidates
       SET matching_evidence = ?
       WHERE candidate_id = ?`,
      [JSON.stringify(evidence), candidate.candidate_id]
    );
  }

  return { candidates: candidates.length };
}

// STEP 4: Scoring (multi-factor gates, deterministic confidence)
async function scoreAndGateCandidates(importBatchId) {
  const candidates = await db.all(
    `SELECT * FROM stg.mapping_candidates
     WHERE import_batch_id = ? AND status = 'pending'`,
    [importBatchId]
  );

  for (const candidate of candidates) {
    const evidence = JSON.parse(candidate.matching_evidence);
    let confidence = 0;
    
    // Gate 1: Name similarity
    const nameSim = levenshteinSimilarity(evidence.name, candidate.source_name);
    if (nameSim < 0.7) {
      await db.run(
        'UPDATE stg.mapping_candidates SET status = ? WHERE candidate_id = ?',
        ['manual_review', candidate.candidate_id]
      );
      continue;
    }
    confidence += nameSim * 0.4;
    
    // Gate 2: Country match
    const countryMatch = evidence.country === candidate.country ? 1 : 0;
    if (!countryMatch) {
      await db.run(
        'UPDATE stg.mapping_candidates SET status = ? WHERE candidate_id = ?',
        ['manual_review', candidate.candidate_id]
      );
      continue;
    }
    confidence += countryMatch * 0.3;
    
    // Gate 3: League tier match (if available)
    const tierMatch = evidence.league_tier === candidate.league_tier ? 1 : 0;
    confidence += tierMatch * 0.3;
    
    // Update confidence and gate
    if (confidence >= 0.95) {
      await db.run(
        'UPDATE stg.mapping_candidates SET confidence_score = ?, status = ? WHERE candidate_id = ?',
        [confidence, 'approved', candidate.candidate_id]
      );
    } else {
      await db.run(
        'UPDATE stg.mapping_candidates SET confidence_score = ?, status = ? WHERE candidate_id = ?',
        [confidence, 'manual_review', candidate.candidate_id]
      );
    }
  }
}

// STEP 5: Manual review (admin approves remaining)
async function manuallyApproveCandidates(importBatchId, approvedBy) {
  // Admin reviews stg.mapping_candidates where status='manual_review'
  // and explicitly approves (UPDATE status='approved')
  // or rejects (UPDATE status='rejected', reject_reason='...')
}

// STEP 6: Move approved → canonical
async function promoteApprovedToCanonical(importBatchId) {
  const approved = await db.all(
    `SELECT * FROM stg.mapping_candidates
     WHERE import_batch_id = ? AND status = 'approved'`,
    [importBatchId]
  );

  let client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const cand of approved) {
      // Insert into canonical
      await client.query(
        `INSERT INTO mapping.teams (source, source_id, team_id, confidence_score)
         VALUES ($1, $2, $3, $4)`,
        [cand.source, cand.source_id, cand.canonical_id, cand.confidence_score]
      );
      
      // Audit log
      await client.query(
        `INSERT INTO audit.canonical_changes (operation, table_name, record_id, new_values, reason, import_batch_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['INSERT', 'mapping.teams', cand.canonical_id, JSON.stringify(cand), 'staging_promotion', importBatchId]
      );
    }
    
    await client.query('COMMIT');
    return { promoted: approved.length };
    
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### How Staging Pipeline Prevents This
- CSV never touches canonical; all data lands in staging first
- Duplicates detected at validation stage (before scoring)
- Multi-factor gates prevent low-confidence matches
- Manual review queue for edge cases
- Only explicitly approved records move to canonical
- Audit trail logs every promotion decision

### Code Review Checklist
- [ ] All imports start in staging table (`stg.mapping_candidates`)
- [ ] Duplicate source ID detection before any matching
- [ ] Multi-factor confidence gates (name + country + tier)
- [ ] Manual review queue populated for low confidence (< 95%)
- [ ] Admin approval required for promotion to canonical
- [ ] Transactions wrap the promotion step
- [ ] Audit logged for every canonical insert
- [ ] Tests verify: duplicate source ID → rejection, not canonical

---

## 8–13: Additional Antipatterns (Brief)

### 8. No Audit Trail
- **Fix**: Every INSERT/UPDATE to canonical tables logged (old/new values, timestamp, reason, batch_id)
- **Table**: `audit.canonical_changes`

### 9. Weak Name Matching (Fuzzy Only)
- **Fix**: Multi-factor gates (name + country + league_tier + active_status)
- **Implementation**: Confidence scoring with multiple independent gates

### 10. No Idempotence Tests
- **Fix**: Mandatory test per skill: `assert(import(data) === import(import(data)))`

### 11. N+1 Queries in Bulk Loops
- **Fix**: Batch FK lookup upfront; cache in memory; measure 1000 items < 5 sec

### 12. Mutable Business Keys
- **Fix**: Document immutable keys per table; use alias tables if rename needed

### 13. No Admin Controls
- **Fix**: Rate limiting, confirmation dialog, request idempotence token, audit log per admin op

---

## Summary

All 13 antipatterns are **prevented via**:
1. **DDL constraints** (UNIQUE, CHECK, FK, NOT NULL)
2. **Mapping tables** (external IDs isolated)
3. **Transactions** (all-or-nothing bulk ops)
4. **Staging pipeline** (validate before canonical)
5. **Audit logging** (operation, old/new values, timestamp)
6. **Middleware guards** (enforce constraints in code)
7. **Code review checklist** (pre-merge verification)

**Every change to dev.* tables MUST:**
- ✅ Respect all UNIQUE constraints
- ✅ Verify FK references exist
- ✅ Wrap bulk ops in transactions
- ✅ Log old/new values to audit table
- ✅ Pass idempotence test (run 2× = run 1×)
- ✅ Include test case for rollback scenario
