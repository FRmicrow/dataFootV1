---
name: Schema Design Standards (Phase 1)
description: DDL-first approach with immutable business keys, strict constraints, and external ID isolation
type: reference
---

# Schema Design Standards — Phase 1 (dev.*, mapping.*, audit.*, stg.*)

## Core Principle: DDL is the Source of Truth

**All business logic constraints MUST be enforced at the SQL level, not at the application level.**

Why: Database constraints are immutable across all clients and protect data integrity even when application logic fails, is bypassed, or evolves.

---

## 1. Business Keys (Immutability & Definition)

### What is a Business Key?

A **business key** is the minimal set of attributes that uniquely identifies a real-world entity. Unlike technical IDs (which are auto-generated), business keys are **stable and immutable** — they do not change over the entity's lifetime.

### Business Key Definition Per Table

| Table | Business Key | Example | Immutable? | Rationale |
|-------|--------------|---------|-----------|-----------|
| `dev.countries` | `name` | "France" | ✅ Yes | Country names are stable |
| `dev.teams` | `(name, country_id)` | ("Paris Saint-Germain", FR) | ✅ Yes | Team name + country uniquely identifies |
| `dev.people` | `(first_name, last_name, nationality_id, birth_date)` | ("Kylian", "Mbappé", FR, 1998-12-20) | ✅ Yes | 4-part key handles homonyms |
| `dev.competitions` | `(name, country_id, season_start_year, competition_type)` | ("Ligue 1", FR, 2025, "league") | ✅ Yes | Identifies specific season + country |
| `dev.venues` | `(name, city, country_id)` | ("Parc des Princes", "Paris", FR) | ✅ Yes | Stadium location is stable |
| `dev.matches` | `(competition_id, home_team_id, away_team_id, match_date)` | (2, 1, 2, 2026-05-04) | ✅ Yes | Identifies unique fixture |
| `dev.match_events` | `(match_id, event_order)` | (123, 1) | ✅ Yes | Sequence within match is immutable |
| `mapping.teams` | `(source, source_id)` | ("flashscore", "12345") | ✅ Yes | External source identifier |

### DDL Enforcement

Every business key MUST have a UNIQUE constraint (with NOT NULL where applicable):

```sql
-- Good: Business key constraint at DDL level
CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id BIGINT NOT NULL REFERENCES dev.countries(country_id),
  ...
  UNIQUE(name, country_id)  -- ← Business key is UNIQUE
);

-- Bad: Relying on application to check uniqueness
CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id BIGINT NOT NULL REFERENCES dev.countries(country_id),
  ...
  -- ❌ Missing UNIQUE constraint — duplicates possible if app logic fails
);
```

### Nullability Rule for Business Keys

**Nullable attributes MUST be handled carefully in composite keys:**

```sql
-- For (first_name, last_name, nationality_id, birth_date) where birth_date may be NULL:
UNIQUE NULLS NOT DISTINCT (first_name, last_name, nationality_id, birth_date)

-- Why: "NULLS NOT DISTINCT" treats NULL as a distinct value
-- Without it: Two rows with birth_date=NULL could both exist (NULL != NULL in SQL)
-- With it: Only one row per (first_name, last_name, nationality_id, NULL) tuple allowed
```

---

## 2. Mapping Tables Own External IDs

### Core Rule

**External source identifiers (Flashscore IDs, Transfermarkt IDs, etc.) MUST live ONLY in `mapping.*` tables. Canonical `dev.*` tables NEVER reference external IDs directly.**

Why: Canonical tables represent real-world entities independent of data sources. If a source changes its ID scheme or deprecates, changes only happen in mapping tables — canonical data is unaffected.

### Pattern: Canonical + Mapping Isolation

```sql
-- ✅ CORRECT: External ID in mapping table only
CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id BIGINT NOT NULL,
  ...
  UNIQUE(name, country_id)
);

CREATE TABLE mapping.teams (
  mapping_id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('flashscore', 'transfermarkt', 'whoscored')),
  source_id TEXT NOT NULL,           -- ← External ID here ONLY
  team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE CASCADE,
  confidence_score NUMERIC(4,3),
  ...
  UNIQUE(source, source_id)          -- ← Business key: (source, source_id)
);

-- ❌ WRONG: External ID leaks into canonical table
CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  flashscore_id TEXT,                -- ❌ FORBIDDEN
  transfermarkt_id TEXT,             -- ❌ FORBIDDEN
  ...
);
```

