📂 Created User Stories (/UserStories/V13-Import-Optimization/)

Feature Name: Smart Import System Optimization
Version: V13
Global Feature Type: Architecture Upgrade / Performance Optimization
Scope: Full Stack (Backend + Frontend + Data)

---

## Context & Business Rationale

The current import system consumes API calls (API-Football, capped at 440 req/min and daily quotas) without intelligence. It does not distinguish between "data not yet imported", "data confirmed not available", and "season fully done — never touch again". This leads to:

- **Wasted API calls** on seasons/pillars with no data (especially FS/PS on older seasons).
- **Re-processing** of already-complete seasons during batch or deep sync operations.
- **No feedback loop** when the API returns empty — the system tries again next time.

This feature introduces a **Status Registry**, **smart import guards**, **consecutive failure detection**, **historical range inference**, and **UI state improvements** to drastically reduce unnecessary API consumption while maintaining full data completeness.

### Key Decisions (Validated by PO)

| Decision | Value |
|---|---|
| Status storage | New mapping table `V3_Import_Status` |
| FS/PS consecutive failure threshold | **10** (= 1 full matchday) |
| Historical range cutoff | 2 consecutive NO_DATA seasons → stop going back |
| Processing order | Most recent → oldest (always) |
| Normalize button | Keep as manual, rename to "Compute Per-90 Metrics" |
| Batch Tracker button | Remove |
| One-Click Deep Sync button | Remove |
| LOCKED status trigger | Programmatic only (auto-lock when all pillars COMPLETE) |
| Cups/Tournaments FS/PS | Same logic as leagues (no assumptions) |
| FS+PS combined pass | Yes — single fixture loop for both pillars |

---

## US_260: Import Status Registry — Database Schema

**Feature Type:** Architecture Upgrade

**Role:** Backend Developer

**Goal:**
Create a dedicated `V3_Import_Status` mapping table to track the import status of each data pillar for every league×season combination, replacing the current simplistic boolean flags with a rich status model that supports "DONE", "NO_DATA", and failure tracking.

**Core Task:**
Design and implement the `V3_Import_Status` table with status enum, failure counters, and audit timestamps. Migrate existing boolean flag data from `V3_League_Seasons` into the new table.

**Functional Requirements:**
- The table must store one row per `(league_id, season_year, pillar)` combination.
- Pillars are: `core`, `events`, `lineups`, `trophies`, `fs`, `ps`.
- Each row tracks:
  - `status`: Enum integer — `0=NONE`, `1=PARTIAL`, `2=COMPLETE`, `3=NO_DATA`, `4=LOCKED`
  - `consecutive_failures`: Counter for sequential empty API responses (primarily for FS/PS).
  - `last_checked_at`: Timestamp of last import attempt.
  - `last_success_at`: Timestamp of last successful data insertion.
  - `failure_reason`: Optional text explaining why status is NO_DATA (for debugging/audit).
  - `data_range_start`: First year with confirmed data (for range inference).
  - `data_range_end`: Last year with confirmed data (for range inference).
- On server startup, run a migration that:
  1. Creates the `V3_Import_Status` table if it doesn't exist.
  2. Back-populates it from existing `V3_League_Seasons` boolean flags (imported_fixtures=1 → status=COMPLETE for `core`, etc.).
  3. Existing boolean flags remain in `V3_League_Seasons` for backward compatibility but are no longer the source of truth.

**Technical Requirements:**

- **Table Schema:**
```sql
CREATE TABLE IF NOT EXISTS V3_Import_Status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER NOT NULL,
    season_year INTEGER NOT NULL,
    pillar TEXT NOT NULL CHECK(pillar IN ('core', 'events', 'lineups', 'trophies', 'fs', 'ps')),
    status INTEGER NOT NULL DEFAULT 0 CHECK(status IN (0, 1, 2, 3, 4)),
    consecutive_failures INTEGER DEFAULT 0,
    total_items_expected INTEGER,
    total_items_imported INTEGER DEFAULT 0,
    last_checked_at DATETIME,
    last_success_at DATETIME,
    failure_reason TEXT,
    data_range_start INTEGER,
    data_range_end INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
    UNIQUE(league_id, season_year, pillar)
);
CREATE INDEX idx_import_status_league_season ON V3_Import_Status(league_id, season_year);
CREATE INDEX idx_import_status_pillar ON V3_Import_Status(pillar, status);
```

- **Status Constants (backend utility):**
```javascript
export const IMPORT_STATUS = {
    NONE: 0,      // Grey   — Never attempted
    PARTIAL: 1,   // Orange — Some data exists, import incomplete
    COMPLETE: 2,  // Green  — Fully imported
    NO_DATA: 3,   // Black  — API confirmed no data available
    LOCKED: 4     // Green+Lock — Season done, no future calls allowed
};
```

