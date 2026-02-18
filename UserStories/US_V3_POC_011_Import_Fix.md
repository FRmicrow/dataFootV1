# User Story: V3 POC - Pure V3 Import Fix & Global Mapping

**ID**: US-V3-POC-011  
**Title**: POC: Decouple V3 Import from V2 Tables & Fix Region Mapping  
**Role**: Full Stack (Frontend + Backend)  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Developer,  
**I want** the V3 Import tool to be completely independent of V2 database tables and correctly handle global competitions (UCL, World Cup, etc.),  
**So that** I can accurately test the new architecture in isolation.

---

## 🎨 Context & Problem
Currently, the `getCountriesV3` endpoint still queries the `V2_countries` table. This creates a dependency that shouldn't exist in V3. 
Furthermore, we need a reliable way to categorize and find international competitions (Regions like "World", "Europe", etc.) using the API-Football taxonomy.

---

## ✅ Acceptance Criteria

### 1. Backend: Pure V3 Metadata Endpoints (Backend Agent)
- [ ] **Rework `getCountriesV3`**:
    - **Remove** all SQL queries targeting `V2_...` tables.
    - **Primary Source**: Fetch the full list of countries directly from API-Football via `footballApi.getCountries()`.
    - **Logic**: 
        - Ensure "World" is included in the list (API-Football returns it).
        - Optional: Cache these in `V3_Countries` to reduce API calls for future page loads.
- [ ] **Rework `getLeaguesV3`**:
    - Ensure it correctly passes the `country` parameter to the API.
    - Validate that when `country="World"` is passed, it returns global tournaments (Champions League, World Cup, etc.).

### 2. Frontend: Region-Aware Selection (Frontend Agent)
- [ ] **Country Selector Update**:
    - The dropdown must correctly display the list returned by the new V3 backend.
    - **Grouping**: Manual grouping of "Regions" (World, Europe, etc.) at the top of the dropdown vs "Individual Countries" below, as per existing mock-up in `ImportV3Page.jsx`.
- [ ] **Mapping Verification**: 
    - Verify that selecting "World" as a region triggers `fetchLeagues("World")`.
    - Verify that selecting "Europe" as a region triggers `fetchLeagues("Europe")` (if API-Football supports this specialized region filter for leagues).

### 3. Data Integrity
- [ ] **Mapping**: 
    - Ensure that during the import of a "World" league (like UCL), the team's country link in `V3_Teams` is handled gracefully (linking to the player's club country, not the "World" region).

---

## 🛠 Technical Notes
- **API-Football Regions**: API-Football uses `World` as a country name for most major international club and national team trophies.
- **Reference**: `backend/src/controllers/v3/importControllerV3.js` needs to be purged of `V2_countries`.
- **Frontend File**: `frontend/src/components/v3/ImportV3Page.jsx`.

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_V3_POC_011_Import_Fix.md`
