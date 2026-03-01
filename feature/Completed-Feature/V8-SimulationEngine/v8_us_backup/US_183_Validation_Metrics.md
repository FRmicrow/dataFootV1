# 👤 US_183: Quant Validation Matrix
**Accountable Agent**: Quant Analyst / ML Agent
**Feature Type**: Computational Metrics
**Mission**: Implement the mathematical framework to settle the Forge results and calculate high-fidelity performance metrics.

---

## 🎯 Strategic Objective
Move beyond simple Accuracy (Win/Loss). We need to determine if our probabilities are "Calibrated" (do results match predicted expectations?) and "Profitable" (would we make money against the bookies?).

## 📋 Technical Blueprint for Agents

### 1. Accuracy & Loss Metrics (Sequential)
Every time a "Forge Month" is completed, calculate:
- **Brier Score**: The mean squared error of our probabilities. Standard benchmark for probability accuracy.
- **Log-Loss**: Penalizes the model heavily for being "confident and wrong."
- **Calibration Curve**: Group predictions into 10% buckets. Verification that for all matches predicted at 80%, exactly 80% resulted in a win.

### 2. ROI Strategy Simulator (The Money Test)
- **Stake Logic**: 1% flat-stake strategy.
- **Trigger**: Bet IF `Model_Probability * Market_Odds > 1.05` (Targeting 5% Edge).
- **Calculation**: 
    - `Profit_Loss = (Stake * Market_Odds) - Stake` on Win.
    - `Profit_Loss = -Stake` on Loss.
- **Output**: Cumulative P/L curve over the season.

### 3. Record Keeping
- Results must be written to `V3_Forge_Monthly_Metrics`.
- The aggregate summary (Total ROI, Max Drawdown) must be written to the `V3_Forge_Simulations.summary_metrics_json` field.

## 🛠️ Technical Requirements
- **Logic**: Implement in `ml-service/analytics.py`.
- **Integrity**: Use `v_market_settlements` as the source of truth for "Actual Winner" and "Bookmaker Lines."

## ✅ Acceptance Criteria
- Simulation summary provides a "Quality Score" (Combined Brier + ROI).
- Users can see which "Probability Buckets" are the most overvalued by the market.
- Maximum Drawdown (the biggest "losing streak" in the simulation) is recorded.
