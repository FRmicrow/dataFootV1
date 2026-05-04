---
name: Phase 1 Data Safety Rules
description: Strict FK resolution, transactional safety, idempotence guarantees, multi-factor identity gates
type: reference
---

# Phase 1 Data Safety Rules

**Principle: No risky intervention allowed without explicit safeguards. Data integrity > Speed.**

---

## 1. Strict Foreign Key Resolution (No Auto-Create)

### Core Rule

**FORBIDDEN: Auto-creating parent records to satisfy FK constraints.**

When inserting a child record (e.g., a match), verify the parent (e.g., competition, teams) EXISTS BEFORE insertion. If parent doesn't exist, **STOP and enqueue for manual review**, not auto-create.

Why: Auto-creation masks data quality issues. Example: Flashscore sends "Ligue 1 (typo)" — auto-create would create a phantom competition instead of mapping to "Ligue 1".

### Implementation Pattern

```javascript
// ❌ BAD: Auto-creating parent record
async function insertMatch(sourceMatch) {
  let competitionId = await db.get(
    'SELECT competition_id FROM mapping.competitions WHERE source = ? AND source_id = ?',
    [sourceMatch.source, sourceMatch.competitionSourceId]
  );
  
  if (!competitionId) {
    // ❌ FORBIDDEN: Auto-creating
    const result = await db.run(
      'INSERT INTO dev.competitions (name, country_id) VALUES (?, ?)',
      [sourceMatch.competitionName, sourceMatch.countryId]
    );
    competitionId = result.lastID;
  }
  
  // Now insert match with competitionId
  await db.run('INSERT INTO dev.matches (competition_id, ...) VALUES (?, ...)', [competitionId, ...]);
}

// ✅ CORRECT: Strict resolution or defer
async function insertMatch(sourceMatch) {
  // Step 1: Resolve parent ID
  const mapping = await db.get(
    'SELECT m.competition_id FROM mapping.competitions m WHERE m.source = ? AND m.source_id = ?',
    ['flashscore', sourceMatch.competitionSourceId]
  );
  
  if (!mapping) {
    // ✅ CORRECT: Enqueue for manual review, don't auto-create
    await db.run(
      'INSERT INTO stg.mapping_candidates (entity_type, source, source_id, source_name, status) VALUES (?, ?, ?, ?, ?)',
      ['competition', 'flashscore', sourceMatch.competitionSourceId, sourceMatch.competitionName, 'manual_review']
    );
    return { inserted: 0, deferred: 1, error: 'competition_unresolved' };
  }
  
  // Step 2: Verify team FKs exist
  const homeTeamResolved = await db.get(
    'SELECT team_id FROM mapping.teams WHERE source = ? AND source_id = ?',
    ['flashscore', sourceMatch.homeTeamSourceId]
  );
  
  if (!homeTeamResolved) {
    await db.run(
      'INSERT INTO stg.mapping_candidates (entity_type, source, source_id, status) VALUES (?, ?, ?, ?)',
      ['team', 'flashscore', sourceMatch.homeTeamSourceId, 'manual_review']
    );
    return { inserted: 0, deferred: 1, error: 'team_unresolved' };
  }
  
  // All FKs resolved → Safe to insert
  await db.run(
    'INSERT INTO dev.matches (competition_id, home_team_id, ...) VALUES (?, ?, ...)',
    [mapping.competition_id, homeTeamResolved.team_id, ...]
  );
  
  return { inserted: 1, deferred: 0 };
}
```

### Enqueue Unresolved References

