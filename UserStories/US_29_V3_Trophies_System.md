# US_29_V3_Trophies_System

## Objective
Integrate player trophy data into the V3 system to enhance player profiles with awards and achievements.

## Data Model (V3_Trophies)
Create a new table `V3_Trophies` to store trophy information.

- **id**: INTEGER PRIMARY KEY AUTOINCREMENT
- **player_id**: INTEGER (Foreign Key to V3_Players)
- **league_name**: TEXT (Name of the league from API)
- **country**: TEXT
- **season**: TEXT (e.g., "2018-2019")
- **place**: TEXT (e.g., "Winner", "2nd Place")
- **trophy**: TEXT (e.g., "UEFA Champions League")
- **created_at**: DATETIME

*Note*: We store `league_name` because the Trophies API endpoint provides strings, and linking to `V3_Leagues` might be ambiguous or incomplete if the league isn't imported.

## Backend Features
1. **Schema Migration**: Create the table.
2. **API Endpoint**: `POST /api/v3/import/trophies`
   - Payload: `{ playerId: 123 }` or `{ list: [123, 456] }`
   - Logic: Call API-Football `/trophies?player={id}`, map fields, save to DB (avoid duplicates).

## Frontend Features (Smart Import Page)
1. **Tool**: `/v3/import/trophies`
2. **Features**:
   - **Single Import**: Search Player -> Import Trophies.
   - **Bulk Import**: "Sync Trophies for Imported Players".
     - Select a League (from loaded leagues).
     - Fetch all players in that league (local DB).
     - Queue trophy checks for these players.
     - Progress bar showing "Fetched X/Y players".
3. **Display**: Update Player Profile key data to show Trophy Count or list.

## Acceptance Criteria
- [ ] Database table `V3_Trophies` exists.
- [ ] Can import trophies for a specific player.
- [ ] Can bulk import trophies for players in a league.
- [ ] Trophies are displayed in the Player Profile.
