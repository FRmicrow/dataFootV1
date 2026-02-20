# US_30_V3_Player_Profile_Trophies_Display

## 1. User Story
**As a** football analyst or fan,
**I want to** view a comprehensive, organized list of a player's trophies and achievements on their profile page,
**So that I can** quickly assess their career success and prestige without searching external sites.

## 2. Technical Context
- **Target Page**: `PlayerProfilePageV3.jsx` (Frontend)
- **Data Source**: `GET /api/v3/player/:id/trophies` (Backend)
- **Data Structure**: Array of objects:
  ```json
  [
    { "trophy": "UEFA Champions League", "place": "Winner", "season": "2018-2019", "league_name": "UEFA Champions League" },
    { "trophy": "Premier League", "place": "2nd Place", "season": "2019-2020", "league_name": "Premier League" },
    ...
  ]
  ```

## 3. Frontend Implementation Requirements

### 3.1 Data Fetching & State
- **Fetch Logic**: 
  - Call the trophies endpoint in parallel with the main profile fetch using `Promise.all`.
  - Handle loading states silently (do not block the main profile if trophies fail).
  - Data must be stored in a dedicated state variable (e.g., `trophies`).

### 3.2 Data Processing (The "Grouping Strategy")
The raw list is chronological and repetitive. The frontend **MUST** process this data before rendering:
1.  **Group By Competition**: Aggregate entries by `league_name` (or `trophy` name if league is generic).
2.  **Filter for Quality**: 
    -   **Primary View**: distinct "Winner" or "1st Place" entries.
    -   **Detailed View (Optional)**: "Runner-up" or "Finalist" entries (can be hidden or shown with lower visual priority).
3.  **Count & Sort**:
    -   Calculate the count of wins (e.g., "3x Winner").
    -   Sort the groups by **Prestige** (Continental > Domestic League > Domestic Cup) OR by **Count** (descending). *MVP: Sort by Count descending.*

### 3.3 UI Component: "Honours Card"
- **Location**: 
  - **Desktop**: In the `Sidebar`, preferably at the top (above "Bio Details") or immediately below it.
  - **Mobile**: Stacked below the "Career Totals" card.
- **Visual Design**:
  - **Header**: Title "🏆 Honours" or "Achievements".
  - **List Items**:
    -   **Badge**: A Gold-colored count badge (e.g., `[ 3x ]`) for multiple wins.
    -   **Name**: Bold text for the competition name.
    -   **Years**: A sub-text line listing the *seasons* of victory (e.g., "2017, 2018, 2021").
- **Styling Specs**:
  -   Use the existing `.dash-card` CSS class for container consistency.
  -   Use `#eab308` (Gold) for win badges to signify importance.
  -   Empty State: If a player has no trophies, the card should **NOT** render at all (avoid clutter).

### 3.4 Responsive Behavior
-   Ensure the list does not overflow horizontally.
-   On small screens, if the list is very long (>10 items), consider a "Show More" toggle (Nice-to-have).

## 4. Acceptance Criteria

### Scenario A: Player with Multiple Wins
- **Given** I am viewing the profile of a player like "Lionel Messi".
- **When** the page loads.
- **Then** I should see an "Honours" card in the sidebar.
- **And** it should group achievements (e.g., "10x La Liga", "4x UEFA Champions League").
- **And** it should list the specific years for each group.

### Scenario B: Player with No Trophies
- **Given** I am viewing a player with no recorded trophies in the V3 API.
- **When** the page loads.
- **Then** the "Honours" card should be completely hidden.
- **And** the "Bio Details" card should remain visible and shift up if necessary.

### Scenario C: Backend Failure
- **Given** the trophies API endpoint fails (500 Error).
- **When** the page loads.
- **Then** the main profile (Stats, Bio) should still load successfully.
- **And** the Honours card should simply not appear (graceful degradation).

## 5. Technical Tasks
1.  Create `UserStory` branch.
2.  Modify `PlayerProfilePageV3.jsx` to fetch trophies.
3.  Implement `groupedTrophies` logic.
4.  Create JSX for the Honours Card using the design system.
5.  Add CSS for gold badges and list layout.
