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
