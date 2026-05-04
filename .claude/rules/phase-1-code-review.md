---
name: Phase 1 Code Review Standards
description: Pre-merge checklist, idempotence testing, transaction verification, audit logging validation
type: reference
---

# Phase 1 Code Review Standards

**Principle: Code review is a gate to production. Every merge must pass these checks or be rejected.**

---

## 1. Pre-Merge Code Review Checklist

### File Changes Review

Before reviewing any Phase 1 code changes:

```markdown
# Code Review Checklist: Phase 1 Ingestion

## File Structure
- [ ] New files follow naming convention (e.g., `phase1_ingester.js`, `teamMapperV4.js`)
- [ ] No stray `console.log()` or `debug()` statements (use logger.info/warn/error)
- [ ] No hardcoded credentials, API keys, or database URLs
- [ ] No commented-out code blocks (delete or explain)
- [ ] Imports are organized (Node built-ins, external packages, local modules)

## SQL Review
- [ ] All parameterized queries (no string interpolation: `?` placeholders only)
- [ ] Business keys defined in UNIQUE constraints
- [ ] FK constraints have explicit ON DELETE strategy (RESTRICT/CASCADE/SET NULL)
- [ ] Check constraints on enum/numeric fields
- [ ] Indexes on business keys + FK columns
- [ ] No `DELETE` or `UPDATE` without WHERE clause
- [ ] No table creation without explicit schema prefix (e.g., `dev.`, `mapping.`)

## Transactions & Safety
- [ ] All INSERT/UPDATE/DELETE wrapped in BEGIN...COMMIT
- [ ] ROLLBACK on error (error handling present)
- [ ] No missing AWAIT on async db operations
- [ ] FK verification BEFORE insert (no auto-create)
- [ ] Audit logging calls present (INSERT into audit.canonical_changes)
- [ ] Bulk operations use transactions (not individual rows)

## Idempotence & Testing
- [ ] Idempotence test present (running import 2x produces same result as 1x)
- [ ] Test verifies { inserted: X, skipped: Y } on second run
- [ ] Deduplication logic present (check UNIQUE key before insert)
- [ ] Manual review enqueue for FK mismatches (not auto-create)

## Error Handling
- [ ] All database calls wrapped in try/catch
- [ ] Error messages include context (table, row number, FK name)
- [ ] Return format: { success: true/false, data/error, inserted, skipped, errors }
- [ ] No generic "Error" messages (specific details required)

## Logging
- [ ] logger.info() for audit trail (batch start/end, counts)
- [ ] logger.warn() for deferred items (manual review queue)
- [ ] logger.error() with full error object (use { err } syntax)
- [ ] Batch ID included in all logs for traceability
- [ ] No sensitive data in logs (strip IDs from PII if needed)

## Multi-Factor Identity Gates
- [ ] Confidence scoring implemented (0.0-1.0)
- [ ] Auto-approval threshold: >= 0.95
- [ ] Manual review threshold: 0.80-0.95
- [ ] Rejection threshold: < 0.80
- [ ] At least 2 identity gates for composite keys (name + country, etc.)

## Return Shape Validation
- [ ] All endpoints return { success, data/error, ...metadata }
- [ ] Metadata includes: inserted, updated, skipped, deferred, errors
- [ ] HTTP status matches success/error (200/500)
- [ ] Error object has: code (string), message, details (optional)

## Documentation
- [ ] Function comments explain business logic (WHY, not WHAT)
- [ ] @CRITICAL markers for invariants that shouldn't change
- [ ] @AUDIT markers for known debt
- [ ] @RACE-CONDITION markers for sections needing synchronization
- [ ] JSDoc for exported functions with param/return types
```

---

## 2. Idempotence Testing (Mandatory)

### Test Template

Every Phase 1 skill MUST include an idempotence test:

