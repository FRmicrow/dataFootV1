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
try {
    db.run("ALTER TABLE V3_System_Preferences ADD COLUMN tracked_leagues TEXT DEFAULT '[]'");
    console.log('🔄 Migration: tracked_leagues column added to V3_System_Preferences');
} catch (e) {
    // Column likely already exists — ignore safely
    if (!e.message?.includes('duplicate column')) {
        console.warn('Migration note (tracked_leagues):', e.message);
    }
}

// --- ML Intelligence Tables (V4.0 — US_025, US_026, US_027) ---
try {
    db.run(`
        CREATE TABLE IF NOT EXISTS V3_ML_Models (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            model_type  TEXT    NOT NULL,
            version     INTEGER NOT NULL,
            file_path   TEXT,
            log_loss    REAL,
            brier_score REAL,
            accuracy    REAL,
            roi_backtest REAL,
            is_active   INTEGER DEFAULT 0,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS V3_ML_Predictions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            fixture_id    INTEGER NOT NULL,
            model_version INTEGER,
            prob_home     REAL,
            prob_draw     REAL,
            prob_away     REAL,
            edge_home     REAL,
            edge_draw     REAL,
            edge_away     REAL,
            value_bet     TEXT,
            quarter_kelly REAL,
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS V3_Backtest_Results (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            league_id    INTEGER,
            model_version INTEGER,
            period_start DATE,
            period_end   DATE,
            total_bets   INTEGER,
            win_rate     REAL,
            roi          REAL,
            max_drawdown REAL,
            brier_score  REAL,
            created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS V3_ML_Feature_Store (
            fixture_id     INTEGER PRIMARY KEY,
            league_id      INTEGER NOT NULL,
            feature_vector TEXT NOT NULL,
            calculated_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id) ON DELETE CASCADE
        )
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_ml_store_league ON V3_ML_Feature_Store(league_id)`);

    console.log('✅ ML intelligence tables ensured (V3_ML_Models, V3_ML_Predictions, V3_Backtest_Results, V3_ML_Feature_Store)');
} catch (e) {
    console.warn('ML table migration note:', e.message);
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

// Start server
const server = app.listen(PORT, () => {
    console.log('⚽ Football Player Database API');
    console.log('================================');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: SQLite V3 (sql.js)`);
    console.log(`🔑 API: API-Football v3`);
    console.log('================================\n');
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is in use. Trying to kill the process...`);
        // We can't actually kill it easily from here without exec, but we can exit gracefully
        console.error(`⚠️ Port ${PORT} is already busy. Please run: kill -9 $(lsof -t -i:${PORT})`);
        process.exit(1);
    }
});
