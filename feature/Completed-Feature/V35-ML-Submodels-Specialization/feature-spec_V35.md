# Feature Specification: V35 - ML Submodels Specialization

## Vision
Transform the ML Hub from a 1X2 centric engine into a versatile betting intelligence suite by specializing in secondary markets (Corners, Cards) with dedicated feature sets.

## Data Contract

### Corners Features
| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `mom_corners_f_h5` | float | Avg corners earned by home team (last 5) |
| `mom_corners_a_h5` | float | Avg corners conceded by home team (last 5) |
| `pressure_index_h` | float | `(xg_f_h5 / xg_a_h5) * venue_weight` |

### Discipline Features
| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `mom_yellow_h10` | float | Avg yellow cards for home team (last 10) |
| `mom_fouls_h10` | float | Avg fouls committed by home team (last 10) |
| `tension_index` | float | High-stakes game indicator + H2H card history |

## Architecture Refinement

The `TemporalFeatureFactory` will now aggregate specialized adapters depending on the model being trained.
- **Model Forge**: Will now loop through a list of `TargetMarket` definitions.
- **Output**: 3 specialized models per league.

## UI Blueprint
- **Leaderboard**: Accuracy metrics per market.
- **Match View**: Interactive charts for Corner/Card trends.
