
import db from '../config/database.js';

const up = async () => {
    console.log("🛠️ Starting Migration: Create V3_Odds and V3_Simulations...");

    try {
        // 1. Create V3_Odds
        db.run(`
            CREATE TABLE IF NOT EXISTS V3_Odds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fixture_id INTEGER NOT NULL,
                bookmaker_id INTEGER,
                market_id INTEGER,
                value_home_over REAL,
                value_draw REAL,
                value_away_under REAL,
                handicap_value REAL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fixture_id, bookmaker_id, market_id, handicap_value)
            );
        `);
        console.log("✅ Table V3_Odds created.");

        // Index for performance
        db.run(`CREATE INDEX IF NOT EXISTS idx_odds_fixture ON V3_Odds(fixture_id);`);

        // 2. Create V3_Simulations
        db.run(`
            CREATE TABLE IF NOT EXISTS V3_Simulations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                strategy_name TEXT,
                fixture_id INTEGER,
                bet_type TEXT,
                odds_used REAL,
                stake REAL,
                pnl REAL,
                status TEXT,
                simulation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(fixture_id) REFERENCES V3_Fixtures(fixture_id)
            );
        `);
        console.log("✅ Table V3_Simulations created.");

        // 3. Add has_odds to V3_Fixtures
        // SQLite doesn't support IF NOT EXISTS for columns, duplicate column error is harmless if caught, 
        // or we check pragma. Simple approach: Try/Catch the ALTER.
        try {
            db.run(`ALTER TABLE V3_Fixtures ADD COLUMN has_odds BOOLEAN DEFAULT 0;`);
            console.log("✅ Column 'has_odds' added to V3_Fixtures.");
        } catch (err) {
            if (err.message.includes("duplicate column")) {
                console.log("ℹ️ Column 'has_odds' already exists.");
            } else {
                throw err;
            }
        }

        db.run(`CREATE INDEX IF NOT EXISTS idx_fixtures_has_odds ON V3_Fixtures(has_odds);`);

        console.log("🎉 Migration US_013 Complete.");

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    }
};

const run = async () => {
    try {
        console.log("🔌 Connecting to DB...");
        await db.init();
        await up();
    } catch (err) {
        console.error("❌ Fatal Error:", err);
    }
};

run();
