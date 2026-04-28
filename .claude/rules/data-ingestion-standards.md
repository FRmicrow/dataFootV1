# Data Ingestion Standards — Database Surgery

## Mission

Garantir que chaque insertion, mise à jour ou suppression de donnée respecte la **chirurgie de base de données** : aucun doublon, aucune donnée orpheline, aucun état incohérent. La base de données doit rester en état optimal à tout moment.

## Core Principles

### 0. V4 Canonical Identity (MANDATORY)
**Règle d'OR:** Toute entité externe (Club, Joueur, Compétition, Stade) **DOIT** être résolue via le `ResolutionServiceV4` avant toute insertion ou liaison.

- **Mapping Table First:** Le système vérifie d'abord si un mapping `(source, source_id)` existe.
- **Heuristic Second:** Si non, il tente de trouver un match via les clés métier (nom, pays, naissance).
- **Canonical ID only:** Seul l'ID interne (UUID/BigInt Snowflake) est autorisé dans les tables métier (`v4.matches`, etc.).

### 1. Validation Schema-First
**Règle Absolue:** Aucune donnée n'entre en base sans validation Zod préalable.

```js
// ✅ CORRECT
import { z } from 'zod';
import { db } from '../config/database.js';

const PlayerInsertSchema = z.object({
  person_id: z.string().uuid('Invalid UUID'),
  player_number: z.number().int().min(1).max(99),
  position: z.enum(['GK', 'DEF', 'MID', 'FWD']),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
});

export async function insertPlayer(data) {
  // Validation AVANT toute opération DB
  const validated = PlayerInsertSchema.parse(data);
  
  // Puis insertion sûre
  return db.run(
    'INSERT INTO v4.club_players (person_id, player_number, position, height, weight) VALUES (?, ?, ?, ?, ?)',
    [validated.person_id, validated.player_number, validated.position, validated.height, validated.weight]
  );
}

// ❌ WRONG
async function insertPlayer(data) {
  // Pas de validation → données corrompues possibles
  const result = await db.run(
    `INSERT INTO v4.club_players (person_id, player_number, position, height, weight) 
     VALUES ('${data.person_id}', ${data.player_number}, '${data.position}', ...)`
  );
}
```

### 2. Deduplication Logic (Core Pattern)
**Règle Absolue:** Avant d'insérer, vérifier l'existence via clés métier (business keys), pas juste l'ID technique.

#### Pattern: Insert-or-Update (Upsert)
```js
/**
 * Safe upsert: Insert if not exists, update if exists
 * Ensures idempotence (run 1x or 10x, same result)
 */
export async function upsertLeague(data) {
  const validated = LeagueSchema.parse(data);
  
  // Clé métier pour déduplication
  const existingLeague = await db.get(
    'SELECT id FROM v4.competitions WHERE name = ? AND country = ?',
    [validated.name, validated.country]
  );
  
  if (existingLeague) {
    // Update: merge new data into existing record
    return db.run(
      `UPDATE v4.competitions 
       SET founded_year = COALESCE(?, founded_year), 
           logo_url = COALESCE(?, logo_url),
           updated_at = NOW()
       WHERE id = ?`,
      [validated.founded_year, validated.logo_url, existingLeague.id]
    );
  } else {
    // Insert: new record
    return db.run(
      `INSERT INTO v4.competitions (id, name, country, founded_year, logo_url, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [validated.id, validated.name, validated.country, validated.founded_year, validated.logo_url]
    );
  }
}
```

#### Pattern: Bulk Upsert (Mass Deduplication)
```js
/**
 * Bulk upsert with transaction guarantee
 * All-or-nothing: if one fails, entire batch rolls back
 */
