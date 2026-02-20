# US_40_V3_FE_BE_Dynamic_Range_Standings

## 1. User Story
**As a** User analyzing a league season,
**I want to** filter the League Table by a specific range of rounds (e.g., "Round 1 to 5", or "Round 20 to 38"),
**So that** I can see the standings at a specific point in time or analyze team form over a specific period.

## 2. Technical Strategy: Dynamic vs Stored

### 2.1 Analysis
-   **Stored Snapshots**: Saving the table for every round (38 rounds * 20 teams = 760 records/season) is possible but inflexible. If we want "Rounds 10-15", snapshots don't help directly (need to subtract). Syncing is complex if scores change.
-   **Dynamic Calculation**: Aggregating ~380 matches takes milliseconds. It allows infinite flexibility (any range, any team filter). It ensures data consistency with the `V3_Fixtures` source of truth.

### 2.2 Decision
**Dynamic Calculation** is the chosen approach. It is robust, maintenance-free, and sufficiently performant for the datasets involved.

## 3. Implementation Requirements

### 3.1 Backend: `Standings Service`
-   **Refactor**: Extract the ranking logic from `US_37` (Studio) into a shared service `src/services/v3/StatsEngine.js`.
-   **New Endpoint**: `GET /api/v3/standings/dynamic`
    -   **Query Params**:
        -   `league_id`: (Required)
        -   `season`: (Required)
        -   `from_round`: (Optional, default 1)
        -   `to_round`: (Optional, default Max)
    -   **Logic**:
        1.  Fetch matches for `league_id` + `season`.
        2.  Parse match `round` string to integer (e.g. "Regular Season - 5" -> 5).
        3.  Filter matches where `from_round <= match_round <= to_round`.
        4.  Compute table:
            -   **P** (Played), **W**, **D**, **L**
            -   **GF**, **GA**, **GD**
            -   **Pts**
            -   **Form** (last 5 in range).
        5.  Sort by Pts DESC, GD DESC, GF DESC, H2H (optional).

### 3.2 Frontend: `StandingsPage` Update
-   **UI Controls**:
    -   Add a "Round Range" slider or double-dropdown (Start / End).
    -   Default: Start=1, End=Current/Max.
    -   Option: quick preset "First Half" (1-19), "Second Half" (20-38).
-   **Display**:
    -   Update the table title dynamically: e.g., "Premier League Table (Rounds 1-5)".
    -   Highlight changes? (Optional future feature).

## 4. Acceptance Criteria
- [ ] User can view the table for the first 5 rounds and it matches the actual historical table at that date.
- [ ] User can view a "Form Table" (e.g., Rounds 30-38) to see who performed best in the final stretch.
- [ ] Changing the range updates the table data instantly (< 200ms).
- [ ] Logic correctly maps "Regular Season - X" to integer X for filtering.
