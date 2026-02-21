# US_026 - [ML/Node] Edge Calculation, Quarter-Kelly & Prediction Serving

## Title
[ML/Node] Compute Betting Edge, Quarter-Kelly Stake, and Serve Predictions via Node API

## User Story
**As an** Analyst  
**I want** the system to calculate the true betting edge against bookmaker odds and suggest a Quarter-Kelly stake  
**So that** I can make informed, data-driven decisions with full transparency on model confidence and expected value.

## Acceptance Criteria

### AC 1: The Prediction Flow (Node ↔ Python)
```
React (match card click)
    ↓
Node GET /api/v3/live-bet/match/:id/prediction
    ↓
Node fetches: fixtureData, bookmaker odds from V3_Odds or API
    ↓
Node calls: POST http://localhost:5050/predict (with feature payload)
    ↓
Python returns calibrated probabilities
    ↓
Node computes: edge, quarter-kelly, confidence
    ↓
Node returns full JSON to React
```

### AC 2: `/predict` Python Endpoint Contract
**Request (Node → Python):**
```json
{
  "fixture_id": 12345,
  "features": {
    "elo_home": 1614,
    "elo_away": 1543,
    "elo_diff": 71,
    "home_form_pts": 2.1,
    "away_form_pts": 1.4,
    "home_goal_diff_5": 3,
    "away_goal_diff_5": -2,
    "home_rest_days": 7,
    "away_rest_days": 4,
    "home_over25_rate": 0.6,
    "away_over25_rate": 0.4,
    "odds_home": 1.85,
    "odds_draw": 3.50,
    "odds_away": 4.20
  }
}
```

**Response (Python → Node):**
```json
{
  "model_version": 3,
  "target": "1x2",
  "probabilities": {
    "home": 0.54,
    "draw": 0.26,
    "away": 0.20
  },
  "top_features": [
    { "feature": "elo_diff", "impact": 0.14 },
    { "feature": "home_form_pts", "impact": 0.09 },
    { "feature": "away_rest_days", "impact": -0.06 }
  ]
}
```

### AC 3: Edge Calculation (Node computes this, not Python)
```javascript
// Remove bookmaker margin first
const rawImplied = { home: 1/odds_home, draw: 1/odds_draw, away: 1/odds_away };
const margin = rawImplied.home + rawImplied.draw + rawImplied.away; // e.g., 1.04
const trueImplied = {
  home: rawImplied.home / margin,
  draw: rawImplied.draw / margin,
  away: rawImplied.away / margin
};

// Edge = our model prob - bookmaker true implied prob
const edge = {
  home: (modelProbs.home - trueImplied.home).toFixed(4),   // e.g., 0.0712  = 7.12% edge
  draw: (modelProbs.draw - trueImplied.draw).toFixed(4),
  away: (modelProbs.away - trueImplied.away).toFixed(4)
};
```

### AC 4: Quarter-Kelly Stake Calculation
```javascript
// Kelly Criterion: f* = (p * b - q) / b
// where p = model_prob, q = 1 - p, b = decimal_odds - 1
// Quarter-Kelly = f* / 4 (safety multiplier)

const kellyStake = (p, b) => {
  const q = 1 - p;
  const raw = (p * b - q) / b;
  if (raw <= 0) return 0; // No bet suggested
  return Math.min(raw / 4, 0.05); // Max 5% of bankroll as hard cap
};
```
**Rule**: If `edge <= 0.03` (less than 3%), `quartKelly = 0` (no value bet detected, do not output a recommendation).

### AC 5: Final Node API Response to React
```json
{
  "fixture_id": 12345,
  "prediction": {
    "model_version": 3,
    "probabilities": { "home": 0.54, "draw": 0.26, "away": 0.20 },
    "top_market": "home",
    "confidence": "HIGH"
  },
  "edge": {
    "home": 0.071,
    "draw": -0.012,
    "away": -0.032,
    "value_bet": "home"
  },
  "stakes": {
    "home_quarter_kelly": 0.028,
    "recommendation": "2.8% of bankroll"
  },
  "bookmaker": {
    "odds_home": 1.85,
    "odds_draw": 3.50,
    "odds_away": 4.20,
    "source": "Winamax"
  }
}
```

### AC 6: Confidence Classification
```
Edge > 10%  → STRONG
Edge 5–10%  → MODERATE
Edge 3–5%   → WEAK
Edge < 3%   → NO VALUE (do not display a bet recommendation)
```

## Technical Notes
- **Store Every Prediction**: Insert each prediction call into the `V3_Predictions` table in SQLite (via Node, after calling Python). This builds the historical accuracy log automatically.
  ```sql
  CREATE TABLE V3_Predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER,
    model_version INTEGER,
    prob_home REAL, prob_draw REAL, prob_away REAL,
    edge_home REAL, edge_draw REAL, edge_away REAL,
    value_bet TEXT,
    quarter_kelly REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  ```
- **Idempotency**: If a prediction for `(fixture_id, model_version)` already exists, return it from DB (no re-call to Python). This saves API rate and ensures consistency for past analysis.
