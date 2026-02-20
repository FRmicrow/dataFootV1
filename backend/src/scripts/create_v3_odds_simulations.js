import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting V3 Odds & Simulations Schema Migration...');

    // 1. V3_Odds Table
    console.log('\n--- 1. Creating V3_Odds ---');
    db.run(`
        CREATE TABLE IF NOT EXISTS V3_Odds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fixture_id INTEGER NOT NULL,
            bookmaker_id INTEGER NOT NULL,
            market_id INTEGER NOT NULL,
            value_home_over REAL,
            value_draw REAL,
            value_away_under REAL,
            handicap_value REAL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
        );
    `);

    // Composite Unique Index (handling NULL handicap via partial indexes for robustness, or just standard unique if simple)
    // To properly support UPSERT on (fixture, bookmaker, market), we should ideally treat NULL handicap as a distinct value '0' or handle via application logic.
    // However, SQLite UNIQUE constraint allows multiple NULLs.
    // For now, we will add a standard unique index and deal with NULLs via application logic (or partial index if needed later).
    // Actually, let's use a partial index approach to enforce uniqueness properly.

    // Case 1: Handicap is NULL (e.g. 1N2)
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_odds_unique_null ON V3_Odds(fixture_id, bookmaker_id, market_id) WHERE handicap_value IS NULL`);

    // Case 2: Handicap has value (e.g. Asian Handicap)
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_odds_unique_value ON V3_Odds(fixture_id, bookmaker_id, market_id, handicap_value) WHERE handicap_value IS NOT NULL`);

    console.log('✅ V3_Odds table and unique indexes created.');

    // 2. V3_Simulations Table
    console.log('\n--- 2. Creating V3_Simulations ---');
    db.run(`
        CREATE TABLE IF NOT EXISTS V3_Simulations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            strategy_name TEXT NOT NULL,
            fixture_id INTEGER NOT NULL,
            bet_type TEXT NOT NULL, -- '1', 'N', '2', 'Over', 'Under'
            odds_used REAL,
            stake REAL,
            pnl REAL,
            status TEXT, -- 'WON', 'LOST', 'VOID'
            simulation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
        );
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_v3_simulations_fixture ON V3_Simulations(fixture_id)`);
    console.log('✅ V3_Simulations table created.');

    // 3. Update V3_Fixtures
    console.log('\n--- 3. Updating V3_Fixtures (has_odds) ---');

    // Check if column exists
    const columns = db.exec("PRAGMA table_info(V3_Fixtures)")[0].values;
    const hasOddsExists = columns.some(col => col[1] === 'has_odds'); // col[1] is name

    if (!hasOddsExists) {
        db.run(`ALTER TABLE V3_Fixtures ADD COLUMN has_odds BOOLEAN DEFAULT 0`);
        console.log('✅ Added has_odds column to V3_Fixtures.');
    } else {
        console.log('⏭️  has_odds column already exists.');
    }

    // Index on has_odds
    db.run(`CREATE INDEX IF NOT EXISTS idx_v3_fixtures_has_odds ON V3_Fixtures(has_odds)`);
    console.log('✅ Created idx_v3_fixtures_has_odds.');

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Done!');
    db.close();
}

run().catch(console.error);
