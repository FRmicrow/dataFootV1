# US_018 - [FE/BE] Dynamic Dashboard Filters & Favorites List

## Title
[FE] Dashboard Multi-Select Filtering and Favorites Initialization

## User Story
**As a** User
**I want** to filter incoming matches by multiple countries/competitions simultaneously, and automatically see my favorite teams/leagues at the top
**So that** I don't miss key matches across different regions.

## Acceptance Criteria
### AC 1: Load Top 10 by Importance
- **Given** I open `/live-bet`
- **When** the page loads
- **Then** the view defaults to the **Top 10** fixtures sorted by `country.importance_rank` (ASC) AND any fixtures matching my `favorite_teams` or `favorite_leagues`.
- **And** if the APIs or DB return 0 fixtures for today, display an empty state.

### AC 2: Multi-Select Filter Cascade
- **Given** the search form at the top
- **Then** it contains two main dropdowns: "Countries" and "Competitions" (Leagues).
- **When** I click "Country", I can select *multiple* (e.g., England, Spain).
- **Then** the "Competitions" dropdown populates *only* with leagues from those selected countries that actually have matches playing today.
- **When** I select multiple countries or competitions
- **Then** the fixture list updates immediately.

### AC 3: Toggle Favorites
- **Given** the Multi-Select Filter form or a Match List
- **When** I click a "⭐" icon next to a team or league name
- **Then** it toggles its status visually.
- **And** triggers `PUT /api/v3/preferences` to save to my global preferences.

## Technical Notes
- **React Select**: Consider a library like `react-select` for robust multi-select dropdowns.
- **Data Flow**: The frontend should fetch the full schedule of fixtures first (AC1), then compute the dropdown options derived purely from the unique `.league.country` and `.league.name` found in the schedule. Do not pull all 1,000 global leagues into the dropdown if only 15 have matches today.
