
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BACKEND_ROOT = join(__dirname, '..'); // backend/
const DB_PATH = join(BACKEND_ROOT, 'database.sqlite');
const BACKUP_DIR = join(BACKEND_ROOT, 'backups');

const now = new Date();
const datePart = now.toISOString().split('T')[0]; // YYYY-MM-DD
const timePart = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
const backupName = `database_backup_${datePart}_${timePart}`;

if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR);
    console.log(`📂 Created backup directory: ${BACKUP_DIR}`);
}

async function createBackup() {
    console.log(`🚀 Creating backup: ${backupName}`);

    // 1. Binary Copy (Fast & Reliable for SQLite)
    const sqliteBackupPath = join(BACKUP_DIR, `${backupName}.sqlite`);
    try {
        copyFileSync(DB_PATH, sqliteBackupPath);
        console.log(`✅ Database file copied to: ${sqliteBackupPath}`);
    } catch (err) {
        console.error('❌ Failed to copy database file:', err.message);
        process.exit(1);
    }

    // 2. SQL Dump (Text format, good for versioning/recovery if binary fails)
    const sqlDumpPath = join(BACKUP_DIR, `${backupName}.sql`);
    try {
        console.log('📝 Generating SQL dump (this may take a moment)...');
        await execPromise(`sqlite3 "${DB_PATH}" .dump > "${sqlDumpPath}"`);
        console.log(`✅ SQL Dump created at: ${sqlDumpPath}`);
    } catch (err) {
        console.warn('⚠️ Could not create SQL dump (sqlite3 CLI might not be installed or available). Binary backup is still valid.');
        console.warn('Error:', err.message);
    }

    console.log('\n🎉 Backup process finished successfully.');
}

createBackup();
