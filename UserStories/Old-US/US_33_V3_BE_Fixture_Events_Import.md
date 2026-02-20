# US_33_V3_BE_Fixture_Events_Import

## 1. User Story
**As a** Backend Developer,
**I want to** implement a bulk import strategy for match events and an API endpoint to serve them,
**So that** we can fully populate our database with historical match details and serve them instantly to the frontend without real-time external API dependency.

## 2. Technical Context
- **External API**: API-Football (`GET /fixtures?id={id}`).
- **Internal API**: `GET /api/v3/fixtures/:id/events` (New Endpoint).
- **Import Logic**: `importLeagueControllerV3.js` (Existing).
- **Quota**: 75,000 calls/day (High capacity).

## 3. Implementation Requirements

### 3.1 Import Architecture: "Deep Sync"
We need to augment the existing league import process.
1.  **Trigger**: After `importFixtures` completes for a league/season.
2.  **Process (`syncFixtureEvents`)**:
    -   Select all `fixture_id` from `V3_Fixtures` where `status` is 'FT' (Finished) AND (optional) where events are missing.
    -   **Loop through fixtures**:
        -   Call External API: `fixtures?id={fixture_id}`.
        -   Extract `response[0].events`.
        -   **Bulk Insert**: Map the API events to the `V3_Fixture_Events` schema and insert them.
    -   **Rate Limit Management**:
        -   Even with high quota, ensure we don't burst > 450 calls/min.
        -   Implement a small delay (e.g., 150ms) between calls or use a queue system.

### 3.2 API Endpoint: Serve Local Data
- **Endpoint**: `GET /api/v3/fixtures/:id/events`
- **Logic**:
    1.  Query `V3_Fixture_Events` by `fixture_id`.
    2.  Sort results by `time_elapsed` + `extra_minute` ASC.
    3.  Return JSON array.
- **Optimization**:
    -   If the DB query returns empty AND the match is 'FT', *optionally* trigger a real-time fetch (fallback), but the primary goal is to rely on the "Deep Sync" data.

### 3.3 Data Transformation (Import)
Map API fields to DB columns:
- `time.elapsed` -> `time_elapsed`
- `time.extra` -> `extra_minute`
- `team.id` -> `team_id`
- `player.id` -> `player_id`
- `assist.id` -> `assist_id`
- `type` -> `type`
- `detail` -> `detail`

## 4. Acceptance Criteria
- [ ] **Import Function**: A script or function exists to populate events for all finished matches in a league.
- [ ] **Endpoint Working**: requesting `/api/v3/fixtures/123/events` returns fast, local data.
- [ ] **Data Completeness**: All goals, cards, and subs are correctly stored.
- [ ] **Performance**: The import process respects the 450/min rate limit (approx. 1 season of 380 matches imports in ~1-2 minutes).
