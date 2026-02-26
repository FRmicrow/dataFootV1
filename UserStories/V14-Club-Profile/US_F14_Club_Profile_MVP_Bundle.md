📂 Created User Stories (/UserStories/V14-Club-Profile/)

Feature Name: Club Profile Power Page (MVP)
Version: V14
Global Feature Type: New Capability / UX Overhaul
Scope: Full Stack (Frontend + Backend + Data)

---

## Context & Business Rationale

The current Club Profile is fragmented and lacks the depth required for advanced scouting and performance analysis. This feature transforms the `/club/:id` route into a structured, tabbed experience that aggregates data from multiple pillars (Core, Standings, Lineups, and Fixture Stats).

By focusing on an **MVP-first** approach, we prioritize usable numbers and simple visual grouping over complex charts, ensuring immediate utility for users.

---

## US_280: Club Profile Shell & Navigation Tabs

**Feature Type:** UX Overhaul

**Role:** Full Stack Developer

**Goal:**
Establish the new tabbed navigation structure for the Club Profile, enabling users to switch between Table & Results, Lineup, Match Archives, and Advanced Stats while maintaining a consistent context (Season/Competition).

**Core Task:**
Refactor `ClubProfilePageV3.jsx` to use a tabbed layout with persistent seasonal filters at the top that broadcast state to all child tabs.

**Functional Requirements:**
- **Navigation**: 4 Tabs: "Table & Results", "Lineup", "Match Archives", "Advanced Stats".
- **Global Filters** (always visible/top):
  - `Season` (Dropdown) — Default: Most recent season with data (consult `V3_Import_Status`).
  - `Competition` (Dropdown) — Populated based on the selected season.
  - `Reset` button.
- **URL Sync**: Selected tab should be reflected in the URL hash or state (e.g., `/club/33#lineup`).
- **Loading State**: Unified loading skeleton for the tab content area.

**Acceptance Criteria:**
- [ ] User can switch between 4 tabs without page reload.
- [ ] Season Change in filters triggers data refresh in the active tab.
- [ ] Tab state persists across refreshes (via URL or local state).

---

## US_281: Tab 1 — Table & Results (League & Cup Logic)

**Feature Type:** New Capability

**Role:** Full Stack Developer

**Goal:**
Display the club's performance in the selected competition using local `V3_Standings` data for leagues or knockout stage data for cups.

**Core Task:**
Implement the logic to distinguish between League and Cup competitions and render the appropriate performance cards.

**Functional Requirements:**
- **League View** (if competition type = League):
  - Render a "Final Rank" card using `V3_Standings`.
  - Include basic stats: P, W, D, L, GF, GA, GD, Pts.
  - **Live Badge**: If `season_year` is current, show a PULSING "LIVE" indicator on the rank.
- **Cup View** (if competition type = Cup):
  - Display "Round Reached" (e.g., Finalist, Semi-Final).
  - Aggregate stats: Matches Played, GL For/Against, Biggest Win/Loss.
- **Multi-League handling**: If a team played in multiple leagues (e.g., PL and Champions League), show separate blocks or a combined summary if all selected.

**Acceptance Criteria:**
- [ ] League table shows correct ranking info from `V3_Standings`.
- [ ] "LIVE" badge appears only for current seasons.
- [ ] Cup performance correctly displays the highest round reached.

---

## US_282: Tab 1 — Global Season Summary (The "All" View)

**Feature Type:** Enhancement

**Role:** Backend Developer

**Goal:**
Provide an aggregated performance snapshot when the "All Competitions" filter is selected, giving a bird's-eye view of the club's entire campaign.

**Core Task:**
Add a summary aggregation to the `/api/v3/club/:id` response that sums metrics across all competitions for the selected year.

**Functional Requirements:**
- **Aggregated Metrics**:
  - Total Matches Played (across all competitions).
  - Overall Win Rate (%).
  - Total Goals Scored / Conceded.
  - "Best Result": Highest rank or deepest cup run.
- **Lightweight UI**: Display as a horizontal row of 4-5 numeric cards.

**Acceptance Criteria:**
- [ ] Summary reflects totals across ALL competitions in the selected season.
- [ ] Percentages are rounded to 1 decimal place.

---

