# User Story 131: Strategic Activation Switch

**Feature Type**: Architecture Upgrade
**Role**: Backend Developer
**Accountable**: Backend Agent

---

## Goal
Optimize system resources and API quota by ensuring the Odds Ingestion and ML engines only run for leagues explicitly tracked by the user.

## Core Task
Implement a filtering layer in the `liveBetService` and background jobs that cross-references the `tracked_leagues` preference.

## Functional Requirements
- **Request Filtering**: The `getDailyFixturesService` must prioritize `tracked_leagues` when fetching odds.
- **Background Sync Logic**: Limit automated "Fetch Odds" cycles to fixtures belonging to `tracked_leagues`.
- **API Quota Management**: If many leagues are tracked, prioritize fetching for those with higher `importance_rank` first.

## Technical Requirements
- **Service Update**: Modify `backend/src/services/v3/liveBetService.js` to read `tracked_leagues` from the DB before executing API calls.
- **SQL Logic**: `SELECT tracked_leagues FROM V3_System_Preferences` should be cached in-memory or queried efficiently.
- **Middleware/Guard**: (Optional) Add a check in the `saveMatchOdds` controller to verify if the league is tracked.

## Acceptance Criteria
- Background processes only fetch odds for tracked leagues.
- System logs show skipped syncs for non-tracked competitions.
- If no leagues are tracked, fall back to the "Top 5" most important leagues by default (as safety).
