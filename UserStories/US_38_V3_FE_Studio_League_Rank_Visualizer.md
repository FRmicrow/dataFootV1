# US_38_V3_FE_Studio_League_Rank_Visualizer

## 1. User Story
**As a** Content Creator,
**I want to** select a specialized "Standing Race" mode in the Studio,
**So that** I can generate a video showing the evolution of a league table over a single season.

## 2. Technical Context
- **Studio Component**: `Step1_Data.jsx` (Data Selection), `Step2_Config.jsx` (Visuals), `charts/BarChartRace.jsx` (Renderer).
- **Backend Endpoint**: `POST /api/v3/studio/query/league-rankings`.

## 3. Implementation Requirements

### 3.1 Specialized Form (Step 1)
When the user clicks the "Standing Race" button:
- **Hide standard Stat selection**: "Statistic" dropdown should be hidden/disabled as the stat is always "Points".
- **Hide standard Options**: "Cumulative Sum" is irrelevant and should be hidden.
- **Hide Season Range**: Replace with a **Single Season** selection.
- **League Filter**:
    -   Must only show competitions of type `League` (filter out `Cup` or `Tourney` if possible).
    -   Must be a single selection.
- **Validation**: Ensure a league and a year are selected before allowing "Next".

### 3.2 Visual Configuration (Step 2)
-   **Default Selection**: If coming from "Standing Race", the chart type "Racing Standings" should be auto-selected.
-   **Theme persistence**: Allow the user to change themes (Dark, Light, Neon).

### 3.3 Dynamic Rendering (Step 3)
Ensure the renderer (`BarChartRace.jsx`) handles the "Round" based data correctly:
-   **X-Axis**: Matches the max points at that Matchday.
-   **Y-Axis**: Teams swap positions based on their cumulative points/GD/GF.
-   **Logos**: High-quality team logos should be animated alongside bars.
-   **Overlay**: Clearly show "Matchday X" at the bottom or top.
-   **Sub-labels**: Show the current Goal Difference (e.g., "+15 GD") or Team Name as sub-label.

## 4. Acceptance Criteria
- [ ] Clicking "Standing Race" mode transforms the UI into a simplified League/Year form.
- [ ] Year selector only allows picking ONE year (no range).
- [ ] "Next" button correctly triggers the `league-rankings` API call.
- [ ] No syntax errors or hydration errors on the Studio page.
- [ ] Animation is smooth and correctly reflects the rank changes between matchdays.
- [ ] The chart title reflects the selected league and season automatically.
