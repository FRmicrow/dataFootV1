# US_32_V3_Player_Profile_Trophies_Display

## 1. Objective
**As a** football analyst or fan,
**I want to** see a player's trophies organized by country and sorted by the country's importance,
**So that I can** easily understand the prestige and geographical context of their achievements.

## 2. Technical Context
- **Target Page**: `PlayerProfilePageV3.jsx`
- **Data Source**: `GET /api/v3/player/:id/trophies`

## 3. Implementation Plan (By Domain)

### 3.1 [BACKEND] Database & API
- **Endpoint**: Update `/api/v3/player/:id/trophies` (`trophyController.js`).
- **Query Logic**:
  - `V3_Trophies` **JOIN** `V3_Countries` on `country` name.
  - **Select**: `t.*`, `c.flag_url` (or `flag_small_url`), `c.importance_rank`.
  - **Sort**: `ORDER BY c.importance_rank ASC, t.season DESC`.
- **Response**: JSON Array of trophy objects enriched with rank and flag.

### 3.2 [FRONTEND] Data Fetching & Processing
- **File**: `PlayerProfilePageV3.jsx`.
- **Fetch**: Retrieve trophies for the player ID.
- **Processing**:
  - **Group Data**: Create a structure where trophies are grouped by `country`.
  - **Filter**: Display **only** "Winner" / "1st Place" items.
  - **Sort Groups**: Ensure country groups are rendered in `importance_rank` ASC order (Rank 1 first).
  - **Aggregate**: Within each country group, count wins per competition (e.g. "3x Premier League").

### 3.3 [FRONTEND] UI Component ("Honours Card")
- **Visual Design**:
  - **Country Header**: Display `flag_url` and Country Name for each group.
  - **Trophy List**: Indented list under each country.
  - **Items**: Show "Count", "Trophy Name", and "Seasons List" (e.g., "2018, 2019").
- **Styling**: `PlayerProfilePageV3.css`.
  - Use `.country-group-header` for flag/name.
  - Use `.trophy-item-row` for the list.

## 4. Acceptance Criteria
- [ ] [Backend] API returns `importance_rank` and `flag_url`.
- [ ] [Frontend] Identify groups by Country.
- [ ] [Frontend] Sort groups by Country Importance (Rank 1 on top).
- [ ] [Frontend] Display Flag in Country Header.
- [ ] [Frontend] Only "Winner" placements are shown.

## 5. Mockup / Data Example
```json
[
  {
    "country": "England",
    "rank": 1,
    "trophies": [
      { "name": "Premier League", "count": 2, "seasons": ["2018", "2019"] },
      { "name": "FA Cup", "count": 1, "seasons": ["2018"] }
    ]
  },
  {
    "country": "France",
    "rank": 5,
    "trophies": [
      { "name": "Ligue 1", "count": 4, "seasons": ["2014", "2015", "2016", "2017"] }
    ]
  }
]
```
