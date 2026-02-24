# 👤 US_188: StatFoot-ELO Rating Engine
**Accountable Agent**: ML Agent / Data Scientist
**Feature Type**: Analytical Engine / Feature Engineering
**Mission**: Implement a dynamic, cross-league, and lineup-aware rating system that provides a numerical "Power Score" for every team and player since 2010.

---

## 🎯 Strategic Objective
Replace basic "Form" stats with a scientifically calibrated ELO system that accounts for opponent strength and provides a stable baseline for "Team Quality".

## 📋 Functional Requirements
- **Recursive ELO History**: Calculate ELO scores for all teams in the DB starting from the first match of 2010.
- **K-Factor Optimization**: Use a dynamic K-factor (sensitivity) that decreases as the model gains confidence in a team's level (season maturity).
- **Lineup Power Adjustment**:
    - Calculate a `Squad_ELO` = Mean ELO of all players in the Starting XI.
    - Final Match Strength = `(Team_ELO * 0.7) + (Squad_ELO * 0.3)`.
- **Cross-League Calibration**: Implement an "Inter-League Adjustment" so a Top 5 League ELO is weighted higher than the 2nd division.

## 🛠️ Technical Requirements
- **Logic**: Implement in `ml-service/ratings.py`.
- **Database**: Store in `V3_Team_Ratings` (team_id, league_id, season, elo_score, date).
- **Inference**: High-speed lookup during time-travel feature extraction.

## ✅ Acceptance Criteria
- Running the rating engine populates a full historical timeline of team strengths.
- Matches between high-ELO teams (e.g., Man City vs Liverpool) generate higher "Quality Points" than lower-tier matches.
- The model's "Win Probability" is significantly positively correlated with the ELO delta between two teams.
- Lineup changes (injuries) result in immediate, measurable drops in the `Match_Strength` variable.
