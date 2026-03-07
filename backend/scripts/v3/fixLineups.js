
import Database from 'better-sqlite3';
import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SQLITE_PATH = path.join(__dirname, '../../data/recovered.db');
const PG_URL = 'postgres://statfoot_user:statfoot_password@localhost:5432/statfoot';

async function migrateLineups() {
    const sqlite = new Database(SQLITE_PATH);
    const pool = new Pool({ connectionString: PG_URL });

    try {
        console.log('🚀 Starting targeted Lineups migration...');

        // 1. Get ALL valid team IDs from PG to avoid FK violations
        const pgTeamsRes = await pool.query('SELECT team_id FROM v3_teams');
        const validTeamIds = new Set(pgTeamsRes.rows.map(t => t.team_id));
        console.log(`✅ Loaded ${validTeamIds.size} valid team IDs from PostgreSQL.`);

        // 2. Clear PG table (Treated as a clean sync)
        await pool.query('TRUNCATE v3_fixture_lineups CASCADE');
        console.log('🧹 Truncated v3_fixture_lineups in PG.');

        // 3. Get data from SQLite
        const rows = sqlite.prepare('SELECT * FROM V3_Fixture_Lineups').all();
        console.log(`📦 Found ${rows.length} lineups in SQLite.`);

        // 4. Batch Insert (Filtering for valid teams)
        const BATCH_SIZE = 500; // Smaller batches for safety
        let importedCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const validRows = batch.filter(row => validTeamIds.has(row.team_id));
            skippedCount += (batch.length - validRows.length);

            if (validRows.length === 0) continue;

            const values = [];
            let placeholders = [];
            let pIndex = 1;

            validRows.forEach((row) => {
                const lineup_id = row.id;
                const fixture_id = row.fixture_id;
                const team_id = row.team_id;
                const formation = row.formation;
                const coach_id = row.coach_id;
                const coach_name = row.coach_name;
                const created_at = row.created_at || new Date().toISOString();
                const starting_xi = row.starting_xi;
                const substitutes = row.substitutes;

                values.push(lineup_id, fixture_id, team_id, formation, coach_id, coach_name, created_at, starting_xi, substitutes);
                placeholders.push(`($${pIndex}, $${pIndex + 1}, $${pIndex + 2}, $${pIndex + 3}, $${pIndex + 4}, $${pIndex + 5}, $${pIndex + 6}, $${pIndex + 7}, $${pIndex + 8})`);
                pIndex += 9;
            });

            const sql = `
                INSERT INTO v3_fixture_lineups (
                    lineup_id, fixture_id, team_id, formation, coach_id, coach_name, created_at, starting_xi, substitutes
                ) VALUES ${placeholders.join(', ')}
            `;

            try {
                await pool.query(sql, values);
                importedCount += validRows.length;
            } catch (batchErr) {
                console.error(`❌ Batch at index ${i} failed. Skipping batch. Reason: ${batchErr.message}`);
                // If it fails even with filtering, we skip the batch to avoid hanging
            }

            if (i % 10000 === 0) console.log(`  Progress: ${i}/${rows.length} (Imported: ${importedCount}, Skipped: ${skippedCount})`);
        }

        console.log(`✅ Lineups migration complete! Total: ${importedCount}, Skipped: ${skippedCount}`);

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        sqlite.close();
        await pool.end();
    }
}

migrateLineups();
