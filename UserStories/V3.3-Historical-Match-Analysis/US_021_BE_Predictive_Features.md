# US_021 - [BE/Data] Predictive Feature Engineering (The "Strong Model")

## Title
[BE/Data] Calculate Advanced Predictive Features for the Smart View

## User Story
**As a** Machine Learning Architect
**I want** to calculate "Fatigue", "Squad Strength", "Form Momentum", and "Defensive Solidity" automatically for completed and upcoming matches
**So that** the UI ("Smart View") displays intelligent, predictive variables instead of raw data, allowing analysts to gauge the true context of an upcoming match or evaluate a past result.

## Acceptance Criteria
### AC 1: The "Fatigue Index" Feature
- **Given** a fixture (past or future)
- **When** generating the Match Details payload
- **Then** the Backend queries `V3_Fixtures` for the previous competitive match played by the Home team and the Away team.
- **And** calculates the **days of rest** between matches.
- **And** appends `{ fatigue: { home: 3, away: 5 } }` (days) to `stats.fatigue`.
- **UI Implication**: Red warning indicator if `rest < 4` days.

### AC 2: Form Momentum & Expected Goals (xG) Variance
- **Given** the "Last 5" form data
- **Then** the Backend calculates the **Total Goal Difference** (Goals Scored - Goals Conceded) over those 5 matches instead of just W/D/L.
- **And** calculates the `clean_sheet_percentage`.
- **And** appends `{ momentum: { home_gd: +4, home_cs: '40%', away_gd: -2, away_cs: '20%' } }`.

### AC 3: Missing Key Player Impact (Squad Strength)
- **Given** the list of `injuries` and the `squads`
- **When** evaluating the team
- **Then** the Backend correlates injuries against players who have> 10 appearances or > 3 goals (Key Performers/Starters).
- **And** generates a severity score.
- **And** appends `{ squad_health: { home: 'Optimal', away: 'Critical (3 Key Missing)' } }`.

### AC 4: H2H Psychological Edge
- **Given** the recent H2H matchups
- **Then** the Backend calculates the "Win Rate" of the current Home team *against* the current Away team specifically at their Home stadium.
- **And** appends `{ psychological_edge: 'Home Dominant (80% Win Rate)' }`.

## Technical Notes
- **API Endpoints Required / Used**:
    - `GET /teams/statistics?team={id}&season={yyyy}&date={date_of_fixture}` (Crucial: The `date` parameter guarantees we get stats *exactly* up to the day before the match, preventing data leakage).
- **Database Refinement**: Complex aggregations (like Fatigue or Form Momentum) should be calculated locally using the `V3_Fixtures` and `V3_Player_Stats` SQL tables with window functions, avoiding excessive external API polling.
- **Model Progression**: These engineered features (`fatigue`, `momentum`, `squad_health`) are the *exact columns* we will feed into our Random Forest / XGBoost model in Phase 4. Exposing them in the UI now (Phase 3) validates their accuracy.
