# US_20_V3_DB_POC_Schema_Hardening

**Role**: Database Expert Agent  
**Objective**: Harden the V3 schema to support auto-discovery and prevent duplicates.

## 📖 User Story
**As a** Developer,  
**I want** to add `is_discovered` column to `V3_Leagues` and a Unique Index to `V3_Player_Stats`,  
**So that** I can safely auto-create leagues during sync and guarantee data integrity.

## ✅ Acceptance Criteria

### 1. Schema Update: Discovery Flag
- [ ] **Table**: `V3_Leagues`
- [ ] **Action**: Add column `is_discovered` (BOOLEAN DEFAULT 0).
- [ ] **Context**: This distinguishes "Official" leagues from those auto-created by the player sync.

### 2. Schema Update: Idempotency
- [ ] **Table**: `V3_Player_Stats`
- [ ] **Action**: Add `UNIQUE INDEX idx_player_stats_unique ON V3_Player_Stats(player_id, team_id, league_id, season_year)`.
- [ ] **Cleanup**: Before adding the index, DELETE duplicates (keeping the row with max `games_appearences`).

## 🛠 Technical Notes
- **File**: `backend/database_v3_test.sqlite`
- **Execution**: Create and run `scripts/v3_migration_020.js`.
