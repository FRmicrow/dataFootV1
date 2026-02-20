# US_017 - [DB/BE] Smart Snapshot Architecture & DB Storage

## Title
[DB/BE] Implement Favorites and "Smart Record" Feature Snapshot

## User Story
**As a** Data Scientist & Product Owner
**I want** to record the exact state of a team (form, injuries, squad) when odds are saved, and persist my UI preferences
**So that** we have a "Freeze Frame" of data for ML training without leakage, and my favorites sync across devices.

## Acceptance Criteria
### AC 1: Favorites Database Table
- **Given** the lack of a user login system
- **When** the DB migrations run
- **Then** a new table `V3_System_Preferences` is created (Singleton pattern or ID=1).
- **And** it must store `favorite_leagues` (JSON array of IDs) and `favorite_teams` (JSON array of IDs).

### AC 2: ML "Smart Snapshot" Table
- **Then** a new table `V3_Feature_Snapshots` is created:
    - `id` (PK)
    - `fixture_id` (FK to V3_Fixtures)
    - `team_id` (FK to V3_Teams)
    - `feature_type` (Enum: 'SQUAD', 'FORM', 'INJURIES', 'STANDINGS_POINTS')
    - `feature_data` (JSON blob)
    - `snapshot_timestamp` (Datetime)
- **Constraint**: `UNIQUE(fixture_id, team_id, feature_type)` to prevent duplicates for a single match.

### AC 3: Smart Record "Save Batch" & "Save Odds" Extensibility
- **Given** the `POST /api/v3/live-bet/save-odds` endpoint
- **When** triggered
- **Then** it must not only save the Odds (US_016), but also:
    1. Fetch current standings for both teams.
    2. Fetch the current Squad & Injuries.
    3. Serialize this data into JSON.
    4. Insert into `V3_Feature_Snapshots`.

## Technical Notes
- **JSON Storage**: SQLite supports JSON functions. `feature_data` can be queried later using JSON extractors. This is the optimal way to store complex nested data (like a 25-man squad list) without building 5 new normalized tables.
- **API Endpoints Required**: 
  - `GET /api/v3/preferences`
  - `PUT /api/v3/preferences`
