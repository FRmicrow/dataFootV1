# US_22_V3_FE_POC_Discovery_Panel

**Role**: Frontend Expert Agent  
**Objective**: Create the UI to manage Discovered Leagues with a clear "Archive" distinction.

## 📖 User Story
**As a** User,  
**I want** to see which leagues were auto-discovered by player syncs,  
**So that** I can clean up my list and promote them to "Full Import" status.

## ✅ Acceptance Criteria

### 1. New Section: "Discovered Leagues"
- [ ] **Context**: V3 Import Page (`ImportV3Page.jsx`).
- [ ] **Data Source**: Fetch leagues where `is_discovered = 1`.
- [ ] **Content**: Display list grouped by Country.

### 2. Action: Promote (Full Import)
- [ ] **Button**: "Run Full Import" next to each discovered season.
- [ ] **Function**: Triggers the standard `importBatchV3` for that league/year.
- [ ] **State**: If successful, update the `sync_status` to `FULL` and remove from the "Discovered" list (as it is now Official).

### 3. Visual Distinction
- [ ] **Color Code**: Use a distinct color (e.g., Purple or Slate) for the "Discovery Archive" section to separate it from "Official Imports."

## 🛠 Technical Notes
- **API**: `GET /api/v3/leagues/discovered` (New endpoint or filtered query).
