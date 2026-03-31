# QA Report - V4 Club Logo Historization

## Summary
The "Club Logo Historization" feature allows teams to have different logos depending on the season. This is particularly useful for historical data (e.g., Bundesliga matches from 1963).

## Changes Made
- **Database**: 
    - Created `V4_Club_Logos` table to store `(team_id, logo_url, start_year, end_year)`.
    - Created index `idx_v4_club_logos_team_period`.
    - Normalized `V4_Fixtures`: `BundesligaFixtureDetail` converted to `Bundesliga`.
    - Seeded `V4_Club_Logos` with current data from `V4_Teams` (valid from 1900-NULL).
- **Backend**:
    - Updated `StandingsV4Service.js` to fetch logos based on the season of the fixture.
    - Updated `leagueControllerV4.js` (`getSeasonOverviewV4`, `getFixturesV4`, `getSeasonPlayersV4`) to fetch logos based on the requested season.
    - Added `ORDER BY start_year DESC` to subqueries to ensure the most specific historical logo is used if multiple periods overlap.

## Verification
### Automated Verification
Run the verification script inside the backend container:
```bash
docker-compose exec backend node src/scripts/v4-logo-verify.js
```
**Results**:
- 📡 Tested team: Arsenal FC (ID: 1)
- ✅ Dummy logo for 1963-1964 correctly returned when context is 1963.
- ✅ Default logo correctly returned when context is 2024.

### Manual Verification
1.  **League Page (Historical)**: Check Bundesliga 1963-1964. Logos should match records in `V4_Club_Logos`.
2.  **League Page (Modern)**: Check a modern season. Logos should fall back to the defaults in `V4_Teams` (via the 1900-NULL entry in `V4_Club_Logos`).

## Regressions
None expected. The use of `COALESCE` ensures that if no entry is found in `V4_Club_Logos`, it falls back to the original `logo_url` in `V4_Teams`.
