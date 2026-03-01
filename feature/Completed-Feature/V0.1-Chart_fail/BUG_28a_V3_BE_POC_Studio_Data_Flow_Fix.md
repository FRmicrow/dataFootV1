# BUG_28a_V3_BE_POC_Studio_Data_Flow_Fix

## Develop this feature as Backend Agent - Following the US related:
`BUG_28a_V3_BE_POC_Studio_Data_Flow_Fix`

Complete rewrite of the Studio backend data endpoints to match the actual V3 schema and workflow.

---

**Role**: Backend Expert Agent  
**Objective**: Fix the entire data flow to use real V3 tables without mocks.

## 🐛 Bug Description
The original implementation had incorrect assumptions about the data model. This fix aligns everything with the actual `V3_Player_Stats` schema.

## ✅ Correct Data Flow

### Phase 1: Form Preparation Endpoints

#### 1.1 Get Available Stats
**Endpoint**: `GET /api/v3/studio/stats`  
**Purpose**: Return all stat columns from `V3_Player_Stats` that can be tracked.  
**Response**:
```json
{
  "stats": [
    { "key": "goals_total", "label": "Goals", "category": "Scoring" },
    { "key": "goals_assists", "label": "Assists", "category": "Scoring" },
    { "key": "games_appearences", "label": "Appearances", "category": "Games" },
    { "key": "games_rating", "label": "Average Rating", "category": "Games" },
    { "key": "passes_key", "label": "Key Passes", "category": "Passing" },
    { "key": "passes_accuracy", "label": "Pass Accuracy", "category": "Passing" },
    { "key": "tackles_total", "label": "Tackles", "category": "Defense" },
    { "key": "dribbles_success", "label": "Successful Dribbles", "category": "Attacking" },
    { "key": "shots_on", "label": "Shots on Target", "category": "Shooting" },
    { "key": "duels_won", "label": "Duels Won", "category": "Dueling" },
    { "key": "cards_yellow", "label": "Yellow Cards", "category": "Discipline" },
    { "key": "cards_red", "label": "Red Cards", "category": "Discipline" }
  ]
}
```

#### 1.2 Get Countries for Filter
**Endpoint**: `GET /api/v3/studio/countries`  
**Purpose**: Return countries that have data in `V3_Player_Stats`.  
**SQL**:
```sql
SELECT DISTINCT c.country_id, c.name, c.flag_url, c.importance_rank
FROM V3_Countries c
JOIN V3_Leagues l ON l.country_id = c.country_id
JOIN V3_Player_Stats ps ON ps.league_id = l.league_id
ORDER BY c.importance_rank ASC, c.name ASC;
```

#### 1.3 Get Leagues for Filter
**Endpoint**: `GET /api/v3/studio/leagues?country=France` (optional country filter)  
**Purpose**: Return leagues that have data in `V3_Player_Stats`.  
**SQL**:
```sql
SELECT DISTINCT l.league_id, l.name, l.logo_url, l.type, c.name as country_name
FROM V3_Leagues l
JOIN V3_Countries c ON l.country_id = c.country_id
JOIN V3_Player_Stats ps ON ps.league_id = l.league_id
WHERE (:country IS NULL OR c.name = :country)
ORDER BY c.importance_rank ASC, l.name ASC;
```

#### 1.4 Get Players for Manual Selection
**Endpoint**: `GET /api/v3/studio/players?stat=goals_total&leagues=1,2&countries=France&limit=50`  
**Purpose**: Return players filtered by the selected stat, sorted DESC.  
**SQL**:
```sql
SELECT 
  p.player_id, p.name, p.firstname, p.lastname, p.photo_url, p.nationality,
  SUM(ps.{stat}) as stat_value
FROM V3_Players p
JOIN V3_Player_Stats ps ON ps.player_id = p.player_id
JOIN V3_Leagues l ON ps.league_id = l.league_id
JOIN V3_Countries c ON l.country_id = c.country_id
WHERE 1=1
  AND (:leagues IS NULL OR ps.league_id IN (:leagues))
  AND (:countries IS NULL OR c.name IN (:countries))
GROUP BY p.player_id
ORDER BY stat_value DESC
LIMIT :limit;
```

### Phase 2: Generate Chart Data

