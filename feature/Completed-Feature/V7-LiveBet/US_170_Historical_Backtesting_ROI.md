# User Story 170: Historical Backtesting & ROI Engine

**Feature Type**: New Capability
**Role**: MLE / Data Engineer
**Accountable**: Data Agent

---

## Goal
Validate the model's profitability and strategy viability using historical data simulations.

## Core Task
Build a "Strategy Simulator" that applies theoretical bets to historical results and calculates cumulative ROI.

## Functional Requirements
- **Strategy Definition**: Allow filtering of simulations (e.g., "All Home Wins with Edge > 5%").
- **ROI Calculation**: Calculate `(Total Return / Total Stake) - 1`.
- **Drawdown Analysis**: Identify the largest peak-to-trough decline in the simulation's bankroll.
- **Reporting**: Group ROI by:
    - League
    - Market (1X2 vs O/U)
    - Odd Range (favorites vs underdogs)
- **Time Window**: Support simulations over 1 month, 6 months, and 1 year.

## Technical Requirements
- **View Integration**: Use `v_market_settlements` as the source of truth for results.
- **Performance**: Simulation should be optimized (avoiding N+1 queries) to run in under 5 seconds.
- **Charting**: Export simulation data points for a "Growth Curve" chart.

## Acceptance Criteria
- User can see which leagues have the most profitable "Edge Detection".
- The system correctly handles "Lost" and "Won" outcomes in ROI calculation.
- Backtesting ignores fixtures where no odds were recorded (to maintain realism).
- ROI data is visible in the Intelligence Hub.
