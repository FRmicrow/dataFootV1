# User Story: Modernize Player Sync & Import System

**ID**: US-FE-002  
**Title**: Update Frontend Import UI to use Optimized League Logic  
**Role**: Frontend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** System Administrator,  
**I want** to update the player import interface to transition away from "Brute Force" ID ranges towards "Optimized League Imports",  
**So that** I can sync data 50x faster and avoid 404 errors from deprecated endpoints.

---

## 🎨 Context & Problem
The frontend is currently throwing 404 errors when attempting to access `/api/admin/import-players-range-v2`. This endpoint is deprecated in favor of the optimized league import strategy.
Additionally, the player detail page needs a way to "Refresh" its data using the new optimized logic.

---

## ✅ Acceptance Criteria

### 1. Fix Deprecated Import Routes
- [ ] **Remove/Update `ImportPlayersV2.jsx`**: Either remove the "Range Import" feature if it is no longer supported by the backend, or point it to a valid backend equivalent if one exists.
- [ ] **Modernize Admin Navigation**: Ensure the Admin menu prioritizes "Import by League" instead of "Import by Player ID Range".

### 2. Implement Player Detail "Sync" Button
- [ ] On the **Player Detail page**, add a "Sync Data" or "Update Player" button.
- [ ] **Logic**: This button should NOT call a single player import. Instead:
    1.  Identify the player's most recent **League ID** and **Season** from their existing stats.
    2.  Call the endpoint `POST /api/admin/import-league-optimized` with that `{ leagueId, season }`.
    3.  Provide visual progress (using SSE - Server Sent Events) while the league imports.
    4.  Refresh the player page upon completion.

### 3. Implement League Import UI
- [ ] Verify that `ImportLeagueDeep.jsx` is using the correct endpoint: `POST /api/admin/import-league-optimized`.
- [ ] Ensure the UI handles the SSE stream correctly to show real-time logs to the user.

---

## 🛠 Technical Notes
- **Broken URL**: `/api/admin/import-players-range-v2` (Currently 404).
- **New URL**: `/api/admin/import-league-optimized` (SSE enabled).
- **Component to Check**: `frontend/src/components/admin/ImportPlayersV2.jsx` and `frontend/src/components/PlayerDetail.jsx`.
- **SSE Handling**: Use `new EventSource()` for progress updates if the endpoint remains a GET/SSE or similar, or handle the POST properly if it returns an initial trigger.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Frontend_Import_Modernization.md`