```javascript
// Phase 1 Verifier → Check all FKs before insert
async function verifyMatchFKs(sourceMatch, batchId) {
  const fkChecks = [
    { table: 'competition', sourceId: sourceMatch.competitionSourceId },
    { table: 'team', sourceId: sourceMatch.homeTeamSourceId },
    { table: 'team', sourceId: sourceMatch.awayTeamSourceId },
    { table: 'venue', sourceId: sourceMatch.venueSourceId },  // May be NULL
    { table: 'person', sourceId: sourceMatch.refereeSourceId },  // May be NULL
  ];
  
  const unresolved = [];
  
  for (const check of fkChecks) {
    const exists = await db.get(
      'SELECT 1 FROM mapping.? WHERE source = ? AND source_id = ?',
      [check.table === 'competition' ? 'competitions' : (check.table === 'team' ? 'teams' : '...'),
       'flashscore', check.sourceId]
    );
    
    if (!exists && check.sourceId) {
      unresolved.push({ entity_type: check.table, source_id: check.sourceId });
    }
  }
  
  if (unresolved.length > 0) {
    // Defer entire match until all FKs resolved
    for (const item of unresolved) {
      await db.run(
        'INSERT INTO stg.mapping_candidates (...) VALUES (...)',
        [item.entity_type, 'flashscore', item.source_id, batchId, 'pending', 'auto_deferred']
      );
    }
    return { status: 'deferred', reason: 'unresolved_fks', count: unresolved.length };
  }
  
  return { status: 'ready_to_insert' };
}
```

---

## 2. Transactional Safety (Mandatory for Bulk Ops)

### Core Rule

**EVERY bulk operation (insert, update, or import) MUST be wrapped in a transaction. If ANY row fails, roll back ALL rows.**

Why: Partial inserts corrupt data and are hard to detect. A transaction guarantees all-or-nothing atomicity.

### Implementation Pattern

```javascript
// ❌ BAD: No transaction (partial inserts possible)
async function bulkInsertMatches(sourceMatches) {
  let inserted = 0;
  for (const sourceMatch of sourceMatches) {
    const result = await db.run(
      'INSERT INTO dev.matches (competition_id, home_team_id, away_team_id, ...) VALUES (?, ?, ?, ...)',
      [sourceMatch.competitionId, sourceMatch.homeTeamId, sourceMatch.awayTeamId, ...]
    );
    if (result.changes) inserted++;
  }
  // ❌ If error on row 500/1000, rows 1-499 are inserted, 500-1000 are not
  return { inserted };
}

// ✅ CORRECT: Transaction wrapping bulk operation
async function bulkInsertMatches(sourceMatches, batchId) {
  try {
    // Begin transaction
    await db.run('BEGIN TRANSACTION');
    
    let inserted = 0;
    const errors = [];
    
    for (const sourceMatch of sourceMatches) {
      try {
        const result = await db.run(
          'INSERT INTO dev.matches (competition_id, home_team_id, away_team_id, match_date, ...) VALUES (?, ?, ?, ?, ...)',
          [sourceMatch.competitionId, sourceMatch.homeTeamId, sourceMatch.awayTeamId, sourceMatch.matchDate, ...]
        );
        
        if (result.changes) {
          inserted++;
          
          // Audit log
          await db.run(
            'INSERT INTO audit.canonical_changes (operation, table_name, record_id, new_values, changed_by, import_batch_id) VALUES (?, ?, ?, ?, ?, ?)',
            ['INSERT', 'dev.matches', result.lastID, JSON.stringify(sourceMatch), 'phase1_ingester', batchId]
          );
        }
      } catch (rowError) {
        errors.push({ sourceMatchId: sourceMatch.id, error: rowError.message });
        // Don't throw yet — continue checking other rows to report all errors
      }
    }
    
    // If any errors, rollback entire batch
    if (errors.length > 0) {
      await db.run('ROLLBACK');
      return {
        inserted: 0,
        deferred: 0,
        errors: errors.length,
        errorDetails: errors,
        message: `Rolled back ${inserted} inserted rows due to ${errors.length} errors`
      };
    }
    
    // All rows succeeded → Commit
    await db.run('COMMIT');
    
    return {
      inserted,
      deferred: 0,
      errors: 0,
      batchId
    };
  } catch (err) {
    // Catch any transaction-level error (FK violation, etc.)
    await db.run('ROLLBACK').catch(() => {});  // Ignore rollback errors
    return {
      inserted: 0,
      deferred: 0,
      errors: 1,
      errorDetails: [{ error: err.message }],
      message: 'Transaction failed, rolled back'
    };
  }
}
```

### Transaction Isolation Levels

For Phase 1, use **READ COMMITTED** (default):

```javascript
// Set isolation level for critical operations
await db.run('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
await db.run('BEGIN TRANSACTION');
// ... insert/update operations ...
await db.run('COMMIT');
```

### Savepoints (Optional, for partial rollback)