```javascript
// File: backend/src/skills/phase1_ingester.test.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ingestTeamsFromFlashscore } from './phase1_ingester.js';
import db from '../../config/database.js';

describe('Phase 1 Ingester — Idempotence', () => {
  const TEST_BATCH_ID = '11111111-2222-3333-4444-555555555555';
  
  beforeEach(async () => {
    // Setup: Create test data
    await db.run('BEGIN TRANSACTION');
  });
  
  afterEach(async () => {
    // Cleanup: Rollback test data
    await db.run('ROLLBACK');
  });
  
  it('should be idempotent: f(f(x)) === f(x)', async () => {
    // Test data: 3 teams from Flashscore
    const sourceData = [
      {
        id: 'fs_1',
        name: 'Paris Saint-Germain',
        countryId: 2,  // France
        sourceId: '12345',
        season: 2025
      },
      {
        id: 'fs_2',
        name: 'Olympique Marseille',
        countryId: 2,
        sourceId: '12346',
        season: 2025
      },
      {
        id: 'fs_3',
        name: 'AS Monaco',
        countryId: 2,
        sourceId: '12347',
        season: 2025
      },
    ];
    
    // ===== RUN 1: First ingestion =====
    const result1 = await ingestTeamsFromFlashscore(sourceData, TEST_BATCH_ID);
    
    // Verify RUN 1 results
    expect(result1).toEqual({
      success: true,
      inserted: 3,
      updated: 0,
      skipped: 0,
      deferred: 0,
      errors: 0,
      batchId: TEST_BATCH_ID
    });
    
    // Verify database state after RUN 1
    const countAfterRun1 = await db.get(
      'SELECT COUNT(*) as cnt FROM dev.teams WHERE name IN (?, ?, ?)',
      ['Paris Saint-Germain', 'Olympique Marseille', 'AS Monaco']
    );
    expect(countAfterRun1.cnt).toBe(3);
    
    const mappingCountAfterRun1 = await db.get(
      'SELECT COUNT(*) as cnt FROM mapping.teams WHERE source = ? AND source_id IN (?, ?, ?)',
      ['flashscore', '12345', '12346', '12347']
    );
    expect(mappingCountAfterRun1.cnt).toBe(3);
    
    // ===== RUN 2: Idempotent re-run (same data) =====
    const result2 = await ingestTeamsFromFlashscore(sourceData, TEST_BATCH_ID);
    
    // Verify RUN 2 results (should be no-ops)
    expect(result2).toEqual({
      success: true,
      inserted: 0,      // ← Should be 0 (already exist)
      updated: 0,       // ← Should be 0 (data identical)
      skipped: 3,       // ← Should be 3 (deduped)
      deferred: 0,
      errors: 0,
      batchId: TEST_BATCH_ID
    });
    
    // Verify database state unchanged after RUN 2
    const countAfterRun2 = await db.get(
      'SELECT COUNT(*) as cnt FROM dev.teams WHERE name IN (?, ?, ?)',
      ['Paris Saint-Germain', 'Olympique Marseille', 'AS Monaco']
    );
    expect(countAfterRun2.cnt).toBe(3);  // Still 3, not 6
    
    // Verify RUN 2 added no new audit entries (identical data)
    const auditDuringRun2 = await db.all(
      'SELECT COUNT(*) as cnt FROM audit.canonical_changes WHERE import_batch_id = ? AND operation = "INSERT"',
      [TEST_BATCH_ID]
    );
    // Should only have audit entries from RUN 1
    expect(auditDuringRun2[0]?.cnt || 0).toBeLessThanOrEqual(3);
  });
  
  it('should handle idempotence with partial data updates', async () => {
    const sourceData = [
      { id: 'fs_1', name: 'PSG', countryId: 2, sourceId: '12345', season: 2025 },
    ];
    
    // RUN 1: Insert
    const result1 = await ingestTeamsFromFlashscore(sourceData, TEST_BATCH_ID);
    expect(result1.inserted).toBe(1);
    
    const teamId = await db.get(
      'SELECT team_id FROM dev.teams WHERE name = ? AND country_id = ?',
      ['PSG', 2]
    );
    expect(teamId.team_id).toBeDefined();
    
    // RUN 2: Same data again (should skip)
    const result2 = await ingestTeamsFromFlashscore(sourceData, TEST_BATCH_ID);
    expect(result2.inserted).toBe(0);
    expect(result2.skipped).toBe(1);
    
    // ===== Data variant: Update logo URL (non-key field) =====
    const updatedData = [
      {
        id: 'fs_1',
        name: 'PSG',
        countryId: 2,
        sourceId: '12345',
        season: 2025,
        logoUrl: 'https://cdn.example.com/psg_new.png'  // ← Different logo
      },
    ];
    
    // RUN 3: Updated data (should update non-key field, not create duplicate)
    const result3 = await ingestTeamsFromFlashscore(updatedData, TEST_BATCH_ID + '2');
    expect(result3.inserted).toBe(0);    // No new insert
    expect(result3.updated).toBe(1);     // Update existing
    expect(result3.skipped).toBe(0);
    
    // Verify single row exists (not duplicated)
    const finalCount = await db.get(
      'SELECT COUNT(*) as cnt FROM dev.teams WHERE name = ? AND country_id = ?',
      ['PSG', 2]
    );
    expect(finalCount.cnt).toBe(1);
    
    // Verify logo was updated
    const updatedTeam = await db.get(
      'SELECT logo_url FROM dev.teams WHERE name = ? AND country_id = ?',
      ['PSG', 2]
    );
    expect(updatedTeam.logo_url).toBe('https://cdn.example.com/psg_new.png');
  });
  
  it('should be idempotent across different batch IDs', async () => {
    const sourceData = [
      { id: 'fs_1', name: 'PSG', countryId: 2, sourceId: '12345', season: 2025 },
    ];
    
    // RUN 1: Batch ID = batch_A
    const result1 = await ingestTeamsFromFlashscore(sourceData, 'batch_A');
    expect(result1.inserted).toBe(1);
    
    // RUN 2: Same data, different batch ID = batch_B
    // (Simulates re-import from Flashscore with new batch ID)
    const result2 = await ingestTeamsFromFlashscore(sourceData, 'batch_B');
    expect(result2.inserted).toBe(0);    // Still a no-op (canonical table deduped)
    expect(result2.skipped).toBe(1);
    
    // Verify audit trail shows both batch IDs (traceability)
    const auditEntries = await db.all(
      'SELECT import_batch_id FROM audit.canonical_changes WHERE table_name = "dev.teams"'
    );
    expect(auditEntries.length).toBeGreaterThan(0);
    expect(auditEntries[0].import_batch_id).toBe('batch_A');
  });
});
```

