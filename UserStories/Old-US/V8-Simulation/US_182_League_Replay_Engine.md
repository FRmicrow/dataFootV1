# US_182: League Replay Engine

## Mission
Create a chronological simulation engine that "replays" a specific league/season match by match.

## Mission Details
1. **Chronological Loop**: Order fixtures by date.
2. **Step Execution**:
    - For each fixture:
    - Extract features (US_181).
    - Request Inference from ML Service.
    - Evaluate Betting Strategy (Kelly, Flat, etc.).
    - Record Simulation Result (US_180).
3. **State Management**: Track bankroll and strategy performance over time.

## Success Criteria
- [ ] Ability to run a full season replay (380 matches for PL) in under 1 minute.
- [ ] Reproducible results.
