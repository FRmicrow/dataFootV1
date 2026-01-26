
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');

console.log('🔄 Starting V2 Features Migration...');

async function migrate() {
    const SQL = await initSqlJs();

    if (!existsSync(dbPath)) {
        console.error('❌ Database file not found!');
        process.exit(1);
    }

    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    const schema = `
    -- ==========================================
    -- AUTHENTICATION & USERS
    -- ==========================================
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user', -- 'user', 'admin'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        points INTEGER DEFAULT 0
    );

    -- ==========================================
    -- TROPHY IMPACT & LEGACY (Cache/Metadata)
    -- ==========================================
    -- Storing calculated scores to avoid expensive re-calculations
    CREATE TABLE IF NOT EXISTS player_legacy_scores (
        player_id INTEGER PRIMARY KEY,
        legacy_score REAL,
        trophy_score REAL,
        stats_score REAL,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (player_id) REFERENCES players(id)
    );

    -- ==========================================
    -- PREDICTION GAMES
    -- ==========================================
    CREATE TABLE IF NOT EXISTS prediction_games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        type TEXT NOT NULL, -- 'trophy_war' (who wins more), 'stat_pop' (over/under), 'future_star'
        description TEXT,
        deadline DATETIME NOT NULL,
        status TEXT DEFAULT 'active', -- 'active', 'locked', 'completed'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS prediction_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL, -- 'player' or 'team'
        entity_id INTEGER NOT NULL, -- references players(id) or teams(id)
        target_stat TEXT, -- e.g. 'goals', 'trophies'
        target_value REAL, -- e.g. 15.5 for over/under
        FOREIGN KEY (game_id) REFERENCES prediction_games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        game_id INTEGER NOT NULL,
        selected_option_id INTEGER, -- For multiple choice / A vs B
        predicted_value REAL, -- For exact number predictions
        points_earned INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (game_id) REFERENCES prediction_games(id),
        UNIQUE(user_id, game_id)
    );

    -- ==========================================
    -- HISTORY & TIMELINE
    -- ==========================================
    CREATE TABLE IF NOT EXISTS historical_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_date DATE NOT NULL, -- stored as YYYY-MM-DD
        type TEXT NOT NULL, -- 'trophy', 'debut', 'transfer', 'record', 'match'
        title TEXT NOT NULL,
        description TEXT,
        importance_score INTEGER DEFAULT 1, -- 1-10 for filtering major events
        
        -- Relations to existing entities (optional)
        primary_player_id INTEGER,
        primary_team_id INTEGER,
        
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (primary_player_id) REFERENCES players(id),
        FOREIGN KEY (primary_team_id) REFERENCES teams(id)
    );

    -- Indexing for performance
    CREATE INDEX IF NOT EXISTS idx_historical_date ON historical_events(event_date);
    CREATE INDEX IF NOT EXISTS idx_historical_type ON historical_events(type);
    CREATE INDEX IF NOT EXISTS idx_predictions_game ON user_predictions(game_id);
    CREATE INDEX IF NOT EXISTS idx_predictions_user ON user_predictions(user_id);
    `;

    console.log('⚡ Executing schema updates...');
    db.run(schema);

    // Save
    const data = db.export();
    writeFileSync(dbPath, data);

    console.log('✅ Migration to V2 successful!');
    console.log('   - Added Users table');
    console.log('   - Added Prediction System tables');
    console.log('   - Added Historical Events table');
    console.log('   - Added Legacy Score cache');
}

migrate().catch(console.error);
