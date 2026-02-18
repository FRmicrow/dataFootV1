# IMPROVEMENT_26_V3_DB_POC_Country_Rank_Sync

## Develop this feature as Database Agent - Following the US related:
`IMPROVEMENT_26_V3_DB_POC_Country_Rank_Sync`

Sync the `importance_rank` from the V2 country data into the `V3_Countries` table so that league cards can be sorted by country priority.

---

**Role**: Database Expert Agent  
**Objective**: Ensure `V3_Countries` contains `importance_rank` for sorting.  
**Status**: ✅ DONE (2026-02-11)

## 📖 User Story
**As a** User,  
**I want** leagues to be sorted by country importance (France first, then England, etc.),  
**So that** the "League Data" page displays the most relevant leagues at the top.

## ✅ Acceptance Criteria

### 1. Schema Update
- [x] **Table**: `V3_Countries`
- [x] **Column**: Add `importance_rank` (INTEGER DEFAULT 999) if not yet present.
- [x] **Bonus Columns**: `continent` (TEXT), `flag_small_url` (TEXT).
- [x] **Schema File**: `02_V3_schema.sql` updated with the new columns.

### 2. Data Migration
- [x] **Script**: Created `backend/scripts/sync_v3_country_rank.js`.
- [x] **Logic**:
    - Reads `importance_rank`, `continent`, `flag_url`, `flag_small_url` from `V2_countries` (via `database.sqlite`).
    - Matches on `country_name` = `V3_Countries.name` (with alias table for discrepancies like `United States` → `USA`).
    - Updates `V3_Countries.importance_rank` with the V2 value.
    - Uses `COALESCE` to avoid overwriting existing flag URLs with NULL.
- [x] **Fallback**: Countries not found in V2 keep `importance_rank = 999`.
- [x] **Name Aliases**: Handles V2↔V3 naming differences: `United States`→`USA`, `Saudi Arabia`→`Saudi-Arabia`.

### 3. Verification
- [x] Run query: `SELECT name, importance_rank FROM V3_Countries ORDER BY importance_rank ASC LIMIT 10;`
- [x] Expected: England (1), Spain (2), Germany (3), Italy (4), France (5) at the top. ✅ Confirmed.

## 📊 Results
```
 1. England       rank = 1
 2. World         rank = 1
 3. Spain         rank = 2
 4. Germany       rank = 3
 5. Italy         rank = 4
 6. France        rank = 5
 7. Portugal      rank = 6
 8. Netherlands   rank = 7
 9. Belgium       rank = 8
10. Turkey        rank = 9
```
Total: **45** countries with explicit ranking, **remaining** countries default to 999.

## 🛠 Technical Notes
- **Source DB**: `backend/database.sqlite` → table `V2_countries`
- **Target DB**: `backend/database_v3_test.sqlite` → table `V3_Countries`
- **Script**: `backend/scripts/sync_v3_country_rank.js` (idempotent, safe to re-run)
- **Schema**: `backend/sql/schema/02_V3_schema.sql` (updated)