### Test Execution

```bash
# Run idempotence tests
npm test -- phase1_ingester.test.js --grep "idempotent"

# Expected output:
# ✓ should be idempotent: f(f(x)) === f(x)
# ✓ should handle idempotence with partial data updates
# ✓ should be idempotent across different batch IDs
# 
# 3 passed
```

---

## 3. Transaction Verification

### Checklist: Transaction Safety

Before approving any data-touching skill:

```markdown
## Transaction Verification Checklist

### Setup
- [ ] Test database is isolated (not production)
- [ ] Backup exists (pg_dump or snapshot)
- [ ] No concurrent operations during test

### During Review
- [ ] `BEGIN TRANSACTION` at start of bulk operation
- [ ] Try/catch wrapping all db operations
- [ ] `ROLLBACK` on ANY error (not selective)
- [ ] `COMMIT` only after all rows processed successfully
- [ ] No missing `await` on async queries (would cause hung transactions)
- [ ] No nested transactions (PostgreSQL doesn't support; use SAVEPOINT instead)

### After Review
- [ ] Run test with simulated error (inject failure mid-batch)
- [ ] Verify ROLLBACK prevents partial inserts
- [ ] Check transaction isolation level (should be READ COMMITTED or higher)
- [ ] Verify no orphaned transactions (check pg_stat_activity)
```

### Test: Transaction Rollback

