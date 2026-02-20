# US_41_V3_Fixture_Lineups

## 1. Feature Overview
**As a** fan analyzing a match,
**I want** to see the starting XI and substitutes for both teams in the Match Detail view,
**So that** I can understand the tactical setup and player selection.

## 2. Technical Architecture

### 2.1 Database Agent (Schema)
**Target Table**: `V3_Fixture_Lineups`
- **Goal**: Maintain a 1-to-1 relationship with `V3_Teams` inside a fixture. A match has 2 lineup entries (Home, Away).
- **Schema**:
  ```sql
  CREATE TABLE V3_Fixture_Lineups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixture_id INTEGER NOT NULL,      -- FK to V3_Fixtures
      team_id INTEGER NOT NULL,         -- FK to V3_Teams
      coach_id INTEGER,                 -- Optional: API ID of coach
      coach_name TEXT,
      formation TEXT,                   -- e.g. "4-3-3"
      starting_xi JSON,                 -- JSON Array: [{player_id, name, number, pos, grid}]
      substitutes JSON,                 -- JSON Array: [{player_id, name, number, pos, grid}]
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(fixture_id) REFERENCES V3_Fixtures(fixture_id),
      FOREIGN KEY(team_id) REFERENCES V3_Teams(team_id),
      UNIQUE(fixture_id, team_id)
  );
  ```

### 2.2 Backend Agent (Logic)
- **Service**: `lineupService.js` / `StatsEngine.js`
- **Method**: `syncFixtureLineups(fixtureId)`
  1.  Check if lineups exist locally.
  2.  If not, call API `GET /fixtures/lineups`.
  3.  **Map Data**:
      -   **Resolving Player IDs**: The API returns player IDs. We **SHOULD** try to match them to `V3_Players` if possible, but store the API's name/number as fallback in the JSON.
      -   **Team ID**: Must link to existing `V3_Teams`.
  4.  **Upsert**: Insert into `V3_Fixture_Lineups`.
- **Endpoint**: `GET /api/v3/fixtures/:id/lineups`
  -   Returns `{ home: { formation, startXI... }, away: { ... } }`.

### 2.3 Frontend Agent (UI)
- **Component**: `MatchDetailLineups.jsx` (inside `MatchDetailPage.jsx`)
- **Layout**: "Versus" Split View.
  -   **Left Column (Home Team)**:
      -   Header: Coach Name | Formation (e.g. "4-3-3").
      -   List: Starting XI (Number - Name - Position).
      -   Divider: "Substitutes".
      -   List: Subs.
  -   **Right Column (Away Team)**:
      -   Mirror of Home, right-aligned text.
- **Integration**:
  -   Fetched alongside Match Stats/Events.
  -   **Visual**: Use Team Colors if available (optional polish).

## 3. Acceptance Criteria
- [ ] **DB**: Table `V3_Fixture_Lineups` created and indexed.
- [ ] **Backend**: Can reliably fetch and store lineups for a given Fixture ID.
- [ ] **Frontend**: Displays Home (Left) and Away (Right) lineups clearly.
- [ ] **Data Integrity**: Players are listed with correct shirt numbers and positions.
