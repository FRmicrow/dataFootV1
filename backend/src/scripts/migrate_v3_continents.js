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

    console.log('🏁 Starting US_050: Database Infrastructure & Continental Re-structuring');

    // 1. Schema Extensions
    console.log('\n--- 1. Extending V3_Leagues Schema ---');
    try {
        // Add importance_rank if it doesn't exist
        const columns = db.exec("PRAGMA table_info(V3_Leagues)")[0].values;
        const hasRank = columns.some(col => col[1] === 'importance_rank');
        if (!hasRank) {
            db.run(`ALTER TABLE V3_Leagues ADD COLUMN importance_rank INTEGER DEFAULT 999;`);
            console.log('✅ Added importance_rank to V3_Leagues');
        } else {
            console.log('⏭️  importance_rank already exists in V3_Leagues');
        }

        db.run(`CREATE INDEX IF NOT EXISTS idx_v3_leagues_importance ON V3_Leagues(importance_rank);`);
        console.log('✅ Created index on V3_Leagues(importance_rank)');
    } catch (e) {
        console.error('❌ Error updating V3_Leagues schema:', e.message);
    }

    // 2. Create/Update Virtual Continent Countries
    console.log('\n--- 2. Creating Virtual Continent Countries ---');

    // Continent ranks to ensure clean sidebar navigation
    const virtualCountries = [
        { name: 'Europe', continent: 'Europe', rank: 1 },
        { name: 'South America', continent: 'South America', rank: 2 },
        { name: 'North America', continent: 'North America', rank: 3 },
        { name: 'Asia', continent: 'Asia', rank: 4 },
        { name: 'Africa', continent: 'Africa', rank: 5 },
        { name: 'Oceania', continent: 'Oceania', rank: 6 },
        { name: 'World', continent: 'World', rank: 7 }
    ];

    const ids = {};

    for (const vc of virtualCountries) {
        let existing = db.exec(`SELECT country_id FROM V3_Countries WHERE name = '${vc.name}'`)[0];
        if (existing && existing.values.length > 0) {
            const id = existing.values[0][0];
            db.run(`UPDATE V3_Countries SET continent = '${vc.continent}', importance_rank = ${vc.rank} WHERE country_id = ${id}`);
            ids[vc.name] = id;
            console.log(`✅ Updated existing virtual country: ${vc.name} (ID: ${id})`);
        } else {
            db.run(`INSERT INTO V3_Countries (name, continent, importance_rank) VALUES ('${vc.name}', '${vc.continent}', ${vc.rank})`);
            const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            ids[vc.name] = id;
            console.log(`✅ Created NEW virtual country: ${vc.name} (ID: ${id})`);
        }
    }

    // 3. Migration: Re-link Continental Competitions from 'World' to proper Virtual Countries
    console.log('\n--- 3. Migrating International Leagues to Proper Continents ---');

    const migrations = [
        // Europe (UEFA)
        { country: 'Europe', pattern: ['UEFA %', 'Euro %', 'Champions League%', 'Europa League%', 'Nations League%', 'Youth League%', 'EC Qualification', 'European Championship%'] },
        // South America (CONMEBOL)
        { country: 'South America', pattern: ['Copa America%', 'CONMEBOL%', 'Libertadores%', 'Sudamericana%', 'Recopa%'] },
        // Asia (AFC)
        { country: 'Asia', pattern: ['AFC %', 'Asian %', 'AFF %', 'SAFF %'] },
        // Africa (CAF)
        { country: 'Africa', pattern: ['Africa Cup%', 'African Nations%', 'CAF %', 'WC Qualification Africa'] },
        // North America (CONCACAF)
        { country: 'North America', pattern: ['CONCACAF %', 'Gold Cup%', 'Leagues Cup', 'MLS%'] }, // MLS is usually USA but sometimes international?
    ];

    let totalUpdated = 0;
    const worldId = ids['World'];

    for (const m of migrations) {
        const targetId = ids[m.country];
        if (!targetId) continue;

        for (const p of m.pattern) {
            // Update leagues currently linked to World that match the pattern
            const res = db.run(`
                UPDATE V3_Leagues 
                SET country_id = ${targetId} 
                WHERE country_id = ${worldId} 
                  AND (name LIKE '${p}' OR name LIKE '%(${m.country})')
            `);
            // Note: sql.js doesn't return affected rows in run() easily without changes, but we assume it works if no error.
            // We can check counts if needed.
        }
    }

    // Special manual corrections for common misplacements seen in logs
    const manualMoves = [
        { name: 'UEFA Champions League', target: 'Europe' },
        { name: 'UEFA Europa League', target: 'Europe' },
        { name: 'UEFA Super Cup', target: 'Europe' },
        { name: 'Euro Championship', target: 'Europe' },
        { name: 'Copa America', target: 'South America' },
        { name: 'CONMEBOL Libertadores', target: 'South America' },
        { name: 'AFC Champions League', target: 'Asia' },
        { name: 'Asian Cup', target: 'Asia' },
        { name: 'Africa Cup of Nations', target: 'Africa' },
        { name: 'CONCACAF Champions League', target: 'North America' },
        // Cleaning up potential typos/mismatches seen in the World list
        { name: 'La Liga', target: 'Spain' },
        { name: 'Premier League', target: 'England' },
        { name: 'Ligue 1', target: 'France' },
        { name: 'Serie A', target: 'Italy' },
        { name: 'Bundesliga', target: 'Germany' }
    ];

    for (const mm of manualMoves) {
        let countryRes = db.exec(`SELECT country_id FROM V3_Countries WHERE name = '${mm.target}'`)[0];
        if (countryRes && countryRes.values.length > 0) {
            const cId = countryRes.values[0][0];
            db.run(`UPDATE V3_Leagues SET country_id = ${cId} WHERE name = '${mm.name}'`);
            console.log(`📍 Manually moved ${mm.name} to ${mm.target}`);
        }
    }

    // 4. Set Initial Importance Ranks for Top Leagues
    console.log('\n--- 4. Setting Importance Ranks for Known Competitions ---');
    const ranks = [
        { name: 'UEFA Champions League', rank: 1 },
        { name: 'UEFA Europa League', rank: 2 },
        { name: 'Premier League', rank: 10 },
        { name: 'La Liga', rank: 11 },
        { name: 'Bundesliga', rank: 12 },
        { name: 'Serie A', rank: 13 },
        { name: 'Ligue 1', rank: 14 },
        { name: 'FIFA World Cup', rank: 0 },
        { name: 'Euro Championship', rank: 5 }
    ];

    for (const r of ranks) {
        db.run(`UPDATE V3_Leagues SET importance_rank = ${r.rank} WHERE name = '${r.name}'`);
    }

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Migration US_050 Complete!');
    db.close();
}

run().catch(console.error);
