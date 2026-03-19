> Obsolete Note (2026-03-18): Historical SQLite-era document kept for archive only. The active stack now uses PostgreSQL via `statfoot-db`.

📂 Created User Stories (/UserStories/V6-App-Enchangement/)

Feature Name: Intelligent Search & Relevance Engine
Version: V6
Global Feature Type: Architecture Upgrade / UX Overhaul
Scope: Full Stack / Data / UX

---

### US_100: Scout-Relevance Ranking Engine
**Feature Type**: Architecture Upgrade
**Role**: Backend Developer / Data Engineer

**Goal**: 
Transform search from a basic name-match query into a professional scouting discovery tool that prioritizes high-impact players and clubs.

**Core Task**: 
Implement a multi-dimensional relevance scoring algorithm ($S$) in the SQL layer to weight search results based on prestige, activity, and name accuracy.

**Functional Requirements**:
- **Relevance Score ($S$) Calculation**:
    - **Exact Match**: +1000 points if the query matches the full name exactly.
    - **Active Bonus**: +500 points if the entity has recorded stats in the **2025/2026** seasons.
    - **Career Longevity**: `(LastSeason - FirstSeason) * 10` points.
    - **Historical Prestige**: `(100 - min(importance_rank)) * 5`.
    - **Performance Weight**: `(Total_Matches * 1) + (Total_Goals * 2)`.
- **Sorting Logic**: Results must return as a single list ordered by `$S$ DESC`.
- **Fallback**: Maintain secondary alphabetical sorting for equal scores.

**Technical Requirements**:
- **APIs Involved**: `GET /api/v3/search` (Modified).
- **Database Fields**: `V3_Player_Stats.season_year`, `V3_Leagues.importance_rank`, `V3_Teams.is_national_team`.
- **Migrations**: No schema change required, but indexing on `importance_rank` and `season_year` is mandatory for performance.
- **Validation**: Query must handle case-insensitive partial matches (`LIKE %term%`) but prioritize exact matches via the scoring engine.

**Acceptance Criteria**:
- Search for "Messi" returns Lionel Messi as the first player result.
- Search for "Real" returns Real Madrid as the first club result.
- Active players (25/26) consistently outrank historical players with similar name matches.
- Response time remains < 400ms under standard load.

---

### US_101: Search Identity & Header Cleanup
**Feature Type**: UX Redesign
**Role**: Frontend Developer / UX

**Goal**: 
Eliminate marketing-style "Discovery Engine" labels to create a clean, high-density professional interface.

**Core Task**: 
Refactor the `SearchPageV3` header and result card components to remove redundant branding and misleading statistics.

**Functional Requirements**:
- **Header Refactor**:
    - Remove "DISCOVERY ENGINE" badge.
    - Remove "Global Search" H1 title.
    - Add a single-line, discreet subtitle (e.g., "Accessing 50+ professional leagues & 40,000+ player profiles").
- **Term Normalization**: Rename the "Everything" filter tab to "All".
- **Visual De-cluttering**: 
    - Remove the `#5` (Country Rank) badge from the top-left of individual cards.
    - Reduce card padding to improve result density on small viewports.

**Technical Requirements**:
- **Design System Alignment**: Use the consolidated `text-slate-400` for subtitles and `text-white` for primary headers.
- **Conditional Rendering**: Ensure the "All" tab correctly toggles the split-view grid.

**Acceptance Criteria**:
- Header follows the "SaaS High-Density" standard.
- No historical "Discovery Engine" labels remain in the DOM.
- Result cards are cleaner, focusing on Entity Name and Nationality.

---

### US_102: Smart Country Selector with Flag Logic
**Feature Type**: New Capability
**Role**: Full Stack 

**Goal**: 
Improve navigation speed by prioritizing elite football nations in the search filter.

**Core Task**: 
Update the country selector API and frontend component to support ranking-based grouping and visual flags.

**Functional Requirements**:
- **Dropdown Logic**:
    - Top 10 countries (by `importance_rank`) appear at the absolute top of the list.
    - A visual divider separates the "Top 10" from the remaining countries.
    - The rest of the countries are sorted alphabetically.
- **UI Logic**: Every country in the dropdown MUST display its flag icon.
- **Default State**: "🌍 Global Search" remains the first, selected option.

**Technical Requirements**:
- **Backend API**: `GET /api/v3/search/countries` must return an object including `importance_rank`.
- **Frontend Refactor**: Replace standard HTML `<select>` with a custom accessible dropdown to support image (flag) rendering.

**Acceptance Criteria**:
- Countries like England, Spain, Brazil are immediately selectable without scrolling.
- All entries show flags.
- Global Search functionality is preserved.

---

### 🔍 Audit & Assumptions
- **Current Limitation**: SQLite `LIKE` is case-sensitive for non-ASCII characters; we assume standard UTF-8 handling is sufficient for now.
- **Technical Debt**: The current `country_rank` field on cards is actually the *league's home country rank*; US_101 removes this to avoid user confusion.
- **Data Integrity**: We assume `V3_Countries` table contains the flags for the Top 10 nations.

### 🎨 UX & Product Strategy
By removing marketing labels, we increase the "Professional Trust" factor. The Relevance Engine ensures that even with a large database, the "Common Sense" result (e.g., world-class players) is always what the user finds first. This improves the "Time-to-Data" KPI for scouts and researchers.

### 🛠 Hand-off Instruction for the Team
**ATTENTION AGENTS:**

**BE AGENT:**
- Priority: Implement the CTE in `searchController.js` for relevance scoring.
- Ensure `getSearchCountries` returns the ranking metadata.

**FE AGENT:**
- Priority: Clean up the `SearchPageV3.jsx` header. 
- Implement the custom Flag Dropdown using the existing `CountryFlag` asset library.
- Rename the tab labels.

**CRITICAL RULES:**
- No regression on the search debounce timing (300ms).
- Zero tolerance for placeholder badges.
- All US MUST use the `importance_rank` logic for their respective domains.