```javascript
// For long-running imports, use savepoints to recover from individual row failures
await db.run('BEGIN TRANSACTION');

for (let i = 0; i < sourceMatches.length; i++) {
  const sourceMatch = sourceMatches[i];
  
  await db.run(`SAVEPOINT sp_${i}`);
  
  try {
    await db.run('INSERT INTO dev.matches (...) VALUES (...)', [...]);
  } catch (err) {
    // Rollback just this row, continue with next
    await db.run(`ROLLBACK TO SAVEPOINT sp_${i}`);
    skipped++;
  }
}

await db.run('COMMIT');

return { inserted: sourceMatches.length - skipped, skipped };
```

---

## 3. Idempotence Guarantee

### Core Rule

**Running import(data) twice MUST produce the same result as running it once.**

Idempotence = No side effects from duplicate runs. If a network blip causes a retry, the second run should be a no-op (or update with identical data).

### Implementation Pattern

```javascript
// ✅ IDEMPOTENT: Using UNIQUE business key to prevent duplicates
async function upsertTeam(sourceTeam) {
  // Step 1: Check if team already exists (by canonical business key)
  const existing = await db.get(
    'SELECT team_id FROM dev.teams WHERE name = ? AND country_id = ?',
    [sourceTeam.name, sourceTeam.countryId]
  );
  
  if (existing) {
    // Team already exists → Check if mapping exists
    const mapping = await db.get(
      'SELECT mapping_id FROM mapping.teams WHERE source = ? AND source_id = ? AND team_id = ?',
      ['flashscore', sourceTeam.sourceId, existing.team_id]
    );
    
    if (mapping) {
      // Both canonical + mapping exist → No-op (idempotent)
      return { action: 'noop', team_id: existing.team_id };
    } else {
      // Canonical exists but mapping doesn't → Add mapping only
      await db.run(
        'INSERT INTO mapping.teams (source, source_id, team_id, confidence_score) VALUES (?, ?, ?, ?)',
        ['flashscore', sourceTeam.sourceId, existing.team_id, 0.95]
      );
      return { action: 'mapping_added', team_id: existing.team_id };
    }
  }
  
  // Team doesn't exist → Insert canonical + mapping
  const result = await db.run(
    'INSERT INTO dev.teams (name, country_id, active_from_year) VALUES (?, ?, ?)',
    [sourceTeam.name, sourceTeam.countryId, sourceTeam.season]
  );
  
  const teamId = result.lastID;
  
  await db.run(
    'INSERT INTO mapping.teams (source, source_id, team_id, confidence_score) VALUES (?, ?, ?, ?)',
    ['flashscore', sourceTeam.sourceId, teamId, 0.95]
  );
  
  return { action: 'inserted', team_id: teamId };
}

// Test idempotence
const sourceTeam = { name: 'PSG', sourceId: '12345', countryId: 2, season: 2025 };

// First run
const result1 = await upsertTeam(sourceTeam);
console.log(result1);  // { action: 'inserted', team_id: 1 }

// Second run (identical data)
const result2 = await upsertTeam(sourceTeam);
console.log(result2);  // { action: 'noop', team_id: 1 }

// ✅ PASS: Same result on second run (idempotent)
```

### Idempotence Testing

Every skill MUST include an idempotence test:

```javascript
describe('phase1_ingester', () => {
  it('should be idempotent: f(f(x)) === f(x)', async () => {
    const sourceData = [
      { name: 'PSG', sourceId: '1', countryId: 2 },
      { name: 'OM', sourceId: '2', countryId: 2 },
    ];
    
    // Run 1
    const result1 = await ingestTeams(sourceData, 'batch_1');
    expect(result1.inserted).toBe(2);
    expect(result1.errors).toBe(0);
    
    // Run 2 (same data)
    const result2 = await ingestTeams(sourceData, 'batch_2');
    expect(result2.inserted).toBe(0);  // ← Should be 0 (no new inserts)
    expect(result2.updated).toBe(0);   // ← Should be 0 (no updates)
    expect(result2.skipped).toBe(2);   // ← Should be 2 (already exist)
    
    // Verify database state unchanged
    const count = await db.get('SELECT COUNT(*) as cnt FROM dev.teams');
    expect(count.cnt).toBe(2);  // Still 2 teams (not 4)
  });
});
```

---

## 4. Multi-Factor Identity Gates