export async function upsertPlayersForClub(clubId, players) {
  // 1. Validate all records upfront
  const validated = z.array(PlayerInsertSchema).parse(players);
  
  // 2. Start transaction
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    
    // 3. Fetch existing players for this club
    const existing = await client.query(
      'SELECT person_id FROM v4.club_players WHERE club_id = ?',
      [clubId]
    );
    const existingIds = new Set(existing.rows.map(r => r.person_id));
    
    // 4. Partition: insert vs update
    const toInsert = validated.filter(p => !existingIds.has(p.person_id));
    const toUpdate = validated.filter(p => existingIds.has(p.person_id));
    
    // 5. Batch insert
    for (const player of toInsert) {
      await client.query(
        `INSERT INTO v4.club_players (club_id, person_id, player_number, position, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [clubId, player.person_id, player.player_number, player.position]
      );
    }
    
    // 6. Batch update
    for (const player of toUpdate) {
      await client.query(
        `UPDATE v4.club_players 
         SET player_number = $1, position = $2, updated_at = NOW()
         WHERE club_id = $3 AND person_id = $4`,
        [player.player_number, player.position, clubId, player.person_id]
      );
    }
    
    // 7. Commit transaction
    await client.query('COMMIT');
    
    logger.info({
      club_id: clubId,
      inserted: toInsert.length,
      updated: toUpdate.length,
    }, 'Bulk upsert completed successfully');
    
    return { inserted: toInsert.length, updated: toUpdate.length };
    
  } catch (error) {
    // Rollback if any error
    await client.query('ROLLBACK');
    logger.error({ err: error, club_id: clubId }, 'Bulk upsert failed — transaction rolled back');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 3. Business Key Definition (Deduplication Strategy)

Every entity must have a **business key** — the unique identifier that matters in the real world, not just the database ID.

### Examples

| Entity | Business Key | SQL Unique Constraint |
|--------|--------------|----------------------|
| League | `(name, country)` | `UNIQUE (name, country)` |
| Club | `(name, country)` | `UNIQUE (name, country)` |
| Person | `(first_name, last_name, birth_date)` | `UNIQUE (first_name, last_name, birth_date)` |
| Match | `(home_club_id, away_club_id, date, competition_id)` | `UNIQUE (home_club_id, away_club_id, date, competition_id)` |
| Match Event | `(match_id, minute, type, player_id)` | `UNIQUE (match_id, minute, type, player_id)` |
| Club Player | `(club_id, person_id, season)` | `UNIQUE (club_id, person_id, season)` |

### Implementation Pattern

```sql
-- ALWAYS create unique constraints on business keys
ALTER TABLE v4.competitions 
ADD CONSTRAINT uq_competitions_business_key UNIQUE (name, country);

ALTER TABLE v4.clubs 
ADD CONSTRAINT uq_clubs_business_key UNIQUE (name, country);

ALTER TABLE v4.people 
ADD CONSTRAINT uq_people_business_key UNIQUE (first_name, last_name, birth_date);

ALTER TABLE v4.matches 
ADD CONSTRAINT uq_matches_business_key UNIQUE (home_club_id, away_club_id, match_date, competition_id);

ALTER TABLE v4.match_events 
ADD CONSTRAINT uq_match_events_business_key UNIQUE (match_id, minute_label, event_type, player_id);
```

---

## 4. Insert Patterns (Safety-First)

### Pattern A: Safe Single Insert
```js
export async function insertMatchEvent(matchId, event) {
  const validated = MatchEventSchema.parse(event);
  
  try {
    // Check for duplicate
    const existing = await db.get(
      `SELECT id FROM v4.match_events 
       WHERE match_id = ? AND minute_label = ? AND event_type = ? AND player_id = ?`,
      [matchId, validated.minute, validated.type, validated.player_id]
    );
    
    if (existing) {
      logger.warn({
        match_id: matchId,
        minute: validated.minute,
        player_id: validated.player_id,
      }, 'Duplicate match event detected — skipped');
      return { inserted: false, duplicate: true, event_id: existing.id };
    }
    
    // Insert new event
    const result = await db.run(
      `INSERT INTO v4.match_events 
       (match_id, minute_label, event_type, player_id, team_id, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [matchId, validated.minute, validated.type, validated.player_id, validated.team_id, validated.detail]
    );
    
    logger.info({
      match_id: matchId,
      event_type: validated.type,
      inserted: true,
    }, 'Match event inserted');
    
    return { inserted: true, event_id: result.lastID };
    
  } catch (error) {
    if (error.code === '23505') {
      // UNIQUE constraint violation (duplicate)
      logger.warn({ err: error, match_id: matchId }, 'Duplicate on constraint');
      return { inserted: false, duplicate: true };
    }
    
    // Re-throw genuine DB errors
    logger.error({ err: error, match_id: matchId }, 'Insert failed');
    throw error;
  }
}
```

### Pattern B: Conditional Insert (Exists Check First)
```js
export async function insertPlayerIfNotExists(clubId, person) {
  const validated = PersonSchema.parse(person);
  
  // 1. Check if person exists by business key
  let person_id = await db.get(
    `SELECT id FROM v4.people 
     WHERE first_name = ? AND last_name = ? AND birth_date = ?`,
    [validated.first_name, validated.last_name, validated.birth_date]
  );
  
  // 2. If not, create person record
  if (!person_id) {
    const result = await db.run(
      `INSERT INTO v4.people (first_name, last_name, birth_date, nationality, height, weight, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [validated.first_name, validated.last_name, validated.birth_date, validated.nationality, 
       validated.height, validated.weight]
    );
    person_id = result.lastID;
    logger.info({ person_id }, 'New person created');
  } else {
    logger.info({ person_id: person_id.id }, 'Person already exists');
    person_id = person_id.id;
  }
  
  // 3. Link person to club (if not already linked)
  const existing = await db.get(
    `SELECT id FROM v4.club_players WHERE club_id = ? AND person_id = ?`,
    [clubId, person_id]
  );
  
  if (existing) {
    logger.info({ club_id: clubId, person_id }, 'Player already in club');
    return { status: 'exists', person_id };
  }
  
  // 4. Insert club-player link
  await db.run(
    `INSERT INTO v4.club_players (club_id, person_id, season, created_at)
     VALUES (?, ?, ?, NOW())`,
    [clubId, person_id, new Date().getFullYear()]
  );
  
  logger.info({ club_id: clubId, person_id }, 'Player linked to club');
  return { status: 'inserted', person_id };
}
```

---

## 5. Deduplication Detection & Repair

### Pattern: Find Duplicates
```js
/**
 * Detect duplicates by business key
 * Use this in admin endpoints for maintenance
 */
export async function findDuplicateLeagues() {
  const duplicates = await db.all(
    `SELECT name, country, COUNT(*) as count, ARRAY_AGG(id) as ids
     FROM v4.competitions
     GROUP BY name, country
     HAVING COUNT(*) > 1
     ORDER BY count DESC`
  );
  
  logger.info({ count: duplicates.length }, 'Found duplicate leagues');
  return duplicates;
}

/**
 * Merge duplicates → keep oldest, delete newer
 */
export async function mergeLeagueDuplicates(keepId, deleteIds) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Redirect all references to keep_id
    for (const deleteId of deleteIds) {
      await client.query(
        'UPDATE v4.matches SET competition_id = $1 WHERE competition_id = $2',
        [keepId, deleteId]
      );
    }
    
    // 2. Delete duplicate records
    const placeholders = deleteIds.map((_, i) => `$${i + 1}`).join(',');
    await client.query(
      `DELETE FROM v4.competitions WHERE id IN (${placeholders})`,
      deleteIds
    );
    
    await client.query('COMMIT');
    
    logger.info({
      kept_id: keepId,
      deleted_count: deleteIds.length,
    }, 'Duplicates merged successfully');
    
    return { merged: deleteIds.length };
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Merge failed — rolled back');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 6. Idempotence (Run Twice = Same Result)

**Rule:** All data insertion endpoints must be idempotent. Running the same request 10 times should produce the same database state as running it once.

### Implementation Pattern

```js
/**
 * Idempotent import: same import file run 2x = no duplicates
 * 
 * Key: Use business key for uniqueness check, not request ID
 */
export async function importMatches(matches) {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let insertCount = 0, skipCount = 0;
    
    for (const match of matches) {
      const validated = MatchSchema.parse(match);
      
      // Check business key uniqueness
      const existing = await client.query(
        `SELECT id FROM v4.matches 
         WHERE home_club_id = $1 AND away_club_id = $2 AND match_date = $3 AND competition_id = $4`,
        [validated.home_club_id, validated.away_club_id, validated.match_date, validated.competition_id]
      );
      
      if (existing.rows.length > 0) {
        skipCount++;
        continue; // Already exists → skip
      }
      
      // Insert new match
      await client.query(
        `INSERT INTO v4.matches 
         (home_club_id, away_club_id, match_date, competition_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [validated.home_club_id, validated.away_club_id, validated.match_date, 
         validated.competition_id, 'scheduled']
      );
      insertCount++;
    }
    
    await client.query('COMMIT');
    
    logger.info({
      total: matches.length,
      inserted: insertCount,
      skipped: skipCount,
    }, 'Match import completed (idempotent)');
    
    return { inserted: insertCount, skipped: skipCount };
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ err: error }, 'Import failed');
    throw error;
  } finally {
    client.release();
  }
}
```

---

## 7. Foreign Key & Referential Integrity

**Rule Absolue:** Never insert a record with a foreign key reference to a non-existent parent.

```js
export async function insertMatch(match) {
  const validated = MatchSchema.parse(match);
  
  // 1. Verify FK references exist
  const [homeClub, awayClub, competition] = await Promise.all([
    db.get('SELECT id FROM v4.clubs WHERE id = ?', [validated.home_club_id]),
    db.get('SELECT id FROM v4.clubs WHERE id = ?', [validated.away_club_id]),
    db.get('SELECT id FROM v4.competitions WHERE id = ?', [validated.competition_id]),
  ]);
  
  if (!homeClub || !awayClub || !competition) {
    throw new Error(
      `Invalid FK reference: home_club=${!!homeClub}, away_club=${!!awayClub}, competition=${!!competition}`
    );
  }
  
  // 2. Only then insert
  return db.run(
    `INSERT INTO v4.matches (home_club_id, away_club_id, competition_id, match_date, status, created_at)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [validated.home_club_id, validated.away_club_id, validated.competition_id, 
     validated.match_date, 'scheduled']
  );
}
```

---

## 8. Logging & Audit Trail

**Rule:** Every insert, update, delete must be logged with context.

```js
import logger from '../utils/logger.js';

export async function insertWithAudit(table, data, userId) {
  const validated = SchemaForTable[table].parse(data);
  
  const result = await db.run(
    `INSERT INTO ${table} (...) VALUES (...)`,
    [...]
  );
  
  // Log the operation
  logger.info({
    operation: 'INSERT',
    table,
    record_id: result.lastID,
    user_id: userId,
    data_keys: Object.keys(validated),
    timestamp: new Date().toISOString(),
  }, `Data inserted: ${table}`);
  
  return result;
}

export async function updateWithAudit(table, id, changes, userId) {
  const validated = SchemaForTable[table].parse(changes);
  
  // Get old state (for audit)
  const oldRecord = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  
  const result = await db.run(
    `UPDATE ${table} SET ... WHERE id = ?`,
    [...]
  );
  
  // Log changes
  logger.info({
    operation: 'UPDATE',
    table,
    record_id: id,
    user_id: userId,
    old_values: oldRecord,
    new_values: validated,
    changed_fields: Object.keys(validated),
    timestamp: new Date().toISOString(),
  }, `Data updated: ${table}`);
  
  return result;
}
```

---

## 9. Database Surgery Checklist

Use this before ANY bulk import or data migration:

- [ ] **Schema Validation:** All records pass Zod validation before DB touch
- [ ] **Business Key Definition:** Identified unique constraint per entity
- [ ] **Deduplication Check:** SELECT COUNT DISTINCT for each business key
- [ ] **FK Verification:** All parent records exist before insert
- [ ] **Transactions:** Bulk operations in BEGIN...COMMIT block
- [ ] **Rollback Plan:** Clear error handling with ROLLBACK on failure
- [ ] **Audit Logging:** Every insert/update logged with context
- [ ] **Idempotence Test:** Run import twice, verify same state
- [ ] **Performance:** No N+1 queries, batch operations where possible
- [ ] **Communication:** Log summary: inserted=X, updated=Y, skipped=Z, errors=0

---

## 10. Common Mistakes (Anti-Patterns)

### ❌ Mistake 1: Insert Without Checking Existence
```js
// WRONG: Will create duplicates if run twice
export function importLeagues(leagues) {
  leagues.forEach(league => {
    db.run(
      'INSERT INTO v4.competitions (name, country) VALUES (?, ?)',
      [league.name, league.country]
    );
  });
}
```

### ✅ Correct: Check Before Insert
```js
// CORRECT: Idempotent
export function importLeagues(leagues) {
  leagues.forEach(league => {
    const exists = db.get(
      'SELECT id FROM v4.competitions WHERE name = ? AND country = ?',
      [league.name, league.country]
    );
    
    if (!exists) {
      db.run(
        'INSERT INTO v4.competitions (name, country) VALUES (?, ?)',
        [league.name, league.country]
      );
    }
  });
}
```

---

### ❌ Mistake 2: No Transaction in Bulk Operations
```js
// WRONG: If error at record 500/1000, partial state left
export async function importPlayers(players) {
  for (const player of players) {
    await db.run('INSERT INTO v4.people (...) VALUES (...)', [...]);
    await db.run('INSERT INTO v4.club_players (...) VALUES (...)', [...]);
  }
}
```

### ✅ Correct: All-or-Nothing
```js
// CORRECT: Either all succeed or rollback
export async function importPlayers(players) {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    for (const player of players) {
      await client.query('INSERT INTO v4.people (...) VALUES (...)', [...]);
      await client.query('INSERT INTO v4.club_players (...) VALUES (...)', [...]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

---

### ❌ Mistake 3: String Interpolation in SQL
```js
// WRONG: SQL injection + malformed queries
db.run(`INSERT INTO v4.people (name) VALUES ('${name}')`);
```

### ✅ Correct: Parameterized Queries
```js
// CORRECT: Safe from injection
db.run('INSERT INTO v4.people (name) VALUES (?)', [name]);
```

---

### ❌ Mistake 4: Missing FK Checks
```js
// WRONG: Could create orphaned records if club doesn't exist
db.run(
  'INSERT INTO v4.club_players (club_id, person_id) VALUES (?, ?)',
  [unknownClubId, unknownPersonId]
);
```

### ✅ Correct: Verify Parents First
```js
// CORRECT: Only link if both parents exist
const [club, person] = await Promise.all([
  db.get('SELECT id FROM v4.clubs WHERE id = ?', [clubId]),
  db.get('SELECT id FROM v4.people WHERE id = ?', [personId]),
]);

if (!club || !person) {
  throw new Error('Parent record not found');
}

db.run(
  'INSERT INTO v4.club_players (club_id, person_id) VALUES (?, ?)',
  [clubId, personId]
);
```

---

## 11. Implementation Roadmap

### Phase 1: Schema Validation Layer (Week 1)
- [ ] Define `MatchEventSchema`, `LeagueSchema`, `ClubSchema`, `PersonSchema` in `backend/src/schemas/`
- [ ] Add Zod validation to all import endpoints
- [ ] Test with invalid data → verify rejection

### Phase 2: Deduplication Guards (Week 1-2)
- [ ] Identify business keys for each entity
- [ ] Add UNIQUE constraints in migrations
- [ ] Implement upsert patterns in all services
- [ ] Test idempotence: run import 2x, verify same state

### Phase 3: Transaction Safety (Week 2)
- [ ] Wrap bulk operations in transactions
- [ ] Implement proper rollback on error
- [ ] Test transaction abort: simulate DB error mid-operation

### Phase 4: Audit Logging (Week 2)
- [ ] Add structured logging to all insert/update operations
- [ ] Create import summary logs (inserted=X, skipped=Y, errors=Z)
- [ ] Monitor logs for anomalies

### Phase 5: Verification & Testing (Week 3)
- [ ] Run full import cycles end-to-end
- [ ] Verify data integrity: no duplicates, no orphans
- [ ] Performance test: measure import speed for 10k records
- [ ] Document successful patterns in CLAUDE.md

---

## 12. Database Surgery in Practice

### Real Example: Import Flashscore Match Events

```js
/**
 * Import match events from Flashscore API
 * Guarantees: No duplicates, all valid, transactional, idempotent
 */
export async function importMatchEventsFromFlashscore(matchId, flashscoreEvents) {
  // Step 1: Validate input
  const validated = z.array(FlashscoreEventSchema).parse(flashscoreEvents);
  logger.info({ match_id: matchId, count: validated.length }, 'Starting event import');
  
  // Step 2: Verify match exists
  const match = await db.get('SELECT id FROM v4.matches WHERE id = ?', [matchId]);
  if (!match) {
    throw new Error(`Match ${matchId} not found`);
  }
  
  // Step 3: Start transaction
  const client = await db.pool.connect();
  let insertCount = 0, skipCount = 0;
  
  try {
    await client.query('BEGIN');
    
    for (const event of validated) {
      // Step 4: Resolve player ID (FK check)
      let playerId = null;
      if (event.player_name) {
        const player = await client.query(
          'SELECT id FROM v4.people WHERE LOWER(CONCAT(first_name, \' \', last_name)) = LOWER(?)',
          [event.player_name]
        );
        playerId = player.rows[0]?.id;
        
        if (!playerId) {
          logger.warn({
            match_id: matchId,
            player_name: event.player_name,
          }, 'Player not found in DB — skipping event');
          skipCount++;
          continue;
        }
      }
      
      // Step 5: Check for duplicate
      const existing = await client.query(
        `SELECT id FROM v4.match_events 
         WHERE match_id = $1 AND minute_label = $2 AND event_type = $3 AND player_id IS NOT DISTINCT FROM $4`,
        [matchId, event.minute, event.type, playerId]
      );
      
      if (existing.rows.length > 0) {
        skipCount++;
        continue; // Duplicate → skip
      }
      
      // Step 6: Insert
      await client.query(
        `INSERT INTO v4.match_events 
         (match_id, minute_label, event_type, player_id, team_id, detail, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [matchId, event.minute, event.type, playerId, event.team_id, event.detail]
      );
      insertCount++;
    }
    
    // Step 7: Commit
    await client.query('COMMIT');
    
    // Step 8: Log summary
    logger.info({
      match_id: matchId,
      total: validated.length,
      inserted: insertCount,
      skipped: skipCount,
      errors: validated.length - insertCount - skipCount,
    }, 'Event import completed (transaction committed)');
    
    return { inserted: insertCount, skipped: skipCount };
    
  } catch (error) {
    // Step 9: Rollback on error
    await client.query('ROLLBACK');
    logger.error({
      err: error,
      match_id: matchId,
      processed: insertCount,
    }, 'Event import failed — transaction rolled back');
    throw error;
    
  } finally {
    client.release();
  }
}
```

---

## Enforcement Rules

1. **No endpoint returns `{ success: true }` without data validation step**
2. **No INSERT/UPDATE without transaction (for multi-step operations)**
3. **No bulk operation without idempotence test**
4. **No data touching production without audit log**
5. **All deduplication checks MUST use business key, not just ID**

---

## Links & References

- **Zod Validation:** `backend/src/schemas/v3Schemas.js`
- **Example Service:** `backend/src/services/v4/AdminServiceV4.js` (has upsert pattern)
- **DB Config:** `backend/src/config/database.js` (has transaction helpers)
- **Logger Setup:** `backend/src/utils/logger.js`

---

**Last Updated:** 2026-04-18  
**Applies To:** All data import, insert, update operations  
**Violations Detected By:** Code review + test suite  
**Severity:** CRITICAL — Database integrity depends on this
