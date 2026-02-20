# US_32_V3_Player_Profile_Trophies

## 1. User Story
**As a** football analyst,
**I want to** view a structured breakdown of a player's career titles,
**So that I can** easily compare their achievements across different countries and competitions.

## 2. Technical Context
- **Target Page**: `PlayerProfilePageV3.jsx` (Frontend)
- **Data Source**: `GET /api/v3/player/:id/trophies` (Backend)
- **Database Tables**:
    -   `V3_Trophies` (Contains `league`, `country`, `season`, `place`)
    -   `V3_Countries` (Contains `importance_rank`)

## 3. Data Requirements (Backend)
The API endpoint MUST return trophies enriched with country importance.
**SQL Logic**:
-   Join `V3_Trophies` with `V3_Countries` on `country = country_name`.
-   **Ordering**:
    1.  `V3_Countries.importance_rank` ASC (Most important countries first).
    2.  `V3_Trophies.league` ASC (Group by league).
    3.  `V3_Trophies.season` DESC (Newest wins first).

**Response Structure (Example)**:
```json
[
  {
    "country": "Spain",
    "country_flag": "...",
    "importance": 2,
    "trophies": [
      {
        "league": "La Liga",
        "items": [
           { "place": "Winner", "season": "2022/2023" },
           { "place": "Winner", "season": "2018/2019" }
        ]
      },
      {
        "league": "Copa del Rey",
        "items": [...]
      }
    ]
  },
  {
    "country": "Brazil",
    "importance": 8,
    "trophies": [...]
  }
]
```

## 4. Frontend Implementation Requirements

### 4.1 Display Logic
The trophies should be rendered in a **List or Card Layout** grouped by **Country**.

**Hierarchy**:
1.  **Country Header**: Flag + Name (e.g., 🇪🇸 Spain).
2.  **League Row**: Name of the competition (e.g., "La Liga").
3.  **Achievement Badge**:
    -   Display a unified badge for the standing.
    -   **Format**: `<BadgeColor> <Count>x <PlaceName>` (e.g., "🥇 2x Winner").
    -   **Tooltip/Subtext**: List the seasons (e.g., "2022/23, 2018/19").

### 4.2 Handling "Place" (Gold/Silver/Bronze)
The `place` field from DB determines the badge style.
-   **Gold** 🥇: `Winner`, `1st Place`, `Champion`.
-   **Silver** 🥈: `2nd Place`, `Runner-up`, `Finalist`.
-   **Bronze** 🥉: `3rd Place`.

### 4.3 Grouping Strategy (Frontend)
If the backend doesn't return the perfectly nested structure above, the Frontend **MUST** perform the grouping:
1.  **Group by Country**: Use `country` field. Sort these groups by `importance_rank` (if available) or predefined list (Europe Top 5 > Others).
2.  **Group by League**: Inside each country, group by `league`.
3.  **Group by Place**: Inside each league, group by `place` (Winner vs 2nd Place).

## 5. Acceptance Criteria
- [ ] **Grouping**: Trophies are visually separated by Country.
- [ ] **Ordering**: "Important" countries (Spain, England) appear at the top.
- [ ] **Badges**: Winners get Gold, 2nd Place gets Silver.
- [ ] **Data**: "2x" counts are accurate based on the number of seasons.
- [ ] **Seasons**: The specific years are visible (either inline or on hover).
