# User Story: Database Schema for Sync Tracking & Integrity

**ID**: US-DB-003  
**Title**: Optimize Schema for Sync Tracking and Data Integrity  
**Role**: Database Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Database Administrator,  
**I want** to add tracking columns and unique constraints to the player tables,  
**So that** the backend can efficiently track sync status and prevent duplicate statistics.

---

## 🎨 Context & Problem
1.  **Duplication**: We have seen duplicate stats for the same player/season/competition. We need a hard constraint to stop this.
2.  **Tracking**: We don't know which players have had their "Full Career" imported versus just a single season. This leads to redundant API calls.

---

## ✅ Acceptance Criteria

### 1. Schema Extensions (V2_players)
- [ ] **Add Column**: `last_full_sync` (DATETIME, Nullable) - Timestamp of the last "Deep Sync".
- [ ] **Add Column**: `is_history_complete` (BOOLEAN, Default 0) - Flag indicating if we have fetched all available historical seasons for this player.

### 2. Unique Constraints (V2_player_statistics)
- [ ] **Review**: Check if a unique index exists on `(player_id, club_id, competition_id, season)`.
- [ ] **Action**: If not, **Create Unique Index**.
    - *Note*: You may need to run the Cleanup User Story (`US_Data_Cleanup_Duplicates.md`) FIRST to remove duplicates before applying this constraint, otherwise the migration will fail.

### 3. Performance Indexing
- [ ] Ensure indexes exist for:
    - `V2_competitions(api_id)`
    - `V2_clubs(api_id)`
    - `V2_players(api_id)`
    - `V2_player_statistics(player_id, season)` (For rapid lookup during import).

---

## 🛠 Technical Notes
- **Migration Strategy**:
    1.  Add new columns (Safe).
    2.  Run Deduplication Script (Crucial).
    3.  Add Unique Constraint (Final Step).
- **SQL**:
    ```sql
    ALTER TABLE V2_players ADD COLUMN last_full_sync DATETIME;
    ALTER TABLE V2_players ADD COLUMN is_history_complete BOOLEAN DEFAULT 0;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_player_stats_unique ON V2_player_statistics(player_id, club_id, competition_id, season);
    ```

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Database_Sync_Optimization.md`
