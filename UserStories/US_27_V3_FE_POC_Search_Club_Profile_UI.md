# US_27_V3_FE_POC_Search_Club_Profile_UI

## Develop this feature as Frontend Agent - Following the US related:
`US_27_V3_FE_POC_Search_Club_Profile_UI`

Create the Search page with autocomplete and the Club Profile page, both using local DB data and the V3 design system.

---

**Role**: Frontend Expert Agent  
**Objective**: Build the Search page and the Club Profile page using local data.

## 📖 User Story
**As a** User,  
**I want** to search for players and clubs with autocomplete and optional country filtering,  
**So that** I can quickly find imported data and navigate to their profile pages.

## ✅ Acceptance Criteria

### 1. Search Page (`/v3/search`)
- [ ] **Form Layout**:
    - **Search Input**: Large, centered input field with placeholder "Search players, clubs...".
    - **Type Toggle**: Pill buttons to filter by `All`, `Players`, `Clubs`.
    - **Country Filter**: Dropdown populated from `V3_Countries`, optional.
- [ ] **Autocomplete**:
    - Trigger search after 2+ characters.
    - Debounce input (300ms).
    - Display results in a dropdown list below the input.
- [ ] **Results Display**:
    - **Players**: Photo thumbnail, name, nationality flag, age.
    - **Clubs**: Logo thumbnail, name, country, founded year.
- [ ] **Navigation**:
    - Click on a **Player** → Navigate to `/v3/player/:id`.
    - Click on a **Club** → Navigate to `/v3/club/:id`.
- [ ] **Empty State**: "No results found" message with a suggestion to import more data.

### 2. Club Profile Page (`/v3/club/:id`)
- [ ] **Hero Section**:
    - Club logo (large), name, country + flag, founded year.
    - Venue card: name, city, capacity, image (if available).
- [ ] **Seasons Overview**:
    - List of all seasons the club has data for.
    - Each season shows: League name + logo, total matches, total goals, avg rating.
    - Clickable → Links to `/v3/league/:leagueId/season/:year`.
- [ ] **Roster Panel**:
    - Default: Show roster of the most recent season.
    - Season selector dropdown to switch between years.
    - Table: Photo, Name, Position, Appearances, Goals, Assists, Rating.
    - Clickable rows → Navigate to `/v3/player/:id`.
- [ ] **Design**: Same V3 dark design system as `PlayerProfilePageV3`.

### 3. Navigation Integration
- [ ] **Sidebar/Header**: Add a "🔍 Search" link in the V3 navigation.
- [ ] **Route**: Register `/v3/search` and `/v3/club/:id` in the router.

## 🛠 Technical Notes
- **Files**:
    - `frontend/src/components/v3/SearchPageV3.jsx` (new)
    - `frontend/src/components/v3/SearchPageV3.css` (new)
    - `frontend/src/components/v3/ClubProfilePageV3.jsx` (new)
    - `frontend/src/components/v3/ClubProfilePageV3.css` (new)
- **API**: `GET /api/v3/search?q=...&type=...&country=...` and `GET /api/v3/club/:id`
- **Dependency**: Requires `US_27_V3_BE_POC_Search_Club_Profile_API` to be completed first.
