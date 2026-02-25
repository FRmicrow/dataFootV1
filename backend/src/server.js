import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import db from './config/database.js';
import v3Routes from './routes/v3_routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
await db.init();

// --- DB Migrations ---
const migrations = [
    { table: 'V3_System_Preferences', column: 'tracked_leagues', sql: "ALTER TABLE V3_System_Preferences ADD COLUMN tracked_leagues TEXT DEFAULT '[]'" },
    { table: 'V3_League_Seasons', column: 'imported_events', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN imported_events BOOLEAN DEFAULT 0" },
    { table: 'V3_League_Seasons', column: 'imported_lineups', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN imported_lineups BOOLEAN DEFAULT 0" },
    { table: 'V3_League_Seasons', column: 'imported_trophies', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN imported_trophies BOOLEAN DEFAULT 0" },
    { table: 'V3_League_Seasons', column: 'last_sync_core', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN last_sync_core DATETIME" },
    { table: 'V3_League_Seasons', column: 'last_sync_events', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN last_sync_events DATETIME" },
    { table: 'V3_League_Seasons', column: 'last_sync_lineups', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN last_sync_lineups DATETIME" },
    { table: 'V3_League_Seasons', column: 'last_sync_trophies', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN last_sync_trophies DATETIME" },
    { table: 'V3_League_Seasons', column: 'coverage_fixtures', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN coverage_fixtures BOOLEAN DEFAULT 0" },
    { table: 'V3_League_Seasons', column: 'last_updated', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN last_updated DATETIME" },
    { table: 'V3_Players', column: 'is_trophy_synced', sql: "ALTER TABLE V3_Players ADD COLUMN is_trophy_synced BOOLEAN DEFAULT 0" },
    { table: 'V3_Players', column: 'last_sync_trophies', sql: "ALTER TABLE V3_Players ADD COLUMN last_sync_trophies DATETIME" },
    {
        table: 'V3_Health_Prescriptions',
        column: 'id',
        sql: `CREATE TABLE IF NOT EXISTS V3_Health_Prescriptions (
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
        )`
    },
    { table: 'V3_Leagues', column: 'is_live_enabled', sql: "ALTER TABLE V3_Leagues ADD COLUMN is_live_enabled BOOLEAN DEFAULT 0" },
    {
        table: 'V3_Odds_History',
        column: 'id',
        sql: `CREATE TABLE IF NOT EXISTS V3_Odds_History (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fixture_id INTEGER NOT NULL,
            bookmaker_id INTEGER NOT NULL,
            market_id INTEGER NOT NULL,
            value_home_over REAL,
            value_draw REAL,
            value_away_under REAL,
            handicap_value REAL,
            capture_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    },
    { table: 'V3_Predictions', column: 'edge_value', sql: "ALTER TABLE V3_Predictions ADD COLUMN edge_value REAL" },
    { table: 'V3_Predictions', column: 'confidence_score', sql: "ALTER TABLE V3_Predictions ADD COLUMN confidence_score INTEGER" },
    { table: 'V3_Predictions', column: 'risk_level', sql: "ALTER TABLE V3_Predictions ADD COLUMN risk_level TEXT" },
    {
        table: 'V3_Forge_Simulations',
        column: 'id',
        sql: `CREATE TABLE IF NOT EXISTS V3_Forge_Simulations (
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
        )`
    },
    { table: 'V3_Forge_Simulations', column: 'stage', sql: "ALTER TABLE V3_Forge_Simulations ADD COLUMN stage TEXT" },
    { table: 'V3_Forge_Simulations', column: 'last_heartbeat', sql: "ALTER TABLE V3_Forge_Simulations ADD COLUMN last_heartbeat DATETIME" },
    { table: 'V3_Forge_Simulations', column: 'error_log', sql: "ALTER TABLE V3_Forge_Simulations ADD COLUMN error_log TEXT" },
    // US_260: Import Status Registry
    {
        table: 'V3_Import_Status',
        column: 'id',
        sql: `CREATE TABLE IF NOT EXISTS V3_Import_Status (
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
        )`
    },
    { table: 'V3_Import_Status', column: 'idx_league_season', sql: 'CREATE INDEX IF NOT EXISTS idx_import_status_league_season ON V3_Import_Status(league_id, season_year)' },
    { table: 'V3_Import_Status', column: 'idx_pillar', sql: 'CREATE INDEX IF NOT EXISTS idx_import_status_pillar ON V3_Import_Status(pillar, status)' },
    { table: 'V3_League_Seasons', column: 'imported_fixture_stats', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN imported_fixture_stats BOOLEAN DEFAULT 0" },
    { table: 'V3_League_Seasons', column: 'imported_player_stats', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN imported_player_stats BOOLEAN DEFAULT 0" },
    { table: 'V3_League_Seasons', column: 'last_sync_fixture_stats', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN last_sync_fixture_stats DATETIME" },
    { table: 'V3_League_Seasons', column: 'last_sync_player_stats', sql: "ALTER TABLE V3_League_Seasons ADD COLUMN last_sync_player_stats DATETIME" }
];

console.log('🏗️  Running DB Migrations...');
for (const m of migrations) {
    try {
        db.run(m.sql);
        console.log(`✅ Migration: ${m.column || 'table'} verified/added to ${m.table}`);
    } catch (e) {
        if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
            console.warn(`⚠️ Migration note (${m.table}.${m.column}):`, e.message);
        }
    }
}

// US_260: Back-populate V3_Import_Status from existing boolean flags
try {
    const existingCount = db.get("SELECT COUNT(*) as count FROM V3_Import_Status");
    if (existingCount && existingCount.count === 0) {
        console.log('📋 US_260: Back-populating V3_Import_Status from boolean flags...');
        const seasons = db.all("SELECT * FROM V3_League_Seasons");
        let populated = 0;

        for (const s of seasons) {
            const { league_id, season_year } = s;
            const pillars = [
                {
                    pillar: 'core',
                    status: (s.imported_fixtures && s.imported_standings && s.imported_players) ? 2
                        : (s.imported_fixtures && (!s.imported_standings || !s.imported_players)) ? 1
                            : 0
                },
                { pillar: 'events', status: s.imported_events ? 2 : 0 },
                { pillar: 'lineups', status: s.imported_lineups ? 2 : 0 },
                { pillar: 'trophies', status: s.imported_trophies ? 2 : 0 },
                { pillar: 'fs', status: s.imported_fixture_stats ? 2 : 0 },
                { pillar: 'ps', status: s.imported_player_stats ? 2 : 0 }
            ];

            for (const p of pillars) {
                try {
                    db.run(
                        `INSERT OR IGNORE INTO V3_Import_Status (league_id, season_year, pillar, status)
                         VALUES (?, ?, ?, ?)`,
                        [league_id, season_year, p.pillar, p.status]
                    );
                    populated++;
                } catch (e) { /* unique constraint - skip */ }
            }
        }
        console.log(`✅ US_260: Back-populated ${populated} status entries from ${seasons.length} seasons.`);
    }
} catch (e) {
    console.warn('⚠️ US_260 back-population note:', e.message);
}

// --- P4: Security & Rate Limiting ---

// 1. Rate Limiter (Global)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Generous limit for dashboard/import operations
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please wait a moment.' }
});
app.use(globalLimiter);

// 2. CORS Configuration (Restrict Access)
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL || false
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// API routes (V3)
app.use('/api', v3Routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('❌ Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

import MarketVolatilityService from './services/v3/MarketVolatilityService.js';

// Start server
const server = app.listen(PORT, () => {
    console.log('⚽ Football Player Database API');
    console.log('================================');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite V3 (sql.js)`);
    console.log(`🔑 API: API-Football v3`);
    console.log('================================\n');

    // US_142: Odds Volatility Tracking - Background Job (Every 4 hours)
    setInterval(() => {
        MarketVolatilityService.runGlobalSnapshot().catch(err => console.error("❌ Stats Snapshot Error:", err));
    }, 4 * 60 * 60 * 1000);

    // US_174: Retraining Trigger System - Weekly Cycle (Every Monday at 04:00 AM)
    import('./services/v3/mlService.js').then(module => {
        const mlService = module.default;
        setInterval(() => {
            const now = new Date();
            // Monday search: day 1, hour 4
            if (now.getDay() === 1 && now.getHours() === 4 && now.getMinutes() < 10) {
                console.log("⏰ [US_174] Weekly retraining cycle triggered automatically.");
                mlService.triggerRetraining().catch(err => console.error("❌ Weekly Training Error:", err));
            }
        }, 10 * 60 * 1000); // Check every 10 minutes
    });
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is in use. Trying to kill the process...`);
        // We can't actually kill it easily from here without exec, but we can exit gracefully
        console.error(`⚠️ Port ${PORT} is already busy. Please run: kill -9 $(lsof -t -i:${PORT})`);
        process.exit(1);
    }
});
