# US_31_V3_Trophies_Nationality_Batch

## Objective
Implement a robust, nationality-based batch import system for trophies to eliminate duplicate processing and optimize API usage.

## Problem Statement
The current league-based import creates duplicates because players appear in multiple leagues. Iterating by league leads to redundant checks for the same player, wasting API quota and time.

## Solution
1.  **Filter by Nationality**: Iterate through players based on their `nationality` field in `V3_Players`.
2.  **Batch Processing**: Load all unique players for a selected nationality and process them in a controlled batch.
3.  **Rate Limiting**: Strictly enforce a 440 request/minute limit to maximize throughput without hitting API bans.

## Backend Requirements

### 1. New API Endpoint: Get Nationalities
-   **Route**: `GET /api/v3/players/nationalities`
-   **Logic**: Return list of distinct nationalities from `V3_Players` with player counts.
    -   `SELECT nationality, COUNT(*) as count FROM V3_Players GROUP BY nationality ORDER BY count DESC`
-   **Response**: `[{ nationality: "France", count: 1200 }, ...]`

### 2. New API Endpoint: Get Players by Nationality
-   **Route**: `GET /api/v3/players/by-nationality?country={CountryName}`
-   **Logic**: Return list of players for that nationality.
    -   `SELECT p.player_id, p.name, p.photo_url, (CASE WHEN t.player_id IS NOT NULL THEN 1 ELSE 0 END) as has_trophies`
    -   `FROM V3_Players p`
    -   `LEFT JOIN (SELECT DISTINCT player_id FROM V3_Trophies) t ON p.player_id = t.player_id`
    -   `WHERE p.nationality = ?`

### 3. Rate Limiter Configuration
-   **File**: `backend/src/services/apiQueue.js`
-   **Change**: Update `MAX_REQUESTS_PER_MINUTE` to **440**.
-   **Verify**: Ensure `processQueue` logic respects this limit strictly.

## Frontend Requirements (ImportTrophiesPage.jsx)

### 1. UI Enhancements
-   Add **Import Mode Switcher**: "By League" (Existing) vs "By Nationality" (New).
-   **Nationality Mode**:
    -   Dropdown: Select Nationality (fetched from new endpoint).
    -   Stats: "Found X Players (Y already have trophies)".
    -   Filter Toggle: "Skip players with existing trophies" (Default: On).

### 2. Batch Logic
-   **Process**:
    -   Fetch player list for nationality.
    -   Filter list based on toggle (skip existing).
    -   Iterate through the list.
    -   Call `POST /api/v3/import/trophies` for each player.
    -   **Pacing**: Frontend should handle basic pacing, but rely on Backend Queue for strict 440/min enforcement.
    -   **Feedback**: Progress bar showing "Processed X / Total Y". Time Remaining estimate.
    -   **Stop**: Ability to pause/stop the batch.

## Acceptance Criteria
- [ ] User can select a nationality (e.g., France).
- [ ] System retrieves all unique players of that nationality.
- [ ] Import process runs at ~440 requests/minute (backend enforced).
- [ ] No duplicate API calls for the same player within the batch.
- [ ] Progress is visualized, including skipped players.
