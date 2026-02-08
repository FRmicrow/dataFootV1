import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const dbPath = resolve(__dirname, '../database.sqlite');
const schemaPath = resolve(__dirname, '../sql/schema/01_V2_schema.sql');

async function initDatabase() {
  console.log('Initializing V2 database at:', dbPath);
  console.log('Reading schema from:', schemaPath);

  if (!existsSync(schemaPath)) {
    console.error('❌ Schema file not found!');
    process.exit(1);
  }

  const schema = readFileSync(schemaPath, 'utf8');

  let db;
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON;');

    // Execute schema
    console.log('Executing V2 schema...');
    await db.exec(schema);

    // Verify
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'V2_%'");
    const tableNames = tables.map(t => t.name);

    console.log('✅ Database initialized successfully!');
    console.log(`Created/Verified ${tableNames.length} V2 tables:`);
    console.log(tableNames.join(', '));

    await db.close();

  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

initDatabase();
