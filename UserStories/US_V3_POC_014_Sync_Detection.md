# User Story: V3 POC - Pre-Import Sync Status Detection

**ID**: US-V3-POC-014  
**Title**: POC: Visually Identify Already Imported Data in the Batch Queue  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User preparing a batch import,  
**I want** to see which years of the selected competition are already present in the database,  
**So that** I don't accidentally re-import massive amounts of data that I already have, or so I can intentionally choose to "Sync/Update" them.

---

## 🎨 Context & Problem
Currently, when you add a league and a year range to the queue, it's a "blind" operation. You don't know if "Premier League 2022" is already 100% imported or if it's missing. The system has the tracking data in `V3_League_Seasons`, but it's not exposed to the user during the import configuration.

---

## ✅ Acceptance Criteria

### 1. Backend: Sync Status Endpoint (Backend Agent)
- [ ] **Method**: `GET /api/v3/league/:id/sync-status`
- [ ] **Logic**: Query `V3_League_Seasons` for the given `league_id`.
- [ ] **Return**: A list of season objects:
  ```json
  [
    { "year": 2022, "players": true, "fixtures": true, "standings": true },
    { "year": 2023, "players": false, "fixtures": true, "standings": false }
  ]
  ```

### 2. Frontend: Real-time Status Check (Frontend Agent)
- [ ] **Trigger**: When a League is selected in the dropdown OR when clicking "Add to Batch".
- [ ] **Feedback**: 
    - Fetch the sync status from the new endpoint.
    - Inside the **Staging Queue** items, color-code the seasons:
        - **Green/Icon**: Already imported (e.g., "2022 ✅").
        - **Orange/Icon**: Partially imported (e.g., "2023 ⚠️").
        - **Normal**: New data.
- [ ] **Summary Label**: Below the season range selector, show a brief summary like: *"Note: 5 seasons in this range are already in the DB."*

### 3. Smart Selection Interaction
- [ ] **"Skip Existing" Toggle**: Add a checkbox "Skip years already fully imported" that automatically filters the range sent to the batch import.

---

## 🛠 Technical Notes
- **Database**: Use the `imported_players`, `imported_fixtures`, and `imported_standings` bit-flags in `V3_League_Seasons`.
- **UI**: Use small badges or icons within the queue list items to keep the UI compact.
- **File**: `frontend/src/components/v3/ImportV3Page.jsx` and new controller logic in `backend/src/controllers/v3/`.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_014_Sync_Detection.md`
