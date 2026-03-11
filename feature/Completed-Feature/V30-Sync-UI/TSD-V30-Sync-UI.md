# TSD — V30: League Sync UI

## Objective
Provide a user-friendly way to synchronize the current season's data for any league directly from its dashboard, without going through the main import matrix.

## Architecture

### 1. Unified Sync Route
The backend now exposes a specific endpoint for targeted sync:
`POST /api/league/:id/season/:year/sync`

This route utilizes the existing `leagueImportService` but skips redundant discovery checks to provide a faster, focused update. It outputs a Server-Sent Events (SSE) stream for real-time progress.

### 2. Frontend Integration
- **Overlay State**: Managed via React `useState` to track sync progress and logs.
- **SSE Consumer**: Utilizes `fetch` readable stream to parse logs line-by-line.
- **Auto-Refresh**: Triggers a full data fetch (`fetchData`) upon receiving the `complete` event.

### 3. UI/UX
The button is integrated into the `ControlBar` component of `SeasonOverviewPage`, placed next to the season selector for logical grouping. It uses the design system's `Button` component with a loading state.

## Implementation Details
- **Backend Controller**: `importLeagueV3` refactored to handle path parameters.
- **Frontend Service**: `api.js` updated with `syncLeague` method.
- **Visuals**: Primary variant button with a spinning sync icon during operation.
