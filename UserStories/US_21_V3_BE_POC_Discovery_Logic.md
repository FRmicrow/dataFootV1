# US_21_V3_BE_POC_Discovery_Logic

**Role**: Backend Expert Agent  
**Objective**: Implement the Full Career Sync with Auto-Discovery.

## 📖 User Story
**As a** Developer,  
**I want** to rewrite the `syncPlayerCareerV3` endpoint to auto-discover missing leagues instead of skipping them,  
**So that** players like Haaland get 100% of their career history immediately.

## ✅ Acceptance Criteria

### 1. Discovery Logic (The "Archive")
- [ ] **Mod**: Instead of ignoring unknown `league_id` from API:
    - **Upsert League**: Create the `V3_Leagues` entry with `is_discovered = 1`.
    - **Upsert Season**: Create `V3_League_Seasons` with `sync_status = 'PARTIAL_DISCOVERY'`.
    - **Upsert Stats**: Import the player stats linked to this new ID.

### 2. Reconciliation Logic (Known Leagues)
- [ ] **Mod**: If `league_id` already exists (Official or Discovered):
    - **Check**: Compare API stats vs DB stats.
    - **Update**: Overwrite if API data is more complete.

### 3. Idempotency (Safety)
- [ ] **Mod**: Rely on the new `UNIQUE` index (from US-20) to prevent phantom duplicates. Use `INSERT OR REPLACE` or check existence before write.

## 🛠 Technical Notes
- **Endpoint**: `POST /api/v3/player/:id/sync-career`
- **Output**: SSE Stream should log `New League Discovered: [Name]` events.
