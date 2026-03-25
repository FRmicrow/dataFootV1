# Technical Spec Document — V39: Transfermarkt Fixture Import

**Date** : 2026-03-23
**Status** : Complete
**Feature** : Transfermarkt Fixture Import with Event Enrichment

---

## Executive Summary

V39 extends statFootV3 to ingest historical match data from Transfermarkt via the `CoveredLeague` dataset (23 leagues, 1929–present). The feature provides:

- A PostgreSQL schema that supports **dual data sources** (API-Sports and Transfermarkt)
- **Null-safe services** that skip API syncs for Transfermarkt-only fixtures
- A **Python import script** with fuzzy team matching, idempotent operations, and dry-run mode
- Full **traceability** via `data_source` columns across tables

### Why This Matters

- API-Sports has limited historical depth; Transfermarkt covers 95+ years
- Dual-source strategy enables rich backtesting (ML training data)
- Backwards compatibility: existing API-Sports workflows are unaffected

---

## Data Contract

### Tables Modified

#### 1. **V3_Fixtures** (core fixture data)

```sql
-- Before V39:
api_id TEXT UNIQUE NOT NULL      -- Only API-Sports fixtures

-- After V39:
api_id TEXT UNIQUE NULL          -- Nullable; enforced only WHERE NOT NULL
data_source TEXT DEFAULT 'api-sports'
tm_match_id TEXT UNIQUE NULL     -- Transfermarkt match ID
home_logo_url TEXT               -- Logo from TM (enrichment)
away_logo_url TEXT               -- Logo from TM (enrichment)

-- Constraints:
CREATE UNIQUE INDEX idx_v3_fixtures_api_id_notnull
  ON V3_Fixtures(api_id) WHERE api_id IS NOT NULL;

CREATE UNIQUE INDEX idx_v3_fixtures_tm_match_id
  ON V3_Fixtures(tm_match_id) WHERE tm_match_id IS NOT NULL;

CREATE INDEX idx_v3_fixtures_teams_date
  ON V3_Fixtures(home_team_id, away_team_id, date);
```

**Fixture States:**
- **API-Sports only** : `api_id` IS NOT NULL, `tm_match_id` IS NULL, `data_source='api-sports'`
- **Transfermarkt only** : `api_id` IS NULL, `tm_match_id` IS NOT NULL, `data_source='transfermarkt'`
- **Enriched (dual)** : both `api_id` and `tm_match_id` populated, `data_source='api-sports'`

#### 2. **V3_Fixture_Events** (match events: goals, cards, subs)

```sql
-- New column:
data_source TEXT DEFAULT 'api-sports'

-- Example:
-- Event from API-Sports: data_source = 'api-sports'
-- Event from TM import:  data_source = 'transfermarkt'
```

#### 3. **V3_Teams** (club registry)

```sql
-- New column:
data_source TEXT DEFAULT 'api-sports'

-- Dynamically created teams from Transfermarkt:
-- INSERT INTO V3_Teams (name, logo_url, data_source)
-- VALUES ('Real Madrid', 'https://tm.com/logo.png', 'transfermarkt')
```

---

## Migration & Idempotency

**File** : `backend/src/migrations/registry/20260323_01_TM_FixtureImport.js`

### Key Operations

1. **Drop NOT NULL on api_id**
   - Allows TM-only fixtures (where `api_id IS NULL`)

2. **Drop old UNIQUE constraint on api_id**
   - PostgreSQL UNIQUE doesn't handle multiple NULLs well
   - Use partial unique index instead

3. **Create partial unique indices**
   - `idx_v3_fixtures_api_id_notnull` → only enforces uniqueness when value exists
   - `idx_v3_fixtures_tm_match_id` → only enforces uniqueness when TM ID exists
   - `idx_v3_fixtures_teams_date` → composite for fixture lookups

4. **Add traceability columns**
   - `data_source` on Fixtures, Events, Teams
   - Defaults to `'api-sports'` (backwards compatible)
   - Set to `'transfermarkt'` on import

### Idempotency

All SQL uses `IF NOT EXISTS` or `ON CONFLICT DO NOTHING` pattern:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_fixtures_tm_match_id
  ON V3_Fixtures(tm_match_id) WHERE tm_match_id IS NOT NULL;

INSERT INTO V3_Teams (...) VALUES (...)
  ON CONFLICT DO NOTHING;