- **Migration service** in `server.js` migrations array.
- **Back-population query** must map:
  - `imported_fixtures = 1 AND imported_standings = 1 AND imported_players = 1` → core = COMPLETE
  - `imported_fixtures = 1 AND (imported_standings = 0 OR imported_players = 0)` → core = PARTIAL
  - `imported_events = 1` → events = COMPLETE
  - `imported_lineups = 1` → lineups = COMPLETE
  - `imported_trophies = 1` → trophies = COMPLETE
  - `imported_fixture_stats = 1` → fs = COMPLETE
  - `imported_player_stats = 1` → ps = COMPLETE
  - All other cases → NONE (0)

**Acceptance Criteria:**
- [ ] `V3_Import_Status` table is created on server startup.
- [ ] Existing flag data is correctly migrated into the new table.
- [ ] UNIQUE constraint on `(league_id, season_year, pillar)` prevents duplicates.
- [ ] Status values are correctly constrained to 0-4.
- [ ] No regression on existing import functionality.
- [ ] Old boolean flags in `V3_League_Seasons` are still updated for backward compatibility during transition period.

---

## US_261: Import Status Service — CRUD & Query Layer

**Feature Type:** Architecture Upgrade

**Role:** Backend Developer

**Goal:**
Create a centralized `ImportStatusService` that all import services use to read/write import status, replacing direct boolean flag manipulation scattered across multiple files.

**Core Task:**
Build a service module (`importStatusService.js`) with clear read/write methods that encapsulate all status logic, including the auto-lock mechanism.

**Functional Requirements:**
- `getStatus(leagueId, seasonYear, pillar)` → Returns current status object or creates NONE entry if missing.
- `setStatus(leagueId, seasonYear, pillar, status, metadata?)` → Updates status with optional metadata (failure_reason, item counts).
- `incrementFailure(leagueId, seasonYear, pillar)` → Increments `consecutive_failures`. If threshold reached (10 for FS/PS), auto-sets status to NO_DATA.
- `resetFailures(leagueId, seasonYear, pillar)` → Resets counter to 0 on successful import.
- `checkAutoLock(leagueId, seasonYear)` → Checks if ALL 6 pillars are COMPLETE or NO_DATA. If yes, sets all COMPLETE pillars to LOCKED.
- `getLeagueMatrix(leagueId?)` → Returns full matrix data for one or all leagues (replaces current `getImportMatrixStatus` query).
- `shouldSkip(leagueId, seasonYear, pillar)` → Returns true if status is COMPLETE, LOCKED, or NO_DATA.
- `getDataRange(leagueId, pillar)` → Returns `{start, end}` year range where data exists for a given league/pillar.

**Technical Requirements:**
- All existing import services (`leagueImportService.js`, `deepSyncService.js`, `tacticalStatsService.js`, `fixtureService.js`) must be refactored to use `ImportStatusService` instead of directly updating `V3_League_Seasons` booleans.
- The auto-lock check must run after every status change to COMPLETE or NO_DATA.
- Backward compatibility: also update old `V3_League_Seasons` boolean flags when status changes (transition period).
- All methods must be synchronous-safe (using `better-sqlite3` / `sql.js` sync API).

**Acceptance Criteria:**
- [ ] All import services use `ImportStatusService` exclusively for status management.
- [ ] Auto-lock triggers correctly when all 6 pillars reach terminal state (COMPLETE or NO_DATA).
- [ ] `shouldSkip()` prevents any API call for LOCKED/COMPLETE/NO_DATA pillars.
- [ ] Old boolean flags remain in sync during transition.
- [ ] No duplicate status entries can be created.

---

## US_262: Smart Import Guard — Core, Events & Lineups

**Feature Type:** Performance Optimization

**Role:** Backend Developer

**Goal:**
Implement intelligent pre-import checks for Core, Events, and Lineups pillars that prevent wasted API calls by respecting the status registry and performing surgical partial repairs instead of full re-imports.

**Core Task:**
Modify `runImportJob`, `syncLeagueEventsService`, `syncSeasonLineups`, and `syncSeasonTrophies` to consult `ImportStatusService.shouldSkip()` before any API call, and to update status accurately based on results.

**Functional Requirements:**

**Core Pillar Guard:**
- Before calling any API endpoint for a season, check `shouldSkip('core')`.
- If status is LOCKED or COMPLETE → skip entirely, zero API calls.
- If status is PARTIAL → **only call the specific missing sub-pillar**:
  - Missing standings only? → Call `getStandings()` only (1 API call instead of 5+).
  - Missing fixtures only? → Call `getFixtures()` only.
  - Missing players only? → Call player endpoints only.
- If status is NONE → Full import (current behavior).
- If API returns empty for all sub-pillars → Set status to NO_DATA (black).
- On successful full import → Set status to COMPLETE.

**Events Pillar Guard:**
- Check `shouldSkip('events')` before processing.
- If LOCKED/COMPLETE/NO_DATA → skip.
- If attempting import and API returns no events for any fixture → count as potential NO_DATA.
- Use the same 10-consecutive-failure threshold: if 10 fixtures in a row have no events, mark as NO_DATA.
- On successful sync with > 0 events → Set status to COMPLETE.

**Lineups Pillar Guard:**
- Same logic as Events.
- Check `shouldSkip('lineups')`.
- 10 consecutive failures → NO_DATA.

