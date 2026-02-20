# US_016 - Manual Odds Saving (Buttons)

## Title
[FE/BE] Add Manual "Save Odds" Buttons for Matches & Competitions

## User Story
**As a** User  
**I want** to manually trigger the saving of odds for a specific match or an entire competition  
**So that** I can build my historical database on demand when viewing live data.

## Acceptance Criteria
### AC 1: Match Detail "Save Odds" Button
- **Given** I am on the Match Detail Page (`/live-bet/match/:id`)
- **When** the page loads
- **Then** a visible button "💾 Save Odds" is displayed in the header or action bar.
- **When** I click it
- **Then** it changes state to "Saving..." -> "Saved ✅".
- **And** triggers `POST /api/v3/live-bet/match/:id/save-odds`.

### AC 2: Competition List "Save All Odds" Button
- **Given** I am on the Dashboard grouped by League
- **When** I see a League Header (e.g., "Premier League")
- **Then** a small "Save All" button/icon is visible next to the league name.
- **When** I click it
- **Then** it triggers `POST /api/v3/live-bet/league/:id/save-odds?date=TODAY` (or batch list of visible fixture IDs).
- **And** provides feedback (toast or icon change) on success.

### AC 3: Backend Implementation (Save Single)
- **Endpoint**: `POST /api/v3/live-bet/match/:id/save-odds`
- **Logic**:
  1. Fetch current odds from API-Football (`/odds?fixture={id}`).
  2. Parse (Winamax > Unibet priority).
  3. Insert/Update `V3_Odds` table (Upsert).
  4. Return success status.

### AC 4: Backend Implementation (Save League/Batch)
- **Endpoint**: `POST /api/v3/live-bet/save-batch`
- **Body**: `{ fixtureIds: [123, 456, ...] }` or `{ leagueId, date }`
- **Logic**:
  1. Loop through fixture IDs.
  2. Determine if we can bulk fetch (API supports `odds?league={id}&season={yyyy}&date={today}`).
  3. If bulk fetch available, use it. Else loop 20 at a time.
  4. Upsert to `V3_Odds`.

## Technical Notes
- **UI UX**: Button should be subtle but accessible. Green checkmark when data exists in DB?
- **State**: If odds *already exist* in DB (check `has_odds` in fixture data), maybe show "Update Odds" or "Re-Save".