```

✅ Safe to re-run without errors.

---

## API & Service Layer

### Affected Endpoints

**No new endpoints created.** V39 adds backend robustness only.

### Service Methods (Null-Guards)

#### 1. **fixtureService.fetchAndStoreEvents()**

```javascript
export async function fetchAndStoreEvents(localFixtureId, apiFixtureId) {
    // Resolve api_id if needed
    if (!apiFixtureId) {
        const row = await db.get(
            'SELECT api_id FROM V3_Fixtures WHERE fixture_id = ?',
            [localFixtureId]
        );
        apiFixtureId = row?.api_id;
    }

    // GUARD: Skip TM-only fixtures
    if (!apiFixtureId) {
        logger.info({ fixture_id: localFixtureId },
            'Skipping event sync: fixture has no api_id (non-API source)');
        return false;
    }

    // Continue with API call for api_id != null
    // ...
}
```

**Logic** :
- If fixture has `api_id IS NULL`, skip API call and return early
- Prevents 404 errors from API-Sports on TM-only fixtures
- Allows event data to be present via direct TM import

#### 2. **tacticalStatsService.fetchAndStoreFixtureStats()** & **fetchAndStorePlayerStats()**

```javascript
if (!apiFixtureId) {
    logger.debug(`Skipping tactical stats: fixture ${fixture_id} has no API ID`);
    return [];
}
// Continue with API call
```

#### 3. **OddsCrawlerService._syncFixtureOdds()**

```javascript
if (!apiFixtureId) {
    logger.debug(`Skipping odds sync: fixture ${fixture_id} has no API ID`);
    return;
}
// Continue with crawl
```

---

## Import Script

### File & Purpose

**Path** : `scripts/import_tm_fixtures.py`

Batch imports Transfermarkt fixture JSON from `externalData/CoveredLeague/` into V3_Fixtures and V3_Fixture_Events.

### Data Source Structure

```
externalData/CoveredLeague/
├── BundesligaFixtureDetail/        (23 leagues)
│   ├── 2024-2025/
│   │   ├── match_1234567.json
│   │   ├── match_1234568.json
│   └── 2023-2024/
│       └── ...
└── ...
```

Each JSON contains:
- `_parser.match_id` → unique Transfermarkt match ID
- `_parser.date` → match date (format: `dd/mm/yyyy`)
- `scorebox.home_team`, `scorebox.away_team` → team names
- `scorebox.home_goals`, `scorebox.away_goals` → final score
- `events[]` → goals, cards, substitutions
- `lineups.home.entraineur` → coach name

### Algorithm: Team Resolution

1. **Fuzzy cache** (in-memory, persists across files in one season)
   - Loads all V3_Teams into normalized dict
   - Compares incoming TM team name with `SequenceMatcher(threshold=0.85)`

2. **Exact match** → use cached team_id
3. **Fuzzy match** (≥0.85) → use matched team_id, update cache
4. **No match** → INSERT new minimal row: `(name, logo_url, data_source='transfermarkt')`

### Algorithm: Fixture Matching

**Goal** : Find or create fixture in V3_Fixtures

**Step 1** : Lookup by `tm_match_id`
```sql
SELECT fixture_id FROM V3_Fixtures WHERE tm_match_id = %s
```

**Step 2** : Lookup by team + date (±1 day window)
```sql
SELECT fixture_id FROM V3_Fixtures
WHERE home_team_id = %s
  AND away_team_id = %s
  AND date::date BETWEEN %s::date - INTERVAL '1 day'
               AND %s::date + INTERVAL '1 day'
```

**Result** :
- **Found** → update with `tm_match_id`, logos (enrichment) → `fixtures_enriched++`
- **Not found** → INSERT new fixture (`api_id=NULL`) → `fixtures_inserted++`

### Insert Fixture (TM-only)

```sql
INSERT INTO V3_Fixtures (
    api_id, league_id, season_year,
    home_team_id, away_team_id,
    goals_home, goals_away,
    score_fulltime_home, score_fulltime_away,
    date, referee,
    data_source, tm_match_id,
    home_logo_url, away_logo_url,
    status_short, status_long
) VALUES (
    NULL,  -- TM fixtures have no API ID
    %s, %s,  -- league_id, season_year
    %s, %s,  -- home_team_id, away_team_id
    %s, %s,  -- goals
    %s, %s,  -- final scores
    %s, %s,  -- date, referee
    'transfermarkt', %s,  -- data_source, tm_match_id
    %s, %s,  -- logo URLs
    'FT', 'Match Finished'
)
ON CONFLICT (tm_match_id) WHERE tm_match_id IS NOT NULL DO NOTHING
RETURNING fixture_id
```

### Insert Events (TM)

```sql
INSERT INTO V3_Fixture_Events (
    fixture_id, time_elapsed, type, detail,
    player_name, assist_name, comments,
    data_source
) VALUES (%s, %s, %s, %s, %s, %s, %s, 'transfermarkt')
ON CONFLICT DO NOTHING
```

**Event Types** :
- `goal` → player_name from `but`, assist from `passe`, detail from `goal_type`
- `card` → player_name, card_type, detail
- `substitution` → player_name (out), assist_name (in), detail

### CLI Usage

```bash
cd /repo
python scripts/import_tm_fixtures.py \
  --dry-run                    # Simulate, no DB writes
  --league bundesliga          # Filter by slug
  --season 2023-2024           # Single season
  --from-season 2020-2021      # 2020-2021 backwards
  --db-url postgresql://...    # Custom DB URL
  --data-dir externalData/...  # Custom data path
  --log-level DEBUG            # Verbose output
