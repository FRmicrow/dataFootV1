📂 Created User Stories (/UserStories/V6-App-Enchangement/)

Feature Name: Dashboard Redesign (Intelligence Hub)
Version: V6
Global Feature Type: UX Overhaul / Data Intelligence
Scope: Full Stack / Data

---

### US_110: Intelligence Aggregation API
**Feature Type**: Architecture Upgrade
**Role**: Backend Developer

**Goal**: 
Provide a high-density, performant API that aggregates global database state, health metrics, and distribution data for visualization.

**Core Task**: 
Refactor `dashboardController.js` to provide a composite "Intelligence" payload containing volumetric counts, continental distribution, and health rolups.

**Functional Requirements**:
- **Volumetric Aggregation**: 
    - `total_leagues`: count from `V3_Leagues`
    - `total_players`: count from `V3_Players`
    - `total_clubs`: count from `V3_Teams`
    - `total_fixtures`: count from `V3_Fixtures` (assuming it exists or counting from `V3_League_Seasons` coverage)
- **Continental Distribution**: Group competitions by continent (using `V3_Countries.continent` if available, or mapping from `V3_Countries`).
- **Data Coverage Logic**: Calculate the % of seasons where `imported_players`, `imported_events`, and `imported_lineups` are ALL 1.
- **Dynamic State**: Ensure queries ignore discovered-only flags where relevant for "Production Data" counts.

**Technical Requirements**:
- **APIs Involved**: `GET /api/v3/stats` (Unified).
- **Database logic**: Use subqueries or `UNION ALL` to fetch counts in a single round-trip if possible for performance.
- **JSON Contract**: Must return `volumetrics`, `distribution`, and `health_summary` objects.

**Acceptance Criteria**:
- Endpoint returns all required counts correctly.
- Distribution object contains counts per continent.
- Data coverage % is calculated based on the ratio of fully synced vs partially synced seasons.

---

### US_111: Intelligence Hub UI Layout
**Feature Type**: UX Overhaul
**Role**: Frontend Developer

**Goal**: 
Transform the dashboard from a static summary into a dynamic, professional cockpit.

**Core Task**: 
Redesign `V3Dashboard.jsx` to accommodate the new Intelligence Hub structure, including KPI blocks and a multi-section dashboard layout.

**Functional Requirements**:
- **Header Refactor**: Change title to "Data Intelligence Hub". Remove "Infrastructure Overview".
- **KPI Block System**: Implement a 4 or 6-column KPI bar at the top with:
    - Growth indicator (+X% vs last sync).
    - Status badges.
- **Layout Sections**:
    - **Top**: Mission-critical counters (Leagues, Players, Clubs, Fixtures).
    - **Middle**: "Structural Intelligence" (Charts area).
    - **Bottom**: "Database Health Console" (Health score + coverage).
- **Navigation**: Integrated shortcuts to search and import remain but in a more compact sidebar or bottom tray.

**Technical Requirements**:
- **State Management**: Fetch unified payload from `/api/v3/stats`.
- **CSS / Styling**: Maintain StatFoot premium aesthetics (glassmorphism, high-contrast typography).
- **Component Design**: Atomic `KPICard` component for reuse.

**Acceptance Criteria**:
- Dashboard title is updated.
- KPI layout is responsive and matches the high-density professional requirement.
- No legacy "Infrastructure Overview" text visible.

---

### US_112: Visual Data Intelligence Layer
**Feature Type**: New Capability
**Role**: Frontend Developer (Dataviz)

**Goal**: 
Provide visual insights into data distribution and growth patterns using interactive charts.

**Core Task**: 
Implement the visualization components using `Recharts` (or `D3.js` if custom logic needed) within the dashboard.

**Functional Requirements**:
- **Chart 1: Players by Country**: Horizontal bar chart showing Top 10 countries by player volume.
- **Chart 2: Competition Importance Distribution**: Pie or Donut chart showing breakdown of leagues by `importance_rank` (Elite vs Major vs Minor).
- **Chart 3: Data Growth Trend**: Area chart showing fixtures/seasons imported over time (using `last_sync_core` dates).
- **Interactivity**: Tooltips showing precise counts on hover.

**Technical Requirements**:
- **Library**: `Recharts` for high-performance SVG rendering.
- **Responsiveness**: Charts must resize dynamically within their grid containers.
- **Data Prep**: Transform backend distribution arrays into Recharts-friendly JSON structures.

**Acceptance Criteria**:
- 3 distinct charts are visible and populated with real DB data.
- Hover tooltips work correctly.
- Layout remains stable during data load (use skeletons).

---

### US_113: Health Intelligence Score Implementation
**Feature Type**: Architecture Upgrade
**Role**: Data Engineer

**Goal**: 
Quantify the overall health and integrity of the database into a single, actionable score.

**Core Task**: 
Define and implement the logic to calculate a "DB Health Score" (0-100) based on data integrity indicators.

**Functional Requirements**:
- **Scoring Algorithm**:
    - **Base**: 100 points.
    - **Deduction**: -1 per 1000 orphan player records.
    - **Deduatcion**: -5 per league with missing core fixtures.
    - **Bonus**: +10 if all "Top 10" countries have 100% coverage.
- **Coverage Metrics**: Roll up individual `imported_X` flags into a global percentage.
- **Persistence**: Calculate this on-the-fly in the dashboard API (or cache it if DB is too large).

**Technical Requirements**:
- **SQL Logic**: Aggregate counts of unresolved entities and partial seasons.
- **Database logic**: Check for NULLs in critical fields (api_id, importance_rank) as deduction factors.

**Acceptance Criteria**:
- Dashbaord displays a visual gauge or large number for "DB Health Score".
- Coverage % reflects the true state of imported vs discovered data.
- Deductions for orphans are correctly reflected in the health score.

---

### 🔍 Audit & Assumptions
- **Current Limitation**: Current dashboard is entirely counts-based; no temporal data is tracked for growth charts. *Prescription*: We assume `last_sync_core` in `V3_League_Seasons` is a reliable proxy for growth tracking.
- **Data Gap**: Continent mapping may required a small mapping table if not present in `V3_Countries`.
- **Inconsistency**: "Health" currently resides in a separate page; this feature merges "Sense" (Stats) and "State" (Health) into one view.

### 🎨 UX & Product Strategy
The transition from an "Infrastructure" view to an "Intelligence" hub changes the product's perceived value from a database manager to a strategic scouting asset. The visual density (Charts + KPIs) reduces the time-to-insight for a PO or Scout.

### 🛠 Hand-off Instruction for the Team
**ATTENTION AGENTS:**

**BE AGENT:**
- Priority: Unified `GET /api/v3/stats` payload with distribution and health rollups.
- Ensure efficient SQL execution for counts.

**FE AGENT:**
- Priority: Redesign dashboard layout for high density.
- Implement Recharts components for the distribution logic.

**DATA AGENT:**
- Define the `HealthScore` algorithm in the backend logic.
- Ensure continent mapping is accurate.

**CRITICAL RULES:**
- No hardcoded numbers.
- Charts must reflect the ACTUAL DB state at the moment of request.
- Health score must be logical (no "random" numbers).
- Zero legacy labels.
