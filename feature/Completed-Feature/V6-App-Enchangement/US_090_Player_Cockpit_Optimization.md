📂 Created User Stories (/UserStories/V6-App-Enchangement/)

Feature Name: Player Performance Cockpit
Version: V6
Global Feature Type: UX Overhaul / Performance Optimization
Scope: Full Stack / UX

---

### US_090: Compact Player Identity System
**Feature Type**: UX Improvement
**Role**: Frontend Developer / UX

**Goal**: 
Maximize professional context above the fold by streamlining the player identity header and adding real-time status intelligence.

**Core Task**: 
Refactor the `.player-hero` container to reduce vertical height by 30% while dynamically resolving the "Current Club" from the latest database record.

**Functional Requirements**:
- **Branding Removal**: Permanent deletion of "V3 Analytics" and "PRO PLAYER PROFILE" badges.
- **Current Club Badge**: 
    - Display the logo and name of the club associated with the most recent `season_year` record.
    - If the latest record is > 1 year old, display "Historical Profile / Inactive" instead of "Current Club".
- **Typography Scale**: Reduce the `.player-name` font size (3.5rem -> 2.5rem) and compact the metadata tray (Age, Foot, Height).

**Technical Requirements**:
- **APIs Involved**: `GET /api/v3/player/:id` (Augmented).
- **Frontend Logic**: Implement a "Status Indicator" component that chooses colors based on `currentContext.status` (Active: Emerald, Inactive: Slate).
- **CSS**: Transition to absolute vertical paddings (e.g., `2rem`) to prevent layout shift.

**Acceptance Criteria**:
- The "Total Career" table is visible on a standard laptop screen without scrolling.
- "Current Club" displays a correct logo and season reference.
- No marketing-style placeholders exist in the header.

---

### US_091: Universal Career Aggregation
**Feature Type**: Architecture Upgrade
**Role**: Backend Developer / Data Engineer

**Goal**: 
Eliminate the mental gap between club and international performance by providing a unified, prestige-weighted career summary.

**Core Task**: 
Rewrite the backend aggregation logic in `playerController.js` to pin National Team performance and calculate career-wide weighted ratings.

**Functional Requirements**:
- **Labeling Change**: Rename "Club Career Totals" to "Total Career" and "Club" to "Team".
- **Pinning Engine**: The National Team row (where `is_national_team = 1`) must ALWAYS be the first record in the summary list.
- **Sorting Logic**: Secondary sorting (for clubs) must be done by `total_matches` DESC.
- **Metric Normalization**: Sum all match/goal/assist data regardless of competition type into a single "Source of Truth" table.

**Technical Requirements**:
- **Database Logic**: Join `V3_Teams.is_national_team` into the career stats query.
- **Weighted Average**: `avg_rating = (SUM(rating * matches) / SUM(matches))` to ensure a 40-match season carries 10x the weight of a 4-match cup run.
- **Validation**: Ensure no division by zero if a player has appearances but no ratings.

**Acceptance Criteria**:
- National Team is #1 in the summary table.
- Career totals match the sum of individual years displayed below.
- "Team" is the universal label used across the UI.

---

### US_092: Hierarchical Career Explorer
**Feature Type**: Refactor
**Role**: Full Stack

**Goal**: 
Enable scouts to instantly identify "High-Prestige" phases of a player's career using the database ranking system.

**Core Task**: 
Integrate the `importance_rank` engine into the career history list to highlight elite competitions and prioritize National Team duty chronological rows.

**Functional Requirements**:
- **Row Prioritization**: Within a single year or club block, rows must be sorted by:
    1. `is_national_team` (First)
    2. `importance_rank` (ASC - e.g., Champions League before domestic cup).
- **Visual Highlighting**: 
    - Any competition with `importance_rank <= 10` (Major Leagues) receives a gold border or ⭐ badge.
- **Toggle State**: "By Year" view is expanded by default.

**Technical Requirements**:
- **BE**: Ensure `importance_rank` is fetched from the `V3_Leagues` table in every career row.
- **FE**: Dynamic CSS class assignment: `isMajor ? 'border-amber-500/30 bg-amber-500/5' : ''`.

**Acceptance Criteria**:
- Champions League and National Team games are visually distinct from B-Tier competitions.
- Default sorting uses the prestige hierarchy.

---

### US_093: Domestic Territorial Migration View
**Feature Type**: Architecture Upgrade
**Role**: Full Stack

**Goal**: 
Group player history by geographical tenure to analyze adaptation and migration patterns across different countries.

**Core Task**: 
Re-engineer the "By Country" filter to group by the **Domestic Country of the Team**, ensuring continental cups are correctly aggregated under the club's home nation.

**Functional Requirements**:
- **Territorial Pivot**: When "By Country" is selected, aggregate all matches played for an English club (PL, FA Cup, UCL) under "England".
- **Geo-Pinning**: The "National Team" group remains a standalone category pinned at the top.
- **Flag Logic**: Display the Team's domestic country flag in the panel header.

**Technical Requirements**:
- **Backend Query**: Update `getPlayerProfileV3` to join `V3_Teams.country` with `V3_Countries.flag_url`.
- **Frontend Reducer**: Refactor the grouping logic to use `team_country` as the primary key instead of `league_country`.

**Acceptance Criteria**:
- Selecting "By Country" shows clean territorial blocks.
- UCL stats for Real Madrid are nested under Spain, not "International".
- National Team is the first territory block.

---

### 🔍 Audit & Assumptions
- **Detected Debt**: The current code uses a hardcoded `FEATURED_IDS` array for major leagues—US_092 replaces this with the database `importance_rank` for scalability.
- **Migration Risk**: Legacy data might have NULL `country` values for teams. Assumption: Default to "International/Unknown" for missing records.
- **Performance**: We assume the player profile has < 500 career entries; if larger, UI virtualization may be required.

### 🎨 UX & Product Strategy
By prioritizing National Team and Major Leagues, we align with the scouting philosophy that "Elite performance is the true signal." Moving to territorial grouping allows scouts to see if a player has successfully "conquered" specific football cultures (e.g., "The German tenure", "The Brazilian era").

### 🛠 Hand-off Instruction for the Team
**ATTENTION AGENTS:**

**BE AGENT:**
- Priority: Update the `playerController` SQL query to include `is_national_team` and `team_country` metadata.
- Implement the weighted average rating calculation.

**FE AGENT:**
- Priority: Refactor the Hero Header padding and typography.
- Implement the hierarchical CSS classes for "Major" rows.
- Ensure the "By Country" grouping logic is updated to the territorial model.

**CRITICAL RULES:**
- No legacy "V3 Analytics" labels.
- "Team" label is non-negotiable.
- National Team must be pinned in every view.
