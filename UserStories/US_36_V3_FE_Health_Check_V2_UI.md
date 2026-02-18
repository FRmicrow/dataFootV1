# US_36_V3_FE_Health_Check_V2_UI

## 1. User Story
**As a** System Administrator,
**I want to** use an improved Health Check interface with detailed issue reporting and "undo" capabilities,
**So that** I can confidently manage the database quality without fear of data loss.

## 2. Technical Context
- **Existing Page**: `HealthCheckPage.jsx`.
- **New Components**: `IntegrityTimeline.jsx`, `RevertManager.jsx`.
- **API Endpoints**:
    -   `POST /api/v3/admin/health/check-deep` (Milestone-based scan).
    -   `POST /api/v3/admin/health/fix-all`.
    -   `GET /api/v3/admin/health/history`.
    -   `POST /api/v3/admin/health/revert/:id`.

## 3. Frontend Implementation Requirements

### 3.1 Deep Scan & Milestones
- **UX**: Instead of a single "Scan" button, provide a "Deep Integrity Scan".
- **Visuals**: Show progress across different "Milestones":
    1.  League Naming Check.
    2.  Duplicate Stats Discovery.
    3.  Orphan/Broken Link Audit.
    4.  Country/Nationality Matching.

### 3.2 Issue Management
- **Categorization**: Group issues by type (naming, duplication, orphan).
- **Expansion**: Let users click on a category to see a sample of affected records.
- **League Renaming Tool**: Specifically highlight "League Collisions" (e.g., Ligue 1) and show a "Preview" of the new names: `Ligue 1 -> Ligue 1 (France)`.

### 3.3 Recovery UI (History Panel)
- **Location**: A side panel or separate tab named "Cleanup History".
- **List Items**:
    -   Date & Time of cleanup.
    -   Issue resolved (e.g., "Deleted 45 Duplicates").
    -   "Revert" button (Danger Red).
- **Interaction**: Clicking "Revert" should show a confirmation: "This will restore the 45 records deleted on 2026-02-16. Continue?".

### 3.4 Responsive Batch processing
- Handle large data sets in the UI without freezing.
- Show "Total records scanned: 12,450" live counter.

## 4. Acceptance Criteria
- [ ] **Milestone Scan**: UI clearly distinguishes between different health checks.
- [ ] **League Renaming**: Preview and execution of country-parenthesis renaming works.
- [ ] **History**: Admin can see a list of past "Fixes".
- [ ] **Safety**: The Revert button successfully triggers the restoration flow.
