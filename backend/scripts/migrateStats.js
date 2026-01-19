import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');

if (!existsSync(dbPath)) {
    console.error('❌ Database file not found at:', dbPath);
    process.exit(1);
}

const SQL = await initSqlJs();
const buffer = readFileSync(dbPath);
const db = new SQL.Database(buffer);

const tables = ['player_club_stats', 'player_national_stats', 'team_statistics'];
const columns = [
    'minutes_played INTEGER DEFAULT 0',
    'yellow_cards INTEGER DEFAULT 0',
    'red_cards INTEGER DEFAULT 0',
    'lineups INTEGER DEFAULT 0',
    'shots_total INTEGER DEFAULT 0',
    'shots_on INTEGER DEFAULT 0',
    'goals_conceded INTEGER DEFAULT 0',
    'goals_saves INTEGER DEFAULT 0',
    'passes_total INTEGER DEFAULT 0',
    'passes_key INTEGER DEFAULT 0',
    'passes_accuracy INTEGER DEFAULT 0',
    'tackles_total INTEGER DEFAULT 0',
    'tackles_blocks INTEGER DEFAULT 0',
    'tackles_interceptions INTEGER DEFAULT 0',
    'duels_total INTEGER DEFAULT 0',
    'duels_won INTEGER DEFAULT 0',
    'dribbles_attempts INTEGER DEFAULT 0',
    'dribbles_success INTEGER DEFAULT 0',
    'dribbles_past INTEGER DEFAULT 0',
    'fouls_drawn INTEGER DEFAULT 0',
    'fouls_committed INTEGER DEFAULT 0',
    'penalty_won INTEGER DEFAULT 0',
    'penalty_commited INTEGER DEFAULT 0',
    'penalty_scored INTEGER DEFAULT 0',
    'penalty_missed INTEGER DEFAULT 0',
    'penalty_saved INTEGER DEFAULT 0',
    'clean_sheets INTEGER DEFAULT 0',
    'failed_to_score INTEGER DEFAULT 0',
    'avg_goals_for REAL DEFAULT 0',
    'avg_goals_against REAL DEFAULT 0'
];

console.log('🚀 Starting migration...');

for (const table of tables) {
    console.log(`\nTable: ${table}`);
    for (const columnDef of columns) {
        const columnName = columnDef.split(' ')[0];
        try {
            // Check if column exists
            const info = db.exec(`PRAGMA table_info(${table})`);
            const exists = info[0].values.some(row => row[1] === columnName);

            if (!exists) {
                console.log(`  ➕ Adding column: ${columnName}`);
                db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
            } else {
                console.log(`  ✅ Column ${columnName} already exists`);
            }
        } catch (err) {
            console.error(`  ❌ Failed to add ${columnName}:`, err.message);
        }
    }
}

const data = db.export();
writeFileSync(dbPath, data);
console.log('\n✅ Migration completed!');
db.close();