### Core Rule

**Match entities using MULTIPLE factors, not just one. Require high confidence (≥ 95%) before auto-approval.**

Single-factor matching (e.g., "name only") risks false positives. Multi-factor matching uses name + country + birth_date + position to uniquely identify players.

### Identity Gate: Teams

```javascript
async function matchTeamMultiFactor(sourceTeam) {
  const gates = [
    // Gate 1: Exact name + country match
    async () => {
      return await db.get(
        'SELECT team_id FROM dev.teams WHERE LOWER(name) = LOWER(?) AND country_id = ?',
        [sourceTeam.name, sourceTeam.countryId]
      );
    },
    
    // Gate 2: Name similarity (Levenshtein) + country
    async () => {
      return await db.get(
        `SELECT team_id FROM dev.teams 
         WHERE country_id = ? AND levenshtein(LOWER(name), LOWER(?)) <= 2`,
        [sourceTeam.countryId, sourceTeam.name]
      );
    },
    
    // Gate 3: Multi-source corroboration (if >1 source confirms)
    async () => {
      return await db.get(
        `SELECT m.team_id, COUNT(*) as source_count 
         FROM mapping.teams m
         WHERE m.team_id IN (
           SELECT team_id FROM mapping.teams 
           WHERE source IN ('flashscore', 'transfermarkt') 
           AND confidence_score >= 0.90
         )
         GROUP BY m.team_id
         HAVING COUNT(*) >= 2`
      );
    },
  ];
  
  let bestMatch = null;
  let gatePassCount = 0;
  
  for (const gate of gates) {
    const match = await gate();
    if (match) {
      gatePassCount++;
      bestMatch = match;
      break;  // Take first match (ordered by strength)
    }
  }
  
  // Require at least 1 gate pass for auto-approval
  // If 0 gates pass → Manual review
  return {
    matched: bestMatch ? true : false,
    team_id: bestMatch?.team_id,
    confidence_score: gatePassCount / gates.length,  // 0.33-1.0
    gate_passes: gatePassCount
  };
}
```

### Identity Gate: People (Complex)

```javascript
async function matchPersonMultiFactor(sourcePerson) {
  const gates = [
    // Gate 1: Exact match on (first_name, last_name, nationality, birth_date)
    async () => {
      return await db.get(
        `SELECT person_id FROM dev.people 
         WHERE LOWER(first_name) = LOWER(?) 
           AND LOWER(last_name) = LOWER(?) 
           AND nationality_id = ?
           AND birth_date = ?`,
        [sourcePerson.firstName, sourcePerson.lastName, sourcePerson.nationalityId, sourcePerson.birthDate]
      );
    },
    
    // Gate 2: Name + birth_date + position (allows nationality variance for multi-nationals)
    async () => {
      return await db.get(
        `SELECT person_id FROM dev.people 
         WHERE LOWER(first_name) = LOWER(?) 
           AND LOWER(last_name) = LOWER(?) 
           AND birth_date = ?
           AND position_code = ?`,
        [sourcePerson.firstName, sourcePerson.lastName, sourcePerson.birthDate, sourcePerson.position]
      );
    },
    
    // Gate 3: Fuzzy name match + birth_year + position + nationality
    async () => {
      return await db.get(
        `SELECT person_id FROM dev.people 
         WHERE levenshtein(LOWER(first_name || ' ' || last_name), LOWER(?)) <= 1
           AND EXTRACT(YEAR FROM birth_date) = ?
           AND position_code = ?
           AND nationality_id = ?`,
        [sourcePerson.firstName + ' ' + sourcePerson.lastName, 
         new Date(sourcePerson.birthDate).getFullYear(),
         sourcePerson.position, 
         sourcePerson.nationalityId]
      );
    },
    
    // Gate 4: Cross-source confirmation (Flashscore + Transfermarkt both say same ID)
    async () => {
      const person_id = await db.get(
        `SELECT m1.person_id FROM mapping.people m1
         WHERE m1.source_id = ? AND m1.source = 'flashscore'
         AND EXISTS (
           SELECT 1 FROM mapping.people m2
           WHERE m2.person_id = m1.person_id 
           AND m2.source = 'transfermarkt'
           AND m2.confidence_score >= 0.90
         )`,
        [sourcePerson.sourceId]
      );
      return person_id;
    },
  ];
  
  let bestMatch = null;
  let gatePassCount = 0;
  let confidenceScore = 0;
  
  for (let i = 0; i < gates.length; i++) {
    const gate = gates[i];
    const match = await gate();
    
    if (match) {
      gatePassCount++;
      bestMatch = match;
      
      // Confidence score: Gate 1 = 1.0, Gate 2 = 0.9, Gate 3 = 0.85, Gate 4 = 0.80
      confidenceScore = Math.max(1.0 - (i * 0.1), 0.8);
      break;
    }
  }
  
  // Auto-approve only if Gate 1 or 2 passes (confidence >= 0.90)
  // Otherwise queue for manual review
  return {
    matched: bestMatch ? true : false,
    person_id: bestMatch?.person_id,
    confidence_score: confidenceScore,
    gate_passes: gatePassCount,
    requires_manual_review: confidenceScore < 0.90
  };
}
```

