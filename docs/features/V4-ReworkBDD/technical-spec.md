# Technical Specification — V4 Rework & Transfermarkt Ingestion

## 1. Context & Objective
The goal is to create a new database layer (V4) dedicated to historical data from Transfermarkt. This layer must mirror the structure of the existing V3 system but remain completely isolated from V3 data.

## 2. Data Contract (SQL)

### 2.1 Core Entities (V4)
To respect the "matching existing models" rule, we will create the following tables:

#### V4_Teams
| Column | Type | Description |
|---|---|---|
| team_id | SERIAL PK | Internal V4 ID |
| name | TEXT NOT NULL | Unique team name from TM |
| logo_url | TEXT | Stored logo URL from TM |
| created_at | TIMESTAMPTZ | Metadata |

#### V4_Players
| Column | Type | Description |
|---|---|---|
| player_id | SERIAL PK | Internal V4 ID |
| name | TEXT NOT NULL | Full name from TM |
| created_at | TIMESTAMPTZ | Metadata |

#### V4_Fixtures
| Column | Type | Description |
|---|---|---|
| fixture_id | SERIAL PK | Internal V4 ID |
| tm_match_id | TEXT UNIQUE | Transfermarkt Match ID (from dump) |
| season | TEXT | e.g., "1963-1964" |
| league | TEXT | e.g., "Bundesliga" |
| date | TIMESTAMPTZ | Match date |
| home_team_id | INTEGER | FK -> V4_Teams |
| away_team_id | INTEGER | FK -> V4_Teams |
| goals_home | INTEGER | |
| goals_away | INTEGER | |
| round | TEXT | Matchday/Round |
| venue | TEXT | Stadium name |
| attendance | INTEGER | Number of spectators |
| referee | TEXT | |
| metadata_json | JSONB | Store everything else from dump |
| created_at | TIMESTAMPTZ | |

#### V4_Fixture_Events
| Column | Type | Description |
|---|---|---|
| event_id | SERIAL PK | |
| fixture_id | INTEGER | FK -> V4_Fixtures |
| time_elapsed | INTEGER | Minute |
| type | TEXT | Goal, Card, Subst, etc. |
| player_id | INTEGER | FK -> V4_Players (Scorer, Carded, or Subbed In) |
| assist_id | INTEGER | FK -> V4_Players (Assist or Subbed Out) |
| detail | TEXT | e.g., "Yellow Card", "Normal Goal" |
| score_at_event | TEXT | |
| created_at | TIMESTAMPTZ | |

#### V4_Fixture_Lineups
| Column | Type | Description |
|---|---|---|
| lineup_id | SERIAL PK | |
| fixture_id | INTEGER | FK -> V4_Fixtures |
| player_id | INTEGER | FK -> V4_Players |
| team_id | INTEGER | FK -> V4_Teams |
| side | TEXT | 'home' | 'away' |
| is_starter | BOOLEAN | |
| position_code | TEXT | G, D, M, A |
| numero | TEXT | |
| created_at | TIMESTAMPTZ | |

## 3. Ingestion Workflow
1. **Extraction**: Create temporary staging tables (`tm_matches`, `tm_match_events`, `tm_match_lineups`) by running the `transfermarkt_dump.sql`.
2. **Normalization**:
   - Insert unique teams from `tm_matches` into `V4_Teams`.
   - Insert unique players from events and lineups into `V4_Players`.
3. **Migration**: 
   - Map `tm_matches` to `V4_Fixtures` (joining with `V4_Teams`).
   - Map `tm_match_events` to `V4_Fixture_Events` (joining with `V4_Fixtures` and `V4_Players`).
   - Map `tm_match_lineups` to `V4_Fixture_Lineups`.
4. **Cleanup**: Drop staging tables.

## 4. Isolation Rules
- **NO JOIN** with `V3_` tables.
- **NO REFERENCES** to `V3_` IDs.
- **V4** is a standalone, siloed ecosystem for this rework.

## 5. Risks & Mitigation
- **Duplicate Players/Teams**: Use case-insensitive name matching and potentially normalization during ingestion.
- **Memory**: The SQL dump might be large; the ingestion script will use multi-row INSERTs for performance.
- **SQL Compatibility**: Ensure all `SERIAL` and `TIMESTAMPTZ` keywords match the project's PostgreSQL standards.
