# Technical Specification: xG Data Integration (V32-Import-xG-Understat)

This feature aims to integrate historical xG (Expected Goals) data from Understat into the `statFootV3` project. The data includes both per-match details and compiled season/league statistics.

## Proposed Changes

### Database Schema (PostgreSQL)

To maintain consistency and allow for easy synchronization, we will add new columns to track the source and specific IDs from Understat.

#### [MODIFY] `V3_Fixtures`
- Add `understat_id`: INTEGER (Unique) - To link with Understat match data.
- Add `xg_home`: REAL - Expected goals for the home team.
- Add `xg_away`: REAL - Expected goals for the away team.

#### [NEW] `V3_League_Season_xG`
A dedicated table for granular xG statistics per league/season/team, designed for ML consumption.
- `id`: SERIAL PRIMARY KEY
- `league_id`: INTEGER
- `season_year`: INTEGER
- `team_id`: INTEGER
- `xg_for`: REAL
- `xg_against`: REAL
- `xg_points`: REAL
- `np_xg`: REAL (Non-Penalty xG)
- `ppda`: REAL
- `deep_completions`: INTEGER
- `raw_json`: JSONB - Storing the original "brut" record for full traceability and future ML features.

### Import Strategy

1. **Phase 1: Mapping Entities**
   - Create a mapping script to link `V3_Teams` with Understat team names.
   - Map `V3_Fixtures` with Understat matches using Date and Team names.

2. **Phase 2: Data Import**
   - Script to parse `xGData/understat/understat_*_all_matches.json` and update `V3_Fixtures`.
   - Script to parse `xGData/xG-PerYear-League-Player/` (compiled data) and populate `V3_League_Season_xG` while storing the `raw_json`.

3. **Phase 3: Logic Synchronization**
   - Ensure the `api_id` (from API-Football) and `understat_id` are both usable for lookups.
   - Use a "similarity" approach (Fuzzy matching) for team names if IDs are not directly available.

## Verification Plan

### Automated Tests
- Run `cd backend && npm test` to ensure no regressions in existing fixture logic.
- Create a new test suite `backend/test/v3/xg_import.test.js` to verify:
  - Correct parsing of Understat JSON files.
  - Successful mapping of teams and fixtures.
  - Data integrity after import (e.g., xG values match source).

### Manual Verification
- Query PostgreSQL to check for non-null `xg_home`/`xg_away` values in `V3_Fixtures`.
- Verify a sample of 10 matches manually against the Understat website.
