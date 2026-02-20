# US_020 - [FE/BE] Historical "Smart View" Toggle & UI Extension

## Title
[FE/BE] Display Past Matches with Post-Match Analytics & Settlement Verification

## User Story
**As a** Model Trainer / Analyst
**I want** to browse matches that have already been played and see the "Smart View" populated with final outcomes compared against the initial odds/predictions
**So that** I can visually inspect where our edge is and where predictions failed, helping to improve the model.

## Acceptance Criteria
### AC 1: Dashboard "Past Matches" Toggle
- **Given** I am on the `/live-bet` dashboard
- **When** I look near the date selector/header
- **Then** I see a toggle or date picker allowing me to select "Past Matches" (e.g., Yesterday, or specific past dates).
- **And** the feed updates to show fixtures where `status_short` IN ('FT', 'AET', 'PEN').

### AC 2: Game Card "Settlement Mode"
- **Given** a Game Card for a completed match
- **Then** the card displays the Final Score prominently.
- **And** the displayed Odds (1N2, O/U) have visual highlights:
    - **Green Highlight**: The market outcome that won (e.g., if Home won, the 'Home' odd box is highlighted).
    - **Red/Strikethrough**: The market outcomes that lost.
- **And** the "Smart Prediction" badge shows a ✅ if the model was correct, or ❌ if incorrect.

### AC 3: Detailed Match Page - Post-Match Analytics
- **Given** I click into a completed Match Detail page (`/live-bet/match/:id`)
- **When** the side-by-side view loads
- **Then** the "Match Context" header displays a new section: **Match Statistics (Actual vs Expected)**.
- **And** this includes data points crucial for modeling (if available from API/DB):
    - Possession %
    - Shots on Target
    - Expected Goals (xG) - *If supported by API*
    - Total Corners & Cards (Discipline rating)

### AC 4: Side-by-Side Verification
- **Given** the Team Squads / Lineup columns
- **Then** the "Match XI" highlights players who scored goals or received Red Cards, showing their direct match impact.
- **And** the `V3_Feature_Snapshots` logic (US_017) remains visible (what the squad *was* pre-match vs what actually happened).

## Data Engineering Context (The "Strong Model" Variables)
To predict future results, the backend must expose these variables for past matches:
1. **Form Momentum**: Not just W/D/L, but Goal Difference over the last 5 matches.
2. **Fatigue Index**: Days of rest since the team's last competitive match.
3. **Squad Value/Strength**: Based on `importance_rank` and player ratings.
4. **Injuries Impact**: Number of *starting* players missing vs their standard XI.
5. **Odds Movement** (Future): Opening Odds vs Closing Odds.

*Backend Agent*: Update `getMatchDetailsService` to pull `events` and `statistics` for FT matches and append them to the payload.
