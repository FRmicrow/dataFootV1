import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting V3 Integrity Fixes...');

    // 1. Add Optimizations
    console.log('\n--- 1. Missing Indexes ---');
    try {
        db.run(`CREATE INDEX IF NOT EXISTS idx_countries_rank ON V3_Countries(importance_rank)`);
        console.log('✅ Created idx_countries_rank');
    } catch (e) { console.error('Error creating idx_countries_rank:', e.message); }

    try {
        db.run(`CREATE INDEX IF NOT EXISTS idx_teams_country ON V3_Teams(country)`);
        console.log('✅ Created idx_teams_country');
    } catch (e) { console.error('Error creating idx_teams_country:', e.message); }

    // 2. Standings Cleanup (Logic Bug Fix)
    console.log('\n--- 2. Standings Cleanup ---');

    // Count NULLs before
    const countBefore = db.exec("SELECT count(*) FROM V3_Standings WHERE group_name IS NULL")[0].values[0][0];
    console.log(`Found ${countBefore} standings with NULL group_name.`);

    if (countBefore > 0) {
        // Step A: Deduplicate NULLs (keep latest)
        // Group by business key (excluding group_name since it is NULL)
        // Keep MAX(standings_id)
        db.run(`
            DELETE FROM V3_Standings 
            WHERE group_name IS NULL 
            AND standings_id NOT IN (
                SELECT MAX(standings_id) 
                FROM V3_Standings 
                WHERE group_name IS NULL 
                GROUP BY league_id, season_year, team_id
            )
        `);
        console.log('✅ Deleted duplicates among NULL groups.');

        // Step B: Update remaining NULLs to 'Regular Season'
        // Handle constraint failures if 'Regular Season' already exists for same (league, season, team)
        // We use INSERT OR REPLACE strategy: Update current row, replace if conflict.
        // Actually UPDATE OR REPLACE works in SQLite.
        db.run(`
            UPDATE OR REPLACE V3_Standings 
            SET group_name = 'Regular Season' 
            WHERE group_name IS NULL
        `);
        console.log("✅ Normalized NULL groups to 'Regular Season'.");
    }

    // 3. Final Deduplication (General Safety)
    // Run general dedupe on (league, season, team, group) keeping MAX id
    const dupes = db.exec(`
        SELECT count(*) FROM V3_Standings 
        GROUP BY league_id, season_year, team_id, group_name 
        HAVING count(*) > 1
    `);

    if (dupes.length > 0) {
        console.log(`⚠️ Found ${dupes.length} sets of duplicates remaining. Cleaning...`);
        db.run(`
            DELETE FROM V3_Standings 
            WHERE standings_id NOT IN (
                SELECT MAX(standings_id) 
                FROM V3_Standings 
                GROUP BY league_id, season_year, team_id, group_name
            )
        `);
        console.log('✅ General deduplication complete.');
    } else {
        console.log('✅ No general duplicates found.');
    }

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Done!');
    db.close();
}

run().catch(console.error);
