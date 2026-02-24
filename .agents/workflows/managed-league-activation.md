---
description: Forge Managed League Activation (4-Step Pipeline)
---

This workflow describes the end-to-end process of activating a new competition in the Forge Simulation Engine, transforming a raw API-Football entry into a Forge-Certified, profitable quantitative module.

### Step 1: Raw Data Ingestion (Vault Extraction)
- **Objective**: Populate the local SQLite database with core entities.
- **Process**: 
    - Sync all `Teams` and `Venues`.
    - Sync historical `Fixtures` and `Results` (last 5 years).
    - Establish `League_Seasons` trackers.
- **Tool**: `deepSyncService.js` -> `runImportJob`.

### Step 2: Forge Feature Backfill (Intelligence Layer)
- **Objective**: Generate Leak-Proof Feature Vectors.
- **Process**:
    - Run the Python `TemporalFeatureFactory`.
    - Calculate ELO, Momentum, and Quality Indexes for every historical match.
    - Enforce the "Morning-Of" rule (no lookahead bias).
- **Tool**: `ml-service/forge_backfill.py --league ID`.

### Step 3: Quant Calibration (Specialized Training)
- **Objective**: Create a league-specific AI model.
- **Process**:
    - Train a specialized `RandomForestClassifier` on the backfilled features.
    - Validate via Walk-Forward Replay.
    - Save the model as `model_1x2_league_ID.joblib`.
- **Tool**: `ml-service/train_1x2.py --league ID`.

---
// turbo-all
**Activation Command (Batch Mode)**:
To activate the Top-5 European leagues in one go:
`npm run forge:activate -- --leagues 1,2,3,4,5`