### Confidence Score Threshold

```javascript
async function processMapping(sourceEntity, entityType, confidenceThreshold = 0.95) {
  let match;
  
  if (entityType === 'team') {
    match = await matchTeamMultiFactor(sourceEntity);
  } else if (entityType === 'person') {
    match = await matchPersonMultiFactor(sourceEntity);
  }
  
  // ✅ HIGH CONFIDENCE: Auto-approve
  if (match.matched && match.confidence_score >= confidenceThreshold) {
    return {
      action: 'auto_approve',
      canonical_id: match.person_id,
      confidence: match.confidence_score,
      gates_passed: match.gate_passes
    };
  }
  
  // ⚠️ MEDIUM CONFIDENCE: Queue for manual review
  if (match.matched && match.confidence_score >= 0.80) {
    await db.run(
      'INSERT INTO stg.mapping_candidates (...) VALUES (...)',
      [entityType, 'flashscore', sourceEntity.sourceId, ..., 'manual_review']
    );
    return {
      action: 'deferred_to_manual_review',
      matched: true,
      confidence: match.confidence_score
    };
  }
  
  // ❌ LOW CONFIDENCE OR NO MATCH: Queue for manual review
  await db.run(
    'INSERT INTO stg.mapping_candidates (...) VALUES (...)',
    [entityType, 'flashscore', sourceEntity.sourceId, ..., 'manual_review']
  );
  return {
    action: 'deferred_to_manual_review',
    matched: false,
    reason: 'no_match_or_low_confidence'
  };
}
```

---

## 5. Risky Operations Blocklist

### Forbidden Without Explicit Approval

| Operation | Reason | Workaround |
|-----------|--------|-----------|
| `DELETE FROM dev.*` | Unaudited data loss | Use soft delete or archive table |
| `UPDATE dev.* SET *` without WHERE | Bulk uncontrolled update | Use targeted WHERE clause + audit logging |
| `TRUNCATE dev.*` | Irreversible | Backup first; use DELETE instead |
| `DROP TABLE dev.*` | Permanent loss | Archive to `archive.*` first; document reason |
| `ALTER TABLE dev.* DROP COLUMN` | Data loss | Create `archive_v1` table; migrate to v2 |
| INSERT without FK check | Orphaned records | Verify parent exists first |
| INSERT without business key check | Duplicates | Check UNIQUE constraint first |
| Bulk insert without transaction | Partial inserts | Wrap in BEGIN...COMMIT |

### Pre-Flight Checklist for Risk Operations

Every operation touching `dev.*` must pass:

```javascript
async function preFlightCheck(operation, tableName, affectedRows = 0) {
  const checks = [
    // Check 1: Is this in a transaction?
    async () => {
      const inTx = await db.get("SELECT current_transaction_isolation_level()");
      if (!inTx) throw new Error('Not in transaction');
    },
    
    // Check 2: Are all FKs verified?
    async () => {
      if (operation === 'INSERT') {
        const fkCount = await db.get(
          'SELECT COUNT(*) as cnt FROM information_schema.table_constraints WHERE table_name = ? AND constraint_type = "FOREIGN KEY"',
          [tableName]
        );
        if (fkCount.cnt > 0) {
          // Verify each FK before proceeding
          console.log(`FK check required for ${fkCount.cnt} foreign keys`);
        }
      }
    },
    
    // Check 3: Is audit logging enabled?
    async () => {
      const auditExists = await db.get(
        'SELECT 1 FROM information_schema.tables WHERE table_name = ?',
        ['audit.canonical_changes']
      );
      if (!auditExists) throw new Error('Audit table missing');
    },
    
    // Check 4: Is the operation idempotent?
    async () => {
      if (operation === 'UPDATE' && affectedRows > 100) {
        console.warn(`Large UPDATE: ${affectedRows} rows affected — ensure idempotence`);
      }
    },
  ];
  
  for (const check of checks) {
    await check();
  }
  
  console.log(`✅ Pre-flight check passed for ${operation} on ${tableName}`);
}
```

