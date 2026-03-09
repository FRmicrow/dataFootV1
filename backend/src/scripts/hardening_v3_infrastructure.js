import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

const extendTrophiesSchema = (db) => {
    console.log('\n--- 1. Extending V3_Trophies Schema ---');
    try {
        const columns = db.exec("PRAGMA table_info(V3_Trophies)")[0].values;
        const hasCompId = columns.some(col => col[1] === 'competition_id');
        if (!hasCompId) {
            db.run(`ALTER TABLE V3_Trophies ADD COLUMN competition_id INTEGER;`);
            console.log('✅ Added competition_id to V3_Trophies');
        } else {
            console.log('⏭️  competition_id already exists in V3_Trophies');
        }
        db.run(`CREATE INDEX IF NOT EXISTS idx_v3_trophies_competition ON V3_Trophies(competition_id);`);
    } catch (e) {
        console.error('❌ Error updating V3_Trophies schema:', e.message);
    }
};

const purgeMissingApiIds = (db) => {
    console.log('\n--- 2. Purging Entities with Missing API_IDs ---');
    const tablesToClean = [
        { name: 'V3_Players', pk: 'player_id' },
        { name: 'V3_Leagues', pk: 'league_id' },
        { name: 'V3_Teams', pk: 'team_id' },
        { name: 'V3_Fixtures', pk: 'fixture_id' }
    ];
    const groupId = `CLEANUP_${new Date().toISOString().split('T')[0]}_STRICT_ID`;

    for (const table of tablesToClean) {
        console.log(`Checking ${table.name}...`);
        const results = db.exec(`SELECT * FROM ${table.name} WHERE api_id IS NULL`);
        if (results.length > 0) {
            const columns = results[0].columns;
            const rows = results[0].values;
            console.log(`⚠️ Found ${rows.length} records in ${table.name} without API_ID. Logging and deleting...`);
            for (const row of rows) {
                const rowData = {};
                columns.forEach((col, i) => { rowData[col] = row[i]; });
                const pkValue = rowData[table.pk];
                db.run(`INSERT INTO V3_Cleanup_History (group_id, table_name, original_pk_id, raw_data, reason) VALUES (?, ?, ?, ?, ?)`,
                    [groupId, table.name, pkValue, JSON.stringify(rowData), 'MISSING_API_ID']);
                db.run(`DELETE FROM ${table.name} WHERE ${table.pk} = ?`, [pkValue]);
            }
            console.log(`✅ Cleaned ${rows.length} records from ${table.name}`);
        } else {
            console.log(`✅ ${table.name} is clean.`);
        }
    }
};

const normalizeTrophies = (db) => {
    console.log('\n--- 3. Normalizing Trophies (Competition Mapping & Home Country Rule) ---');
    const leagueMap = {};
    const leaguesRes = db.exec(`SELECT l.name, l.league_id, c.name as country_name FROM V3_Leagues l JOIN V3_Countries c ON l.country_id = c.country_id ORDER BY l.importance_rank ASC`);
    if (leaguesRes.length > 0) {
        leaguesRes[0].values.forEach(v => {
            if (!leagueMap[v[0]]) leagueMap[v[0]] = { id: v[1], country: v[2] };
        });
    }

    const trophiesRes = db.exec("SELECT id, league_name FROM V3_Trophies WHERE competition_id IS NULL");
    if (trophiesRes.length > 0) {
        const rows = trophiesRes[0].values;
        console.log(`Processing ${rows.length} unlinked trophies...`);
        let mappedCount = 0;
        for (const [id, leagueName] of rows) {
            const match = leagueMap[leagueName];
            if (match) {
                db.run(`UPDATE V3_Trophies SET competition_id = ?, country = ? WHERE id = ?`, [match.id, match.country, id]);
                mappedCount++;
            }
        }
        console.log(`✅ Successfully mapped and normalized ${mappedCount} trophies.`);
    } else {
        console.log('✅ All trophies are already linked or no trophies found.');
    }
};

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting US_060: Database Health Infrastructure & Schema Hardening');

    extendTrophiesSchema(db);
    purgeMissingApiIds(db);
    normalizeTrophies(db);

    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Implementation of US_060 Complete!');
    db.close();
}

run().catch(console.error);
