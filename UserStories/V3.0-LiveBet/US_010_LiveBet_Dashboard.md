# US_010 - "Today's Bets" Dashboard & Search

## Title
View "Today's Bets" Dashboard sorted by League Importance

## User Story
**As a** Punter  
**I want** to see a list of today's and tomorrow's upcoming matches  
**So that** I can quickly identify the most important games to bet on without searching manually.

## Acceptance Criteria
### AC 1: Default Dashboard View
- **Given** I open the "Live Bet" (`/live-bet`) page
- **When** the page loads
- **Then** the system fetches fixtures for **Today** (`YYYY-MM-DD`).
- **And** if there are fewer than 10 matches today, it automatically fetches **Tomorrow's** matches as well.
- **And** the list is displayed as a vertical feed of "Game Cards".

### AC 2: Sorting Logic
- **Given** a list of fetched matches
- **When** the list is rendered
- **Then** the matches are sorted by:
    1.  `league.country` Importance Rank (ASC) - (e.g., Premier League first).
    2.  `league.id` (Grouping matches from the same league together).
    3.  `fixture.date` (Earliest to latest).

### AC 3: Search Functionality
- **Given** I am on the Dashboard
- **When** I type into the search bar (e.g., "Arsenal" or "La Liga")
- **Then** the list updates in real-time (debounced 300ms) to show only matching fixtures.
- **And** the search queries both `teams.home.name`, `teams.away.name`, and `league.name`.

### AC 4: Empty State
- **Given** no matches are found for the search query or date range
- **Then** a clear message "No upcoming matches found for your criteria" is displayed.

## Functional Notes
- **Scope**: Focus on *Pre-Match* display. Live games can appear but status should be clearly marked.
- **Header**: Display current date context e.g., "Today, 19 Dec".
- **Interaction**: Clicking a Game Card navigates to the Match Detail page (see US_012).

## Technical Notes
### API Integration
- **Endpoint**: `GET https://v3.football.api-sports.io/fixtures?date={YYYY-MM-DD}`
- **Parameters**: 
    - `date`: Current date.
    - `timezone`: User's local timezone (e.g., 'Europe/Paris').
- **Response Optimisation**: 
    - The response includes `league`, `teams`, `goals`, `fixture`.
    - Map `league.country` against our internal `Metadata` table to get `importance_rank`.
    - If `importance_rank` is missing for a country/league, assign a default low priority (e.g., 999).

### Frontend State
- Does not require a full Redux flow for just this view; a local `useQuery` or context state is sufficient.
- **Caching**: Cache the daily schedule for 15-30 minutes to reduce API usage, as the *schedule* rarely changes (unlike odds).

### Database Sync (Optional/Hybrid)
- Ideally, check the local DB first for fixtures synced via the "Import Hub".
- If local DB is empty for today, fallback to calling the external API directly to ensure the user sees data.
