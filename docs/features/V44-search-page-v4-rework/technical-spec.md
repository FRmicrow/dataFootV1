# Technical Spec: V44 — Search Page V4 Rework

## 1. Context & Objectives
The search page is currently using the V3 schema and layout, which is obsolete. The objective is to migrate it to the V4 data ecosystem (Transfermarkt/Flashscore) and align it with the V4 design system.

**Objectives:**
- Connect search to `v4.teams`, `v4.people`, and `v4.competitions`.
- Modernize the UI using `PageLayoutV4` and V4 components.
- Improve search relevance and performance.

## 2. Architecture & Data Contract

### 2.1 Backend Structure
- **Controller:** `backend/src/controllers/v4/searchControllerV4.js`
- **Service:** `backend/src/services/v4/SearchServiceV4.js` (Handles SQL queries)
- **Routes:** `backend/src/routes/v4/search_routes_v4.js` (Registered in `app.js` as `/api/v4/search`)

### 2.2 SQL Queries (Service Layer)
The search will perform ILIKE queries on the following tables:

**Competitions:**
```sql
SELECT league_id, name, logo_url, country_name, country_flag, competition_type
FROM v4.competitions
WHERE name ILIKE :query
ORDER BY name ASC
LIMIT 10;
```

**Teams:**
```sql
SELECT team_id, name, logo_url, country_name, country_flag
FROM v4.teams
WHERE name ILIKE :query
ORDER BY name ASC
LIMIT 20;
```

**People (Players/Coaches):**
```sql
SELECT person_id, name, photo_url, nationality_name, nationality_flag, current_team_name
FROM v4.people
WHERE name ILIKE :query
ORDER BY name ASC
LIMIT 20;
```

### 2.3 API Endpoint
`GET /api/v4/search?q={query}&type={all|player|team|competition}`

**Response Format:**
```json
{
  "success": true,
  "data": {
    "competitions": [...],
    "teams": [...],
    "people": [...]
  }
}
```

## 3. Frontend Plan

### 3.1 Component structure
- **Page:** `frontend/src/components/v4/pages/search/SearchPageV4.jsx`
- **Layout:** `PageLayoutV4` + `PageContentV4`.
- **Search Bar:** Centered hero input with auto-focus.
- **Result Sections:** 
    - Interactive grid of cards.
    - Specific badges for "Active" or "Top" results.

### 3.2 Design System V4
- Use `Stack` and `Grid` for layout.
- Use `Skeleton` for loading states.
- Use `Card` with hover effects.

## 4. Implementation Steps (User Stories)

| ID | Title | Description | Tags |
|---|---|---|---|
| **V44-US-01** | Backend Search Service | Implement `SearchServiceV4` with optimized SQL queries. | `[BACKEND]` `[DATABASE]` |
| **V44-US-02** | Backend Search API | Create Controller and Routes for V4 search. | `[BACKEND]` |
| **V44-US-03** | Frontend Search Page | Create `SearchPageV4.jsx` with basic search logic. | `[FRONTEND]` |
| **V44-US-04** | UI/UX V4 Polishing | Apply V4 design system, animations, and responsive layout. | `[FRONTEND]` |
| **V44-US-05** | Routing & Cleanup | Switch `/search` route to the new V4 page and remove V3 links. | `[FRONTEND]` |

## 5. Edge Cases
- **No results:** Proper empty state with suggestions.
- **Short query:** Debounce search and require at least 2 characters.
- **Network errors:** Graceful error handling in UI.
