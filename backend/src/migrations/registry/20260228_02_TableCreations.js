export const up = async (db) => {
    // Health Prescriptions Table
    db.run(`CREATE TABLE IF NOT EXISTS V3_Health_Prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        priority TEXT DEFAULT 'MEDIUM',
        status TEXT DEFAULT 'PENDING',
        target_entity_type TEXT,
        target_entity_id INTEGER,
        description TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME
    )`);

    // Odds History Table
    db.run(`CREATE TABLE IF NOT EXISTS V3_Odds_History (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixture_id INTEGER NOT NULL,
        bookmaker_id INTEGER NOT NULL,
        market_id INTEGER NOT NULL,
        value_home_over REAL,
        value_draw REAL,
        value_away_under REAL,
        handicap_value REAL,
        capture_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Forge Simulations Table
    db.run(`CREATE TABLE IF NOT EXISTS V3_Forge_Simulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        model_id INTEGER,
        status TEXT CHECK(status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')) DEFAULT 'PENDING',
        current_month TEXT,
        total_months INTEGER,
        completed_months INTEGER DEFAULT 0,
        summary_metrics_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        horizon_type TEXT,
        stage TEXT,
        last_heartbeat DATETIME,
        error_log TEXT,
        FOREIGN KEY (model_id) REFERENCES V3_Model_Registry(id) ON DELETE SET NULL
    )`);

    // Import Status Registry
    db.run(`CREATE TABLE IF NOT EXISTS V3_Import_Status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        pillar TEXT NOT NULL CHECK(pillar IN ('core', 'events', 'lineups', 'trophies', 'fs', 'ps')),
        status INTEGER NOT NULL DEFAULT 0 CHECK(status IN (0, 1, 2, 3, 4)),
        consecutive_failures INTEGER DEFAULT 0,
        total_items_expected INTEGER,
        total_items_imported INTEGER DEFAULT 0,
        last_checked_at DATETIME,
        last_success_at DATETIME,
        failure_reason TEXT,
        data_range_start INTEGER,
        data_range_end INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (league_id) REFERENCES V3_Leagues(league_id),
        UNIQUE(league_id, season_year, pillar)
    )`);

    // Indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_import_status_league_season ON V3_Import_Status(league_id, season_year)');
    db.run('CREATE INDEX IF NOT EXISTS idx_import_status_pillar ON V3_Import_Status(pillar, status)');
};
