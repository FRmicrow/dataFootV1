import pkg from 'pg';
const { Pool, types } = pkg;
import { cleanParams } from '../utils/sqlHelpers.js';
import logger from '../utils/logger.js';

// Configure type parsers to mimic SQLite behavior for backward compatibility
// 16 is the OID for 'bool' in Postgres. Return 1 for true, 0 for false.
types.setTypeParser(16, val => (val === 't' || val === true) ? 1 : 0);
// 20 is the OID for 'int8' (BIGINT). Return as Number to avoid string scientific notation.
types.setTypeParser(20, val => Number.parseInt(val, 10));

let pool;

/**
 * Initialize database connection using node-postgres (pg)
 * This replaces better-sqlite3 to connect to the PostgreSQL Docker container.
 */
async function initDatabase() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is required. Copy backend/.env.example to backend/.env and fill in your credentials.');
    }

    try {
        logger.info({ url: connectionString.replace(/:[^:@]+@/, ':***@') }, '🧪 Connecting to PostgreSQL');

        pool = new Pool({
            connectionString,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Test the connection
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        client.release();

        logger.info({ connectedAt: res.rows[0].now }, '🔒 Database connected successfully to PostgreSQL');

        return pool;
    } catch (err) {
        logger.error({ err }, '❌ Failed to connect to PostgreSQL');
        throw err;
    }
}

/**
 * Helper to convert standard SQL queries with ? to PostgreSQL $1, $2 format
 */
function convertToDollarParams(text) {
    let index = 1;
    return text.replace(/\?/g, () => `$${index++}`);
}

/**
 * Async wrapper for the legacy 'run' method
 * For INSERT/UPDATE/DELETE
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<{lastInsertRowid: number|null, changes: number}>}
 */
async function run(sql, params = []) {
    if (!pool) throw new Error('Database not initialized');
    const sanitized = Array.isArray(params) ? cleanParams(params) : params;
    const pgSql = convertToDollarParams(sql);
    const result = await pool.query(pgSql, sanitized);

    // Attempt to mimic better-sqlite3 return object
    let lastInsertRowid = null;
    if (result.command === 'INSERT' && result.rows.length > 0) {
        // Postgres returns values only if RETURNING is in the query.
        // We take the value of the first column of the first row as the ID.
        const firstRow = result.rows[0];
        const firstColName = Object.keys(firstRow)[0];
        lastInsertRowid = firstRow[firstColName] || null;
    }

    return {
        lastInsertRowid,
        changes: result.rowCount
    };
}

/**
 * Async wrapper for the legacy 'get' method
 * For SELECT LIMIT 1
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any>}
 */
async function get(sql, params = []) {
    if (!pool) throw new Error('Database not initialized');
    const sanitized = Array.isArray(params) ? cleanParams(params) : params;
    const pgSql = convertToDollarParams(sql);
    const result = await pool.query(pgSql, sanitized);
    return result.rows.length > 0 ? result.rows[0] : undefined;
}

/**
 * Async wrapper for the legacy 'all' method
 * For SELECT multiple rows
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
async function all(sql, params = []) {
    if (!pool) throw new Error('Database not initialized');
    const sanitized = Array.isArray(params) ? cleanParams(params) : params;
    const pgSql = convertToDollarParams(sql);
    const result = await pool.query(pgSql, sanitized);
    return result.rows;
}

/**
 * Async wrapper for querying multiple results
 */
async function query(sql, params = []) {
    return all(sql, params);
}

/**
 * Wraps a pg Client with the same run/get/all interface
 */
function createWrapper(client) {
    return {
        run: async (sql, params = []) => {
            const sanitized = Array.isArray(params) ? cleanParams(params) : params;
            const pgSql = convertToDollarParams(sql);
            const result = await client.query(pgSql, sanitized);
            let lastInsertRowid = null;
            if (result.command === 'INSERT' && result.rows.length > 0) {
                const firstRow = result.rows[0];
                const firstColName = Object.keys(firstRow)[0];
                lastInsertRowid = firstRow[firstColName] || null;
            }
            return { lastInsertRowid, changes: result.rowCount };
        },
        get: async (sql, params = []) => {
            const sanitized = Array.isArray(params) ? cleanParams(params) : params;
            const pgSql = convertToDollarParams(sql);
            const result = await client.query(pgSql, sanitized);
            return result.rows.length > 0 ? result.rows[0] : undefined;
        },
        all: async (sql, params = []) => {
            const sanitized = Array.isArray(params) ? cleanParams(params) : params;
            const pgSql = convertToDollarParams(sql);
            const result = await client.query(pgSql, sanitized);
            return result.rows;
        },
        exec: async (sql) => {
            return client.query(sql);
        }
    };
}

/**
 * Returns a wrapper that uses a dedicated client from the pool.
 * Must call release() when done.
 */
async function getTransactionClient() {
    if (!pool) throw new Error('Database not initialized');
    const client = await pool.connect();
    const wrapper = createWrapper(client);
    return {
        ...wrapper,
        release: () => client.release(),
        beginTransaction: () => client.query('BEGIN'),
        commit: () => client.query('COMMIT'),
        rollback: () => client.query('ROLLBACK')
    };
}

/**
 * Empty 'save' method for backward compatibility.
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
    getTransactionClient,
    get db() { return pool; }
};