**Trophies Pillar Guard:**
- Check `shouldSkip('trophies')`.
- If no players found (empty squad) → NO_DATA.
- On successful sync → COMPLETE.

**Technical Requirements:**
- `leagueImportService.js` → `runImportJob()` must query status before each sub-task.
- `deepSyncService.js` → `runDeepSyncLeague()` must respect all guards per pillar.
- `fixtureService.js` → `syncLeagueEventsService()` must track consecutive failures.
- `deepSyncService.js` → `syncSeasonLineups()` must track consecutive failures.
- Log clearly when skipping (e.g., `"[C] SKIPPED — Status: LOCKED (Season 2022)"`).
- Update `ImportStatusService` after every operation.

**Acceptance Criteria:**
- [ ] LOCKED seasons generate zero API calls for any pillar.
- [ ] COMPLETE seasons generate zero API calls for that pillar.
- [ ] NO_DATA seasons generate zero API calls for that pillar.
- [ ] PARTIAL core imports only call the specific missing endpoint(s).
- [ ] Empty API responses correctly transition status to NO_DATA.
- [ ] Successful imports correctly transition status to COMPLETE.
- [ ] Logs clearly indicate skip reasons.

---

## US_263: FS/PS Consecutive Failure Auto-Blacklisting

**Feature Type:** Performance Optimization

**Role:** Backend Developer

**Goal:**
Implement a consecutive failure counter for Fixture Stats (FS) and Player Stats (PS) imports that automatically blacklists a season after **10 consecutive fixtures** return no data, preventing hundreds of wasted API calls on seasons without granular statistics.

**Core Task:**
Modify `syncLeagueFixtureStatsService` and `syncLeaguePlayerStatsService` in `tacticalStatsService.js` to track consecutive empty responses per season and auto-set NO_DATA status when threshold is reached.

**Functional Requirements:**
- For each fixture processed during FS or PS import:
  - If the API returns data → reset `consecutive_failures` to 0, increment `total_items_imported`.
  - If the API returns empty (`No FS/PS data for fixture xxx`) → increment `consecutive_failures` by 1.
- If `consecutive_failures` reaches **10** (one full matchday):
  - Stop processing remaining fixtures for this season.
  - Set pillar status to `NO_DATA` with `failure_reason = "10 consecutive fixtures returned no data (auto-blacklisted)"`.
  - Log clearly: `"⛔ Auto-Blacklisted: FS for League X / Season Y — 10 consecutive empty responses"`.
- The threshold of 10 must be a configurable constant (`CONSECUTIVE_FAILURE_THRESHOLD = 10`).
- If some fixtures had data before the 10 consecutive failures, mark as PARTIAL (not NO_DATA) — the blacklist only applies if we hit 10 in a row **from the start** or if remaining fixtures are all empty.

**Technical Requirements:**
- Modify `fetchAndStoreFixtureStats()` to return a boolean indicating success (data found) vs. empty.
- Modify `fetchAndStorePlayerStats()` to return a boolean indicating success vs. empty.
- In `syncLeagueFixtureStatsService()` loop:
  ```javascript
  let consecutiveFailures = 0;
  for (const fixture of targetFixtures) {
      const hasData = await fetchAndStoreFixtureStats(fixture.fixture_id, fixture.api_id);
      if (hasData) {
          consecutiveFailures = 0;
          success++;
      } else {
          consecutiveFailures++;
          if (consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
              // Auto-blacklist
              ImportStatusService.setStatus(leagueId, seasonYear, 'fs', IMPORT_STATUS.NO_DATA, {
                  failure_reason: `${CONSECUTIVE_FAILURE_THRESHOLD} consecutive fixtures returned no data`
              });
              break;
          }
      }
  }
  ```
- Same pattern for `syncLeaguePlayerStatsService()`.
- Update `ImportStatusService` with final status after loop completes.

**Acceptance Criteria:**
- [ ] After 10 consecutive empty FS responses, import stops and season is marked NO_DATA.
- [ ] After 10 consecutive empty PS responses, import stops and season is marked NO_DATA.
- [ ] Counter resets to 0 whenever a fixture has data.
- [ ] If some data was imported before blacklist trigger, status reflects PARTIAL or NO_DATA correctly.
- [ ] Threshold is a named constant, easy to adjust.
- [ ] Blacklisted seasons are never re-processed unless manually overridden.
- [ ] Logs clearly indicate the auto-blacklist event.

---

## US_264: Historical Range Inference Engine

**Feature Type:** Performance Optimization

**Role:** Backend Developer

**Goal:**
Implement a historical range inference system that detects the data availability boundary for FS and PS per league, and automatically blacklists older seasons beyond that boundary — preventing thousands of wasted API calls on historical data that doesn't exist.

**Core Task:**
Build a range detection algorithm that processes seasons from most recent to oldest and stops (+ blacklists remaining seasons) after 2 consecutive seasons return NO_DATA.

