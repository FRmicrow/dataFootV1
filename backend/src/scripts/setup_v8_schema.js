import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

console.log('🏁 Starting V8 Simulation Framework Schema Migration...');

// 1. V3_ML_Models Table
console.log('\n--- 1. Creating V3_ML_Models ---');
db.run(`
    CREATE TABLE IF NOT EXISTS V3_ML_Models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        target TEXT NOT NULL, -- '1X2', 'OU25', 'BTTS'
        features_hash TEXT,
        metrics_json TEXT, -- Accuracy, Log-loss at training time
        path TEXT, -- Local path to model file
        is_active INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, version)
    );
`);

// 2. V3_Predictions Table
console.log('\n--- 2. Creating V3_Predictions ---');
db.run(`
    CREATE TABLE IF NOT EXISTS V3_Predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixture_id INTEGER NOT NULL,
        model_id INTEGER DEFAULT 1,
        league_id INTEGER,
        season INTEGER,
        winner_id INTEGER,
        winner_name TEXT,
        winner_comment TEXT,
        prob_home REAL,
        prob_draw REAL,
        prob_away REAL,
        prob_over REAL,
        prob_under REAL,
        goals_home TEXT,
        goals_away TEXT,
        advice TEXT,
        edge_value REAL,
        confidence_score INTEGER,
        risk_level TEXT,
        outcome_result TEXT DEFAULT 'PENDING',
        prediction_data_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE,
        UNIQUE(fixture_id, model_id)
    );
`);

// Insert Default API-Football Model (id=1) if not exists
db.run(`
    INSERT OR IGNORE INTO V3_ML_Models (id, name, version, target, is_active)
    VALUES (1, 'API-Football Baseline', '1.0.0', '1X2', 1)
`);


// 3. Update V3_Simulations
console.log('\n--- 3. Updating V3_Simulations ---');

// Check if model_id exists in V3_Simulations
const columns = db.exec("PRAGMA table_info(V3_Simulations)")[0].values;
const modelIdExists = columns.some(col => col[1] === 'model_id');

if (!modelIdExists) {
    // SQLite doesn't support adding FK in ALTER TABLE easily for some versions, 
    // but we can add the column.
    db.run(`ALTER TABLE V3_Simulations ADD COLUMN model_id INTEGER REFERENCES V3_ML_Models(id)`);
    console.log('✅ Added model_id column to V3_Simulations.');
}

// Add kelly_criterion column
const kellyExists = columns.some(col => col[1] === 'kelly_criterion');
if (!kellyExists) {
    db.run(`ALTER TABLE V3_Simulations ADD COLUMN kelly_criterion REAL`);
    console.log('✅ Added kelly_criterion column to V3_Simulations.');
}

// Save
console.log('\n💾 Saving Database...');
const data = db.export();
writeFileSync(dbPath, Buffer.from(data));
console.log('🎉 V8 Schema Ready!');
db.close();
