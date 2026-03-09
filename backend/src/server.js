import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import db from './config/database.js';
import v3Routes from './routes/v3_routes.js';
import MigrationService from './services/v3/MigrationService.js';
import SimulationQueueService from './services/v3/SimulationQueueService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
await db.init();

// Initialize Simulation Queue (after DB)
await SimulationQueueService.init();
// --- DB Migrations (US-161) ---
await MigrationService.runPending().catch(err => {
    console.error('❌ Critical Migration Error:', err);
    process.exit(1);
});

// --- P4: Security & Performance (US-165) ---

// 1. Security Headers - Allow cross-origin resources for the Vite proxy
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Compression
app.use(compression());

// 3. Rate Limiter (Data Import Friendly: 450 req/min)
const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 450,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded (450 req/min). Please slow down.' }
});
app.use(globalLimiter);

// 4. CORS Configuration - Allow localhost even in "production" (Docker) if FRONTEND_URL is not set
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
});


// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

import MarketVolatilityService from './services/v3/MarketVolatilityService.js';

// Start server
const server = app.listen(PORT, async () => {
    console.log('⚽ Football Player Database API');
    console.log('================================');
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: PostgreSQL (node-postgres)`);
    console.log(`🔑 API: API-Football v3`);
    console.log('================================\n');

    // US_142: Odds Volatility Tracking - Background Job (Every 4 hours)
    setInterval(() => {
        MarketVolatilityService.runGlobalSnapshot().catch(err => console.error("❌ Stats Snapshot Error:", err));
    }, 4 * 60 * 60 * 1000);

    // US_174: Retraining Trigger System - Weekly Cycle (Every Monday at 04:00 AM)
    const { default: mlService } = await import('./services/v3/mlService.js');
    setInterval(() => {
        const now = new Date();
        // Monday search: day 1, hour 4
        if (now.getDay() === 1 && now.getHours() === 4 && now.getMinutes() < 10) {
            console.log("⏰ [US_174] Weekly retraining cycle triggered automatically.");
            mlService.triggerRetraining().catch(err => console.error("❌ Weekly Training Error:", err));
        }
    }, 10 * 60 * 1000); // Check every 10 minutes
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`❌ Port ${PORT} is in use. Trying to kill the process...`);
        // We can't actually kill it easily from here without exec, but we can exit gracefully
        console.error(`⚠️ Port ${PORT} is already busy. Please run: kill -9 $(lsof -t -i:${PORT})`);
        process.exit(1);
    }
});
