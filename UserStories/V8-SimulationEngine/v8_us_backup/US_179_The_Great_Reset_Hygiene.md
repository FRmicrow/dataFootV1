# 👤 US_179: The Great Reset (Data Hygiene)
**Accountable Agent**: SQL Agent / Data Engineer
**Feature Type**: Maintenance / Data Governance
**Mission**: Purge all legacy ML features, stale predictions, and prototype simulation data to ensure the V8 Quant Forge starts with 100% mathematical integrity.

---

## 🎯 Goal
Eliminate "Static" features and legacy model outputs from the database. This prevents "Data Contamination" where the new sequential model accidentally relies on feature vectors calculated with old, non-leakage-proof logic.

## 📋 Instruction for SQL Agent (Step 0.1)
Run the following cleanup sequence on the `database.sqlite` file. Do NOT touch raw fixture, team, player, or odds data.

### 1. Purge Feature Store
```sql
-- Remove all pre-calculated feature vectors.
-- These will be rebuilt using US_181 (Time-Travel) and US_188 (ELO).
DELETE FROM V3_ML_Feature_Store;
VACUUM;
```

### 2. Flush Legacy Predictions
```sql
-- Remove all predictions from previous model versions.
DELETE FROM V3_ML_Predictions;
DELETE FROM V3_Predictions;
```

### 3. Reset Simulation & Backtest Tables
```sql
-- Reset legacy backtesting attempts to prepare for the V8 Simulation Ledger.
DELETE FROM V3_Simulations;
DELETE FROM V3_Backtest_Results;
DELETE FROM V3_Feature_Snapshots; -- If used as temp storage for old ML runs
```

### 4. Sequence Reset (Optional but Recommended)
```sql
-- Reset auto-increment counters for clean logging.
DELETE FROM sqlite_sequence WHERE name IN ('V3_ML_Feature_Store', 'V3_Predictions', 'V3_Simulations');
```

## ✅ Acceptance Criteria
- `SELECT COUNT(*) FROM V3_ML_Feature_Store` returns `0`.
- `SELECT COUNT(*) FROM V3_Predictions` returns `0`.
- Raw match data (`V3_Fixtures`) and Odds data (`V3_Odds`) remain 100% intact.
- Database file size is reduced (via `VACUUM`).
