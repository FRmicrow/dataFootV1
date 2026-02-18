# US_34_V3_FE_Import_Fixture_Events_Page

## 1. User Story
**As a** System Admin,
**I want to** access a dedicated "Event Import" dashboard,
**So that** I can identify which leagues are missing detailed event data and trigger a catch-up sync.

## 2. Technical Context
- **New Page**: `/admin/events-import` (or similar route in your Admin section).
- **API Dependencies**:
    -   `GET /api/v3/admin/import/candidates`
    -   `POST /api/v3/admin/import/events`
- **Components**: `ImportEventsManager.jsx`

## 3. Frontend Implementation Requirements

### 3.1 Page Layout
- **Header**: "Fixture Events Import Manager"
- **Description**: "Select leagues below to sync detailed match events (Goals, Cards, Subs). High API usage warning."

### 3.2 The "Catch-up" List
- **Data Fetch**: On mount, call `/candidates`.
- **Table Columns**:
    1.  **League**: Name + Logo (e.g., Premier League).
    2.  **Season**: (e.g., 2023).
    3.  **Status**: "Missing Data" (Red badge) or count of missing matches.
    4.  **Action**: "Sync Events" button.

### 3.3 Interaction & Feedback
- **On Click "Sync Events"**:
    -   Disable the button.
    -   Show a **Progress Bar** or "Processing..." spinner for that row.
    -   (Optional) If backend supports Server-Sent Events (SSE) or simple polling, update progress. Otherwise, simulate or wait for completion.
- **Completion**:
    -   Show "Completed" (Green checkmark).
    -   Remove from list or move to a "Completed" section.

### 3.4 Integration
- Add a link to this page from the main **Admin Import Dashboard** or Sidebar.
- Ensure the user understands that "Future Imports" will happen automatically, and this page is only for **historical/missing** data.

## 4. Acceptance Criteria
- [ ] **Page Exists**: Accessible via Admin navigation.
- [ ] **List Populates**: Shows only leagues that actually need syncing.
- [ ] **Action Works**: Clicking sync calls the API and updates UI state.
- [ ] **Clear Feedback**: User knows when the process is running and finished.
