# US_42_V3_Betting_Labs_Predictions

## 1. Feature Overview
**As a** bettor or analyst,
**I want** a dedicated "Betting Labs" dashboard that tracks and analyzes match predictions vs outcomes,
**So that** I can identify profitable trends and reliable leagues.

## 2. Technical Architecture

### 2.1 Database Agent (Schema)
**Target Table**: `V3_Predictions` (Renamed from ephemeral proposal)
- **Goal**: Long-term storage of predictions for analysis.
- **Schema**:
  ```sql
  CREATE TABLE V3_Predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fixture_id INTEGER NOT NULL UNIQUE,  -- FK to V3_Fixtures
      winner_id INTEGER,                   -- Suggested Team ID
      winner_name TEXT,                    -- Backup name
      winner_comment TEXT,                 -- "Double Chance" etc.
      prob_home REAL,                      -- e.g. 45.5%
      prob_draw REAL,
      prob_away REAL,
      goals_home TEXT,                     -- e.g. "-2.5" (Under)
      goals_away TEXT,
      advice TEXT,                         -- Full API text
      prediction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      outcome_result TEXT,                 -- "CORRECT" / "INCORRECT" (filled post-match)
      FOREIGN KEY(fixture_id) REFERENCES V3_Fixtures(fixture_id)
  );
  ```

### 2.2 Backend Agent (Logic)
- **Service**: `predictionService.js` / `bettingLabsController.js`
- **Method 1**: `syncUpcomingProps()`
  1.  **Filter**: Select Fixtures (`fixture_date > NOW`) from **Rank 1-10** leagues (`V3_Leagues` joined `V3_Countries` where `rank <= 10`).
  2.  **API Call**: For each, call `GET /predictions?fixture={id}`.
  3.  **Store**: Insert into `V3_Predictions`.
- **Method 2**: `analyzeOutcomes()`
  1.  **Filter**: Select `V3_Predictions` where `outcome_result IS NULL` AND linked `V3_Fixtures.status = 'FT'`.
  2.  **Logic**:
      -   Compare `V3_Fixtures.goals_home/away` vs `V3_Predictions.winner_id`.
      -   If match result aligns with `winner_id` (or `winner_comment` includes Draw for 1X/X2), set `outcome_result = 'CORRECT'`.
      -   Ideally compute simple accuracy first.
  3.  **Update**: Set `outcome_result`.

### 2.3 Frontend Agent (UI)
- **Main Page**: `/v3/betting-labs`
- **Tab 1: Upcoming Predictions**
  -   **Filter**: League Selector (Rank 1-10 only).
  -   **Card View**:
      -   Match Header (Date, Teams).
      -   **Advice Badge**: "Home Win (60%)" with Green/Yellow progress bar.
      -   Goals Prediction: "Over 2.5".
- **Tab 2: Accuracy Stats** (Future Iteration)
  -   "Premier League Accuracy: 78%" (calculated from `outcome_result`).

## 3. Acceptance Criteria
- [ ] **DB**: Table `V3_Predictions` exists and links to Fixtures.
- [ ] **Data Pipeline**: Can batch-fetch predictions for top leagues.
- [ ] **Visualization**: Dashboard shows upcoming predictions clearly with Team Logos and Probability Bars.
- [ ] **Smart Integration**: Clicking a Team Log redirects to `TeamProfile` page.
