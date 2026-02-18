# Frontend Impact Analysis - V2 Data Architecture

## Overview
We have migrated the backend data ingestion strategy from a "Player-Centric" model to a "League/Team-Centric" model to align with the API-Football architecture and optimize for the Pro Plan (75k req/day).

This change has significant implications for how the Frontend should request and display data.

## Key Changes

### 1. Data Availability Model
- **Old Model**: "Check if Player ID exists -> Fetch Player Data".
  - Result: Frontend often had to handle "Partial" or "Missing" player states individually.
- **New Model**: "Import League -> All Players & Stats Available".
  - Result: If a League/Season is imported, **ALL** players in that league are guaranteed to be present with their stats.

### 2. "Missing Data" Handling
- **Do NOT** attempt to "refresh" or "fetch" a single player if data seems missing.
- **DO** prompt the user to "Import/Update League Data" if a specific competition seems out of date.
- **Action**: Add a "Data Source" or "Last Updated" badge on League/Team pages to give confidence.

### 3. API Usage for Frontend Agents
When building new features, prioritizing the following hierarchy:

1.  **Leagues List**: `GET /api/leagues`
2.  **League Import Trigger**: `POST /api/import/league` `{ "leagueId": 39, "season": 2023 }`
    - This is the "God Button" that fixes missing data for hundreds of players at once.
3.  **Team View**: `GET /api/teams/:id`
4.  **Player View**: `GET /api/players/:id`

### 4. Deprecated Features
- Individual Player Import (`POST /api/import/player`) is **deprecated/removed**.
- Reason: It is inefficient (600 calls vs 4 calls) and creates data fragmentation.
- **Replacement**: Use League Import.

## Recommendation for UI Design
- **Dashboard**: Center the admin experience around "Managed Leagues".
- **Status Indicators**: Show "Sync Status" for each League (e.g., "Premier League 2023: Synced 2 hours ago").
- **Error Handling**: If a player is missing stats, the error message should say: *"Player stats unavailable. Please update the [Team Name] or [League Name] data."*

## Performance Benefits
- **Speed**: Bulk imports are ~50x faster.
- **Completeness**: No more "missing holes" in team rosters.
- **Reliability**: Reduced chance of API rate limiting blocking the UI.
