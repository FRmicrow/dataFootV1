# US_28a_V3_BE_POC_Studio_Data_API

## Develop this feature as Backend Agent - Following the US related:
`US_28a_V3_BE_POC_Studio_Data_API`

Create the backend API endpoint that aggregates football data into "frames" ready for animated chart rendering.

---

**Role**: Backend Expert Agent  
**Objective**: Serve pre-aggregated data for the Content Studio charts.

## 📖 User Story
**As a** Frontend Developer,  
**I want** a single endpoint that returns structured frame-by-frame data,  
**So that** D3.js can render animated charts without complex client-side aggregation.

## ✅ Acceptance Criteria

### 1. Endpoint: `GET /api/v3/studio/data`

#### Query Parameters:
| Param | Type | Required | Description |
|---|---|---|---|
| `chart_type` | string | ✅ | `bar_race`, `line_evolution`, `radar` |
| `stat` | string | ✅ | `goals`, `assists`, `appearances`, `rating` |
| `scope` | string | ❌ | `league:1`, `country:France`, `all` (default: `all`) |
| `year_start` | int | ✅ | Start year (e.g., 2010) |
| `year_end` | int | ✅ | End year (e.g., 2024) |
| `players` | string | ❌ | Comma-separated player IDs (for `line_evolution` and `radar`) |
| `top_n` | int | ❌ | Limit (default: 10) |

### 2. Response Format per Chart Type

#### `bar_race` Response:
```json
{
  "type": "bar_race",
  "stat": "goals",
  "frames": [
    {
      "year": 2010,
      "data": [
        { "rank": 1, "player_id": 2982, "name": "L. Messi", "photo": "...", "team_name": "Barcelona", "team_logo": "...", "value": 34, "cumulative": 234 },
        { "rank": 2, "player_id": 6898, "name": "C. Ronaldo", "photo": "...", "team_name": "Real Madrid", "team_logo": "...", "value": 26, "cumulative": 210 }
      ]
    }
  ]
}
```

#### `line_evolution` Response:
```json
{
  "type": "line_evolution",
  "stat": "goals",
  "players": [
    {
      "player_id": 2982, "name": "L. Messi", "photo": "...",
      "data": [
        { "year": 2010, "value": 34 },
        { "year": 2011, "value": 53 }
      ]
    }
  ]
}
```

#### `radar` Response:
```json
{
  "type": "radar",
  "season": 2023,
  "players": [
    {
      "player_id": 2982, "name": "L. Messi", "photo": "...",
      "stats": {
        "goals": 23, "assists": 17, "passes_key": 78,
        "tackles_total": 12, "dribbles_success": 94, "shots_on": 56
      }
    }
  ]
}
```

### 3. SQL Logic
- [ ] **bar_race**: Aggregate `SUM(goals_total)` from `V3_Player_Stats` grouped by `player_id, season_year`, compute cumulative totals, rank per frame.
- [ ] **line_evolution**: Filter by specific player IDs, return per-season stat.
- [ ] **radar**: Return raw stats for specific players in a specific season.
- [ ] **Scope filter**: If `scope=league:1`, filter by `league_id`. If `scope=country:France`, JOIN `V3_Countries`.

### 4. Controller & Route
- [ ] **File**: Create `backend/src/controllers/v3/studioControllerV3.js`.
- [ ] **Route**: Register in `v3Routes.js`.

## 🛠 Technical Notes
- **Performance**: Use indexed queries. For `bar_race` with `all` scope, this can be heavy — limit to `top_n` per frame.
- **Cumulative**: For `bar_race`, compute running totals across years for each player.
- **No external dependencies**: Pure SQL aggregation.
