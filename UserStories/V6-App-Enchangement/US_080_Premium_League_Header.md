# US_080: Premium League Header & Historical Achievements

**Role: Full Stack (BE/FE)**

## User Story
**As a** User  
**I want** a compact, premium header that displays competition winners and top performers for past seasons  
**So that** I can quickly grasp the historical context of a league edition.

## Acceptance Criteria
- **Given** the League Detail Header  
- **When** rendered  
- **Then** all legacy labels ("V3 Analytics", "world") must be removed.
- **Given** a season that has concluded (not current)  
- **When** the Page loads  
- **Then** the header must display:
    - **Winner**: Team name and logo (Rank #1 from `V3_Standings`).
    - **Top Scorer**: Player name and goal count.
    - **Best Player**: Highest rated player (min. 10 appearances).
    - **Top Assister**: Player with most assists.
- **Given** the header layout  
- **Then** it must be more compact, using a clean professional aesthetic with consistent font sizes (Logo + Name + Metadata).

## Functional Notes
- If it's the *Current* season, show "Season in Progress" status instead of a winner.

## Technical Notes
- **Backend**: Update `getSeasonOverview` in `seasonController.js` to explicitly fetch the Winner from `V3_Standings`.
- **Frontend**: Update `SeasonOverviewPage.jsx` header section. Create a `HistoricalBanner` component or similar to show top performers.
