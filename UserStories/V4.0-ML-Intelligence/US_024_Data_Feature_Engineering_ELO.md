# US_024 - [Data/Python] Feature Engineering & Per-League ELO System

## Title
[Data/Python] Build Feature Engineering Pipeline: Per-League ELO, Form, Fatigue, Discipline

## User Story
**As a** Machine Learning Architect  
**I want** to extract rich, time-aware, per-league features from `V3_Fixtures`, `V3_Standings`, `V3_Player_Stats`, and `V3_Odds`  
**So that** the LightGBM model has meaningful predictive signals that reflect genuine team quality without data leakage.

## Acceptance Criteria

### AC 1: Per-League ELO System
- **Given** all historical matches in `V3_Fixtures` for a league
- **When** `features/builder.py` initializes
- **Then** it calculates a dynamic ELO rating per team, **scoped to its league**.
- **Rules:**
  - Starting ELO: `1500` for all teams.
  - K-factor: `20` (standard, season-agnostic).
  - ELO updates after every `FT/AET/PEN` match.
  - Home advantage bonus: `+100 ELO points` added to home team's expected score formula.
  - Cross-league form note: ELO is per-league, but the `recent_form_score` feature (see AC 3) is computed over all competitions to capture team momentum.

- **Output Feature:** `elo_home`, `elo_away`, `elo_diff` (home minus away). Stored in `V3_Feature_Snapshots` as `feature_type = 'ELO'`.

### AC 2: Anti-Data-Leakage Constraint (Non-Negotiable)
- **Given** a target match with `fixture_date = D`
- **Then** ALL features must only use data from matches completed **strictly before date D**.
- **Implementation:** Every SQL query in `builder.py` MUST include `AND date < '{fixture_date}'` in the WHERE clause.
- **Verification:** A unit test must confirm that ELO for match on `2024-05-10` does not include results from `2024-05-10`.

### AC 3: Form Features (Rolling Window)
For each team, compute over the last **5 completed league matches** (before fixture date):
| Feature | Description |
|---------|-------------|
| `home_form_pts` | Points per game (3=W, 1=D, 0=L) |
| `home_goal_diff_5` | Goals for - Goals against |
| `home_clean_sheet_rate` | % of clean sheets |
| `home_btts_rate` | % of matches both teams scored |
| `home_over25_rate` | % of matches with >2.5 goals |

Repeat all 5 for `away_*`. This gives **10 form features**.

### AC 4: Fatigue / Rest Features
| Feature | Description |
|---------|-------------|
| `home_rest_days` | Days since last competitive match (all competitions) |
| `away_rest_days` | Same for away team |
| `home_matches_last_30d` | Total matches played in last 30 days (fixture congestion) |
| `away_matches_last_30d` | Same for away |

Source: `V3_Fixtures` table (all competitions).

### AC 5: Discipline & Style Features
| Feature | Description |
|---------|-------------|
| `home_avg_cards_5` | Average cards per match (last 5) — requires `V3_Fixture_Events` or stats |
| `away_avg_cards_5` | Same |
| `home_avg_corners_5` | Proxy for attacking pressure |
| `away_avg_corners_5` | Same |

### AC 6: Head-to-Head (H2H) Features
| Feature | Description |
|---------|-------------|
| `h2h_home_wins` | Home team wins in last 5 H2H meetings |
| `h2h_draws` | Draws in last 5 H2H meetings |
| `h2h_away_wins` | Away team wins in last 5 H2H meetings |
| `h2h_avg_goals` | Average total goals scored in H2H |

Source: Filter `V3_Fixtures` for pairs `(home_team_id, away_team_id)` in both orderings.

### AC 7: Odds-Derived Features (When Available)
| Feature | Description |
|---------|-------------|
| `odds_home` | Bookmaker home win odds |
| `odds_draw` | Draw odds |
| `odds_away` | Away win odds |
| `implied_prob_home` | `1/odds_home` normalized |
| `implied_prob_draw` | Same |
| `implied_prob_away` | Same |

Source: `V3_Odds` table. If no odds available, mark as `NULL` (LightGBM handles missing values natively).

### AC 8: Feature Builder Output
The function `build_features(fixture_id, fixture_date, home_team_id, away_team_id, league_id)` returns a Python dict (later a DataFrame row) with all ~35 features clearly named.

## Technical Notes
- **No Sklearn in feature computation** — pure Pandas + SQL.
- **All features must be computable for FUTURE matches** (no stats that only exist post-match like "actual goals").
- **Feature table in SQLite (optional optimization)**: If real-time prediction latency is too high, pre-compute features for upcoming matches and cache them in a `V3_Feature_Matrix` table via a nightly script.
