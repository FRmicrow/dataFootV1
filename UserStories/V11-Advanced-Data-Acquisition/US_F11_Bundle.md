📂 Created User Stories (/UserStories/V11-Advanced-Data-Acquisition/)

Feature Name: Advanced Data Acquisition & Tactical Intelligence
Version: V11
Global Feature Type: New Capability & Architecture Upgrade
Scope: Full Stack / Data / UX

---

US_230: Advanced Data Model for Tactical Intelligence
Feature Type: Architecture Upgrade
Role: Data Architect
Goal: Establish a robust relational structure to store high-fidelity fixture and player statistics, enabling deep tactical analysis and feature engineering.

Core Task: Define and implement the database schema for fixture-level statistics (including halves), fixture-player performance, and normalized seasonal statistics.

Technical Requirements:
- Create `V3_Fixture_Stats` table:
    - `fixture_id` (INTEGER, FK)
    - `team_id` (INTEGER, FK)
    - `half` (TEXT: 'FT', '1H', '2H')
    - Statistics columns: `shots_on_goal`, `shots_off_goal`, `shots_inside_box`, `shots_outside_box`, `shots_total`, `shots_blocked`, `fouls`, `corners`, `offsides`, `possession`, `yellow_cards`, `red_cards`, `saves`, `passes_total`, `passes_accurate`, `pass_accuracy_pct`.
    - UNIQUE constraint on `(fixture_id, team_id, half)`.
- Create `V3_Fixture_Player_Stats` table:
    - `fixture_id` (INTEGER, FK)
    - `team_id` (INTEGER, FK)
    - `player_id` (INTEGER, FK)
    - `is_start_xi` (BOOLEAN)
    - `minutes_played` (INTEGER)
    - `position` (TEXT)
    - `rating` (FLOAT)
    - Dynamic performance stats (Shots, Passes, Tackles, etc.).
    - UNIQUE constraint on `(fixture_id, player_id)`.
- Create/Extend `V3_Player_Season_Stats_Extended` (or update existing `V3_Player_Stats`):
    - Add computed `_per_90` columns for all key performance metrics.
    - Ensure `league_id` and `season_year` are present for easy filtering.

Acceptance Criteria:
- Schema successfully applied to `database.sqlite`.
- All foreign keys correctly linked to `V3_Fixtures`, `V3_Teams`, and `V3_Players`.
- No orphan records allowed.

---

US_231: High-Fidelity Fixture Statistics Ingestion
Feature Type: New Capability
Role: Data Engineer
Goal: Automate the retrieval and storage of granular team statistics for every fixture, including half-time splits.

Core Task: Implement the ingestion logic for the `/fixtures/statistics` endpoint, ensuring FT, 1H, and 2H data is captured.

Functional Requirements:
- Query API with `half=true` to get detailed splits.
- Map original API fields to the `V3_Fixture_Stats` schema.
- Handle missing statistics gracefully (nullable fields).
- Support English Premier League 2024/2025 as the primary test target.

Technical Requirements:
- Service: `FixtureStatsService.fetchAndStore(fixtureId)`.
- API Endpoint: `GET /fixtures/statistics?fixture={fixture_id}&half=true`.
- Ensure data consistency (1H + 2H stats should logically relate to FT stats where applicable).

Acceptance Criteria:
- Data for both teams stored correctly for each fixture.
- Each fixture has 6 records in `V3_Fixture_Stats` (2 teams x 3 halves).
- Logged success for England Premier League fixtures.

---

US_232: Granular Player-Fixture Performance Tracking
Feature Type: New Capability
Role: Data Engineer
Goal: Capture the individual performance of every player in a match to enable player-level modeling and lineup strength calculations.

Core Task: Implement the ingestion logic for the `/fixtures/players` endpoint.

Functional Requirements:
- Identify and store "minutes played", "position", and "rating".
- Distinguish between Start XI and Substitutes.
- Capture all performance stats (Shots, Passes, Tackles, Duels, etc.).

Technical Requirements:
- Service: `PlayerFixtureStatsService.fetchAndStore(fixtureId)`.
- API Endpoint: `GET /fixtures/players?fixture={fixture_id}`.
- Relational mapping to `V3_Fixture_Player_Stats`.

Acceptance Criteria:
- Every player in the match list (including bench) is recorded.
- Player IDs and Team IDs are correctly mapped and validated.

---

US_233: Aggregated Player Seasonal Intelligence & Normalization
Feature Type: Data Logic
Role: Data Engineer / Architect
Goal: Provide a consolidated view of player performance across a season, normalized by 90 minutes of play for fair comparison.

Core Task: Implement the ingestion of `/players?id={player_id}&season={season}` and compute per-90 metrics.

