import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import MarketVolatilityService from './services/v3/MarketVolatilityService.js';
import db from './config/database.js';
import v3Routes from './routes/v3_routes.js';
import MigrationService from './services/v3/MigrationService.js';
import SimulationQueueService from './services/v3/SimulationQueueService.js';
import logger from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
await db.init();

// Initialize Simulation Queue (after DB)
await SimulationQueueService.init();
// --- DB Migrations (US-161) ---
await MigrationService.runPending().catch(err => {
    logger.error({ err }, '❌ Critical Migration Error');
    process.exit(1);
});

// --- P4: Security & Performance (US-165) ---

// 1. Security Headers - Allow cross-origin resources for the Vite proxy
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// 2. Compression
app.use(compression());

// 3. Rate Limiter (2000 req/min — sufficient for internal scripts + UI usage)
const globalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Rate limit exceeded (2000 req/min). Please slow down.' }
});
app.use(globalLimiter);

// 4. CORS Configuration - Allow localhost even in "production" (Docker) if FRONTEND_URL is not set
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || localhostOriginPattern.test(origin)) {
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
    logger.info({ method: req.method, path: req.path }, 'request');
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
    logger.error({ err, method: req.method, path: req.path }, '❌ Server error');
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, async () => {
    logger.info('⚽ Football Player Database API');
    logger.info('================================');
    logger.info(`🚀 Server running on http://localhost:${PORT}`);
    logger.info('📊 Database: PostgreSQL (node-postgres)');
    logger.info('🔑 API: API-Football v3');
    logger.info('================================');

    // US_142: Odds Volatility Tracking - Background Job (Every 4 hours)
    setInterval(() => {
        MarketVolatilityService.runGlobalSnapshot().catch(err => logger.error({ err }, '❌ Stats Snapshot Error'));
    }, 4 * 60 * 60 * 1000);

    // US_174: Retraining Trigger System - Every Monday at 04:00 AM
    const { default: mlService } = await import('./services/v3/mlService.js');
    cron.schedule('0 4 * * 1', () => {
        logger.info('⏰ [US_174] Weekly retraining cycle triggered automatically.');
        mlService.triggerRetraining().catch(err => logger.error({ err }, '❌ Weekly Training Error'));
    });
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${PORT} is already busy. Please run: kill -9 $(lsof -t -i:${PORT})`);
        process.exit(1);
    }
});
