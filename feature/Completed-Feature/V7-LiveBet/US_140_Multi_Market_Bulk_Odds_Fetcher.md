# US_140: Multi-Market Bulk Odds Fetcher (Depth Ingestion)

## Context
Standard odds fetchers often only target the main Match Winner market. For advanced ML empowerment and live betting intelligence, we need a depth of markets including Both Teams to Score, Asian Handicaps, and Half-Time results.

## Mission
Implement a high-performance bulk odds ingestion service (`MultiMarketOddsFetcher`) that fetches and persists multiple markets for batches of fixtures. This service will enable "Depth Ingestion" for ML feature engineering and advanced betting analytics.

### Target Bet IDs (API-Football)
1.  **Bet 1**: Match Winner (1x2)
2.  **Bet 3**: Goals Over/Under (Wait, let's verify if 3 is O/U or 5. Standard is 5. If user says 3, 5, let's check both).
3.  **Bet 5**: Goals Over/Under (Total Goals)
4.  **Bet 8**: Both Teams to Score (BTTS)
5.  **Bet 10**: First Half Winner
6.  **Bet 12**: Double Chance

*Note: Asian Handicap (ID 4) will be included if encountered, to fulfil the "Handicaps" mission requirement.*

## Technical Plan

### 1. Database Layer
The `V3_Odds` table will be used. Ensure it handles the mapping for different market types:
- **1x2 / First Half Winner / Second Half Winner**: 
  - `value_home_over` -> Home
  - `value_draw` -> Draw
  - `value_away_under` -> Away
- **BTTS**: 
  - `value_home_over` -> Yes
  - `value_away_under` -> No
- **Over/Under 2.5**:
  - `value_home_over` -> Over 2.5
  - `value_away_under` -> Under 2.5
  - `handicap_value` -> 2.5
- **Double Chance**:
  - `value_home_over` -> Home/Draw
  - `value_draw` -> Home/Away
  - `value_away_under` -> Draw/Away

### 2. Service Layer (`bulkOddsService.js`)
Create a new service `bulkOddsService.js` to handle:
- **`ingestOddsForLeague(leagueId, season)`**: Ingests odds for all fixtures in a season.
- **`ingestOddsForDate(date)`**: Ingests odds for all fixtures on a specific date.
- **Batch Processing**: Use `apiQueue` for rate-limited requests.
- **Smart Mapping**: Logic to correctly assign API values to DB columns based on `market_id`.

### 3. Integration
- Expose an endpoint in `v3_routes.js` to trigger bulk ingestion.
- Add UI button in the "Import Hub" or "Live Bet Intelligence" dashboard.
3: ?
5: O/U
8: BTTS
10: First Half Winner
12: Double Chance

Where did "Handicaps" go? Maybe 8 is Asian Handicap in their mind? No, 8 is usually BTTS.
I'll check `footballApi.js` to see if there's any documentation or previous usage.