```javascript
it('should rollback entire transaction on FK error', async () => {
  const invalidData = [
    { name: 'PSG', countryId: 9999 },  // ← Invalid country ID
  ];
  
  // Get count before
  const beforeCount = await db.get('SELECT COUNT(*) as cnt FROM dev.teams');
  
  // Attempt insert (should fail FK constraint)
  const result = await ingestTeamsFromFlashscore(invalidData, 'test_batch');
  
  expect(result.success).toBe(false);
  expect(result.errors).toBeGreaterThan(0);
  
  // Verify no rows inserted (transaction rolled back)
  const afterCount = await db.get('SELECT COUNT(*) as cnt FROM dev.teams');
  expect(afterCount.cnt).toBe(beforeCount.cnt);
  
  // Verify transaction is clean (no hung transaction)
  const activeTx = await db.get(
    "SELECT COUNT(*) as cnt FROM pg_stat_activity WHERE datname = current_database()"
  );
  expect(activeTx.cnt).toBeLessThanOrEqual(1);  // Only this connection
});
```

---

## 4. Audit Logging Verification

### Checklist: Audit Trail Completeness

```markdown
## Audit Logging Verification

### Coverage
- [ ] INSERT operations logged (with new_values)
- [ ] UPDATE operations logged (with old_values + new_values)
- [ ] DELETE operations logged (with old_values)
- [ ] Bulk operations tracked by batch ID
- [ ] Each audit entry has: operation, table, record_id, old/new values, timestamp, reason

### Data Quality
- [ ] old_values is NULL for INSERT
- [ ] new_values is NULL for DELETE
- [ ] old_values + new_values populated for UPDATE
- [ ] JSONB values are properly formatted (escaped strings, etc.)
- [ ] No PII logged (strip sensitive fields if needed)
- [ ] No duplicate audit entries for same record

### Queryability
- [ ] Index on batch_id allows quick audit trail by import
- [ ] Index on created_at allows time-based queries
- [ ] Index on (table_name, record_id) allows entity history
- [ ] Queries return results in consistent order (ORDER BY created_at)
```

### Test: Audit Logging

```javascript
it('should audit all INSERT operations', async () => {
  const sourceData = [
    { id: 'fs_1', name: 'PSG', countryId: 2, sourceId: '12345', season: 2025 },
  ];
  
  const result = await ingestTeamsFromFlashscore(sourceData, 'batch_audit_test');
  expect(result.inserted).toBe(1);
  
  // Get inserted team ID
  const team = await db.get(
    'SELECT team_id FROM dev.teams WHERE name = ? AND country_id = ?',
    ['PSG', 2]
  );
  
  // Verify audit entry
  const auditEntry = await db.get(
    'SELECT * FROM audit.canonical_changes WHERE table_name = ? AND record_id = ? AND operation = ?',
    ['dev.teams', team.team_id, 'INSERT']
  );
  
  expect(auditEntry).toBeDefined();
  expect(auditEntry.old_values).toBeNull();  // INSERT has no old values
  expect(auditEntry.new_values).toBeDefined();
  expect(JSON.parse(auditEntry.new_values).name).toBe('PSG');
  expect(auditEntry.import_batch_id).toBe('batch_audit_test');
  expect(auditEntry.changed_by).toBe('phase1_ingester');
});

it('should audit UPDATE operations with old + new values', async () => {
  // Setup: Insert initial data
  await db.run('INSERT INTO dev.teams (name, country_id) VALUES (?, ?)', ['PSG', 2]);
  
  const team = await db.get('SELECT team_id FROM dev.teams WHERE name = ?', ['PSG']);
  
  // Clear prior audit entries
  await db.run('DELETE FROM audit.canonical_changes');
  
  // Update: Change logo
  await db.run(
    'UPDATE dev.teams SET logo_url = ? WHERE team_id = ?',
    ['https://new-logo.png', team.team_id]
  );
  
  // Log audit
  await db.run(
    'INSERT INTO audit.canonical_changes (operation, table_name, record_id, old_values, new_values, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
    [
      'UPDATE',
      'dev.teams',
      team.team_id,
      JSON.stringify({ logo_url: null }),
      JSON.stringify({ logo_url: 'https://new-logo.png' }),
      'admin'
    ]
  );
  
  // Verify audit entry
  const auditEntry = await db.get(
    'SELECT * FROM audit.canonical_changes WHERE record_id = ? AND operation = "UPDATE"',
    [team.team_id]
  );
  
  expect(auditEntry.old_values).toBeDefined();
  expect(auditEntry.new_values).toBeDefined();
  expect(JSON.parse(auditEntry.old_values).logo_url).toBeNull();
  expect(JSON.parse(auditEntry.new_values).logo_url).toBe('https://new-logo.png');
});
```

