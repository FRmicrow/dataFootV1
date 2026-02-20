# US_022 - [FE/BE] Competition-Centric Upcoming Matches Dashboard

## Title
[FE/BE] Configure Dashboard by Competition and Fetch Upcoming Matches

## User Story
**As a** Model Trainer / Analyst
**I want** to select a specific list of competitions and view their next upcoming matches (filtered by importance)
**So that** I can focus my analysis and betting strategy on the specific leagues I track, rather than being overwhelmed by a massive list of all global matches happening "today".

## Acceptance Criteria
### AC 1: Competition Configuration Panel
- **Given** I am on the `/live-bet` dashboard
- **When** the page loads
- **Then** I see a "⚙️ Configure Competitions" section.
- **And** I can search, add, or remove multiple competitions from my tracked list.
- **And** the list of available competitions to choose from MUST be sorted by `importance_rank` (Most important like Premier League at the top).

### AC 2: Fetching "Next Matches" instead of "Today"
- **Given** I have an active list of selected competitions
- **When** the dashboard feed loads
- **Then** it no longer simply fetches "all matches for today".
- **Instead**, it fetches the upcoming matches (e.g., the next round of fixtures or next 7 days) specifically for the selected competitions.
- **And** if no competitions are selected, it should default to the Top 5 most important leagues globally based on `importance_rank` (e.g., PL, La Liga, Serie A, Bundesliga, Ligue 1) or show a prompt to select some.

### AC 3: Display and Sorting by Importance
- **Given** the fetched upcoming matches
- **Then** the dashboard groups the matches by Competition.
- **And** the Competitions are rendered in strict order of their `country.importance_rank` (or league importance), ensuring the most prestigious leagues are always at the top of my feed.

### AC 4: Persistent Preferences
- **Given** I change my selected competitions
- **Then** this selection is automatically saved (leveraging the preferences storage defined in US_017, e.g., `V3_System_Preferences` or browser localStorage).
- **So that** when I return to the app tomorrow, my specific curated list of leagues and their upcoming matches is instantly ready.

## Technical Notes
- **Backend API Change**: The current `getDailyFixturesService` fetches `/fixtures?date={today}`. This needs to be refactored or supplemented with an endpoint that takes an array of league IDs and fetches their upcoming matches. 
  - *Option 1:* API-Football supports `/fixtures?league={id}&next=10` to get the next 10 matches for a league.
  - *Option 2:* Query `/fixtures?league={id}&season={current_season}&from={today}&to={today+7days}`.
- **Frontend State**: The UI needs a persistent state for `selectedLeagues: []`. 
- **Deprecation**: This effectively replaces or refines the "Daily List" logic from US_010 and the "Filters" logic from US_018, pivoting the app from a "Daily Calendar" to a "Targeted League Tracker".
