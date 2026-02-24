# US_141: Implied Probability Engine (Fair Value Conversion)

## Context
Bookmaker odds include a "margin" or "overround" (the vig), which means raw implied probabilities ($1/odds$) sum to > 100%. To perform accurate ML analysis and value betting detection, we must strip this margin to find the "fair" implied probability.

## Mission
Implement a conversion engine that transforms raw decimal odds into fair-value implied probabilities by removing the bookmaker's margin.

### Core Calculations
1. **Raw Probability**: $P_{raw} = 1 / \text{Decimal Odds}$
2. **Overround (Margin)**: $M = (\sum P_{raw}) - 1$
3. **Fair Probability (Normalization)**: $P_{fair} = P_{raw} / (\sum P_{raw})$

## Technical Plan

### 1. Service Layer (`probabilityService.js`)
Create a utility service to handle mathematical conversions:
- `calculateImpliedProbabilities(oddsObject)`: Takes a set of odds (e.g., `{home: 2.0, draw: 3.4, away: 3.8}`) and returns fair probabilities.
- Handle different market structures:
    - **3-way (1X2)**: Home, Draw, Away.
    - **2-way (BTTS, O/U)**: Over/Under or Yes/No.
    - **Handicaps**: (Optional but recommended).

### 2. Integration with `liveBetService.js`
Update the `getMatchDetails` service to include fair-value probabilities alongside raw odds. This allows the UI to display "Market Confidence" vs "Bookmaker Price".

### 3. Edge Case Handling
- Handle cases where odds might be missing (null).
- Ensure precision (rounding to 4 decimal places).

## Success Criteria
- [ ] Fair probabilities sum to exactly 1.0 (100%).
- [ ] API returns `implied_probabilities` for all tracked markets.
- [ ] Match details UI displays fair probabilities for the 1X2 market.
