# IMPROVEMENT_25_V3_FE_BE_POC_Discovery_Full_League_Import

**Role**: Full Stack (Frontend + Backend)  
**Objective**: Allow importing all available seasons for a discovered league, not just the orphan years.

## 📖 User Story
**As a** User,  
**I want** to import ALL available seasons for a discovered league (not just the years I found from a player sync),  
**So that** when I discover "Eliteserien (Norway)" from Haaland's career, I can choose to import the full history of that league.

## 🐛 Current Limitation
- The "Discovery Archive" only shows the specific season(s) found during a player's Deep Sync (e.g., Eliteserien 2017, 2018).
- There is no way to fetch and display the full season range available from the API (e.g., Eliteserien 2010-2024).
- The user is forced to manually go to the Import Page, search for the country, find the league, and set up the import — defeating the purpose of the Discovery Panel.

## ✅ Acceptance Criteria

### 1. Backend: Season Range Endpoint
- [ ] **New Endpoint**: `GET /api/v3/league/:apiId/available-seasons`
- [ ] **Logic**:
    - Call `footballApi.getLeagues({ id: apiId })` to fetch all seasons.
    - Return a list of available years with metadata (start_date, end_date, is_current).
    - Cross-reference with `V3_League_Seasons` to flag which ones are already imported.
- [ ] **Response Format**:
    ```json
    {
      "league": { "name": "Eliteserien", "country": "Norway", "logo": "..." },
      "seasons": [
        { "year": 2024, "status": "NOT_IMPORTED" },
        { "year": 2023, "status": "PARTIAL_DISCOVERY" },
        { "year": 2022, "status": "NOT_IMPORTED" },
        { "year": 2018, "status": "PARTIAL_DISCOVERY" },
        { "year": 2017, "status": "PARTIAL_DISCOVERY" }
      ]
    }
    ```

### 2. Frontend: Enhanced Discovery Card
- [ ] **Component**: `DiscoveredLeaguesPanel` in `ImportV3Page.jsx`.
- [ ] **Current View**: Shows league name + orphan seasons.
- [ ] **Improvement**: Add a **"View All Seasons"** button on each discovered league card.
- [ ] **Expanded View**:
    - Fetch and display the full season range from the new endpoint.
    - Show each season with its status badge: `✅ Imported`, `🟡 Partial`, `⬜ Available`.
    - Allow multi-select of seasons to import.
- [ ] **Actions**:
    - **"Import Selected"**: Triggers `importBatchV3` for the selected seasons (using `api_id`).
    - **"Import All Missing"**: Shortcut to import every season with status `NOT_IMPORTED` or `PARTIAL_DISCOVERY`.

### 3. Post-Import State Update
- [ ] After a successful import, update `V3_Leagues.is_discovered = 0` (promote to "Official").
- [ ] Update `V3_League_Seasons.sync_status = 'FULL'` for imported seasons.

## 🛠 Technical Notes
- **API Cost**: Fetching available seasons costs 1 API call per league. The actual season imports cost ~5-10 calls each.
- **UX**: The expanded card view should use the same year-range styling as the main Import Page for consistency.
- **Safety**: Must use `api_id` (not local `league_id`) when triggering imports (ref: US_24 bug fix).
