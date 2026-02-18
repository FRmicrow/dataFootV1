# User Story: Frontend Multi-League Import & Progress Dashboard

**ID**: US-FE-003  
**Title**: Implement Multi-Select Import UI with Real-Time Progress  
**Role**: Frontend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** System Administrator,  
**I want** to select multiple leagues and seasons for bulk import,  
**So that** I can populate the database efficiently without running individual imports one by one.

---

## 🎨 Context & Problem
Currently, the import tool only allows selecting one league and one season at a time. This is tedious when setting up a new database or backfilling history (e.g., "Premier League 2010-2023"). Users need a batch operation mode.

---

## ✅ Acceptance Criteria

### 1. Multi-Select UI
- [ ] **League Selector**: Replace the single dropdown with a **Multi-Select Component** (e.g., checkboxes or a tag-based selector). Allow searching/filtering by country.
- [ ] **Season Selector**: Provide a **Range Selector** (Start Year - End Year) or a multi-select list for seasons (e.g., "Select All from 2015 to 2024").
- [ ] **Import Mode Toggle**:
    - **"League Only (Fast)"**: Imports only the roster/stats for the selected league/season.
    - **"Full Career Backfill (Deep)"**: For every player found, also fetches their *entire* history from other years/leagues.

### 2. Action & Feedback
- [ ] **Start Button**: Triggers the batch import via `POST /api/admin/import-league-optimized`. payload: `{ leagueIds: [...], seasons: [...] }`.
- [ ] **Stop Button**: Aborts the current operation.

### 3. Real-Time Progress Dashboard
- [ ] **Queue Visualization**: Show a list/table of tasks (e.g., "Premier League 2023: Pending", "La Liga 2023: Processing...").
- [ ] **SSE Integration**: Connect to the server-sent events stream to display:
    - Current Action (e.g., "Fetching Manchester City...").
    - Progress Bar (Teams processed / Total teams).
    - Stats Counter (Players imported, New stats added).
- [ ] **Completion Report**: Show a summary dialog when all tasks are done (Total time, Total records).

---

## 🛠 Technical Notes
- **Endpoint**: `POST /api/admin/import-league-optimized` (Updated to handle arrays).
- **State Management**: Managing the queue of "Pending" vs "Processing" items locally or via backend state.
- **Performance**: Ensure the UI doesn't freeze if receiving many logs via SSE. Use a virtualized list for logs if necessary.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Frontend_Multi_import_V2.md`
