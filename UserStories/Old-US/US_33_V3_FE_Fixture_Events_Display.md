# US_33_V3_FE_Fixture_Events_Display

## 1. User Story
**As a** User analyzing league results,
**I want to** click on a match row to expand it,
**So that** I can view detailed match events (Goal Scorers, Cards) inline without navigating away.

## 2. Technical Context
- **Component**: `LeagueResults.jsx` (or equivalent Results list component).
- **Data Source**: `GET /api/v3/fixtures/:id/events`.
- **Design Pattern**: Accordion / Expandable Row.

## 3. Frontend Implementation Requirements

### 3.1 Interaction Design
- **Trigger**: Clicking anywhere on the match row (or specifically the score area) toggles the expanded state.
- **Animation**: The row should expand smoothly (slide down) to reveal the "Details Panel".
- **Visuals**:
    -   The "Details Panel" should have a distinct background (slightly darker/lighter than the row) to indicate hierarchy.
    -   Use a "Glassmorphism" effect or shadow to give it depth.

### 3.2 The Details Panel Content
The expanded area should display:
1.  **Goal Scorers (Priority)**:
    -   List goals for Home Team (Left aligned) and Away Team (Right aligned) or central chronological list.
    -   **Format**: `Min' Player Name (Assist)` + ⚽ Icon.
    -   *(Style requirement)*: Use the gold color/accent for goals.
2.  **Cards (Secondary)**:
    -   Yellow/Red card icons with player name and minute.
    -   Can be integrated into the same timeline or separate sections.
3.  **Loading State**:
    -   When expanding, if data isn't loaded, show a small spinner or skeleton inside the panel.

### 3.3 Data Handling
- **Lazy Loading**:
    -   The component should not fetch events for all 380 matches on load.
    -   **On Click**: Check if events for `fixture_id` exist in state/cache.
    -   **If Missing**: Call internal API `GET /api/v3/fixtures/:id/events`.
    -   **Store**: Save to local context/state to prevent re-fetching if the user toggles it again.

### 3.4 Responsive Design
- **Mobile**:
    -   Ensure the expanded panel fits within the screen width.
    -   Text should not wrap awkwardly. Use abbreviations if necessary for small screens.

## 4. Acceptance Criteria
- [ ] **Click-to-Expand**: Clicking a match row expands the view.
- [ ] **Data Retrieval**: Expanding triggers a fetch to the backend (if data not cached).
- [ ] **Visuals**: Goals are clearly visible with minutes and scorers.
- [ ] **UX**: The transition is smooth; opening one match *optionally* closes others (Accordion mode) or allows multiple open (Expansion mode). *Decision: Allow multiple open.*
