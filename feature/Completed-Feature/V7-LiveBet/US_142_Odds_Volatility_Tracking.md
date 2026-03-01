# User Story 142: Odds Volatility & Movement Tracking (Steam Detection)

**Feature Type**: New Capability
**Role**: Data Engineer
**Accountable**: Data Agent

---

## Goal
Identify "Steam" (significant market movement) to detect where "Sharp" money or updated team news is influencing the market.

## Core Task
Build a historical tracking system for odds that compares the "Opening Line" to the "Current Line".

## Functional Requirements
- **Snapshot Frequency**: Capture a snapshot of odds at T-24h, T-6h, T-1h, and Kickoff.
- **Volatility Metric**: Calculate `% change` between snapshots.
- **Directional Trend**: Identify if odds are "Steaming" (dropping fast) or "Drifting" (rising).
- **Signal Generation**: Generate a "Market Alert" for movements > 10% within 1 hour.

## Technical Requirements
- **New Table**: `V3_Odds_History` (id, fixture_id, market_id, odd_value, capture_timestamp).
- **Background Job**: Cron job to snapshot tracked leagues every 4 hours.
- **Optimization**: Only store history for the "Primary" bookmaker (Winamax/Unibet).

## Acceptance Criteria
- UI Match Details show a mini-chart or arrows indicating movement.
- System identifies the "Opening Line" for every fixture.
- Database contains at least 3 snapshots for matches ingested > 24h before kickoff.
- Moving percentages are displayed accurately (e.g., "-12% drop in Home Win odds").
