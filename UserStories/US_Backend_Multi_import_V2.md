# User Story: Backend Hybrid Import Engine (Multi-Select & Deep Sync)

**ID**: US-BE-003  
**Title**: Implement Multi-Target Import Logic with Career Backfill  
**Role**: Backend Expert Agent  
**Status**: Ready for Dev  

---

## 📖 User Story
**As a** Backend Developer,  
**I want** to upgrade the import controller to handle batch requests and recursively backfill player careers,  
**So that** we can build a complete historical database starting from partial league rosters.

---

## 🎨 Context & Problem
The current import logic is "Single League/Season". We need to support:
1.  **Batching**: Importing multiple leagues/seasons in one go.
2.  **Backfilling**: API-Football league endpoints often stop at 2010. To get a player's career from 2005 (e.g., Alisson in Brazil), we must detect their existence in a league (Phase 1) and then fetch their specific history (Phase 2).

---

## ✅ Acceptance Criteria

### 1. Batch Endpoint Upgrade
- [ ] **Update**: `importLeagueController.js` `importLeagueData` function.
- [ ] **Input**: Accept `{ leagueIds: number[], seasons: number[], mode: 'fast' | 'deep' }`.
- [ ] **Loop Logic**: Iterate through `leagueIds` x `seasons`. Process sequentially to avoid rate-limit spikes.

### 2. Idempotency & Data Stability
- [ ] **Pre-Check**: Before inserting a stat record, check `V2_player_statistics` for `(player_id, season, competition_id, club_id)`.
- [ ] **Smart Update**:
    - If record exists AND `matches_played > 0`, **SKIP** (Assume data is good).
    - If record exists BUT `matches_played == 0` (Placeholder), **UPDATE**.
    - If record does not exist, **INSERT**.
- [ ] **Error Safety**: Wrap individual team/player imports in `try/catch` so one failure does not abort the entire batch.

### 3. "Deep Sync" (Career Backfill)
If `mode === 'deep'`:
- [ ] **Discovery**: As players are upserted from the League roster, collect their `api_id`.
- [ ] **Check Status**: Check `V2_players.is_history_complete`. If TRUE, skip.
- [ ] **Fetch History**:
    - Call API `/players/seasons?player=API_ID` (1 call) to get valid seasons.
    - Compare with local DB.
    - **Queue API Calls**: For every missing season, schedule a job (via `apiQueue`) to fetch `/players?id=API_ID&season=MISSING_YEAR`.
- [ ] **Completion**: Mark `is_history_complete = TRUE`.

---

## 🛠 Technical Notes
- **API Limits**: The Pro Plan has 75k calls/day. A Deep Sync is expensive. Implement a "Governor" or delay in the loop.
- **Queue**: Use the internal `apiQueue` service to manage the backfill requests asynchronously.
- **Logging**: Send SSE events for major milestones ("Finished League X", "Queued 500 historical fetches").

---
**File Location**: `/Users/dominiqueparsis/statFootV3/UserStories/US_Backend_Multi_import_V2.md`