### Lookup Pattern

When resolving external IDs to canonical IDs:

```sql
-- Query: Given flashscore_id="12345", find team_id
SELECT team_id FROM mapping.teams
WHERE source = 'flashscore' AND source_id = '12345';

-- If found: Use team_id for all business logic
-- If not found: Insert into stg.mapping_candidates for manual review
```

### Multi-Source Mapping

When the same entity maps to multiple sources:

```sql
-- Example: Paris Saint-Germain
-- Flashscore: flashscore_12345
-- Transfermarkt: tm_89
-- WhoScored: ws_456

INSERT INTO mapping.teams (source, source_id, team_id, confidence_score) VALUES
  ('flashscore', '12345', 1, 0.99),
  ('transfermarkt', '89', 1, 0.98),
  ('whoscored', '456', 1, 0.97);

-- All three rows point to the same team_id=1
-- If a source changes its ID or deprecates, remove just that row
-- team_id=1 in dev.teams remains unaffected
```

---

## 3. Audit Logging (Immutable Change Trail)

### Why Audit Everything

Every INSERT, UPDATE, DELETE on canonical tables (`dev.*`) must be logged with:
- **Old values** (pre-change state)
- **New values** (post-change state)
- **Timestamp** (when change occurred)
- **Reason** (why: import batch ID, manual correction, etc.)
- **Changed by** (system, admin email, job name, etc.)

Why: Allows forensic analysis of data quality issues, compliance audits, and root-cause analysis of bugs.

### DDL: audit.canonical_changes

```sql
CREATE TABLE audit.canonical_changes (
  change_id BIGSERIAL PRIMARY KEY,
  operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,           -- e.g., 'dev.teams'
  record_id BIGINT NOT NULL,          -- FK to the affected record
  
  old_values JSONB,                   -- NULL for INSERT; full row for UPDATE/DELETE
  new_values JSONB,                   -- Full row for INSERT/UPDATE; NULL for DELETE
  
  changed_by TEXT DEFAULT 'system',   -- e.g., 'api_ingester_v1', 'admin@company.com'
  reason TEXT,                        -- e.g., 'bulk_import_20260504_flashscore_batch_xyz'
  import_batch_id UUID,               -- Groups related changes
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_changes_batch ON audit.canonical_changes(import_batch_id);
CREATE INDEX idx_audit_changes_date ON audit.canonical_changes(created_at);
CREATE INDEX idx_audit_changes_record ON audit.canonical_changes(table_name, record_id);
```

### Audit in Practice

```sql
-- Example: INSERT new team
INSERT INTO dev.teams (name, country_id, ...) 
VALUES ('AS Monaco', 2, ...)
RETURNING team_id;
-- → Returns team_id = 456

-- Log it
INSERT INTO audit.canonical_changes (
  operation, table_name, record_id,
  old_values, new_values,
  changed_by, reason, import_batch_id
) VALUES (
  'INSERT', 'dev.teams', 456,
  NULL,  -- No old values (INSERT)
  jsonb_build_object(
    'team_id', 456,
    'name', 'AS Monaco',
    'country_id', 2,
    ...
  ),
  'phase1_ingester',
  'bulk_import_20260504_flashscore_batch_f47e8c',
  '550e8400-e29b-41d4-a716-446655440000'
);

-- Example: UPDATE team name
UPDATE dev.teams SET name = 'AS Monaco (corrected)' WHERE team_id = 456;

INSERT INTO audit.canonical_changes (
  operation, table_name, record_id,
  old_values, new_values,
  changed_by, reason, import_batch_id
) VALUES (
  'UPDATE', 'dev.teams', 456,
  jsonb_build_object('name', 'AS Monaco'),      -- Old value
  jsonb_build_object('name', 'AS Monaco (corrected)'),  -- New value
  'admin@company.com',
  'manual_correction_typo',
  NULL
);
```

### Query Audit Trail

