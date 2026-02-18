# User Story: V3 POC - Dynamic Season Ranges in Import Form

**ID**: US-V3-POC-013  
**Title**: POC: Dynamic Season Selection based on API Availability  
**Role**: Frontend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** User importing data,  
**I want** the season selection range (From/To) to automatically adjust based on the historical availability of the selected competition,  
**So that** I don't try to import years that don't exist and I can easily see how far back the data goes.

---

## 🎨 Context & Problem
Currently, the season dropdown in `ImportV3Page.jsx` is hardcoded to go from the current year back to 2010. Some competitions (like the English Premier League) have data going back to the 90s, while newer competitions might only have a few years. Choosing a year where no data exists leads to empty imports or errors.

---

## ✅ Acceptance Criteria

### 1. Dynamic Season Options (Frontend)
- [ ] **State Update**: When a league is selected, extract the `seasons` array from the league object returned by the API.
- [ ] **Dynamic Dropdowns**: 
    - Replace the hardcoded `seasonOptions` with a list derived from the selected league's `seasons` array.
    - The dropdowns for "From Season" and "To Season" must only contain years actually supported by that competition.
- [ ] **Smart Defaulting**:
    - **From Season**: Automatically set to the **oldest year** available in the `seasons` list for that league.
    - **To Season**: Automatically set to the **most recent year** available.

### 2. Validation
- [ ] Ensure that if no league is selected, the season dropdowns are either disabled or show a generic range (e.g., current year only).
- [ ] Ensure the "Add to Batch" and "Start Import" logic correctly uses these dynamic values.

### 3. Visual Feedback
- [ ] Display the total number of available seasons as a small note (e.g., "Available: 24 seasons") near the dropdowns to give the user context.

---

## 🛠 Technical Notes
- **Data Structure**: The API response from `/api/v3/leagues` includes a `seasons` array:
  ```json
  "seasons": [
    { "year": 2010, "current": false, ... },
    { "year": 2023, "current": true, ... }
  ]
  ```
- **File**: `frontend/src/components/v3/ImportV3Page.jsx`
- **Logic**: Use the `seasons` array of the `selectedLeagueData` to populate the state.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_013_Dynamic_Seasons.md`
