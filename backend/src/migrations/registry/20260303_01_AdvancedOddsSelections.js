export const up = async (db) => {
    // 1. V3_Odds_Selections
    // Normalized storage for all market odds with timestamp-based trend tracking
    db.run(`CREATE TABLE IF NOT EXISTS V3_Odds_Selections (
        fixture_id INTEGER NOT NULL,
        bookmaker_id INTEGER NOT NULL,
        market_name TEXT NOT NULL,
        label TEXT NOT NULL,
        odd_value REAL NOT NULL,
        handicap REAL,
        captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (fixture_id, bookmaker_id, market_name, label, captured_at),
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
    )`);

    // 2. Add odds_last_sync to V3_Fixtures for tracking Catch-up status
    try {
        db.run("ALTER TABLE V3_Fixtures ADD COLUMN odds_last_sync DATETIME");
        console.log("✅ Added odds_last_sync column to V3_Fixtures");
    } catch (e) {
        if (!e.message.includes('duplicate column')) {
            console.warn("⚠️ Error adding odds_last_sync to V3_Fixtures:", e.message);
        }
    }

    // 3. Indexes for performance
    db.run('CREATE INDEX IF NOT EXISTS idx_v3_odds_fixture_id ON V3_Odds_Selections(fixture_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_v3_odds_market ON V3_Odds_Selections(market_name)');
};
