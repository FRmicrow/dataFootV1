import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', '..', 'database.sqlite');

let SQL;
let db;

// Initialize database connection
async function initDatabase() {
    if (!SQL) {
        SQL = await initSqlJs();
    }

    if (existsSync(dbPath)) {
        const buffer = readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    console.log('📊 Database connected:', dbPath);
    return db;
}

// Save database to file
function saveDatabase() {
    if (db) {
        const data = db.export();
        writeFileSync(dbPath, data);
    }
}

// Wrapper for queries that returns results
function query(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();

    return results;
}

// Wrapper for executing statements (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    db.run(sql, params);
    saveDatabase();

    // Return lastInsertRowid equivalent
    const result = query('SELECT last_insert_rowid() as id');
    return { lastInsertRowid: result[0]?.id };
}

// Get single row
function get(sql, params = []) {
    const results = query(sql, params);
    return results[0] || null;
}

// Get all rows
function all(sql, params = []) {
    return query(sql, params);
}

export default {
    init: initDatabase,
    save: saveDatabase,
    run,
    get,
    all,
    query
};