Functional Requirements:
- Aggregate all core statistics (Goals, Assists, Passes, etc.).
- Compute `Normalized Per 90` fields: `(Stat / MinutesPlayed) * 90`.
- Store one record per player per season.

Technical Requirements:
- Triggered after fixture-player stats are imported or via dedicated seasonal sync.
- Handle players moving between teams mid-season (store per team/season if available).

Acceptance Criteria:
- `V3_Player_Season_Stats` populated with accurate per-90 metrics.
- Premier League 2024/2025 player profiles are complete.

---

US_234: Import Matrix UX Extension: FS & PS Pillars
Feature Type: UX Improvement
Role: Frontend Developer
Goal: Visualize the sync status of high-fidelity statistics in the Import Matrix, allowing users to track and trigger tactical data imports.

Core Task: Add "Fixture Stats" (FS) and "Player Stats" (PS) pillars to the `ImportMatrixPage` grid.

Functional Requirements:
- Grid modification: Two new columns/indicators in the status box.
- Tooltips: Show last sync date for FS and PS.
- Click to Queue: Allow individual cell selection for batching.

Acceptance Criteria:
- The matrix shows 6 pillars instead of 4 (C, E, L, T, FS, PS).
- Indicators correctly reflect the database status.

---

US_235: High-Impact Batch Selection by Category
Feature Type: UX Improvement
Role: Frontend Developer
Goal: Streamline the ingestion process by allowing users to select a specific data category (e.g., "Fixture Stats") across multiple leagues/seasons at once, reducing repetitive manual clicking.

Core Task: Implement a "Category Command Center" in the Import Matrix UI.

Functional Requirements:
- **Category Selector UI**: A new button group or dropdown in the `matrix-header` labeled "Category Selection Mode".
- **Interaction Logic**: When a category (e.g., `Fixture Stats`) is selected in this mode, clicking a league's name or checkbox will automatically stage that *specific* category for all visible seasons of that league.
- **Bulk Action**: A button "Stage [Category] for All Visible" to quickly queue a data pillar across the entire matrix.
- **Visual Feedback**: The staging queue should clearly show the category name alongside the league/season.

Acceptance Criteria:
- User can select "Fixture Stats" category and then click "Premier League" to queue FS for all seasons.
- The "Staging Bar" reflects the specific category selection accurately.

---

US_236: Robust Ingestion Pipeline (Rate Limiting & Safety)
Feature Type: Architecture Upgrade
Role: Backend Developer / DevOps
Goal: Protect API tokens and ensure reliable long-running data imports without manual supervision.

Core Task: Implement rate limiting, retry logic, and comprehensive logging for the new data endpoints.

