import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', '..', 'database.sqlite');
const tempDbPath = join(__dirname, '..', '..', 'database.sqlite.tmp');

let SQL;
let db;
let saveTimeout = null;
const SAVE_DEBOUNCE_MS = 1000; // Save to disk at most once per second

// Initialize database connection
async function initDatabase() {
    if (!SQL) {
        SQL = await initSqlJs();
    }

    if (existsSync(dbPath)) {
        try {
            const buffer = readFileSync(dbPath);
            db = new SQL.Database(buffer);
        } catch (err) {
            console.error("❌ Failed to load database file:", err);
            // Maybe try load backup or temp? For now let it throw or create new
            if (existsSync(tempDbPath)) {
                console.log("⚠️ Attempting to recover from temp file...");
                const buffer = readFileSync(tempDbPath);
                db = new SQL.Database(buffer);
            } else {
                throw err;
            }
        }
    } else {
        db = new SQL.Database();
    }

    console.log('📊 Database connected:', dbPath);
    return db;
}

// Save database to file (Debounced & Atomic)
function saveDatabase(immediate = false) {
    if (!db) return;

    const doSave = () => {
        try {
            saveTimeout = null; // Clear flag
            const data = db.export();
            writeFileSync(tempDbPath, data);
            renameSync(tempDbPath, dbPath);
            // console.log('💾 Database saved to disk');
        } catch (err) {
            console.error('❌ Error saving database:', err);
        }
    };

    if (immediate) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = null;
        doSave();
    } else {
        // If a save is already scheduled, don't reschedule (throttle/batch behavior)
        // This ensures ensures we eventually save even if updates are constant
        if (!saveTimeout) {
            saveTimeout = setTimeout(doSave, SAVE_DEBOUNCE_MS);
        }
    }
}

// Wrapper for queries that returns results
function query(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    try {
        const stmt = db.prepare(sql);
        stmt.bind(params);

        const results = [];
        while (stmt.step()) {
            results.push(stmt.getAsObject());
        }
        stmt.free();
        return results;
    } catch (e) {
        console.error("Query Error:", sql, e.message);
        throw e;
    }
}

// Wrapper for executing statements (INSERT, UPDATE, DELETE)
function run(sql, params = []) {
    if (!db) {
        throw new Error('Database not initialized');
    }

    db.run(sql, params);
    saveDatabase(false); // Debounced save

    // Return lastInsertRowid equivalent
    try {
        const result = query('SELECT last_insert_rowid() as id');
        return { lastInsertRowid: result[0]?.id };
    } catch (e) {
        return { lastInsertRowid: null };
    }
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
