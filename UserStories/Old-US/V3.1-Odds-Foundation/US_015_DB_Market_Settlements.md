# US_015 - [DB/FE] - Feature Calculation: Market Settlements

## Title
[DB] Implement SQL Views/Scripts for Market Settlement

## User Story
**As a** Data Scientist
**I want** to calculate "Winning Bets" directly in the database
**So that** I have clear 'Outcome' labels (Target Variable y) for my predictive models.

## Acceptance Criteria
### AC 1: Create SQL View `V3_Market_Settlements`
- **Given** existing `V3_Fixtures` with fulltime scores
- **When** the migration runs
- **Then** create a View `v_market_settlements` joining Odds and Results.
- **And** calculate `res_1n2`: 
    - `'1'` if `home_goals > away_goals`
    - `'X'` if `home_goals == away_goals`
    - `'2'` if `away_goals > home_goals`
- **And** calculate `res_ou25`:
    - `'O'` if `(home_goals + away_goals) > 2.5`
    - `'U'` if `(home_goals + away_goals) <= 2.5`
- **And** calculate `res_btts`:
    - `'Yes'` if `home_goals > 0 AND away_goals > 0`
    - `'No'` otherwise.

### AC 2: Validate Data Integrity
- **Given** matches that went to Extra Time
- **When** calculating settlements
- **Then** strictly use `score_fulltime_home` and `score_fulltime_away` (90 mins).
- **And** ignore Penalty Shootout results for standard markets.

## Technical Notes
- **Performance**:
  - Materialize this view if query performance is slow on large datasets (10k+ rows).
  - Use `CASE WHEN ... THEN ... END` logic in SQL.
- **Output**:
  - `fixture_id`
  - `odds_home`, `odds_draw`, `odds_away`
  - `outcome_1n2_class` (0, 1, 2 for ML logic)
  - `outcome_ou25_class` (0, 1)

## Risks
- **Data Quality**: Ensure `goals_home` is not NULL before calculating.