Technical Requirements:
- Implement a worker/queue for these heavy requests.
- Exponential backoff for 429 errors.
- Persistent logs for failed requests in the database.
- Incremental updates support (don't re-fetch if recently synced).

Acceptance Criteria:
- 100% of fixtures for a PL season can be imported without manual restart.
- Log table shows clear failure reasons for any rejected API calls.

---

US_237: Data Integrity & Validation Suite
Feature Type: Architecture Upgrade
Role: Data Engineer
Goal: Ensure the high-fidelity data is accurate, consistent, and ready for machine learning models.

Core Task: Build an automated validation layer to check for duplicates and logical inconsistencies.

Functional Requirements:
- Ensure no duplicate `(fixture_id, team_id, half)` records.
- Cross-check: Sum of individual player goals/assists must match the fixture total.
- Cross-check: Ensure every fixture in `V3_Fixture_Stats` exists in `V3_Fixtures`.

Acceptance Criteria:
- Validation script runs post-import and reports 0 errors.
- Premier League 2024/2025 data passes all integrity checks.

---

US_238: Inline Tactical Statistics Tab (Team Stats)
Feature Type: New Capability
Role: Frontend Developer
Goal: Visualize team-level tactical statistics (shots, possession, passes) within the expanded match view on the competition page, without navigating away.

Core Task: Add a "Tactical" tab to the `InlineFixtureDetails` component.

Functional Requirements:
- **Tabbed Interface**: Implement a sub-navigation within the expanded fixture row (e.g., Timeline | Tactical | Player Intel).
- **Comparative Data**: Display a comparative "Stat Bar" layout for both teams:
    - Possession %
    - Total Shots (On/Off/Blocked)
    - Corner Kicks
    - Fouls
    - Yellow/Red Cards
    - Accurate Passes / Total Passes
- **Half-Time Splits**: Include a small toggle (FT / 1H / 2H) to filter the statistics.

Technical Requirements:
- Fetch tactical stats from `/api/fixtures/${id}/stats`.
- Integrate seamlessly into the existing `InlineFixtureDetails.css`.

Acceptance Criteria:
- Clicking the "Tactical" tab in the expanded row reveals the team statistics.
- Data updates correctly when switching between Halves.

---

US_239: Interactive Player Performance (Inline Visualizer)
Feature Type: New Capability
Role: Frontend Developer
Goal: Deep-dive into individual player performance while maintaining the visual context of the team lineups in the expanded view.

Core Task: Implement an interactive player-stats mode within the `InlineFixtureDetails` view.

Functional Requirements:
- **Layout Persistence**: Keep the Home Squad (Left) and Away Squad (Right) visible as they are currently.
- **Center Component Switcher**: When "Player Intel" tab is active (or when a player is clicked), the middle column (currently the Timeline) switches to a "Player Performance Card".
- **Interaction**: Clicking any player name in the side columns updates the center card with their specific match stats (Rating, Minutes, Goals, Shots, Tackles, Interceptions, etc.).
- Default state: Show the Man of the Match stats in the center.

Technical Requirements:
- Use `useState` in `InlineFixtureDetails` to track the `selectedPlayerId`.
- Component: `InlinePlayerStatCard.jsx` to be rendered in the middle column.

Acceptance Criteria:
- Lineups on left/right remain interactive.
- Middle column dynamically switches between Match Events (Timeline) and Player Stats.

---

### 📋 User Story & Agent Allocation

| US ID | Title | Feature Type | Primary Agent |
| :--- | :--- | :--- | :--- |
| **US_230** | Advanced Data Model for Tactical Intel | Architecture Upgrade | Data Architect |
| **US_231** | High-Fidelity Fixture Stats Ingestion | New Capability | Data Engineer |
| **US_232** | Granular Player-Fixture Performance Tracking | New Capability | Data Engineer |
| **US_233** | Aggregated Player Seasonal Intelligence | Data Logic | Data Engineer |
| **US_234** | Import Matrix UX Extension: FS & PS | UX Improvement | Frontend Developer |
| **US_235** | High-Impact Batch Selection by Category | UX Improvement | Frontend Developer |
| **US_236** | Robust Ingestion Pipeline (Rate Limits) | Architecture Upgrade | Backend Developer |
| **US_237** | Data Integrity & Validation Suite | Architecture Upgrade | Data Engineer |
| **US_238** | Inline Tactical Statistics Tab | New Capability | Frontend Developer |
| **US_239** | Interactive Player Performance visualizer | New Capability | Frontend Developer |

---

🔍 Audit & Assumptions

Current system limitations identified:
- The `V3_Player_Stats` table currently exists but lacks the per-90 normalization logic natively in the schema.
- Existing import logic for "Lineups" (L) and "Events" (E) is high-level; the new tactical data (FS/PS) is significantly more granular and volume-heavy.
- Sportmonks API rate limits may be hit quickly during a full season backfill of player stats per fixture.

Technical debt detected:
- Partial imports from previous attempts may have left inconsistent state flags in the `V3_League_Seasons` table.

Migration risks:
- Adding many new columns to `V3_Player_Stats` might require a careful migration to avoid locking the DB during active use.

---

🎨 UX & Product Strategy

Why this feature improves the product:
- **Tactical Depth**: Moves the platform from "Macro Prediction" (who wins) to "Micro Intelligence" (how they play).
- **Model Accuracy**: Half-time splits (1H/2H) allow for more complex live-prediction models and "momentum" feature engineering.
- **Scouting Potential**: Normalized player stats (per-90) allow the user to find "hidden gems" whose raw stats are dampened by low playing time.

---

🛠 Hand-off Instruction for the Team

BE AGENT:
- Implement the 3 new tables in `V3_schema.sql` (US_230).
- Create the generic `SportmonksTacticalService` to handle the new endpoints with rate limiting (US_236).
- Expose `/import/fixture-stats` and `/import/player-stats` endpoints for the batch worker.

FE AGENT:
- Extend the `ImportMatrixPage` status indicators to include `fs` and `ps` (US_234).
- Implement the Category Selection logic in the Staging Bar (US_235).
- Add Tabbed navigation to `InlineFixtureDetails.jsx` (Timeline / Tactical / Player Intel).
- Build the Inline Tactical view with FT/1H/2H stats (US_238).
- Build the interactive Player Performance center-card for the expanded view (US_239).

DATA AGENT:
- Build the normalization worker for US_233.
- Build the "Integrity Firewall" (US_237) to prevent bad data from reaching the ML Layer.

📊 Definition of Done
The feature is complete when:
- All endpoints successfully queried for England Premier League 2024/2025.
- Data stored in structured format in `V3_Fixture_Stats` and `V3_Fixture_Player_Stats`.
- Performance metrics (accuracy/completeness) are visible in the Import Matrix.
- Tactical match details and player-level stats are visually available on the League Results page.
- Data integrity tests pass (Sum check: Players stats vs Team stats).
- Dataset is ready for modeling for the 2024/2025 season.
