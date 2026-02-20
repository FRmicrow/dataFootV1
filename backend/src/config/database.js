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
const SAVE_DEBOUNCE_MS = 1000;

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
            if (existsSync(tempDbPath)) {
                console.log("⚠️ Attempting to recover V3 from temp file...");
                const buffer = readFileSync(tempDbPath);
                db = new SQL.Database(buffer);
            } else {
                throw err;
            }
        }
    } else {
        console.warn("⚠️ Database file not found, creating new empty (in-memory) DB.");
        db = new SQL.Database();
    }

    console.log('🧪 Database connected:', dbPath);

    // Enable Foreign Keys (Critical for Integrity)
    db.run("PRAGMA foreign_keys = ON;");
    const fkStatus = db.exec("PRAGMA foreign_keys;")[0].values[0][0];
    console.log(`🔒 Foreign Keys: ${fkStatus ? 'ENABLED' : 'DISABLED'}`);

    return db;
}

// Save database to file
function saveDatabase(immediate = false) {
    if (!db) return;

    const doSave = () => {
        try {
            saveTimeout = null;
            const data = db.export();
            writeFileSync(tempDbPath, data);
            renameSync(tempDbPath, dbPath);
        } catch (err) {
            console.error('❌ Error saving database:', err);
        }
    };

    if (immediate) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = null;
        doSave();
    } else {
        if (!saveTimeout) {
            saveTimeout = setTimeout(doSave, SAVE_DEBOUNCE_MS);
        }
    }
}

// Wrapper for queries
function query(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
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

// Wrapper for execution
function run(sql, params = []) {
    if (!db) throw new Error('Database not initialized');
    db.run(sql, params);
    saveDatabase(false);

    try {
        const result = query('SELECT last_insert_rowid() as id');
        return { lastInsertRowid: result[0]?.id };
    } catch (e) {
        return { lastInsertRowid: null };
    }
}

function get(sql, params = []) {
    const results = query(sql, params);
    return results[0] || null;
}

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
