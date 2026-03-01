# US_27_V3_BE_POC_Search_Club_Profile_API

## Develop this feature as Backend Agent - Following the US related:
`US_27_V3_BE_POC_Search_Club_Profile_API`

Create the backend API endpoints for the Search page and the Club Profile page, querying only local DB data.

---

**Role**: Backend Expert Agent  
**Objective**: Provide search and club profile data from the local V3 database.

## 📖 User Story
**As a** Developer,  
**I want** API endpoints to search players/clubs and retrieve club profile data,  
**So that** the frontend can build a Search page and a Club Profile page.

## ✅ Acceptance Criteria

### 1. Search Endpoint
- [ ] **Endpoint**: `GET /api/v3/search`
- [ ] **Query Params**:
    - `q` (string, required): The search term (min 2 characters).
    - `type` (string, optional): `player`, `club`, or `all` (default: `all`).
    - `country` (string, optional): Filter by country name.
- [ ] **Logic**:
    - **Players**: Search `V3_Players` by `name`, `firstname`, `lastname` using `LIKE '%q%'`.
    - **Clubs**: Search `V3_Teams` by `name` using `LIKE '%q%'`. Exclude national teams (`is_national_team = 0`).
    - If `country` filter is provided, filter clubs by `V3_Teams.country` and players by `V3_Players.nationality`.
- [ ] **Response**:
    ```json
    {
      "players": [
        { "player_id": 2982, "name": "L. Messi", "photo_url": "...", "nationality": "Argentina", "age": 37 }
      ],
      "clubs": [
        { "team_id": 45, "name": "Barcelona", "logo_url": "...", "country": "Spain", "founded": 1899 }
      ]
    }
    ```
- [ ] **Limit**: Max 20 results per type.

### 2. Club Profile Endpoint
- [ ] **Endpoint**: `GET /api/v3/club/:id`
- [ ] **Response**:
    ```json
    {
      "club": {
        "team_id": 45, "api_id": 529, "name": "Barcelona",
        "logo_url": "...", "country": "Spain", "founded": 1899,
        "venue_name": "Camp Nou", "venue_city": "Barcelona", "venue_capacity": 99354, "venue_image": "..."
      },
      "seasons": [
        {
          "season_year": 2023,
          "league_id": 1, "league_name": "La Liga", "league_logo": "...",
          "games": 38, "goals": 68, "avg_rating": "7.12"
        }
      ],
      "roster": {
        "2023": [
          { "player_id": 2982, "name": "L. Messi", "photo_url": "...", "position": "Attacker", "appearances": 35, "goals": 23 }
        ]
      }
    }
    ```
- [ ] **Logic**:
    - **Club info**: Query `V3_Teams` JOIN `V3_Venues`.
    - **Seasons**: Aggregate `V3_Player_Stats` grouped by `season_year, league_id`.
    - **Roster**: Query `V3_Player_Stats` JOIN `V3_Players` for the most recent season (or allow `?year=` param).

## 🛠 Technical Notes
- **File**: `backend/src/controllers/v3/importControllerV3.js` (or new `searchControllerV3.js`).
- **Routes**: Add to `backend/src/routes/v3Routes.js`.
- **Performance**: Use indexed columns (`name`, `api_id`) for fast searches.
