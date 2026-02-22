# US_41_V3_FE_BE_Data_Availability_Indicator

## 1. User Story
**As a** Content Creator using the Import & Discovery tools,
**I want to** clearly see which League/Season combinations already have data in my local database versus which ones are empty,
**So that** I avoid re-importing existing data and can quickly identify gaps (missing seasons) in my library.

## 2. Technical Context
- **Frontend**: `ImportEventsPage.jsx` (and potentially `ImportTrophiesPage.jsx`).
- **Backend API**: `GET /api/v3/league/:apiId/available-seasons`.
- **Database**: `V3_League_Seasons` table (already has `sync_status` and boolean flags `imported_players`, `imported_fixtures`, etc.).
- **External API**: API-Football `/leagues` endpoint (used for discovery list).

## 3. Implementation Requirements

### 3.1 Backend: Enhance Availability Check
-   The current endpoint `getAvailableSeasons` already cross-references API data with Local DB status.
-   **Current Logic**:
    -   It checks `V3_League_Seasons` for `sync_status` ('FULL', 'PARTIAL', 'NONE').
    -   It maps this to a `status` field in the response.
-   **Refinement Requirement**:
    -   Ensure standard "Full" import (Players + Fixtures + Standings) results in `status: 'FULL'`.
    -   Ensure empty or missing local record results in `status: 'NOT_IMPORTED'`.
    -   (Optional) If we want to check "Trophies", we might need a separate check or a specific flag since Trophies are often separate from the main league cycle.

### 3.2 Frontend: Visual Indicators
-   **Layout Update**:
    -   In the "Select Season" grid/list:
    -   If `status === 'FULL'` (or contains data): Display a **Green Tick** icon ✅.
        -   Tooltip: "Data Imported".
        -   Action: Clicking it might ask "Re-import?" or just navigate to view.
    -   If `status === 'NOT_IMPORTED'` (Empty): Display a **Red Cross** icon ❌.
        -   Tooltip: "No Data Found Locally".
        -   Action: Clicking selects it for import.
    -   If `status === 'PARTIAL'`: Display an **Orange Query** icon ⚠️ (or similar).
-   **Discovery Archive**:
    -   Remove the "Discovery archive" section/layout if it still exists in the codebase, as requested ("obsolete").

### 3.3 Trophies Import Page
-   Apply the same logic:
-   When selecting a Player/Team to import trophies for, check if `V3_Trophies` has records for them.
-   If `count > 0` -> Green Tick.
-   If `count === 0` -> Red Cross.

## 4. Acceptance Criteria
- [ ] The "Available Seasons" list for a league correctly shows Green Ticks for seasons I have fully imported.
- [ ] It shows Red Crosses for seasons I have never imported.
- [ ] The "Discovery Archive" UI section is removed.
- [ ] Trophies import page (if applicable) indicates if trophies already exist for an entity.