## US_283: Tab 2 — Lineup: Squad Table & Aggregation

**Feature Type:** Enhancement

**Role:** Full Stack Developer

**Goal:**
Display a comprehensive squad table showing individual player contributions for the selected season.

**Core Task:**
Refactor the current roster display into a searchable/sortable table powered by `V3_Player_Stats`.

**Functional Requirements:**
- **Table Columns**: Player (Photo+Name), Position, Appearances, Minutes, Goals, Assists, Avg Rating.
- **Interactions**:
  - Clicking a player opens their profile page (`/player/:id`).
  - Sort by any column (default: appearances DESC).
- **Responsive**: On mobile, collapse to Name, GLS, and Rating.

**Acceptance Criteria:**
- [ ] All players who made at least 1 appearance are listed.
- [ ] Stats match the values in `V3_Player_Stats` for that specific team/season.

---

## US_284: Tab 2 — Most Common Lineup Engine (MVP logic)

**Feature Type:** New Capability

**Role:** Backend Developer

**Goal:**
Calculate and display the most frequent formation and starting personnel for the selected season using lineup occurrence logic.

**Core Task:**
Implement a backend service in `lineupController.js` that analyzes `V3_Fixture_Lineups` to find the "Typical Starting XI".

**Logic (MVP)**:
1. Identify the most used `formation` (e.g., "4-3-3", "4-2-3-1").
2. For that formation, select the **11 players** with the highest `starting_xi` appearances.
3. Group selected players by their primary tactical position.
4. Calculate Win Rate (%) specifically for matches where this formation was used.

**Functional Requirements:**
- Display: Formation string (e.g., "4-2-3-1"), Usage Count, Win Rate.
- Visual: Group players by GK, DEF, MID, ATT blocks (Visual Pitch is P2, simple list is P1/MVP).
- **MVP Tag**: Mark this section with a subtle "MVP Logic" tag as requested.

**Acceptance Criteria:**
- [ ] The formation displayed is the one used in the most fixtures.
- [ ] The win rate is calculated correctly for those specific fixtures.
- [ ] 11 players are returned with their relative frequency.

---

## US_285: Tab 3 — Match Archives (The Results List)

**Feature Type:** Enhancement

**Role:** Full Stack Developer

**Goal:**
Provide a searchable list of all matches played by the club, serving as a historical archive with quick access to match details.

**Core Task:**
Filter and render `V3_Fixtures` where `team_id` is either home or away.

**Functional Requirements:**
- **Filters**: Home/Away/All.
- **Columns**: Date, Competition, Opponent, H/A, Result (Badge: W/D/L), Score, Round.
- **Interaction**: Clickable row redirects to `/match/:id`.
- **Sorting**: Newest first.

**Acceptance Criteria:**
- [ ] Correct W/D/L badges based on final score and club perspective.
- [ ] Opponent name and logo correctly linked.
- [ ] Filter logic applies instantly to the list.

---

## US_286: Tab 4 — Team Metrics Aggregation API (Average Based)

**Feature Type:** New Capability

**Role:** Backend Developer

**Goal:**
Expose an API that aggregates fixture-level tactical stats into team-level season metrics.

**Core Task:**
Create a new endpoint `GET /api/v3/club/:id/tactical-summary?season=2023&competition=...` that aggregates `V3_Fixture_Stats`.

**Functional Requirements:**
- **Aggregated (AVERAGE)**:
  - Possession %
  - Shots per Match
  - Shots on Target per Match
  - Pass Accuracy %
  - Corners per Match
  - Discipline (Avg Yellow/Red per match)
- **Aggregated (TOTAL/PCT)**:
  - Shot Conversion % (Goals / Total Shots)
  - Clean Sheet %
  - Goals Conceded per Match

**Acceptance Criteria:**
- [ ] All metrics are calculated as **Mean (Average)** per user request.
- [ ] Filter by competition correctly restricts the aggregation set.

---

## US_287: Tab 4 — Advanced Stats UI: Cards & Comparison Accordion

**Feature Type:** UX Improvement

**Role:** Frontend Developer

**Goal:**
Display tactical insights in a premium, readable format with a drill-down for Home vs Away performance.

**Core Task:**
Build the UI for the Advanced Stats tab using card grids and an accordion component.