---

## 6. Rollback & Recovery

### Backup Strategy

Before any bulk operation:

```bash
# Create backup snapshot (recommended)
pg_dump -U postgres -d statfoot_db -Fc -f /backups/before_phase1_ingestion_20260504.dump

# OR create table copy (minimal)
CREATE TABLE dev.teams_backup_20260504 AS SELECT * FROM dev.teams;
```

### Recovery After Failure

```javascript
async function rollbackOperation(operationName, backupTimestamp) {
  // Step 1: Stop all ongoing operations
  console.log(`🛑 STOPPING ${operationName}...`);
  
  // Step 2: Check audit log
  const recentChanges = await db.all(
    'SELECT * FROM audit.canonical_changes WHERE created_at >= ? ORDER BY created_at DESC LIMIT 100',
    [new Date(backupTimestamp).toISOString()]
  );
  
  console.log(`Found ${recentChanges.length} changes since backup`);
  
  // Step 3: Decide: rollback to backup or surgical undo
  if (recentChanges.length < 10) {
    // Surgical undo: reverse each change
    for (const change of recentChanges) {
      if (change.operation === 'INSERT') {
        await db.run('DELETE FROM ?? WHERE id = ?', [change.table_name, change.record_id]);
      } else if (change.operation === 'UPDATE') {
        await db.run('UPDATE ?? SET ? WHERE id = ?', [change.table_name, change.old_values, change.record_id]);
      } else if (change.operation === 'DELETE') {
        await db.run('INSERT INTO ?? (??) VALUES (??)', [change.table_name, Object.keys(change.old_values), Object.values(change.old_values)]);
      }
    }
    console.log(`✅ Surgical undo completed`);
  } else {
    // Full rollback to backup
    console.log(`⚠️ Too many changes (${recentChanges.length}). Consider full restore:`);
    console.log(`pg_restore -U postgres -d statfoot_db -Fc /backups/before_${operationName}_${backupTimestamp}.dump`);
  }
}
```

---

## 7. Checklist: Pre-Ingestion

Before running any Phase 1 ingestion skill:

- [ ] **All schemas created** (dev.*, mapping.*, audit.*, stg.*)
- [ ] **Business keys defined** (UNIQUE constraints in place)
- [ ] **FK constraints verified** (ON DELETE strategy documented)
- [ ] **Audit table ready** (audit.canonical_changes exists)
- [ ] **Staging table ready** (stg.mapping_candidates for manual review queue)
- [ ] **Backup created** (pg_dump or table copy)
- [ ] **Idempotence tests pass** (f(f(x)) === f(x))
- [ ] **Multi-factor gates configured** (confidence thresholds set)
- [ ] **Transaction rollback tested** (ROLLBACK works)
- [ ] **All source IDs mapped** (Flashscore + Transfermarkt → mapping.*)
- [ ] **High-confidence mappings auto-approved** (≥ 95%)
- [ ] **Low-confidence mappings queued** (manual_review status)
- [ ] **Audit logging enabled** (changes tracked)

---

## Summary: Data Safety Hierarchy

1. **Strict FK Resolution** → No auto-create, defer unknowns
2. **Transactional Safety** → All or nothing, no partial inserts
3. **Idempotence Guarantee** → No side effects from retries
4. **Multi-Factor Gates** → Confidence ≥ 95% for auto-approval
5. **Audit Trail** → Every change logged with reason
6. **Rollback Readiness** → Backups + surgical undo available

**Together, these rules ensure Phase 1 data integrity: no duplicates, no orphans, no untracked changes.**
