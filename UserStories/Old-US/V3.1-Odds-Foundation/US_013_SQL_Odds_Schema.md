# US_013 - [SQL/DB] - Schema Expansion for Odds & Settlements

## Title
[SQL/DB] Create V3_Odds and V3_Market_Settlements Tables

## User Story
**As a** Database Engineer
**I want** to create a robust schema for storing historical odds and computed market settlements
**So that** we can start analyzing profitability and training predictive models.

## Acceptance Criteria
### AC 1: Create `V3_Odds` Table
- **Given** the current database schema
- **When** the migration runs
- **Then** a new table `V3_Odds` is created with columns:
  - `id` (PK, AutoIncrement)
  - `fixture_id` (Integer, Indexed, FK -> `V3_Fixtures`)
  - `bookmaker_id` (Integer) - Stores the provider ID (e.g., 1 for Bet365).
  - `market_id` (Integer) - Stores market type (1=1N2, 5=Goals).
  - `value_home_over` (Decimal 5,2) - '1' or 'Over' odds.
  - `value_draw` (Decimal 5,2, Nullable) - 'X' odds.
  - `value_away_under` (Decimal 5,2) - '2' or 'Under' odds.
  - `handicap_value` (Decimal, Nullable) - For markets that need a line (e.g., 2.5).
  - `updated_at` (Datetime)
  - **Constraints**: Composite Unique Index on `(fixture_id, bookmaker_id, market_id, handicap_value)`.

### AC 2: Create `V3_Simulations` Table (Backtesting)
- **Then** a new table `V3_Simulations` is created:
  - `id` (PK)
  - `strategy_name` (Text)
  - `fixture_id` (FK)
  - `bet_type` (Text: '1', 'N', '2', 'Over', 'Under')
  - `odds_used` (Decimal)
  - `stake` (Decimal)
  - `pnl` (Decimal) - Profit and Loss.
  - `status` (Text: 'WON', 'LOST', 'VOID').
  - `simulation_date` (Datetime).

### AC 3: Add `has_odds` Flag to Fixtures
- **Then** add a column `has_odds` (Boolean, Default FALSE) to `V3_Fixtures`.
- **And** create an index on `has_odds` for faster fetching of pending jobs.

## Technical Notes
- **Engine**: SQLite.
- **Precision**: Store odds as `REAL` or `DECIMAL(10,2)` logic (though SQLite uses REAL internally).
- **Indexing**: `fixture_id` MUST be indexed in `V3_Odds` for join performance.