**Functional Requirements:**
- **Metric Cards**: 2 rows of 4 cards each for Global/Offensive/Defensive metrics.
- **Home vs Away Comparison**:
  - Implement an **Accordion** component (User Req: Open by default for current season).
  - Side-by-side comparison table for: Points per Match, Goals per Match, Win %.
- **Conditional Visibility**: Hide metrics if `fs` (Fixture Stats) pillar hasn't been imported for that season.

**Acceptance Criteria:**
- [ ] Accordion opens/closes smoothly.
- [ ] Comparison correctly separates Home and Away games based on `V3_Fixtures`.
- [ ] Design matches the "Premium V3" aesthetics (Glassmorphism, subtle borders).

---

## US_288: Routing Migration & Breadcrumb System

**Feature Type:** Refactor

**Role:** Full Stack Developer

**Goal:**
Enforce the `/club/` naming convention and ensure all links within the app point to the new structured profile.

**Core Task:**
Global search and replace of `/team/:id` references to `/club/:id` and update `App.jsx` and `V3Dashboard`.

**Functional Requirements:**
- Update `SearchPageV3` to link clubs to `/club/`.
- Update `PlayerProfilePageV3` career history to link to `/club/`.
- Implement a breadcrumb in the Hero section: `Discovery / {Country} / {Club Name}`.

**Acceptance Criteria:**
- [ ] No broken links remaining targeting `/team/`.
- [ ] Breadcrumbs are dynamic and clickable.

---

## US_289: Data Integrity & Empty State Handling

**Feature Type:** UX Improvement

**Role:** Full Stack Developer

**Goal:**
Ensure a professional UX by never showing empty tables or broken components when data is missing.

**Core Task:**
Implement "Guards" for every component in the Club Profile.

**Rules:**
- If **Lineups** pillar is missing → Show "Lineup data pending sync" with a link to the Import Matrix.
- If **Fixture Stats** pillar is missing → Hide the Advanced Stats tab or show a descriptive placeholder.
- Never show a table with 0 rows (render a "No matches found for selected filters" message).

**Acceptance Criteria:**
- [ ] Zero "white screens" or empty table headers visible.
- [ ] Descriptive placeholders tell the user exactly what is missing.

---

## 🔍 Audit & Assumptions

- **Standing Availability**: Assumes `V3_Standings` is populated. If not, the League component relies on `StatsEngine.getDynamicStandings` as a backup.
- **Formation Parsing**: Assumes `V3_Fixture_Lineups` contains standardized formation strings (e.g. "4-4-2").
- **Performance**: Aggregating stats on the fly for the Advanced Stats tab might be slow for clubs with 50+ fixtures. Caching in summary table (`V3_Team_Season_Stats`) is recommended.

---

## 🎨 UX & Product Strategy

Choosing an **MVP approach** for the "Most Common Lineup" ensures we deliver value quickly without getting stuck in complex pitch visualization. The use of **Accordions** for Home/Away splits follows modern dashboard patterns, allowing the user to focus on global metrics first while keeping granular data accessible.

---

## 🛠 Hand-off Instruction for the Team

### BE AGENT:
1. **Prio 1**: Create the Aggregation API for Advanced Stats (US_286).
2. **Prio 2**: Implement the "Most Common Lineup" logic using `V3_Fixture_Lineups` (US_284).
3. **Transition**: Ensure `/api/v3/club/:id` returns the new summary metrics.

### FE AGENT:
1. **UI Priority**: Implement the Tabbed Shell and Global Filters first (US_280).
2. **Tab 1 & 3**: These are data-heavy tables. Optimize for mobile legibility.
3. **Tab 4**: Implement the Accordion for the Home/Away split as requested.

---

## 📊 Step 9: Definition of Done

The feature is complete and "Ready for Development" when:
- All `/club/` routes are operational and replace `/team/`.
- 4 Tabs are navigable and filters are synchronized.
- **Live Badge** pulse is verified for active competitions.
- **Most Common Lineup** returns exactly 11 players based on STARTING appearances.
- **Advanced Stats** uses Average calculation exclusively.
- **Accordions** for Home/Away split work as designed.
- Zero empty tables are shown (proper fallback logic active).
