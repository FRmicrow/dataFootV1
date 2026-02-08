# User Story: Backend Import Endpoint Stabilization

**ID**: US-BE-002  
**Title**: Stabilize and Expose Optimized Import Endpoints  
**Role**: Backend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Backend Developer,  
**I want** to ensure the optimized league import endpoints are robust and correctly exposed to the frontend,  
**So that** the system can ingest bulk data efficiently without specialized "individual player" calls.

---

## 🎨 Context & Problem
The frontend is currently making calls to `/api/admin/import-players-range-v2` which results in a 404. We need to decide if we want to restore a "Single Player" or "Range" endpoint that is thin-wrapped around the optimized logic, or if we force the frontend to only use League-wide imports.

---

## ✅ Acceptance Criteria

### 1. Endpoint Verification
- [ ] **Verify `import-league-optimized`**: Ensure this endpoint is fully functional and handles high throughput correctly.
- [ ] **Fix 404 Inconsistency**: If `import-players-range-v2` is truly deprecated, confirm that the frontend can achieve the same goal using `import-league-optimized`.

### 2. Support for Player-Specific Sync (Optional but Recommended)
- [ ] Implement (or fix) a specific endpoint `POST /api/admin/sync-player/:id` that:
    1.  Finds the player's current/last league and season.
    2.  Triggers the `importLeagueData` logic internally for that specific context.
    3.  **Benefit**: Allows a user to "update Messi" without needing to know his League ID.

### 3. SSE Logging Robustness
- [ ] Ensure that during a league import, the logs sent via SSE are clean and don't crash if competition data is partially missing.
- [ ] Ensure that `totalPlayersImported` and `totalStatsImported` are accurately reported at the end of the stream.

---

## 🛠 Technical Notes
- **Controller**: `backend/src/controllers/importLeagueController.js`.
- **Routes**: `backend/src/routes/adminRoutes.js`.
- **Database**: Monitor `V2_import_status` if applicable to prevent redundant overlapping imports for the same league/season.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Backend_Import_Stabilization.md`
