# US_030: Manual League-Based Selection & Control

## 🎯 High-Level Objective
Move away from blind "batch" training to a surgical league-by-league approach. The user must have manual control over which competitions are "empowered" (processed for ML features) to ensure only high-quality, verified data enters the model.

## 👤 User Persona
**StatFoot Data Scientist / Admin** who wants to focus on perfecting one league (Premier League) before expanding.

## 📋 Requirements
1. **League Inventory**: Dashboard must fetch all leagues from `V3_Leagues` that have matches in `V3_Fixtures`.
2. **Empowerment Status**: For each league, calculate:
   - Total matches in DB.
   - Matches already processed in the ML Store.
   - Pending matches (Delta).
3. **Manual Action**: Add an "Empower League" button for each specific league.
4. **No Auto-Sync**: The system creates NO features automatically upon import. It only happens when this manual trigger is used.

## ✅ Acceptance Criteria (AC)
- [ ] UI displays a grid of leagues found in the local database.
- [ ] Each league row shows a counter: `{processed} / {total}`.
- [ ] Clicking "Empower" on "Premier League" only triggers the Python feature builder for `league_id: 39`.
- [ ] The process can be started and stopped per-league without affecting other system tasks.
- [ ] Visual indicator (Ready/In-Progress/Dirty) for the data status.

## 🛠️ Technical Implementation Notes
- **Frontend**: New `LeagueEmpowermentGrid.jsx` component inside the Data Empowerment page.
- **Backend**: API endpoint `POST /api/v3/ml/empower/:leagueId` that calls the Python service.
- **Python**: Update `features/builder.py` to accept a single `league_id` filter.
