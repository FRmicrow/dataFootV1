# US-V3-POC-019: Deep Sync v3 - Discovery Archive & Auto-Creation

**Role**: Full Stack (DB + Backend + Frontend)  
**Objective**: Implement a complete career sync that auto-discovers and archives unknown leagues.

## 📖 User Story
**As a** User,  
**I want** to sync a player's full career history (e.g., Haaland's early years) without manual league setup,  
**So that** I get 100% of the player's data instantly, while the system organizes new leagues into a "Discovered" section for optional full import.

## ✅ Acceptance Criteria

### 1. Database Schema (DB Agent)
- [ ] **Table**: `V3_Leagues`
- [ ] **Column**: Add `is_discovered` (BOOLEAN DEFAULT 0).
- [ ] **Migration**: Create a migration script to add this column to `backend/database_v3_test.sqlite`.

### 2. Backend Logic (Backend Agent)
- [ ] **Sync Engine Update**: Modify `syncPlayerCareerV3` logic.
    - **Step 1**: Fetch entire career range.
    - **Step 2**: Iterate through every yearly stat entry.
    - **Step 3 (Known League)**: If `league_id` exists in `V3_Leagues`, import/update stats directly.
    - **Step 4 (New League)**: 
        - **If League ID is NEW**:
            - Insert into `V3_Leagues` with `is_discovered = 1`.
            - Insert into `V3_League_Seasons` with `sync_status = 'PARTIAL_DISCOVERY'`.
        - Import stats linked to this new League ID.
- [ ] **Idempotency**: Ensure the `UNIQUE` index on `V3_Player_Stats` prevents duplication (US-017).

### 3. Frontend: Import Page & Discovery Queue (Frontend Agent)
- [ ] **New UI Section**: On the V3 Import Page, add a "Discovered Leagues" panel.
- [ ] **Content**: List all leagues where `is_discovered = 1`, grouped by Country.
- [ ] **Action**: "Run Full Import" button next to each discovered season. This triggers the standard Batch Import job to fetch Standings, Fixtures, and the rest of the Roster.

## 🛠 Technical Notes
- **Reliability**: This guarantees that if the API has data for Haaland in Norway, we get it.
- **Organization**: Keeps the main "Official" league list clean by segregating auto-discovered entries.
