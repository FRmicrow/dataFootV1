import db from '../config/database.js';

async function fixOddsSchema() {
    console.log("🛠️ Fixing V3_Odds schema to flattened format...");

    try {
        await db.init();
        await db.run("DROP TABLE IF EXISTS V3_Odds;");

        await db.run(`
            CREATE TABLE V3_Odds (
                fixture_id INTEGER NOT NULL,
                bookmaker_id INTEGER NOT NULL,
                market_id INTEGER NOT NULL,
                value_home_over REAL,
                value_draw REAL,
                value_away_under REAL,
                handicap_value REAL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (fixture_id, bookmaker_id, market_id),
                FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
            );
        `);

        console.log("✅ V3_Odds schema updated successfully.");
    } catch (err) {
        console.error("❌ Failed to update V3_Odds schema:", err);
    }
}

fixOddsSchema();