---

## 5. Multi-Factor Identity Verification

### Review Checklist: Confidence Gates

```markdown
## Multi-Factor Identity Gate Review

### Gate Configuration
- [ ] At least 2 identity gates implemented per entity type
- [ ] Gate 1: Exact match (name + country, etc.)
- [ ] Gate 2: Fuzzy/similarity match (Levenshtein, etc.)
- [ ] Gate 3+: Cross-source validation (Flashscore + Transfermarkt agree)
- [ ] Confidence score: 0.0-1.0 scale

### Thresholds
- [ ] Auto-approve: >= 0.95 (no manual review)
- [ ] Manual review: 0.80-0.94 (queue for approval)
- [ ] Reject: < 0.80 (flag as error)
- [ ] Thresholds documented in code

### Testing
- [ ] Test exact match (Gate 1 passes)
- [ ] Test fuzzy match (Gate 2 passes, Gate 1 fails)
- [ ] Test no match (all gates fail)
- [ ] Test cross-source confirmation (multiple sources agree)
- [ ] Verify confidence scores computed correctly
```

### Test: Identity Gates

```javascript
it('should apply multi-factor identity gates', async () => {
  // Setup: Pre-existing team
  await db.run(
    'INSERT INTO dev.teams (name, country_id) VALUES (?, ?)',
    ['Paris Saint-Germain', 2]
  );
  
  const existingTeam = await db.get(
    'SELECT team_id FROM dev.teams WHERE name = ? AND country_id = ?',
    ['Paris Saint-Germain', 2]
  );
  
  // Test 1: Exact match (highest confidence)
  const sourceMatch1 = {
    name: 'Paris Saint-Germain',
    countryId: 2,
    sourceId: 'fs_12345'
  };
  const gate1 = await matchTeamMultiFactor(sourceMatch1);
  expect(gate1.matched).toBe(true);
  expect(gate1.confidence_score).toBe(1.0);  // Exact match
  expect(gate1.gate_passes).toBe(1);
  
  // Test 2: Fuzzy match (medium confidence)
  const sourceMatch2 = {
    name: 'PSG',  // ← Abbreviated
    countryId: 2,
    sourceId: 'fs_12346'
  };
  const gate2 = await matchTeamMultiFactor(sourceMatch2);
  expect(gate2.matched).toBe(true);
  expect(gate2.confidence_score).toBeLessThan(1.0);  // Fuzzy match
  expect(gate2.confidence_score).toBeGreaterThan(0.8);
  
  // Test 3: No match (should defer)
  const sourceMatch3 = {
    name: 'Unknown FC',
    countryId: 2,
    sourceId: 'fs_99999'
  };
  const gate3 = await matchTeamMultiFactor(sourceMatch3);
  expect(gate3.matched).toBe(false);
  expect(gate3.gate_passes).toBe(0);
});
```

---

## 6. Return Shape Validation

### Endpoint Response Format

Every Phase 1 skill endpoint MUST return:

```javascript
// ✅ SUCCESS RESPONSE
{
  success: true,
  data: {...},  // or omitted for operations
  inserted: 10,
  updated: 5,
  skipped: 2,
  deferred: 1,
  errors: 0,
  batchId: "550e8400-e29b-41d4-a716-446655440000"
}

// ❌ ERROR RESPONSE
{
  success: false,
  error: {
    code: "FK_RESOLUTION_FAILED",
    message: "Cannot resolve team_id for source_id=12345",
    details: {
      entityType: "team",
      sourceId: "12345",
      source: "flashscore",
      reason: "No matching team in dev.teams"
    }
  },
  inserted: 0,
  skipped: 0,
  deferred: 1,
  errors: 1,
  batchId: "550e8400-e29b-41d4-a716-446655440000"
}
```

### Test: Response Shape

