# US_28_A_V3_BE_Studio_Data_Engine

## Develop this feature as Backend Agent - Following the US related:
`US_28_A_V3_BE_Studio_Data_Engine`

Build the robust backend engine to serve aggregated football data for the Studio Wizard.

---

**Role**: Backend Expert Agent  
**Objective**: Create API endpoints that serve strict, validated data from the V3 database for visualization.

## 📖 User Story
**As a** Studio User,  
**I want** to query the database for specific stats across leagues, years, and players,  
**So that** I can build accurate data visualizations without mocking any data.

## ✅ Acceptance Criteria

### 1. Metadata Endpoints (For Form Step 1)
- [ ] `GET /api/v3/studio/meta/stats`
    - Returns available stats from `V3_Player_Stats` schema.
    - Format: `[{ key: 'goals_total', label: 'Goals', category: 'Attacking' }, ...]`
- [ ] `GET /api/v3/studio/meta/leagues`
    - Returns Leagues with valid data in `V3_Player_Stats`.
    - Grouped by Country.
- [ ] `GET /api/v3/studio/meta/players`
    - Search endpoint for manual selection.
    - Query params: `search`, `league_id`, `season`.

### 2. Data Aggregation Endpoint (The Engine)
- [ ] `POST /api/v3/studio/query`
- [ ] **Payload**:
    ```json
    {
      "stat": "goals_total",
      "filters": {
        "leagues": [1, 2],       // Optional
        "countries": ["France"], // Optional
        "years": [2010, 2024]    // Required
      },
      "selection": {
        "mode": "top_n",         // or "manual"
        "value": 10,             // Top 10
        "players": []            // Manual IDs
      }
    }
    ```
- [ ] **Logic**:
    - **Validate**: Ensure at least one filter (League/Country) is active.
    - **Aggregate**: Sum stats per player per year.
    - **Cumulative**: If `cumulative: true` (for bar race), compute running totals.
    - **Ranking**: Sort by value DESC for each year.
- [ ] **Response**:
    ```json
    {
      "meta": { "stat": "Goals", "range": "2010-2024" },
      "timeline": [
        {
          "year": 2010,
          "records": [
            { "player_id": 2982, "name": "L. Messi", "value": 34, "cumul": 234, "team": "..." }
          ]
        }
      ]
    }
    ```

## 🛠 Technical Notes
- **Optimization**: Use SQL `GROUP BY` and `WINDOW functions` (if supported by SQLite) for cumulative sums.
- **Safety**: Verify stat columns exist to prevent SQL injection.
