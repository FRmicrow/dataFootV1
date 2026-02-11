# US_28_A_V3_BE_Studio_Data_Contract

## Develop this feature as Backend Agent - Following the US related:
`US_28_A_V3_BE_Studio_Data_Contract`

Build the robust backend engine that adheres to the strict V3 Studio Data Contract.

---

**Role**: Backend Expert Agent  
**Objective**: Expose API endpoints that return strictly typed, normalized, and aggregated data for D3 consumption.

## 📖 Data Contract Definition

### 1. Metadata Endpoints (Input for Filters)
- `GET /api/v3/studio/meta/stats` -> Returns list of stat keys available in `V3_Player_Stats` with metadata (label, unit, category).
- `GET /api/v3/studio/meta/leagues` -> Returns active leagues grouped by country.
- `GET /api/v3/studio/meta/players?search=...` -> Returns player candidates for manual selection.

### 2. Aggregation Endpoint (The Engine)
**Endpoint**: `POST /api/v3/studio/query`

**Input Payload (Filters):**
```json
{
  "stat": "goals_total",         // string (column name)
  "filters": {
    "leagues": [1, 2],           // array<int> (optional)
    "years": [2010, 2024]        // [min, max] (required)
  },
  "selection": {
    "mode": "top_n",             // "top_n" | "manual"
    "value": 10,                 // int (if top_n)
    "players": []                // array<int> (if manual)
  },
  "options": {
    "cumulative": true           // boolean (for bar chart race)
  }
}
```

**Output Contract (Chart Data):**
```json
{
  "meta": {
    "stat_key": "goals_total",
    "stat_label": "Total Goals",
    "unit": "integer"
  },
  "timeline": [
    {
      "season": 2010,
      "records": [
        {
          "id": 2982,
          "label": "L. Messi",         // Player Name
          "subLabel": "Barcelona",     // Team Name
          "image": "https://...",      // Player Photo URL
          "value": 34,                 // The Stat Value (or Cumulative Value)
          "rank": 1                    // Rank in this specific frame
        },
        ...
      ]
    },
    ...
  ]
}
```

## ✅ Acceptance Criteria
1.  **Validation**: API must reject requests with missing `years` or invalid `stat` keys.
2.  **Aggregation**:
    -   If `cumulative=true`: Sum stats from `min_year` up to `current_year`.
    -   If `cumulative=false`: Sum stats for `current_year` only.
    -   **Re-ranking**: Calculate `rank` dynamically for every frame based on `value` DESC.
3.  **Performance**: Use optimized SQL queries (Window functions or Group By) to handle multi-year aggregation efficiently.
4.  **No Mocks**: Data must come from `V3_Player_Stats`, `V3_Players`, `V3_Teams`.

## 🛠 SQL Logic Hint
```sql
-- Conceptual logic for Cumulative Bar Race
SELECT 
    ps.season_year,
    p.player_id,
    p.name,
    t.name as team_name,
    SUM(ps.{stat}) OVER (PARTITION BY p.player_id ORDER BY ps.season_year) as cumulative_value
FROM V3_Player_Stats ...
```