#### 2.1 Bar Chart Race Data
**Endpoint**: `POST /api/v3/studio/generate`  
**Body**:
```json
{
  "chart_type": "bar_race",
  "stat": "goals_total",
  "leagues": [1, 2],
  "countries": null,
  "year_start": 2010,
  "year_end": 2024,
  "selection_mode": "top_n",
  "top_n": 10,
  "players": null
}
```

**Logic**:
1. **If `selection_mode = "top_n"`**:
   - Get top N players across the entire date range by cumulative stat value
   - Filter by leagues/countries if provided
2. **If `selection_mode = "manual"`**:
   - Use the explicit `players` array

**SQL** (Top N mode):
```sql
-- Get top N players by cumulative stat
WITH TopPlayers AS (
  SELECT 
    ps.player_id,
    SUM(ps.{stat}) as total_value
  FROM V3_Player_Stats ps
  JOIN V3_Leagues l ON ps.league_id = l.league_id
  JOIN V3_Countries c ON l.country_id = c.country_id
  WHERE ps.season_year BETWEEN :year_start AND :year_end
    AND (:leagues IS NULL OR ps.league_id IN (:leagues))
    AND (:countries IS NULL OR c.name IN (:countries))
  GROUP BY ps.player_id
  ORDER BY total_value DESC
  LIMIT :top_n
)
-- Get per-year data for these players
SELECT 
  ps.season_year as year,
  p.player_id, p.name, p.photo_url,
  t.name as team_name, t.logo_url as team_logo,
  SUM(ps.{stat}) as value
FROM V3_Player_Stats ps
JOIN V3_Players p ON ps.player_id = p.player_id
JOIN V3_Teams t ON ps.team_id = t.team_id
WHERE ps.player_id IN (SELECT player_id FROM TopPlayers)
  AND ps.season_year BETWEEN :year_start AND :year_end
GROUP BY ps.season_year, ps.player_id, ps.team_id
ORDER BY ps.season_year ASC, value DESC;
```

**Response Format**:
```json
{
  "chart_type": "bar_race",
  "stat": { "key": "goals_total", "label": "Goals" },
  "frames": [
    {
      "year": 2010,
      "data": [
        {
          "player_id": 2982,
          "name": "L. Messi",
          "photo": "https://...",
          "team_name": "Barcelona",
          "team_logo": "https://...",
          "value": 34,
          "cumulative": 234
        }
      ]
    }
  ]
}
```

#### 2.2 Line Evolution Data
**Endpoint**: Same `POST /api/v3/studio/generate` with `chart_type=line_evolution`  
**SQL**:
```sql
SELECT 
  ps.season_year as year,
  p.player_id, p.name, p.photo_url,
  SUM(ps.{stat}) as value
FROM V3_Player_Stats ps
JOIN V3_Players p ON ps.player_id = p.player_id
WHERE ps.player_id IN (:players)
  AND ps.season_year BETWEEN :year_start AND :year_end
GROUP BY ps.season_year, ps.player_id
ORDER BY ps.season_year ASC;
```

#### 2.3 Radar Comparison Data
**Endpoint**: Same `POST /api/v3/studio/generate` with `chart_type=radar`  
**Body**:
```json
{
  "chart_type": "radar",
  "stats": ["goals_total", "goals_assists", "passes_key", "tackles_total", "dribbles_success", "shots_on"],
  "players": [2982, 6898],
  "season": 2023
}
```

**SQL**:
```sql
SELECT 
  p.player_id, p.name, p.photo_url,
  SUM(ps.goals_total) as goals_total,
  SUM(ps.goals_assists) as goals_assists,
  SUM(ps.passes_key) as passes_key,
  SUM(ps.tackles_total) as tackles_total,
  SUM(ps.dribbles_success) as dribbles_success,
  SUM(ps.shots_on) as shots_on
FROM V3_Player_Stats ps
JOIN V3_Players p ON ps.player_id = p.player_id
WHERE ps.player_id IN (:players)
  AND ps.season_year = :season
GROUP BY ps.player_id;
```

## 🛠 Technical Notes
- **File**: `backend/src/controllers/v3/studioController.js`
- **No Mocks**: All data comes from the actual V3 database
- **Performance**: Use the existing indexes on `V3_Player_Stats`
- **Stat Validation**: Validate that the requested stat column exists in the schema
