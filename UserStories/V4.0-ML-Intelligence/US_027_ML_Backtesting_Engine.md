# US_027 - [ML/Python] Walk-Forward Backtesting Engine

## Title
[ML/Python] Build Walk-Forward Backtesting Engine with ROI and Calibration Tracking

## User Story
**As a** Model Evaluator  
**I want** to run a time-correct, walk-forward backtest of the model on historical data  
**So that** I can see the true historical ROI, detect overfitting, and know how many real "value bets" the model would have found.

## Acceptance Criteria

### AC 1: Walk-Forward Protocol (Non-Negotiable Rules)
1. **No data shuffle.** Data is always ordered chronologically.
2. **Training window**: All matches from `start_date` to `cutoff_date`.
3. **Test window**: Matches from `cutoff_date` to `cutoff_date + 3 months`.
4. **Walk forward**: After each test window, advance `cutoff_date` by 3 months and retrain.
5. **Minimum training size**: Skip period if `< 500 samples` in training window.

### AC 2: Backtest CLI Interface
```bash
# Run backtest for Premier League (ID 39), from 2022-08-01
python -m backtesting.engine --league 39 --from 2022-08-01

# Run for all leagues with historical data
python -m backtesting.engine --league all --from 2022-08-01
```

### AC 3: Bet Simulation Logic
For each match in the test window:
1. Compute `model_prob` for each outcome (1/X/2).
2. Compute `edge` vs bookmaker odds (from `V3_Odds`).
3. If `edge >= 0.05` (5% threshold), place a simulated bet.
4. Calculate `pnl = (QK_stake * odds) - QK_stake` if won, `-QK_stake` if lost.

**Stake**: Always use `Quarter-Kelly` (see US_026). For backtesting, use a **simulated starting bankroll of 1000 units**.

### AC 4: Backtest Metrics Output
```json
{
  "league": "Premier League",
  "period": "2022-08-01 to 2026-01-31",
  "total_matches_evaluated": 1440,
  "value_bets_identified": 234,
  "value_bet_rate": "16.3%",
  "bets_won": 128,
  "bets_lost": 106,
  "win_rate": "54.7%",
  "roi": "+12.4%",
  "max_drawdown": "-18.2%",
  "starting_bankroll": 1000,
  "ending_bankroll": 1124,
  "calibration": {
    "brier_score": 0.218,
    "log_loss": 0.921
  }
}
```

### AC 5: Results Storage
- **Given** a completed backtest
- **Then** save results to `V3_Backtest_Results` in SQLite (via Node endpoint `POST /api/v3/admin/backtest/save`):
  ```sql
  CREATE TABLE V3_Backtest_Results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER,
    model_version INTEGER,
    period_start DATE,
    period_end DATE,
    total_bets INTEGER,
    win_rate REAL,
    roi REAL,
    max_drawdown REAL,
    brier_score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **And** the results are viewable in the React Admin/Model Page.

## Technical Notes
- **"Matches without odds" handling**: Skip fixtures with no odds in `V3_Odds`. Mark them as `NOT_EVALUATED` in output, not failures.
- **Overfitting detector**: If `roi_test >> roi_train` consistently, flag as "potential overfitting — review your features".
- **Benchmark**: Always compute a `naive_roi` — i.e., what would happen if we bet on the bookmaker's implied favourite for every match. Our model must beat this.
