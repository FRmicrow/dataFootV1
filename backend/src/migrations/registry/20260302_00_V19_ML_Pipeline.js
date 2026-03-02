export const up = async (db) => {
    // 1. V3_Fixture_Lineup_Players
    // Stores normalized lineup data and substitution minutes
    db.run(`CREATE TABLE IF NOT EXISTS V3_Fixture_Lineup_Players (
        fixture_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        player_id INTEGER NOT NULL,
        is_starting INTEGER NOT NULL DEFAULT 0,
        shirt_number INTEGER,
        player_name TEXT,
        position TEXT,
        grid TEXT,
        sub_in_minute INTEGER,
        sub_out_minute INTEGER,
        PRIMARY KEY (fixture_id, team_id, player_id),
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
    )`);

    // 2. V3_Team_Features_PreMatch
    // Stores calculated features for a team at the moment of a specific fixture
    db.run(`CREATE TABLE IF NOT EXISTS V3_Team_Features_PreMatch (
        fixture_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        feature_set_id TEXT NOT NULL, -- e.g., 'BASELINE_V1', 'PROCESS_V1'
        horizon_type TEXT NOT NULL,   -- e.g., 'FULL_HISTORICAL', '5Y_ROLLING'
        as_of DATETIME NOT NULL,
        features_json TEXT NOT NULL,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (fixture_id, team_id, feature_set_id, horizon_type),
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
    )`);

    // 3. V3_Submodel_Outputs
    // Stores intermediate predictions from submodels (HT, Corners, Cards)
    db.run(`CREATE TABLE IF NOT EXISTS V3_Submodel_Outputs (
        fixture_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        model_type TEXT NOT NULL,     -- e.g., 'HT_RESULT', 'CORNERS_TOTAL'
        prediction_json TEXT NOT NULL,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (fixture_id, team_id, model_type),
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
    )`);

    // 4. V3_ML_Feature_Store_V2
    // Final dataset for meta-model training/inference (Match vector)
    db.run(`CREATE TABLE IF NOT EXISTS V3_ML_Feature_Store_V2 (
        fixture_id INTEGER NOT NULL,
        league_id INTEGER NOT NULL,
        feature_set_id TEXT NOT NULL, -- e.g., 'META_V1'
        target TEXT NOT NULL,         -- e.g., '1N2', 'BTTS'
        horizon_type TEXT NOT NULL,
        schema_version INTEGER NOT NULL DEFAULT 1,
        feature_vector TEXT NOT NULL, -- JSON vector
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (fixture_id, feature_set_id, target, horizon_type, schema_version),
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
    )`);

    // 5. V3_Model_Registry
    // Tracks model artifacts and active versions
    db.run(`CREATE TABLE IF NOT EXISTS V3_Model_Registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        type TEXT NOT NULL,           -- 'SUBMODEL', 'METAMODEL'
        path TEXT,                    -- Path to .bin or .pkl
        is_active INTEGER DEFAULT 0,
        metadata_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, version)
    )`);

    // 6. V3_Training_Runs
    // History of training executions and their performance
    db.run(`CREATE TABLE IF NOT EXISTS V3_Training_Runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_registry_id INTEGER,
        config_json TEXT,
        metrics_json TEXT,
        status TEXT DEFAULT 'PENDING',
        is_champion INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY (model_registry_id) REFERENCES V3_Model_Registry(id)
    )`);

    // 7. V3_ML_Predictions
    // Final predictions with risk engine metadata
    db.run(`CREATE TABLE IF NOT EXISTS V3_ML_Predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixture_id INTEGER NOT NULL,
        model_registry_id INTEGER,
        feature_set_id TEXT,
        horizon_type TEXT,
        prediction_json TEXT NOT NULL,
        confidence_score REAL,
        risk_status TEXT,             -- e.g., 'SAFE', 'HIGH_RISK', 'BLOCKED'
        stake_amount REAL,
        schema_version INTEGER DEFAULT 1,
        is_valid INTEGER DEFAULT 1,
        data_completeness_tag TEXT,   -- e.g., 'POST_LINEUP', 'PRE_LINEUP'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
        FOREIGN KEY (model_registry_id) REFERENCES V3_Model_Registry(id)
    )`);

    // 8. Alterations
    // Numerical possession for ML calculations
    try {
        db.run("ALTER TABLE V3_Fixture_Stats ADD COLUMN ball_possession_pct INTEGER");
    } catch (e) {
        if (!e.message.includes('duplicate column')) throw e;
    }

    // 9. Indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_ml_features_prematch_team ON V3_Team_Features_PreMatch(team_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_ml_predictions_fixture ON V3_ML_Predictions(fixture_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_v3_fixture_lineup_players_team ON V3_Fixture_Lineup_Players(team_id)');
};