**Functional Requirements:**
- When processing FS or PS for a league, **always process seasons from most recent to oldest**.
- Track a `noDataStreak` counter per league/pillar.
- If a season completes as `NO_DATA` → increment `noDataStreak`.
- If a season completes as `COMPLETE` or `PARTIAL` → reset `noDataStreak` to 0, record this year in `data_range_start`.
- If `noDataStreak >= 2`:
  - **Stop processing older seasons entirely.**
  - Auto-blacklist ALL remaining (older) seasons for that pillar with status `NO_DATA` and `failure_reason = "Inferred from historical range: no data exists before {year}"`.
  - Update `data_range_start` and `data_range_end` in the status registry for audit trail.
- Example flow:
  ```
  2025: FS → COMPLETE (noDataStreak=0, range_end=2025)
  2024: FS → COMPLETE (noDataStreak=0)
  2023: FS → COMPLETE (noDataStreak=0, range_start=2023)
  2022: FS → NO_DATA  (noDataStreak=1)
  2021: FS → NO_DATA  (noDataStreak=2) → STOP
  2020-2010: FS → AUTO-BLACKLISTED (NO_DATA, inferred)
  ```
- The range detection results must be persisted in `V3_Import_Status` for display in the matrix UI.
- **Cross-pillar inference:** If FS is NO_DATA for a season, **suggest** (but don't force) PS as NO_DATA. This can be implemented as a pre-check: before starting PS import for a season, check if FS is NO_DATA — if yes, try only 3 fixtures before blacklisting (reduced threshold).

**Technical Requirements:**
- Modify `deepSyncService.js` → `runDeepSyncLeague()` to implement range inference when iterating seasons for FS/PS pillars.
- The seasons query must be ordered `ORDER BY season_year DESC` (most recent first).
- Create a helper function `inferHistoricalRange(leagueId, pillar)` that:
  1. Reads existing `V3_Import_Status` entries for the league/pillar.
  2. Identifies the data boundary.
  3. Bulk-inserts `NO_DATA` entries for all older seasons.
- `data_range_start` and `data_range_end` columns in `V3_Import_Status` must be updated.
- Cross-pillar pre-check: When FS is NO_DATA and PS is about to start, reduce PS threshold from 10 to 3.

**Acceptance Criteria:**
- [ ] Seasons are always processed newest → oldest for FS and PS.
- [ ] After 2 consecutive NO_DATA seasons, all older seasons are auto-blacklisted.
- [ ] Auto-blacklisted seasons generate zero API calls on future runs.
- [ ] Data range (start/end years) is correctly recorded.
- [ ] Cross-pillar inference reduces PS threshold when FS is already NO_DATA.
- [ ] The inference can be overridden manually if needed (by resetting status to NONE).

---

## US_265: Combined FS+PS Single-Pass Import

**Feature Type:** Performance Optimization

**Role:** Backend Developer

**Goal:**
Merge the Fixture Stats (FS) and Player Stats (PS) import loops into a single fixture iteration, eliminating redundant fixture list traversal and enabling shared failure tracking.

**Core Task:**
Create a new `syncLeagueTacticalStatsService()` function that processes both FS and PS for each fixture in a single pass, reducing total processing time and enabling shared consecutive failure detection.

**Functional Requirements:**
- Instead of two separate loops over the same fixture list (one for FS, one for PS), iterate once:
  ```
  For each fixture:
    1. Check if FS is needed → if yes, fetch FS
    2. Check if PS is needed → if yes, fetch PS
    3. Track consecutive failures independently for each pillar
  ```
- If only one pillar is needed (e.g., FS already COMPLETE but PS is not), only fetch that pillar.
- If both are needed, make both API calls per fixture (2 calls per fixture, but 1 traversal).
- Shared intelligence: If FS returns empty AND PS returns empty for the same fixture, count it as a failure for both counters simultaneously.
- The combined function replaces separate calls to `syncLeagueFixtureStatsService` and `syncLeaguePlayerStatsService` in `deepSyncService.js`.

**Technical Requirements:**
- New function signature:
  ```javascript
  export async function syncLeagueTacticalStatsService(
      leagueId, seasonYear, limit, sendLog,
      options = { includeFS: true, includePS: true }
  )
  ```
- The function must:
  1. Query fixtures missing FS data (LEFT JOIN on `V3_Fixture_Stats`).
  2. Query fixtures missing PS data (LEFT JOIN on `V3_Fixture_Player_Stats`).
  3. Merge both lists into a unified target set.
  4. For each fixture, call the relevant fetch function(s).
  5. Track separate `consecutiveFailures_FS` and `consecutiveFailures_PS`.
  6. Apply the 10-threshold independently per pillar.
- Keep the original `syncLeagueFixtureStatsService` and `syncLeaguePlayerStatsService` as thin wrappers for backward compatibility (they call `syncLeagueTacticalStatsService` with single-pillar options).
- Rate limiting: Use the same 50ms delay between fixtures.

**Acceptance Criteria:**
- [ ] FS and PS are processed in a single fixture loop when both are needed.
- [ ] Individual pillar skipping works (only FS, only PS, or both).
- [ ] Consecutive failure counters are independent per pillar.
- [ ] Total fixture traversal count is reduced by ~50% when both pillars are needed.
- [ ] Backward-compatible wrappers still work for single-pillar calls.
- [ ] Progress events (SSE) correctly report combined progress.

---

## US_266: Matrix API — Status-Aware Endpoint

**Feature Type:** Refactor

**Role:** Backend Developer

**Goal:**
Refactor the `/api/v3/import/matrix-status` endpoint to read from the new `V3_Import_Status` table instead of boolean flags, enabling the frontend to display the new 5-state color model (NONE/PARTIAL/COMPLETE/NO_DATA/LOCKED).

**Core Task:**
Rewrite `getImportMatrixStatus()` in `importMatrixController.js` to query `V3_Import_Status` and return enriched status objects with status codes, failure counts, and data range information.

**Functional Requirements:**
- The response shape per season must change from:
  ```json
  {
      "status": { "core": 1, "events": 0, "lineups": 0.5, "fs": 0, "ps": 0 }
  }
  ```
  To:
  ```json
  {
      "status": {
          "core":    { "code": 2, "label": "COMPLETE", "lastSync": "2025-01-15T..." },
          "events":  { "code": 4, "label": "LOCKED", "lastSync": "2025-01-15T..." },
          "lineups": { "code": 1, "label": "PARTIAL", "lastSync": "2025-01-10T..." },
          "trophies":{ "code": 0, "label": "NONE", "lastSync": null },
          "fs":      { "code": 3, "label": "NO_DATA", "lastSync": null, "reason": "10 consecutive failures" },
          "ps":      { "code": 3, "label": "NO_DATA", "lastSync": null, "reason": "Inferred from range" }
      }
  }
  ```
- Include an aggregate `seasonLocked` boolean if ALL pillars are LOCKED.
- Include a `dataRange` object per league: `{ fs: { start: 2020, end: 2025 }, ps: { start: 2020, end: 2025 } }`.

**Technical Requirements:**
- Query `V3_Import_Status` LEFT JOINed with `V3_League_Seasons`.
- Group by league, then by season, then pivot pillars into the status object.
- Maintain backward compatibility: if `V3_Import_Status` has no entry for a season/pillar, fall back to the old boolean flags.
- Performance: Use a single SQL query with GROUP_CONCAT or multiple LEFT JOINs to avoid N+1 queries.

**Acceptance Criteria:**
- [ ] API returns the new enriched status format.
- [ ] All 5 status codes (0-4) are correctly represented.
- [ ] `seasonLocked` flag is accurate.
- [ ] Data range information is included per league/pillar.
- [ ] Response time remains under 200ms for 20+ leagues.
- [ ] No regression — frontend must still function if old format is returned during migration.

---

## US_267: Matrix UI — 5-State Visual Model & Cleanup

**Feature Type:** UX Improvement

**Role:** Frontend Developer

**Goal:**
Update the Import Matrix frontend to display the new 5-state color model (NONE → Grey, PARTIAL → Orange, COMPLETE → Green, NO_DATA → Black, LOCKED → Green+Lock), remove deprecated buttons, and rename the Normalize button.

**Core Task:**
Modify `ImportMatrixPage.jsx` and `ImportMatrix.css` to consume the new API response format and render the new visual states.

**Functional Requirements:**

**New Color States:**
| Status Code | Label | CSS Class | Visual |
|---|---|---|---|
| 0 | NONE | `indicator-none` | Grey background, no icon |
| 1 | PARTIAL | `indicator-partial` | Orange background, pulse animation |
| 2 | COMPLETE | `indicator-complete` | Green background |
| 3 | NO_DATA | `indicator-nodata` | Black/dark background, dash icon or "—" |
| 4 | LOCKED | `indicator-locked` | Green background + lock icon 🔒 |

**Tooltip Enhancement:**
- NONE: `"Not imported yet"`
- PARTIAL: `"Partially imported — Last sync: {date}"`
- COMPLETE: `"Fully imported — Last sync: {date}"`
- NO_DATA: `"No data available — Reason: {reason}"`
- LOCKED: `"Season complete & locked — No further imports"`

**Button Changes:**
- **REMOVE** the ⚡ "One-Click Deep Sync" button per league row.
- **REMOVE** the 📊 "Batch Tracker" button from the header.
- **RENAME** the 🧮 "Normalize" button to 🧮 "Compute Per-90 Metrics" (keep existing functionality).
- **REMOVE** the "Normalize" duplicate in the staging bar (line 344).

**Interaction Rules:**
- LOCKED and NO_DATA indicators must NOT be clickable (no toggling into batch queue).
- Only NONE and PARTIAL indicators should be clickable for batch queue addition.
- COMPLETE indicators can be clicked but should show a confirmation: "This pillar is already complete. Re-import anyway?"

**Technical Requirements:**
- Update `getIndicatorClass()` to handle status codes 0-4 instead of float values.
- Add new CSS classes: `.indicator-nodata`, `.indicator-locked`.
- Update tooltip rendering to use the new status object shape.
- Parse the new `status.{pillar}.code` format from API response.
- Add graceful fallback: if API returns old format (number instead of object), treat as before.

**Acceptance Criteria:**
- [ ] All 5 status states render with correct colors and icons.
- [ ] LOCKED seasons show a lock icon overlay.
- [ ] NO_DATA seasons show a black/dark indicator.
- [ ] Tooltips display the correct status label, timestamp, and reason.
- [ ] "One-Click Deep Sync" button is removed from every league row.
- [ ] "Batch Tracker" button is removed from the header.
- [ ] "Normalize" button is renamed to "Compute Per-90 Metrics".
- [ ] LOCKED/NO_DATA cells are not clickable.
- [ ] No regression on existing batch queue functionality for NONE/PARTIAL cells.

---

## US_268: Audit Service Upgrade — Smart Discovery Scan

**Feature Type:** Refactor

**Role:** Backend Developer

**Goal:**
Upgrade the Discovery Scan (`auditService.js`) to populate the new `V3_Import_Status` table and detect PARTIAL vs. COMPLETE states more accurately by comparing imported item counts against expected totals.

**Core Task:**
Rewrite `performDiscoveryScan()` to use `ImportStatusService` and compute accurate completion ratios.

**Functional Requirements:**
- For each league/season, the scan must:
  1. Count total fixtures in `V3_Fixtures` (expected baseline).
  2. For each pillar, count actual imported items:
     - Core: fixtures + standings + player_stats entries.
     - Events: fixtures WITH events / total finished fixtures.
     - Lineups: fixtures WITH lineups / total finished fixtures.
     - FS: fixtures WITH fixture_stats / total finished fixtures.
     - PS: fixtures WITH player_stats / total finished fixtures.
  3. Compute ratio: `imported / expected`.
  4. Set status:
     - Ratio = 0 → NONE
     - 0 < Ratio < 0.95 → PARTIAL (with `total_items_expected` and `total_items_imported` recorded)
     - Ratio >= 0.95 → COMPLETE (allowing for cancelled/postponed matches)
  5. Existing NO_DATA and LOCKED statuses must NOT be overwritten by the scan.
- The scan must trigger `checkAutoLock()` after processing each season.

**Technical Requirements:**
- Use `ImportStatusService.setStatus()` for all updates.
- Skip any season/pillar with status LOCKED or NO_DATA (preserve manual/auto decisions).
- Record `total_items_expected` and `total_items_imported` for transparency.
- Log summary: `"Scan complete: X seasons updated, Y auto-locked, Z already locked"`.

**Acceptance Criteria:**
- [ ] Discovery Scan correctly populates `V3_Import_Status` with accurate status codes.
- [ ] PARTIAL status includes item count data (expected vs. imported).
- [ ] LOCKED and NO_DATA statuses are never overwritten.
- [ ] Auto-lock triggers for newly COMPLETE seasons.
- [ ] Scan completes in under 5 seconds for 20 leagues × 15 seasons.

---

## US_269: Deep Sync Refactor — Status-Aware Orchestration

**Feature Type:** Refactor

**Role:** Backend Developer

**Goal:**
Refactor `runDeepSyncLeague()` in `deepSyncService.js` to leverage the full power of the Import Status Registry and the new smart import guards, ensuring zero wasted API calls and proper orchestration order.

**Core Task:**
Rewrite the deep sync loop to consult `ImportStatusService` before every pillar, process FS/PS using the combined single-pass function (US_265), and apply historical range inference (US_264).

**Functional Requirements:**
- **Pre-flight:** Before processing any season, fetch all `V3_Import_Status` entries for the league.
- **Skip locked seasons entirely** — log `"⏩ Season {year} is LOCKED. Skipping all pillars."`.
- **Per-pillar skip:** For each season, check each pillar status individually.
- **Processing order:** Always iterate seasons from newest to oldest.
- **FS+PS combined:** Use `syncLeagueTacticalStatsService()` (US_265) instead of separate FS/PS calls.
- **Range inference:** Apply US_264 logic for FS/PS — track `noDataStreak` across seasons.
- **Progress reporting:** SSE progress events must include:
  - Total seasons to process (excluding locked/skipped).
  - Current pillar being processed.
  - Skip reason when applicable.
- **Post-sync:** Re-run `checkAutoLock()` for all processed seasons.

**Technical Requirements:**
- Remove the "One-Click Deep Sync" HTTP endpoint (`triggerDeepSync`) from `importMatrixController.js`.
- Keep `triggerBatchDeepSync` but refactor it to use the new status-aware logic.
- The batch deep sync remains the primary mechanism for multi-league imports.
- Remove Pillar 4 (Trophies) skip placeholder — actually process or skip based on status.

**Acceptance Criteria:**
- [ ] LOCKED seasons produce zero API calls.
- [ ] NO_DATA pillars produce zero API calls.
- [ ] FS/PS use combined single-pass when both are needed.
- [ ] Historical range inference stops processing older seasons after 2× NO_DATA.
- [ ] SSE progress accurately reflects only actionable work (no counting skipped items).
- [ ] `triggerDeepSync` single-league endpoint is removed.
- [ ] `triggerBatchDeepSync` works correctly with new logic.

---

## US_270: Import Status Manual Override API

**Feature Type:** Enhancement

**Role:** Backend Developer

**Goal:**
Provide an API endpoint for manually resetting a pillar's status (e.g., from NO_DATA or LOCKED back to NONE), enabling operators to force re-import if the auto-detection was wrong.

**Core Task:**
Create a `POST /api/v3/import/status/reset` endpoint that resets a specific pillar status.

**Functional Requirements:**
- Endpoint: `POST /api/v3/import/status/reset`
- Body: `{ leagueId, seasonYear, pillar, reason? }`
- Action:
  1. Set status to NONE (0).
  2. Reset `consecutive_failures` to 0.
  3. Clear `failure_reason`.
  4. Log the override: `"⚠️ Manual override: {pillar} for League {id} / Season {year} reset to NONE. Reason: {reason}"`.
- If a season was LOCKED, unlocking one pillar must un-LOCK all pillars for that season (revert them to COMPLETE, since LOCKED means "all done").
- Optional `resetAll` flag to reset ALL pillars for a league/season.

**Technical Requirements:**
- New controller method in `importMatrixController.js`.
- Use `ImportStatusService.setStatus()`.
- Must also update old `V3_League_Seasons` boolean flags (set imported_* = 0 for the reset pillar).

**Acceptance Criteria:**
- [ ] Reset endpoint correctly changes status from any state to NONE.
- [ ] Consecutive failures counter is reset.
- [ ] Un-locking one pillar reverts all LOCKED pillars to COMPLETE for that season.
- [ ] Reset is logged for audit trail.
- [ ] The matrix UI reflects the change immediately after refresh.

---

### 📋 User Story & Agent Allocation

| US ID | Title | Feature Type | Primary Agent | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **US_260** | Import Status Registry — Database Schema | Architecture Upgrade | Backend | 🔴 P0 (Foundation) |
| **US_261** | Import Status Service — CRUD & Query Layer | Architecture Upgrade | Backend | 🔴 P0 (Foundation) |
| **US_262** | Smart Import Guard — Core, Events & Lineups | Performance Optimization | Backend | 🟠 P1 |
| **US_263** | FS/PS Consecutive Failure Auto-Blacklisting | Performance Optimization | Backend | 🟠 P1 |
| **US_264** | Historical Range Inference Engine | Performance Optimization | Backend | 🟠 P1 |
| **US_265** | Combined FS+PS Single-Pass Import | Performance Optimization | Backend | 🟡 P2 |
| **US_266** | Matrix API — Status-Aware Endpoint | Refactor | Backend | 🟠 P1 |
| **US_267** | Matrix UI — 5-State Visual Model & Cleanup | UX Improvement | Frontend | 🟠 P1 |
| **US_268** | Audit Service Upgrade — Smart Discovery Scan | Refactor | Backend | 🟡 P2 |
| **US_269** | Deep Sync Refactor — Status-Aware Orchestration | Refactor | Backend | 🟠 P1 |
| **US_270** | Import Status Manual Override API | Enhancement | Backend | 🟡 P2 |

### Recommended Execution Order

```
Phase 1 — Foundation (Must be first):
  US_260 → US_261

Phase 2 — Smart Guards (Can be parallelized):
  US_262 + US_263 + US_264

Phase 3 — Combined optimization:
  US_265

Phase 4 — API & UI (After backend is stable):
  US_266 → US_267

Phase 5 — Polish:
  US_268 + US_269 + US_270
```

---

## 🔍 Audit & Assumptions

**Current system limitations identified:**
- Boolean flags (`imported_*`) have no concept of "confirmed missing" vs. "not yet attempted", leading to infinite retry loops on data that will never exist.
- The FS/PS imports for older seasons (pre-2018) on many leagues burn 300-400 API calls per season with zero return — the data simply doesn't exist on API-Football for those years.
- The "One-Click Deep Sync" per league had no guard rails and could trigger thousands of calls.

**Technical debt detected:**
- Import status logic is scattered across 5+ files (`leagueImportService.js`, `deepSyncService.js`, `tacticalStatsService.js`, `auditService.js`, `importMatrixController.js`), all directly manipulating `V3_League_Seasons` booleans.
- The `imported_fixture_stats` and `imported_player_stats` columns were added via ALTER TABLE migrations in `server.js` but never added to the original schema file, creating schema documentation drift.

**Migration risks:**
- The back-population migration (US_260) must correctly interpret existing boolean states. A wrong mapping could incorrectly LOCK seasons.
- During the transition period, both old boolean flags and new `V3_Import_Status` table must be kept in sync.

**Dependencies between services:**
- US_261 depends on US_260 (table must exist).
- US_262/263/264 depend on US_261 (service must exist).
- US_265 depends on US_263 (failure tracking logic).
- US_266 depends on US_260 (new table).
- US_267 depends on US_266 (new API format).
- US_269 depends on US_262+263+264+265 (all guard features).

**Assumptions about DB schema integrity:**
- All `V3_League_Seasons` entries have a valid `league_id` reference.
- Seasons with `imported_*=1` actually have data in the corresponding tables (validated by audit scan).

**API reliability risks:**
- API-Football may return 429 (rate limit) errors which are handled by `apiQueue.js` but add latency.
- Empty responses are not errors — they indicate no data. The system must distinguish between "API error" and "genuinely no data".

**Performance risks:**
- The combined FS+PS loop (US_265) doubles the API calls per fixture iteration (2 instead of 1). This is offset by halving the loop iterations.
- The `V3_Import_Status` table adds a JOIN to the matrix query. With proper indexing, this should be negligible.

---

## 🎨 UX & Product Strategy

**Why this feature improves the product:**
- **API quota protection**: By preventing thousands of wasted calls, the daily/minute quota is preserved for actual useful imports, enabling more leagues to be imported in the same budget.
- **User trust**: The black (NO_DATA) state gives users immediate clarity — they know it's not a bug, the data simply doesn't exist.
- **Lock confidence**: LOCKED seasons give peace of mind — once done, never touched again.
- **Import speed**: Combined FS+PS passes and smart skipping can reduce total import time for a full league by 50-80%.

**Competitive benchmark:**
- This mirrors how professional data platforms (Opta, StatsBomb) handle data coverage — they publish explicit data availability matrices with clear "not covered" markers.

**Scalability:**
- As more leagues are added, the savings compound. 20 leagues × 15 seasons × 6 pillars = 1,800 status entries to manage. Without this system, each "batch sync" could burn 10,000+ useless API calls.

**Data integrity:**
- The status registry provides a single source of truth, eliminating conflicting boolean flags.
- The auto-lock mechanism ensures truly complete seasons are never accidentally modified.

**Technical debt reduction:**
- Centralizes all import status logic into `ImportStatusService`, replacing 5+ scattered implementations.
- Removes dead code (Batch Tracker button, Deep Sync single-league endpoint).

---

## 🛠 Hand-off Instruction for the Team

**ATTENTION AGENTS:**

### BE AGENT:
1. **Start with US_260** — Create `V3_Import_Status` table and add migration to `server.js`. Run back-population from existing boolean flags.
2. **Then US_261** — Build `ImportStatusService` with all CRUD methods. This is the **critical path** — all other US depend on this.
3. **Then US_262+263+264 in parallel** — Implement guards in each import service file. Each is independent.
4. **Then US_265** — Combine FS+PS loop in `tacticalStatsService.js`.
5. **Then US_266** — Refactor the matrix API endpoint to use new status format.
6. **Then US_268+269+270** — Polish: audit upgrade, deep sync refactor, manual override.
7. **Remove `triggerDeepSync` endpoint** from `importMatrixController.js` and its route.
8. **Keep backward compatibility** — Update old boolean flags alongside new status table during transition.

### FE AGENT:
1. **Wait for US_266** to be complete before starting US_267.
2. **Update `getIndicatorClass()`** to handle integer status codes (0-4).
3. **Add new CSS classes**: `.indicator-nodata` (dark/black), `.indicator-locked` (green + 🔒).
4. **Remove**: Deep Sync button per league, Batch Tracker button, duplicate Normalize in staging bar.
5. **Rename**: "Normalize" → "Compute Per-90 Metrics".
6. **Graceful degradation**: If API returns old format, fall back to current behavior.

### DATA AGENT:
1. **Back-population migration** must be tested on a copy of the production DB first.
2. **Verify**: Run Discovery Scan after migration to cross-check new status table vs. actual data.
3. **No orphan records**: Every `V3_League_Seasons` entry must have corresponding `V3_Import_Status` entries (6 per season).

### CRITICAL RULES:
- No legacy boolean-only updates. Always use `ImportStatusService`.
- No orphan DB records in `V3_Import_Status`.
- No null `pillar` or `status` fields.
- No duplicate `(league_id, season_year, pillar)` combinations.
- Zero regression tolerance on existing import functionality.
- All status changes must be logged for audit trail.
- Feature Types are explicitly declared in EACH User Story above.

---

## 📊 Estimated API Call Savings

| Scenario | Before | After | Savings |
|---|---|---|---|
| Full sync, 1 league, 15 seasons, FS pillar (no data pre-2020) | ~4,500 calls | ~1,500 calls | **67%** |
| Re-sync LOCKED league | ~3,000 calls | 0 calls | **100%** |
| Batch sync 10 leagues, mixed states | ~45,000 calls | ~12,000 calls | **73%** |
| Discovery Scan re-audit | ~0 (DB only) | ~0 (DB only) | Neutral |

## 📊 Definition of Done

The feature is complete when:
- `V3_Import_Status` table is operational and populated.
- All import services use `ImportStatusService` exclusively.
- Matrix UI displays 5 distinct status colors correctly.
- LOCKED seasons generate exactly 0 API calls.
- NO_DATA seasons generate exactly 0 API calls.
- FS/PS auto-blacklisting triggers after 10 consecutive failures.
- Historical range inference stops processing after 2× NO_DATA seasons.
- "One-Click Deep Sync" button is removed.
- "Batch Tracker" button is removed.
- "Normalize" is renamed to "Compute Per-90 Metrics".
