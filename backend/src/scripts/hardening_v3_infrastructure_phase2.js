import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting US_060 Phase 2: Advanced Trophy Normalization & API-ID Enforcement');

    // 1. Strict API-ID Integrity (Cleanup again just in case)
    console.log('\n--- 1. Enforcing API-ID Integrity ---');
    const tablesToClean = [
        { name: 'V3_Leagues', pk: 'league_id' },
        { name: 'V3_Teams', pk: 'team_id' },
        { name: 'V3_Players', pk: 'player_id' }
    ];
    const groupId = `CLEANUP_${new Date().toISOString().split('T')[0]}_HARDENING`;

    for (const table of tablesToClean) {
        const nullIds = db.exec(`SELECT ${table.pk} FROM ${table.name} WHERE api_id IS NULL`);
        if (nullIds.length > 0) {
            const rows = nullIds[0].values;
            console.log(`⚠️  Found ${rows.length} records in ${table.name} without API_ID. Logging and deleting...`);
            for (const [pkValue] of rows) {
                const rowData = db.exec(`SELECT * FROM ${table.name} WHERE ${table.pk} = ${pkValue}`)[0];
                const objData = {};
                rowData.columns.forEach((col, i) => { objData[col] = rowData.values[0][i]; });

                db.run(`INSERT INTO V3_Cleanup_History (group_id, table_name, original_pk_id, raw_data, reason) VALUES (?, ?, ?, ?, ?)`,
                    [groupId, table.name, pkValue, JSON.stringify(objData), 'MISSING_API_ID']);
                db.run(`DELETE FROM ${table.name} WHERE ${table.pk} = ${pkValue}`);
            }
        }
    }

    // 2. Advanced Trophy Mapping
    console.log('\n--- 2. Advanced Trophy Normalization (Disambiguation) ---');

    // Load all leagues into memory with their country name for fuzzy matching
    const leagueMap = []; // Array of { id, name, country }
    const leaguesRes = db.exec(`
        SELECT l.league_id, l.name, c.name as country_name 
        FROM V3_Leagues l
        JOIN V3_Countries c ON l.country_id = c.country_id
    `);

    if (leaguesRes.length > 0) {
        leaguesRes[0].values.forEach(v => {
            leagueMap.push({ id: v[0], name: v[1], country: v[2] });
        });
    }

    const unmappedRes = db.exec("SELECT id, league_name, country FROM V3_Trophies WHERE competition_id IS NULL");
    if (unmappedRes.length > 0) {
        const rows = unmappedRes[0].values;
        console.log(`Analyzing ${rows.length} unmapped trophies...`);

        let mappedCount = 0;
        for (const [id, tLeague, tCountry] of rows) {
            let match = null;

            // Strategy A: Exact Match
            match = leagueMap.find(l => l.name === tLeague);

            // Strategy B: Disambiguated Match (e.g. "Serie A" + "Italy" -> "Serie A (Italy)")
            if (!match) {
                const disambiguatedName = `${tLeague} (${tCountry})`;
                match = leagueMap.find(l => l.name === disambiguatedName);
            }

            // Strategy C: Partial Match (e.g. "Premier League" + "England" -> "Premier League")
            // This is risky but let's try if names start with tLeague and country matches
            if (!match) {
                match = leagueMap.find(l => l.name.startsWith(tLeague) && l.country === tCountry);
            }

            if (match) {
                db.run(`UPDATE V3_Trophies SET competition_id = ?, country = ? WHERE id = ?`, [match.id, match.country, id]);
                mappedCount++;
            }
        }
        console.log(`✅ successfully mapped ${mappedCount} additional trophies using advanced heuristics.`);
    }

    // 3. Final cleanup of "null" date (season) and duplicates - DOUBLE CHECK
    console.log('\n--- 3. Final Sweep: "null" dates and Duplicates ---');
    const invalidCount = db.exec("SELECT count(*) FROM V3_Trophies WHERE season IS NULL OR season = 'null' OR season = ''")[0].values[0][0];
    if (invalidCount > 0) {
        db.run("DELETE FROM V3_Trophies WHERE season IS NULL OR season = 'null' OR season = ''");
        console.log(`✅ Purged ${invalidCount} residual invalid season records.`);
    }

    // Deduping again using the new competition_id
    db.run(`
        DELETE FROM V3_Trophies 
        WHERE id NOT IN (
            SELECT MAX(id) 
            FROM V3_Trophies 
            GROUP BY player_id, IFNULL(competition_id, league_name), trophy, season, place
        )
    `);
    console.log('✅ Final deduplication pass complete.');

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Implementation Finished!');
    db.close();
}

run().catch(console.error);