```sql
-- Reconstruct entity history
SELECT 
  change_id, operation, old_values, new_values,
  changed_by, created_at
FROM audit.canonical_changes
WHERE table_name = 'dev.teams' AND record_id = 456
ORDER BY created_at ASC;

-- Find all changes in a batch
SELECT * FROM audit.canonical_changes
WHERE import_batch_id = '550e8400-e29b-41d4-a716-446655440000';

-- Data quality report: Who changed what and when
SELECT 
  table_name, COUNT(*) as change_count, 
  MIN(created_at) as first_change, 
  MAX(created_at) as last_change
FROM audit.canonical_changes
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY table_name;
```

---

## 4. Constraint Hierarchy

### Constraint Order of Strength

1. **NOT NULL** — Column cannot be empty (highest priority)
2. **CHECK** — Column value must satisfy condition (e.g., `height_cm > 100`)
3. **UNIQUE** — No two rows can have same value(s) (enforces business key)
4. **FOREIGN KEY** — Row must reference existing parent record
5. **TRIGGERS** — Custom logic (lowest priority, last resort)

### Foreign Key Strategies

**ON DELETE RESTRICT** (default for critical relationships):

```sql
CREATE TABLE dev.matches (
  ...
  competition_id BIGINT NOT NULL REFERENCES dev.competitions(competition_id) ON DELETE RESTRICT,
  home_team_id BIGINT NOT NULL REFERENCES dev.teams(team_id) ON DELETE RESTRICT,
  ...
);
-- Result: Cannot delete a competition or team that has matches
-- This prevents orphaned match records
```

**ON DELETE CASCADE** (for subsidiary data):

```sql
CREATE TABLE dev.match_events (
  ...
  match_id BIGINT NOT NULL REFERENCES dev.matches(match_id) ON DELETE CASCADE,
  ...
);
-- Result: Deleting a match automatically deletes all its events
-- This maintains referential integrity without manual cleanup
```

**ON DELETE SET NULL** (for optional references):

```sql
CREATE TABLE dev.matches (
  ...
  referee_person_id BIGINT REFERENCES dev.people(person_id) ON DELETE SET NULL,
  ...
);
-- Result: If referee is deleted, matches.referee_person_id becomes NULL
-- Match record survives; just loses referee info
```

---

## 5. Type Safety & Validation

### Boolean and Enum Fields

Use CHECK constraints instead of string ambiguity:

```sql
-- ✅ CORRECT: CHECK constraint prevents invalid values
CREATE TABLE dev.match_events (
  ...
  event_type TEXT NOT NULL CHECK(event_type IN ('goal', 'card', 'substitution', 'own_goal')),
  side TEXT NOT NULL CHECK(side IN ('home', 'away')),
  ...
);

-- ❌ WRONG: String field, no constraints (could contain 'gol', 'Goal', '123', etc.)
CREATE TABLE dev.match_events (
  ...
  event_type TEXT NOT NULL,
  side TEXT NOT NULL,
  ...
);
```

### Numeric Bounds

Use CHECK constraints for valid ranges:

```sql
-- ✅ CORRECT: Constraints on numeric fields
CREATE TABLE dev.people (
  ...
  height_cm SMALLINT CHECK(height_cm > 100 AND height_cm < 250 OR height_cm IS NULL),
  ...
);

CREATE TABLE dev.matches (
  ...
  home_score SMALLINT CHECK(home_score >= 0 OR home_score IS NULL),
  ...
);

-- ❌ WRONG: No validation
CREATE TABLE dev.people (
  height_cm SMALLINT  -- Could be -999, 500, or any value
);
```

### Temporal Precision

Use explicit precision flags for partial dates:

```sql
-- ✅ CORRECT: Precision metadata for date uncertainty
CREATE TABLE dev.matches (
  ...
  match_date TIMESTAMPTZ,
  match_date_precision TEXT CHECK(match_date_precision IN ('year_only', 'month_only', 'full')),
  ...
);

-- Example: Old match from 1986 with unknown day/month
-- match_date = '1986-01-01'
-- match_date_precision = 'year_only'
-- (Query knows to treat this as approximate)

-- ❌ WRONG: No precision marker
CREATE TABLE dev.matches (
  match_date TIMESTAMPTZ  -- Is '1986-01-01' exact or approximate? Unknown.
);
```

---

## 6. Index Strategy

### Index on Business Keys (Mandatory)

