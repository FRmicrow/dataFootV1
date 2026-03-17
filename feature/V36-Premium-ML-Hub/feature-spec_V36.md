# Feature Spec - V36: Data & ML Foundations Refactor

## Vision
Refactor the ML stack around a PostgreSQL-only runtime, a unified data contract, a market-driven feature store, and traceable prediction outputs. V36 is a foundations feature, not a UI-first feature.

## Scope
- Remediate the current audit findings before any model extension
- Replace the coarse `BASELINE_V1 / PROCESS_V1` split with explicit feature blocks
- Define a reproducible training and inference contract for:
  - `1X2_FT`
  - `1X2_HT`
  - `CORNERS_OU`
  - `CARDS_OU`
  - `GOALS_OU`
- Establish model governance for:
  - `global_full_history`
  - `global_5y`
  - `global_3y`
  - `league_specific` when eligible

## Initial Competition Priority
### Tier A
- Premier League
- La Liga
- Bundesliga
- Serie A
- Ligue 1
- Champions League
- Europa League

### Tier B
- Primeira Liga
- Eredivisie
- Belgian Pro League
- Europa Conference League

### Tier C
- National domestic cups in a later phase only

## Initial Market Priority
1. `1X2_FT`
2. `GOALS_OU`
3. `1X2_HT`
4. `CORNERS_OU`
5. `CARDS_OU`

## Explicit Non-Scope
- No continent-specific models in V1
- No club-specific or club-by-league-specific models in V1
- No destructive database changes

## Audit Findings To Resolve First
### Critical
- Artifact paths are inconsistent across training and inference
- The 1X2 training pipeline is fragile at persistence time
- Heuristic and dummy outputs are mixed with actual ML outputs

### High
- Market identifiers and evaluation labels are inconsistent
- Runtime truth is spread across code and outdated docs

### Medium
- Data validation, schema validation, and model guardrails are insufficient

## Target Data Contract
### Contract Stabilization Method
- Define one `feature_schema_version` per market family
- Freeze the exact ordered column list, type, semantic meaning, horizon rule, and allowed default policy
- Validate the same schema in:
  - feature generation
  - training dataset builders
  - inference vector assembly
  - model registry metadata
- Define one output contract for all model predictions with explicit status and provenance
- Ban undocumented silent proxies and implicit fallback vectors from the official contract

### Feature Blocks
- `BASELINE_CORE`
  - stable strength signals such as Elo, standings, rank, lineup strength
- `FORM_RECENT`
  - rolling momentum on goals, points, xG, corners, discipline
- `STYLE_PROCESS`
  - possession, shots, control, corners, fouls, cards, tempo proxies
- `MATCH_CONTEXT`
  - home/away, rest, stage, competition level, derby, travel
- `MARKET_SPECIFIC`
  - derived features tailored to FT, HT, corners, cards, goals OU

### Team Feature Enrichment Priority
#### `BASELINE_CORE`
- `elo_team`
- `elo_diff`
- `league_rank`
- `league_points_per_game`
- `goal_diff_per_game`
- `lineup_strength_v1`
- `opponent_strength_index`

#### `FORM_RECENT`
- `points_last_3/5/10`
- `goals_for_last_3/5/10`
- `goals_against_last_3/5/10`
- `xg_for_last_3/5/10`
- `xg_against_last_3/5/10`
- `corners_for_last_5/10`
- `cards_last_5/10`

#### `STYLE_PROCESS`
- `possession_avg_5`
- `shots_avg_5`
- `shots_on_target_avg_5`
- `sot_rate_5`
- `pass_accuracy_5`
- `control_index_5`
- `corners_avg_5`
- `fouls_avg_5`
- `yellow_avg_5`
- `red_avg_5`

#### `MATCH_CONTEXT`
- `is_home`
- `rest_days`
- `competition_level`
- `competition_type`
- `is_european_match`
- `is_knockout`
- `stage_weight`
- `travel_proxy`
- `derby_flag`

#### `MATCHUP`
- `strength_gap`
- `style_clash_score`
- `favorite_pressure_index`
- `open_game_index`
- `low_block_risk_proxy`

### Prediction Contract
Every persisted prediction must include:
- `market_type`
- `model_version`
- `feature_schema_version`
- `prediction_status`
- `is_fallback`
- `features_completeness`
- `calculated_at`

### Training Registry Contract
Every model run must include:
- market
- scope
- horizon
- dataset size
- feature schema version
- metrics
- artifact path
- active status

## Target Modeling Strategy
- Start with global models and real historical windows
- Specialize by league only when volume and out-of-sample performance justify it
- Encode continent/league/competition/context differences in features before considering separate models
- Use team and competition context to model cases such as "domestic favorite but European outsider"

## Data Sufficiency Policy
- Data is considered sufficient for global generic models in the initial target competitions
- Data is likely sufficient for `league_specific` exploration in:
  - Premier League
  - La Liga
  - Bundesliga
  - Serie A
  - Ligue 1
- Data sufficiency is uncertain and must be proven for:
  - Primeira Liga
  - Eredivisie
  - Belgian Pro League
  - Europa Conference League
- Data is considered insufficient in V1 for:
  - `club_specific`
  - `club_by_league_specific`

## League-Specific Activation Principle
- `global` is always available
- `league_specific` can be activated only when:
  - historical volume is sufficient
  - feature completeness is sufficient
  - out-of-sample metrics beat the global baseline
  - calibration does not degrade

## Success Criteria
- No silent fallback due to missing artifacts
- No heuristic output persisted as official ML output
- Training and inference consume the same feature schema
- All supported markets expose coherent labels and evaluators
- Horizons `full`, `5y`, and `3y` are real, not tags only
