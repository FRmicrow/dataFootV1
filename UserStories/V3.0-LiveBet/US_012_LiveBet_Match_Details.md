# US_012 - Match Detail & Analysis

## Title
View Match Detail Page with Official/Probable Lineups and Deep Stats

## User Story
**As a** Punter  
**I am** on the Match Detail page (`/live-bet/{fixtureId}`)  
**I want** to see the confirmed or probable lineups, recent form, and head-to-head records  
**So that** I can make a data-backed betting decision.

## Acceptance Criteria
### AC 1: Lineups Display (Official vs Probable)
- **Given** I am on the Match Detail Page
- **When** the official lineups are **not released** (<1h before KO)
- **Then** the system displays the **Probable Lineups** (prediction).
- **And** a clear badge says **"⚠️ Probable Lineup"**.
- **When** the lineups **are official**
- **Then** the display changes to **"✅ Official Lineup"**.
- **And** the data source switches accordingly.

### AC 2: Form & Head-to-Head (H2H)
- **Given** I am scrolling the detail page
- **Then** I see three distinct sections:
    1.  **Home Team Form**: Last 5 matches (W-D-L-W-L) with color-coded badges.
    2.  **Away Team Form**: Last 5 matches.
    3.  **H2H History**: The last 5 meetings between *these two teams* specifically.
- **And** each item shows the result (Score) and Date.

### AC 3: Detailed Odds View
- **Given** I am on the Match Detail page
- **Then** below the stats, I see an expanded "All Odds" section.
- **And** this includes:
    -   Match Winner (1N2)
    -   Goals Over/Under Markets (Full spectrum: 0.5, 1.5, 2.5, 3.5...)
    -   Both Teams to Score (BTTS: Yes/No)
- **And** markets are grouped or collapsible for clarity.

## Functional Notes
- **Lineup Visuals**: Use the standard pitch view component if generic enough, else list view.
- **Injuries**: Future enhancement (V2), ignore for now (or placeholder if easy).
- **Navigation**: Back button returns to the Dashboard list while preserving Scroll Position.

## Technical Notes
### Data Dependencies
- **Lineups**:
    - **Probable**: `GET /predictions?fixture={id}` → `response[0].lineups`.
    - **Official**: `GET /fixtures/lineups?fixture={id}`.
    - **Logic**: If `official_lineups` API returns content, use it. Else fall back to `predictions`.

- **Stats**:
    - **Form**: `GET /fixtures/headtohead?h2h={team1}-{team2}` for direct clashes.
    - **Team Form**: `predictions` endpoint also returns `teams.home.last_5`. Use this directly to save calls.

- **Odds Markets**:
    - Market ID `1` = 1N2.
    - Market ID `5` = Goals Over/Under.
    - Market ID `8` = Both Teams to Score (BTTS).
    - Market ID `12` = Double Chance.
    - **Display**: Use a library component (e.g., Accordion) to render.

### Performance
- These are heavy payloads.
- **Server Component**: Ideally fetch this server-side (Next.js) and pass as props to the Client Component for interactivity.
- **Cache**: 60 minutes for H2H/Form (static). 5 minutes for Lineups/Odds (dynamic).
