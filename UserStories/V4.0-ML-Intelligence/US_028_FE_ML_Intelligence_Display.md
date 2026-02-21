# US_028 - [FE] ML Intelligence Display in Match Cards & Detail Page

## Title
[FE] Display Edge %, Quarter-Kelly, and Model Probabilities in Live Bet UI

## User Story
**As an** Analyst  
**I want** to see the model's edge calculation and stake recommendation directly on the match card and detail page  
**So that** I never have to manually compute value — it's all visible at a glance.

## Acceptance Criteria

### AC 1: Match Card ML Badge (Dashboard)
- **Given** a match card where predictions are available
- **Then** display a compact "Intelligence Badge" with:
  - Model probability for top outcome (e.g., `Home 54%`)
  - Edge label color-coded:
    - 🟢 `+7.1% EDGE` (STRONG ≥ 10%)
    - 🟡 `+5.4% EDGE` (MODERATE 5-10%)
    - 🟠 `+3.2% EDGE` (WEAK 3-5%)
    - ⚫ No badge shown (< 3% = no value)
  - Quarter-Kelly suggestion: `Stake: 2.8%`
- If the ML service is unavailable, the badge is simply hidden (no error shown on card).

### AC 2: Detail Page — Prediction & Intelligence Section
- **Given** the Smart View detail page
- **When** the page loads
- **Then** the "🤖 ML Predictions" card (currently showing API-Football predictions) is **augmented** with a second block:
  ```
  ┌─────────────────────────────────────────────┐
  │  🧠 Internal Model (v3)                      │
  │                                              │
  │  Home    Draw    Away                        │
  │  54%     26%     20%                         │
  │                                              │
  │  📊 Edge vs Winamax Odds                    │
  │  Home: +7.1% ●●●●●○ STRONG                 │
  │  Draw: -1.2% (No value)                     │
  │  Away: -3.2% (No value)                     │
  │                                              │
  │  💰 Quarter-Kelly: 2.8% of bankroll        │
  │  Value bet: HOME (1.85)                     │
  └─────────────────────────────────────────────┘
  ```

### AC 3: Top Features Accordion (Scaffold for Explanation Layer)
- **Given** the prediction block on the detail page
- **Then** include a collapsed `<details>` / expandable accordion: "🔍 Why this prediction?"
- **Inside**: Display the `top_features` array from the prediction response as a simple ranked list (not yet explained in English — scaffold for future LLM explanations in US_029):
  ```
  1. ELO Difference (+14% impact)
  2. Home Team Form (+9% impact)
  3. Away Rest Days (-6% impact)
  ```
- **Label**: "Model v3 · Powered by LightGBM"

### AC 4: Historical Accuracy Tracker (Detail Page Footer)
- **Given** `V3_Predictions` has past records for this league
- **Then** display a compact "Model Track Record" section:
  ```
  Model Performance (PL, 2025-26)
  Bets recommended: 14 | Won: 8 | Lost: 6
  ROI: +6.2% | Accuracy: 57%
  ```
- Data fetched from `GET /api/v3/model/performance?league={id}`.

## Technical Notes
- **Graceful Degradation**: Every ML-related UI block must be wrapped in conditional checks. If `prediction === null`, render nothing. Never display loading errors to the user for ML features.
- **Skeleton Loader**: While the prediction data loads (async, after match data), show a skeleton placeholder for the "🧠 Internal Model" block.
- **Do NOT** remove the API-Football Prediction block. Keep both in the same card — one labeled "API Analysis", one labeled "Internal Model". This lets us compare their accuracy over time.
