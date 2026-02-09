# User Story: V3 UI Optimizations & Fixes

**ID**: US-V3-OPT-007  
**Title**: Optimize Import Logs, League Selection, and Fix Player Page  
**Role**: Full Stack (Frontend + UX)  
**Status**: Done  

---

## 📖 User Story
**As a** Developer/Admin,  
**I want** a more usable import interface with scrolling logs and ranked league lists, and a functional player details page,  
**So that** I can efficiently manage data imports and verify the results in the V3 ecosystem.

---

## ✅ Acceptance Criteria

### 1. Improved Logs Display (Import Page)
- [ ] **Pinned Height**: The logs container in `ImportV3Page.jsx` must have a fixed maximum height (e.g., `500px`) with an internal scrollbar. It should not expand the page height indefinitely.
- [ ] **Auto-Scroll Toggle**: Add a "Auto-scroll" checkbox or toggle button.
    - If ON: The log display automatically sticks to the bottom as new lines arrive.
    - If OFF: The user can manually scroll up to inspect logs without being jumped back to the bottom.

### 2. League Selection UX
- [ ] **Country Grouping**: Group leagues by their country in the selection dropdown/list.
- [ ] **Ranking Priority**: Sort countries based on their ranking (assuming `V2_countries.importance_rank` or similar logic applies to V3 mapping). Major leagues (England, Spain, France, etc.) should appear at the top.

### 3. Fix Player Profile Page
- [ ] **Debug & Repair**: Identify why the current V3 Player Page is broken.
- [ ] **Data Alignment**: Ensure it correctly fetches and displays data from the new `V3_Players` and `V3_Player_Stats` tables.
- [ ] **Basic Visualization**: Display at least the core identity (name, age, photo) and the seasonal stats grid.

---

## 🛠 Technical Notes
- **Component**: `frontend/src/components/v3/ImportV3Page.jsx`
- **Component**: `frontend/src/components/v3/PlayerProfilePageV3.jsx` (and associated CSS/hooks).
- **Backend**: Ensure the API endpoints for V3 Players are returning the correct schema fields (`firstname`, `lastname`, `games_appearences` etc.).

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_UI_Optimization.md`
