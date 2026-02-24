# User Story 130: Live Monitoring League Selector

**Feature Type**: UX Overhaul
**Role**: Frontend Developer
**Accountable**: Frontend Agent

---

## Goal
Provide a specialized interface for the user to select which leagues should be "active" for live betting analysis, ensuring the system only processes high-value data.

## Core Task
Design and implement a "Monitoring Console" within the Live Bet Dashboard or Preferences section that allows granular control over league selection.

## Functional Requirements
- **League Discovery**: List all leagues found in `V3_Leagues` with their `importance_rank` and country flags.
- **Toggle Mechanism**: Each league must have a "Monitor" toggle switch.
- **Favorites Integration**: Pre-select leagues marked as `favorite_leagues` but allow independent monitoring control.
- **Visual Feedback**: Active monitored leagues should be visually highlighted (e.g., pulsing green indicator or "Active Analysis" badge).
- **Batch Actions**: "Select Top 10" button to quickly activate the most important leagues.

## Technical Requirements
- **State Management**: Persist the selected IDs into the `tracked_leagues` array within the `V3_System_Preferences` table.
- **API Integration**: Connect to `PUT /api/v3/preferences` with a dedicated `tracked_leagues` field.
- **Component**: Create a `LeagueMonitorSelector` component with search and country filtering.

## Acceptance Criteria
- User can select/deselect leagues.
- Clicking "Save" persists the list to the backend.
- The selection is reflected in the main Live Bet dashboard (filtering out non-tracked leagues).
- The list is sorted by `importance_rank` by default.
