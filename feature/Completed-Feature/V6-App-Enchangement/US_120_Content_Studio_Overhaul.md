📂 Created User Stories (/UserStories/V6-App-Enchangement/)

Feature Name: Content Studio Overhaul
Version: V6
Global Feature Type: UX Overhaul / Refactor
Scope: Full Stack / UX

---

### US_120: Unified Studio Aesthetic & Tag System
**Feature Type**: UX Redesign
**Role**: Frontend Developer / UX

**Goal**: 
Align the Content Studio with the premium StatFoot V3 design system and improve the multi-entity selection experience.

**Core Task**: 
Refactor the Studio layout to use glassmorphism and high-density components, and replace the list-based player selection with a modern Tag (Chip) system.

**Functional Requirements**:
- **Visual Harmonization**: 
    - Apply standardized V3 Hero Header styling.
    - Implement glass cards (`bg-white/5 backdrop-blur-md`) for wizard steps.
- **Player Tag System**: 
    - Selected players must appear as clean UI chips/tags below the search bar.
    - Each tag must include: Player Photo (mini), Name, and a Clear (X) remove button.
- **Selection Interaction**: 
    - Selection happens instantly upon clicking a search result.
    - Prevent duplicate tags for the same player.

**Technical Requirements**:
- **Design System Alignment**: Use `app.css` design tokens.
- **State Management**: Refactor `Step1_Data.jsx` selection state to handle array-based tag rendering efficiently.

**Acceptance Criteria**:
- Studio UI matches the look and feel of the Player/League detail pages.
- Selected players appear as individual, removable chips.
- Search input is cleared after a player is added to the selection.

---

### US_121: Prestige-Aware Studio Filtering
**Feature Type**: Enhancement
**Role**: Backend Developer / Data Engineer

**Goal**: 
Ensure that data exploration in the Studio starts with the most relevant competitions and nations.

**Core Task**: 
Integrate the `importance_rank` engine into the Studio metadata APIs to ensure dropdowns and search results prioritize elite data.

**Functional Requirements**:
- **League Dropdown Hierarchy**:
    - Group by Country (existing).
    - **New**: Sort countries by `c.importance_rank ASC`.
    - **New**: Within each country, sort competitions by `l.importance_rank ASC` (e.g., Premier League above Championship).
- **Nationalities**: Sort the nationalities dropdown to show the "Top 10" nations by database weight first, then alphabetical.

**Technical Requirements**:
- **Backend API**: Refactor `getStudioLeagues` in `studioController.js` to include the double-ranking sort in SQL.
- **Backend API**: Refactor `getStudioNationalities` to return a prioritized list.

**Acceptance Criteria**:
- Selecting a league shows a structured list where Major Leagues (Rank <= 10) are at the top of their respective country blocks.
- Elite countries (England, Spain, France) appear first in the dropdowns.

---

### US_122: Semantic Metric Mapping
**Feature Type**: UX Improvement
**Role**: Full Stack

**Goal**: 
Replace technical database field names with professional scouting terminology to improve usability.

**Core Task**: 
Implement a mapping layer to rename "Statistic" to "Performance Metrics" and translate raw field labels.

**Functional Requirements**:
- **UI Rename**: Change all "Statistic" labels in Step 1 to "Performance Metrics".
- **Label Normalization**: 
    - `Goals Totals` -> `Goals`
    - `Assists Total` -> `Assists`
    - `Matches` -> `Appearances`
    - `Minutes` -> `Playtime`
- **Default Behavior**: Set `Cumulative Sum` (Total Career) to be checked by default and remove the "Cumulative..." text prefix if redundant.

**Technical Requirements**:
- **Constant Mapping**: Create a `METRIC_MAP` in the backend or shared constants.
- **UI Cleanup**: Update `Step1_Data.jsx` JSX labels.

**Acceptance Criteria**:
- Dropdown labels reflect professional terms (Metrics, Appearances) instead of DB-like strings.
- "Cumulative Sum" is pre-selected for new sessions.

---

### US_123: Studio Wizard State Integrity
**Feature Type**: Bug Fix
**Role**: Frontend Developer

**Goal**: 
Ensure data consistency when navigating between wizard steps, specifically fixing the blank-data state in Step 2.

**Core Task**: 
Audit the `StudioContext` and `Step2_Config` flow to ensure data processed in Step 1 is correctly cached and accessible for the preview.

**Functional Requirements**:
- **Data Persistence**: Ensure that moving "Back" from Step 2 to Step 1 does not reset selected entities.
- **State Synchronization**: Force a data refresh or validation check when entering Step 2 to ensure the `chartData` state is fully populated.
- **Error Handling**: Gracefully handle cases where Step 1 is skipped or data fails to load by redirecting back to Step 1.

**Technical Requirements**:
- **Context Fix**: Verify that `setChartData` is called and awaited correctly in `handleNext()`.
- **Z-Index/Visibility**: Ensure that Step 2's "preview" configuration doesn't attempt to render a 0-length timeline (add protective guards).

**Acceptance Criteria**:
- No "No data found" errors appear in Step 2 if data was successfully fetched in Step 1.
- All selection states are preserved during back/next navigation.

---

### 🔍 Audit & Assumptions
- **Detected Debt**: Duplicated files (`Step1Data.jsx` vs `Step1_Data.jsx`) exist in the directory. *Prescription*: Delete obsolete `StepXData` (without underscores) files to avoid developer confusion.
- **Assumption**: `importance_rank` is correctly populated in `V3_Countries` and `V3_Leagues`.
- **Bug Root**: The "Step 2 data bug" likely stems from the asynchronous nature of the `setChartData` state update occurring simultaneously with the `goToStep(2)` call.

### 🎨 UX & Product Strategy
Transitioning from "Statistic" to "Performance Metrics" and using a "Tag System" elevates the tool from a "chart builder" to an "intelligence storyboarder." By enforcing prestige ranking in the dropdowns, we guide the user toward high-quality data stories (e.g., analyzing Mbappe in Real Madrid vs a random 3rd division player).

### 🛠 Hand-off Instruction for the Team
**ATTENTION AGENTS:**

**BE AGENT:**
- Priority: Implement the double-rank sort in `studioController.js`.
- Clean up the `getStudioStats` mapping to use professional labels.

**FE AGENT:**
- Priority: Implement the Tag component in Step 1.
- Fix the async race condition in `handleNext` (await the state or use a navigation callback).
- Cleanup the duplicated files in the `studio/` directory.

**CRITICAL RULES:**
- No "Raw" DB column names in the UI.
- Importance rank must be the anchor for all selection components.
- Wizard state must be resilient to navigation.
