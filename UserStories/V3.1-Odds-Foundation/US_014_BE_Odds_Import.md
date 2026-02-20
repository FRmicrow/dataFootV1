# US_014 - [BE/Backfill] - Historical Odds Import

## Title
[BE/Backfill] Fetch and Store Historical Odds

## User Story
**As a** Backend Engineer
**I want** to create a pipeline that backfills odds for completed matches (2022-2025)
**So that** we can start building a historical dataset for training.

## Acceptance Criteria
### AC 1: Create Odds Backfill Script
- **Given** existing `V3_Fixtures` with completed status but `has_odds = FALSE`
- **When** `npm run sync:odds:history` runs
- **Then** the script loops through these fixtures (batch size 20).
- **And** calls API: `GET https://v3.football.api-sports.io/odds?fixture={id}`.
- **And** handles rate limiting (respect API quota).

### AC 2: Parse and Prioritize Odds
- **Given** multiple bookmakers in response
- **When** parsing the data
- **Then** select odds from **Bookmaker 1 (Bet365)** first. If unavailable, try **Bookmaker 11 (Unibet)**, then **first available**.
- **And** parse Market ID `1` (1N2) and Market ID `5` (Goals Over/Under).
- **And** store values into `V3_Odds` with correct mapping:
   - Match Winner: `value_home`, `value_draw`, `value_away`.
   - Goals: `value_over` (Outcome 4), `value_under` (Outcome 5) for line `2.5`.

### AC 3: Update Fixture Metadata
- **Given** odds are successfully saved
- **Then** mark `V3_Fixtures.has_odds = TRUE`.
- **And** ensure the script is idempotent (re-running it doesn't duplicate data).

## Technical Notes
- **API**: `/odds` endpoint.
- **Rate Limit**: API-Football allows 300 calls/min (check user plan). Use `limiter` library.
- **Handling**:
  - `429 Too Many Requests`: Pause and retry.
  - `404/Empty`: Log as "No Odds Available" and skip (mark `has_odds = -1` or similar to avoid retry loops).
