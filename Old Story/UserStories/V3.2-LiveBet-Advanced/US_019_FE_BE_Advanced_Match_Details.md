# US_019 - [BE/FE] The ML Context Details Page ("Smart View")

## Title
[BE/FE] Build the Advanced "ML Context" Match Detail View

## User Story
**As a** Model Trainer / Analyst
**I want** to see the full Squad list (with injuries), Match Lineup, Last Matches, and Predictions side-by-side
**So that** I understand all factors contributing to the final odds and outcomes.

## Acceptance Criteria
### AC 1: New UI Layout - Side-by-Side Teams
- **Given** I am on the `/live-bet/match/:id` page
- **When** the page renders
- **Then** the main content area splits into two symmetrical columns: **Home Team** (Left) | **Away Team** (Right).
- **And** above them spans a shared "Match Context" header (Odds, Predictions, Recent Head-to-Head).

### AC 2: Last Matches & Form Toggle
- **Given** the Team Columns
- **Then** each column has a "Last 5 Matches" block displaying the Home/Away specific form (W-D-L badges) and the opponents/scores.
- **And** the UI must distinguish if the match was played Home vs. Away.

### AC 3: Predictions Display (Pre-ML)
- **Given** the shared header
- **Then** the API-Football Predictions block is rendered directly, showing:
    - Probabilities (e.g., Home 45% / Draw 25% / Away 30%)
    - Goal Expectancy (Over/Under 2.5 suggested)

### AC 4: Squad & Injuries Component
- **Given** the Team Columns
- **Then** I see the **Match Starting XI** prominently (if official) or **Probable XI** (Prediction data).
- **And** below it, I see the **Full Squad List**.
- **When** fetching Squad Data, it must indicate if a player is Injured (requires API-Football `/injuries` endpoint call for this fixture).
- **And** Injured players must bear a strict visual indicator (e.g., 🔴 Cross).

## Technical Notes
- **API Endpoints**: 
    - `/injuries?fixture={id}` or `/injuries?team={id}&date={today}`
    - `/players/squads?team={id}`
- **Performance**: This page now needs to make 5-6 parallel API calls. The Backend `getMatchDetailsService` MUST use `Promise.all` and aggregrate this into a single JSON payload.
- **UI Constraints**: The side-by-side layout works best on Desktop. Ensure it collapses gracefully into stacked rows on Mobile.
