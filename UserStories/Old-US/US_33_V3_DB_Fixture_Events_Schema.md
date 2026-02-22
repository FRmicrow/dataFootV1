# US_33_V3_DB_Fixture_Events_Schema

## 1. User Story
**As a** Database Architect,
**I want to** create a dedicated schema to store detailed match events (Goals, Cards, Substitutions),
**So that** we can persist granular match data locally and avoid repeated external API calls.

## 2. Technical Context
- **Target Database**: SQLite (`V3` schema separation).
- **Data Source**: API-Football `/fixtures/events` or `/fixtures?id=x` response.
- **Parent Table**: `V3_Fixtures` (linked via `fixture_id`).

## 3. Implementation Requirements

### 3.1 New Table: `V3_Fixture_Events`
Create a table to store individual events that occur during a match.

| Column Name | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PK, Auto Increment | Unique Event ID |
| `fixture_id` | INTEGER | FK, Not Null | Link to `V3_Fixtures.fixture_id` |
| `time_elapsed` | INTEGER | Not Null | Minute the event occurred (e.g., 45) |
| `extra_minute` | INTEGER | Nullable | Stoppage time (e.g., 3 for 45+3) |
| `team_id` | INTEGER | FK | The team ID associated with the event |
| `player_id` | INTEGER | FK, Nullable | The player ID involved (e.g., Scorer) |
| `player_name` | TEXT | | Name of the player (fallback if ID null) |
| `assist_id` | INTEGER | FK, Nullable | The assisting player ID (if applicable) |
| `assist_name` | TEXT | | Name of the assistant |
| `type` | TEXT | Not Null | Event Type: `'Goal'`, `'Card'`, `'subst'`, `'Var'` |
| `detail` | TEXT | | Detail: `'Normal Goal'`, `'Yellow Card'`, etc. |
| `comments` | TEXT | Nullable | Any additional comments from API |

### 3.2 Constraints & Indexes
- **Foreign Key**: `fixture_id` references `V3_Fixtures(fixture_id)` ON DELETE CASCADE.
- **Index**: Create an index on `fixture_id` for rapid retrieval of all events for a specific match.
- **Composite Index**: Optional index on `(fixture_id, type)` if we frequently query just goals.

### 3.3 Data Integrity & Performance
- Ensure `player_id` can be null.
- `type` should be normalized.
- **Performance**: Ensure the `fixture_id` index is optimized for the `GROUP BY` counts required by the `getCatchupCandidates` query (counting events per league).

## 4. Acceptance Criteria
- [x] Table `V3_Fixture_Events` exists.
- [x] Foreign keys enforced.
- [x] Index on `fixture_id` created.
- [x] Query performance verified for identifying "empty" leagues (Catch-up logic).

