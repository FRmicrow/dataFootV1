# US_082: Smart Standings & Result Visualization Logic

**Role: Frontend / Full Stack**

## User Story
**As a** Football fan  
**I want** to see standings only for leagues and improved knockout results for cups  
**So that** I don't see empty tables for cup competitions and can track knockout progression easily.

## Acceptance Criteria
- **Given** a competition of type **"Cup"**  
- **When** viewing the League Detail page  
- **Then** the **Standings** tab must be hidden.
- **Given** the **Results** (Fixtures) tab  
- **When** matches are rendered  
- **Then** align match score, status, and detail vertically (centered block) for better readability.
- **Given** a knockout stage (e.g., Round of 16, Quarter-finals) with Home/Away legs  
- **When** rendered  
- **Then** both matches must be stacked vertically within the same visual group.
- **When** a knockout tie is complete  
- **Then** display the **Aggregate Winner** name in **Bold** next to the aggregate score.

## Functional Notes
- Logic for "Cup" detection should be based on the `V3_Leagues.type` field.
- "Stacked matches" means grouping fixtures by round and team pairs.

## Technical Notes
- **FE Component**: Update `SeasonOverviewPage.jsx` logic to exclude 'standings' tab if `data.league.type === 'Cup'`.
- **FE Component**: Update `FixturesList.jsx` to grouping logic. If two fixtures have the same round and "Team A vs Team B" and "Team B vs Team A", they belong to a tie.
