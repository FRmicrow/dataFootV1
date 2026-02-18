# IMPROVEMENT_28a_V3_BE_POC_Studio_API_Refinement

## Develop this feature as Backend Agent - Following the US related:
`IMPROVEMENT_28a_V3_BE_POC_Studio_API_Refinement`

Refine the Studio Data API to use dynamic DB-driven stats and enhanced scope filtering.

---

**Role**: Backend Expert Agent  
**Objective**: Fix the API specification to match real DB schema and support advanced filtering.

## 📖 Improvements Needed

### 1. Dynamic Stats from DB Schema
❌ **Wrong**: Hardcoded stat list (`goals`, `assists`, `appearances`, `rating`).  
✅ **Correct**: Query available stats from the actual `V3_Player_Stats` schema.

- [ ] **New Endpoint**: `GET /api/v3/studio/stats`
- [ ] **Response**:
    ```json
    {
      "stats": [
        { "key": "goals_total", "label": "Goals", "type": "numeric" },
        { "key": "goals_assists", "label": "Assists", "type": "numeric" },
        { "key": "games_appearences", "label": "Appearances", "type": "numeric" },
        { "key": "games_rating", "label": "Average Rating", "type": "decimal" },
        { "key": "passes_key", "label": "Key Passes", "type": "numeric" },
        { "key": "dribbles_success", "label": "Successful Dribbles", "type": "numeric" },
        { "key": "tackles_total", "label": "Tackles", "type": "numeric" },
        { "key": "shots_on", "label": "Shots on Target", "type": "numeric" }
      ]
    }
    ```
- [ ] **Usage**: Frontend uses this list to populate the "Stat" dropdown dynamically.

### 2. Enhanced Scope Filtering
❌ **Wrong**: `scope=all` (too large, will crash).  
✅ **Correct**: Scope is ALWAYS required. Support checkbox-based multi-select.

#### New Query Parameters:
| Param | Type | Required | Description |
|---|---|---|---|
| `leagues` | string | ❌ | Comma-separated league IDs (e.g., `1,2,3`) |
| `countries` | string | ❌ | Comma-separated country names (e.g., `France,England`) |
| `players` | string | ❌ | Comma-separated player IDs for manual selection |

**Validation**: At least ONE of `leagues`, `countries`, or `players` must be provided. Return `400 Bad Request` if all are empty.

### 3. Top N + Manual Player Selection Logic
- [ ] **If `players` param exists**: Return data ONLY for those specific players (ignore `top_n`).
- [ ] **If `players` is empty**: Apply `top_n` filter, sorted by the selected stat in **DESC** order (highest value first).
- [ ] **Per-frame ranking**: For `bar_race`, re-rank players in each frame based on cumulative value.

### 4. SQL Optimization
- [ ] **Leagues filter**: `WHERE league_id IN (1,2,3)`
- [ ] **Countries filter**: `JOIN V3_Countries c ON ... WHERE c.name IN ('France','England')`
- [ ] **Players filter**: `WHERE player_id IN (2982,6898,...)`
- [ ] **Top N**: `ORDER BY SUM(stat_column) DESC LIMIT top_n`

## 🛠 Updated Endpoint Signature

```
GET /api/v3/studio/data?
  chart_type=bar_race&
  stat=goals_total&
  leagues=1,2&
  year_start=2010&
  year_end=2024&
  top_n=10
```

OR with manual selection:

```
GET /api/v3/studio/data?
  chart_type=line_evolution&
  stat=goals_total&
  players=2982,6898&
  year_start=2010&
  year_end=2024
```