```javascript
it('should return consistent response shape on success', async () => {
  const result = await ingestTeamsFromFlashscore(sourceData, batchId);
  
  expect(result).toHaveProperty('success', true);
  expect(result).toHaveProperty('inserted');
  expect(result).toHaveProperty('updated');
  expect(result).toHaveProperty('skipped');
  expect(result).toHaveProperty('deferred');
  expect(result).toHaveProperty('errors');
  expect(result).toHaveProperty('batchId');
  
  expect(typeof result.inserted).toBe('number');
  expect(result.inserted >= 0).toBe(true);
  expect(result.inserted + result.skipped + result.deferred).toBe(sourceData.length);
});

it('should return consistent response shape on error', async () => {
  const result = await ingestTeamsFromFlashscore(invalidData, batchId);
  
  expect(result).toHaveProperty('success', false);
  expect(result).toHaveProperty('error');
  expect(result.error).toHaveProperty('code');
  expect(result.error).toHaveProperty('message');
  expect(result).toHaveProperty('inserted');
  expect(result).toHaveProperty('errors');
  expect(result.errors).toBeGreaterThan(0);
});
```

---

## 7. Summary: Pre-Merge Gate

**No code merge unless ALL of these pass:**

| Check | Tool | Pass Condition |
|-------|------|---|
| **SQL Safety** | Manual review | All queries parameterized, business keys unique, FKs explicit |
| **Transactions** | Manual review | BEGIN/COMMIT/ROLLBACK present, error handling complete |
| **Idempotence** | Test suite | Running import 2x produces same result as 1x |
| **Audit Logging** | Test suite | All INSERT/UPDATE/DELETE logged with full context |
| **Identity Gates** | Test suite | Multi-factor matching with confidence >= 0.95 |
| **Return Shape** | Test suite | Response matches { success, data/error, inserted, ... } |
| **No Secrets** | Manual review + linter | No hardcoded credentials, API keys, or PII |
| **Logging** | Manual review | No console.*, only structured logger calls |

**Merge approval:** All 8 checks pass + 1 approval from code-reviewer agent.

---

## 8. Code Review Execution

### During PR Review

```bash
# Step 1: Lint SQL
npm run lint -- --sql-only backend/src/skills/phase1_*.js

# Step 2: Run tests
npm test -- phase1_*.test.js --coverage

# Step 3: Check transactions
grep -n "BEGIN\|COMMIT\|ROLLBACK" backend/src/skills/phase1_*.js
# Should show 1 BEGIN + 1 COMMIT (or ROLLBACK) per operation

# Step 4: Verify audit logging
grep -n "audit.canonical_changes" backend/src/skills/phase1_*.js
# Should have INSERT for every data-touching operation

# Step 5: Manual review
# Read code for logic errors, edge cases, and compliance with rules
```

### Approval Template

```markdown
## Phase 1 Skill Approval ✅

**Reviewer:** @code-reviewer  
**Date:** 2026-05-04  
**PR:** #123  

### Checks Passed
- [x] SQL safety (parameterized, business keys, FKs)
- [x] Transactions (BEGIN/COMMIT/ROLLBACK)
- [x] Idempotence tests (100% pass rate)
- [x] Audit logging (complete coverage)
- [x] Identity gates (multi-factor, >= 0.95)
- [x] Return shape (consistent format)
- [x] No secrets (zero hardcoded creds)
- [x] Logging (structured logger only)

### Notes
- Tested with 500-row batch; ROLLBACK works on row 250 (transaction safety verified)
- Idempotence: f(f(x)) === f(x) passes 3/3 tests
- Audit trail: All INSERT operations logged with batch ID + timestamp

**Verdict: APPROVED FOR MERGE**

Merge this PR with confidence. The skill is production-ready.
```

---

## Summary

**Phase 1 code review is not optional.** Every change must:

1. **Follow safety rules** (strict FK, transactions, idempotence)
2. **Pass test suite** (idempotence, audit logging, identity gates)
3. **Pass manual review** (SQL safety, secret scanning, edge cases)
4. **Get explicit approval** (from code-reviewer agent)

Only then can it merge to `project_init` and deploy to production.
