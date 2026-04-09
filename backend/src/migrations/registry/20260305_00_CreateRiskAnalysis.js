export const up = async (db) => {
    // V3_Risk_Analysis
    // Stores ML predictions results, fair odds, and edge calculations
    await db.run(`CREATE TABLE IF NOT EXISTS V3_Risk_Analysis (
        id SERIAL PRIMARY KEY,
        fixture_id INTEGER NOT NULL,
        market_type TEXT NOT NULL,    -- e.g., '1N2_FT', '1N2_HT', 'BTTS'
        selection TEXT NOT NULL,      -- e.g., '1', 'N', '2', 'YES', 'NO'
        ml_probability REAL,          -- Predicted probability (0-1)
        fair_odd REAL,                -- 1 / ml_probability
        bookmaker_odd REAL,           -- Current best bookmaker odd
        edge REAL,                    -- (bookmaker_odd / fair_odd) - 1 or similar formula
        analyzed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
        UNIQUE(fixture_id, market_type, selection)
    )`);

    // Indexes for the ML Hub performance
    await db.run('CREATE INDEX IF NOT EXISTS idx_risk_analysis_fixture ON V3_Risk_Analysis(fixture_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_risk_analysis_market ON V3_Risk_Analysis(market_type)');
};
