# User Story: V3 POC - Multi-Criteria Import Filters

**ID**: US-V3-002  
**Title**: POC: Multi-League & Season Import with Dynamic Filtering  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Developer testing the V3 Schema,  
**I want** to filter available leagues by country and select multiple leagues/seasons at once,  
**So that** I can trigger massive data ingestion into the new tables efficiently.

---

## 🎨 Context & Problem
The initial POC import page might be too simple (single league). We need to replicate the "Advanced Multi-Import" features we designed for V2, but applied to the V3 structure. This includes:
1.  **Drill-down**: Select Country -> Show only Leagues in that country.
2.  **Batching**: "I want Premier League 2015-2023 AND La Liga 2020-2023" in one go.

---

## ✅ Acceptance Criteria

### 1. Backend: Metadata Endpoints (Backend Agent)
- [ ] **`GET /api/v3/countries`**:
    - Returns distinct countries available in API-Football (or local cache).
- [ ] **`GET /api/v3/leagues`**:
    - Accepts query param `?country=France`.
    - Returns leagues filtered by that country.
- [ ] **`POST /api/v3/import/batch`**:
    - Input: ` { selection: [{ leagueId: 39, seasons: [2021, 2022] }, { leagueId: 140, seasons: [2022] }] } `
    - Logic: Loop through the selection and trigger the `importLeagueDataV3` logic for each combination.
    - **Optimization**: Use `Promise.all` or a sequential queue to avoid rate limits.

### 2. Frontend: Dynamic Filter UI (Frontend Agent)
- [ ] **Country Selector**: A searchable dropdown to pick a country.
- [ ] **League Multi-Select**: A list/checkbox group of leagues belonging to the selected country.
    - Allow "Select All" for the visible leagues.
- [ ] **Season Range**: A generic range selector (e.g., "From 2010 to 2024").
- [ ] **"Add to Queue" Button**:
    - Instead of immediately running, add the selection to a "Staging Area".
    - Example: User selects "England" -> "Premier League" -> "2020-2023" -> Adds to queue.
    - Then selects "Spain" -> "La Liga" -> "2023" -> Adds to queue.
- [ ] **"Start Batch Import" Button**:
    - Sends the entire staged queue to the backend.

### 3. Feedback (Frontend Agent)
- [ ] **Progress Log**: Use SSE (Server-Sent Events) to stream the import status of each league/season in the batch (e.g., "Importing Premier League 2021: 20%...").

---

## 🛠 Technical Notes
- **API-Football**: The `leagues` endpoint supports filtering by country. Use it.
- **State**: The frontend needs a local state array `importQueue` to hold the batch before sending.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_Multi_Import.md`
