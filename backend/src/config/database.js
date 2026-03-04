import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { cleanParams } from '../utils/sqlHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let db;
/**
 * Initialize database connection using better-sqlite3
 * This replaces sql.js to handle large databases (>2GB) and prevent memory leaks.
 */
async function initDatabase() {
    try {
        const defaultDbPath = join(__dirname, '..', '..', 'database.sqlite');
        let dbPath = process.env.DATABASE_PATH || defaultDbPath;

        // If the path is relative, resolve it from the backend root (one level up from src)
        if (process.env.DATABASE_PATH && !process.env.DATABASE_PATH.startsWith('/')) {
            dbPath = join(__dirname, '..', '..', process.env.DATABASE_PATH);
        }

        console.log('🧪 Connecting to SQLite (Native):', dbPath);

        // Open the database file
        db = new Database(dbPath, {
            // verbose: console.log, // Enable for debugging queries
            fileMustExist: false
        });

        // Optimize performance for high-volume imports
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('temp_store = MEMORY');
        db.pragma('cache_size = -1048576'); // 1GB cache for performance
        db.pragma('foreign_keys = ON');

        console.log('🔒 Database connected & optimized (WAL Mode Enabled)');

        return db;
    } catch (err) {
        console.error("❌ Failed to connect to native SQLite:", err);
        throw err;
    }
}

/**
 * Wrapper for the legacy sql.js 'run' method
 */
function run(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    const sanitized = Array.isArray(params) ? cleanParams(params) : params;
    const info = db.prepare(sql).run(sanitized);
    return { lastInsertRowid: info.lastInsertRowid, changes: info.changes };
}

/**
 * Wrapper for the legacy sql.js 'get' method
 */
function get(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    const sanitized = Array.isArray(params) ? cleanParams(params) : params;
    return db.prepare(sql).get(sanitized);
}

/**
 * Wrapper for the legacy sql.js 'all' method
 */
function all(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    const sanitized = Array.isArray(params) ? cleanParams(params) : params;
    return db.prepare(sql).all(sanitized);
}

/**
 * Wrapper for querying multiple results
 */
function query(sql, params = []) {
    return all(sql, params);
}

/**
 * Empty 'save' method for backward compatibility.
 * better-sqlite3 persist data on disk automatically.
 */
function saveDatabase() {
    // No-op
}

export default {
    init: initDatabase,
    save: saveDatabase,
    run,
    get,
    all,
    query,
    get db() { return db; }
};