```sql
-- ✅ REQUIRED: Index on every business key for fast lookups
CREATE TABLE dev.teams (..., UNIQUE(name, country_id));
CREATE INDEX idx_dev_teams_name_country ON dev.teams(name, country_id);
```

### Index on Foreign Keys (Best Practice)

```sql
-- ✅ REQUIRED: Indexes on FK columns for JOIN performance
CREATE TABLE dev.matches (..., competition_id BIGINT REFERENCES dev.competitions);
CREATE INDEX idx_dev_matches_competition ON dev.matches(competition_id);

CREATE TABLE mapping.teams (..., team_id BIGINT REFERENCES dev.teams);
CREATE INDEX idx_mapping_teams_team ON mapping.teams(team_id);
```

### Index on Queries (Selective)

```sql
-- ✅ USEFUL: Index on frequently filtered columns
CREATE INDEX idx_dev_matches_status ON dev.matches(match_status) 
  WHERE match_status = 'finished';  -- Partial index for active queries

CREATE INDEX idx_dev_match_lineups_player ON dev.match_lineups(player_id) 
  WHERE player_id IS NOT NULL;  -- Skip NULL entries
```

---

## 7. Schema Evolution (Additive Only)

### Allowed Changes

✅ Add new columns (with sensible defaults)  
✅ Add new tables  
✅ Add new indexes  
✅ Relax constraints (widen range, drop NOT NULL)  

### Forbidden Changes

❌ Remove columns (use soft delete + audit instead)  
❌ Rename columns without backward compat  
❌ Tighten constraints (reduces data access)  
❌ Modify business key definition (breaks identity)  
❌ Change FK ON DELETE strategy on existing relations  

---

## 8. Documentation Requirements

### Per-Table Documentation

Every table in a migration file MUST include:

```sql
-- Table: dev.teams
-- Purpose: Clubs, franchises, league teams
-- Business Key: (name, country_id) — immutable, stable across time
-- Owner: Data ingestion pipeline (phase1_ingester)
-- Audit: ✅ Yes (logged in audit.canonical_changes)
-- Example: { team_id: 1, name: "Paris Saint-Germain", country_id: 2 }

CREATE TABLE dev.teams (
  team_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  country_id BIGINT NOT NULL REFERENCES dev.countries(country_id),
  ...
  UNIQUE(name, country_id),
  CONSTRAINT no_delete_with_matches CHECK(NOT EXISTS(
    SELECT 1 FROM dev.matches WHERE home_team_id = team_id OR away_team_id = team_id
  ))
);
```

### Per-Constraint Documentation

Complex constraints deserve inline comments:

```sql
-- @CRITICAL: home_team_id != away_team_id
-- Prevents nonsensical "matches" like PSG vs PSG
CONSTRAINT teams_different CHECK(home_team_id != away_team_id)
```

---

## 9. Checklist: Schema Review

Before committing any schema change:

- [ ] **Business key** defined and documented per table
- [ ] **UNIQUE constraint** on business key (or composite if multi-column)
- [ ] **NOT NULL** on all required columns
- [ ] **CHECK constraints** on enums and numeric bounds
- [ ] **FK constraints** with explicit ON DELETE strategy
- [ ] **Indexes** on business keys and FK columns
- [ ] **Audit logging** integrated (if canonical table)
- [ ] **Nullability** handled explicitly (NULLS NOT DISTINCT if needed)
- [ ] **Documentation** present (purpose, business key, example)
- [ ] **No external IDs** in canonical tables (mapping.* only)
- [ ] **Test migration** validates all constraints work

---

## Summary Table

| Principle | Implementation | Why |
|-----------|---|---|
| DDL is truth | Constraints at SQL level, not app | Immutable across all clients |
| Business keys immutable | UNIQUE constraints per table | Stable entity identity |
| External IDs isolated | mapping.* tables only | Canonical data decoupled from sources |
| Audit everything | audit.canonical_changes table | Forensic analysis + compliance |
| Type safety | CHECK constraints + enums | Prevents invalid data |
| Referential integrity | FK constraints ON DELETE RESTRICT | No orphaned records |
| Performance | Indexes on keys + FKs | Query speed guaranteed |
| Documentation | Per-table purpose + business key | Institutional knowledge preserved |
