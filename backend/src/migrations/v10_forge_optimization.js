import sqlite3 from 'sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.resolve(__dirname, '../../database.sqlite');

const db = new sqlite3.Database(DB_PATH);

console.log('🚀 Running V10 Forge Optimization Migration...');

db.serialize(() => {
    // 1. Add columns to V3_Forge_Simulations
    db.run(`ALTER TABLE V3_Forge_Simulations ADD COLUMN last_heartbeat DATETIME`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ last_heartbeat column already exists.');
            } else {
                console.error('❌ Error adding last_heartbeat:', err.message);
            }
        } else {
            console.log('✅ Added last_heartbeat column to V3_Forge_Simulations.');
        }
    });

    db.run(`ALTER TABLE V3_Forge_Simulations ADD COLUMN error_log TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ error_log column already exists.');
            } else {
                console.error('❌ Error adding error_log:', err.message);
            }
        } else {
            console.log('✅ Added error_log column to V3_Forge_Simulations.');
        }
    });

    db.run(`ALTER TABLE V3_Forge_Simulations ADD COLUMN stage TEXT`, (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('✅ stage column already exists.');
            } else {
                console.error('❌ Error adding stage:', err.message);
            }
        } else {
            console.log('✅ Added stage column to V3_Forge_Simulations.');
        }
    });

    console.log('🎉 Migration complete.');
});

db.close();