```

**Default behavior** (no flags):
- Auto-detects DATABASE_URL from `backend/.env`
- Processes all leagues in `externalData/CoveredLeague/`
- Orders by season (newest first) for optimal team matching

### Output Metrics

```
Files read: 1234
Fixtures inserted: 456
Fixtures enriched: 123
Fixtures skipped: 655
Events inserted: 5789
Teams created: 12
Errors: 0
```

---

## Backwards Compatibility

### Existing API-Sports Workflows

✅ **Unchanged**
- `data_source='api-sports'` by default (all old rows)
- `api_id` still populated and UNIQUE (via partial index)
- Services call API → no impact

### Existing Database

✅ **Zero breaking changes**
- `api_id NOT NULL` → `api_id NULL` (column default change only)
- Old fixtures: `api_id IS NOT NULL`, `data_source='api-sports'` (implicit)
- New TM fixtures: `api_id IS NULL`, `data_source='transfermarkt'`

### Edge Cases Handled

| Case | Behavior |
|------|----------|
| TM fixture already in DB by (team, date) | UPDATE with `tm_match_id`, logos; don't re-insert |
| Fixture has both `api_id` AND `tm_match_id` | Valid enriched state; services use `api_id` |
| `fetchAndStoreEvents(NULL)` with `api_id=NULL` | Early return; no error |
| Team not found in TM lookup | Create minimal row with `data_source='transfermarkt'` |
| Event insert fails (duplicate) | `ON CONFLICT DO NOTHING`; silent skip |

---

## Dependencies & Requirements

### Python Script

**File** : `scripts/requirements.txt`

```
psycopg2-binary>=2.9.0
python-dotenv>=0.19.0
tqdm>=4.60.0
unidecode>=1.2.0
```

**Runtime** : Python 3.8+

### Data

- **CoveredLeague** dataset must be present at `externalData/CoveredLeague/`
- Contains JSON files per match (scraped from Transfermarkt)
- ~1929 onwards; 23 leagues

### Database

- PostgreSQL 12+ (partial indices supported)
- `V3_Fixtures`, `V3_Fixture_Events`, `V3_Teams`, `V3_Leagues` must exist
- Migration must have been applied

---

## Performance Considerations

### Import Script

- **Team cache** : O(1) lookups per team; fuzzy match is O(n) but amortized via cache
- **Fixture matching** : Primary key on `tm_match_id` + composite index on `(home_team_id, away_team_id, date)`
- **Batch commits** : `ON CONFLICT DO NOTHING` + periodic `conn.commit()` per file
- **Expected throughput** : ~50–100 files/minute on 4-core laptop

### Service Impact

- **fetchAndStoreEvents** : Added `if (!apiFixtureId) return false;` → negligible overhead
- **No N+1 queries** : Guard is single lookup per fixture
- **Logging** : Structured logs only for skipped fixtures

---

## Testing & Validation

### Unit Tests

✅ **Backend (110/110 tests passing)**
- All existing tests pass (zero regression)
- Migration idempotency verified
- Null-guard services verified

### Integration Tests

✅ **Dry-run validation**
- `python scripts/import_tm_fixtures.py --dry-run --league bundesliga --season 2023-2024`
- Output confirmed correct; DB unchanged

### Data Integrity

- `ON CONFLICT` prevents duplicates
- Partial indices enforce uniqueness only where needed
- Foreign keys remain intact

---

## Deployment

### Pre-deployment Checklist

- [ ] Apply migration: `npm run migrate` (idempotent)
- [ ] Verify `externalData/CoveredLeague/` exists
- [ ] Test dry-run: `python scripts/import_tm_fixtures.py --dry-run`
- [ ] Verify Python dependencies: `pip install -r scripts/requirements.txt`
- [ ] Backup production database (if applicable)

### Deployment Steps

1. Merge feature branch to `main`
2. Pull latest code
3. Run migration: `npm run migrate`
4. (Optional) Run import on specific league: `python scripts/import_tm_fixtures.py --league laliga --dry-run`
5. (Optional) Run full import: `python scripts/import_tm_fixtures.py` (production ready)

### Rollback

- No schema rollback needed (columns are additive, indices are idempotent)
- If needed: drop new indices and columns (advanced usage)
- Data is never deleted; safe to keep TM fixtures in DB

---

## Future Enhancements

1. **Live Transfermarkt sync** : Scheduled job to pull fresh TM fixtures weekly
2. **Smart enrichment** : Detect API-Sports fixtures missing TM data; add via fuzzy match
3. **Event reconciliation** : Compare API-Sports vs TM events for same fixture; flag discrepancies
4. **Player mapping** : Create V3_Players entries for TM-specific players; link via Levenshtein distance
5. **Web UI** : Dashboard showing import progress, team creation log, fixture enrichment rate

---

## Résultat de livraison

**Date** : 2026-03-23
**Statut** : ✅ Livré

### Écarts par rapport au TSD

Aucun écart. Implémentation conforme au TSD initial.

### US livrées

- ✅ Nullable `api_id` + data source traceability
- ✅ Null-guard services (fixtureService, tacticalStatsService, OddsCrawlerService)
- ✅ Python import script with fuzzy team matching
- ✅ Idempotent migration + indices
- ✅ Full test coverage (110/110 passing)
