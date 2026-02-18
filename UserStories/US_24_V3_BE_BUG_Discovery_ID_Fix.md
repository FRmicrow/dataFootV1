# US_24_V3_BE_BUG_Discovery_ID_Fix

**Role**: Backend Expert Agent  
**Objective**: Fix the Discovery Archive import bug where local `league_id` is used instead of external `api_id`.

## 📖 User Story
**As a** Developer,  
**I want** to ensure the "Discovered Leagues" panel uses the correct `api_id` when triggering a full import,  
**So that** I don't accidentally import "Bahrain" league data when trying to import the Austrian Cup.

## 🐛 Defect Analysis
- **Symptom**: Importing a discovered league fetches data for the wrong league (e.g., Bahrain).
- **Cause**: The frontend is sending `leagueId` (which is the local SQL ID, e.g., 1113) to the `importBatchV3` endpoint. The `runImportJob` function expects an **API ID**.
- **Result**: API-Football receives ID `1113` (local ID), which happens to correspond to "Bahrain League" in their system.

## ✅ Acceptance Criteria

### 1. Backend Logic Update (`importControllerV3.js`)
- [ ] **Function**: `importBatchV3` and `runImportJob`.
- [ ] **Fix**:
    - When receiving `leagueId` from the frontend, check if it's a **Local V3 ID**.
    - If it is local, query the DB to get the corresponding `api_id`.
    - Pass the correct `api_id` to `footballApi.getLeagues` and subsequent calls.
    - *Alternatively*: Update the Frontend to send `api_id`, but fixing the Backend is safer to handle both cases.

### 2. Frontend Logic Update (`ImportV3Page.jsx`)
- [ ] **Component**: `DiscoveredLeaguesPanel`.
- [ ] **Fix**: Ensure the "Run Full Import" button passes the `api_id` of the discovered league, not its local `league_id`.

## 🛠 Technical Notes
- **File**: `backend/src/controllers/v3/importControllerV3.js`
- **File**: `frontend/src/components/v3/ImportV3Page.jsx`
