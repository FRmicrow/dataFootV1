import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

const extendLeaguesSchema = (db) => {
    console.log('\n--- 1. Extending V3_Leagues Schema ---');
    try {
        const columns = db.exec("PRAGMA table_info(V3_Leagues)")[0].values;
        if (!columns.some(col => col[1] === 'importance_rank')) {
            db.run(`ALTER TABLE V3_Leagues ADD COLUMN importance_rank INTEGER DEFAULT 999;`);
            console.log('✅ Added importance_rank to V3_Leagues');
        }
        db.run(`CREATE INDEX IF NOT EXISTS idx_v3_leagues_importance ON V3_Leagues(importance_rank);`);
    } catch (e) {
        console.error('❌ Error updating V3_Leagues schema:', e.message);
    }
};

const createVirtualCountries = (db) => {
    console.log('\n--- 2. Creating Virtual Continent Countries ---');
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
            console.log(`✅ Updated: ${vc.name}`);
        } else {
            db.run(`INSERT INTO V3_Countries (name, continent, importance_rank) VALUES ('${vc.name}', '${vc.continent}', ${vc.rank})`);
            const id = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
            ids[vc.name] = id;
            console.log(`✅ Created: ${vc.name}`);
        }
    }
    return ids;
};

const migrateInternationalLeagues = (db, ids) => {
    console.log('\n--- 3. Migrating International Leagues ---');
    const migrations = [
        { country: 'Europe', pattern: ['UEFA %', 'Euro %', 'Champions League%', 'Europa League%', 'Nations League%', 'Youth League%', 'EC Qualification', 'European Championship%'] },
        { country: 'South America', pattern: ['Copa America%', 'CONMEBOL%', 'Libertadores%', 'Sudamericana%', 'Recopa%'] },
        { country: 'Asia', pattern: ['AFC %', 'Asian %', 'AFF %', 'SAFF %'] },
        { country: 'Africa', pattern: ['Africa Cup%', 'African Nations%', 'CAF %', 'WC Qualification Africa'] },
        { country: 'North America', pattern: ['CONCACAF %', 'Gold Cup%', 'Leagues Cup', 'MLS%'] },
    ];
    const worldId = ids['World'];
    for (const m of migrations) {
        const targetId = ids[m.country];
        if (!targetId) continue;
        for (const p of m.pattern) {
            db.run(`UPDATE V3_Leagues SET country_id = ${targetId} WHERE country_id = ${worldId} AND (name LIKE '${p}' OR name LIKE '%(${m.country})')`);
        }
    }
};

const setLeaguesImportance = (db) => {
    console.log('\n--- 4. Setting Importance Ranks ---');
    const ranks = [
        { name: 'UEFA Champions League', rank: 1 }, { name: 'UEFA Europa League', rank: 2 },
        { name: 'Premier League', rank: 10 }, { name: 'La Liga', rank: 11 },
        { name: 'Bundesliga', rank: 12 }, { name: 'Serie A', rank: 13 },
        { name: 'Ligue 1', rank: 14 }, { name: 'FIFA World Cup', rank: 0 },
        { name: 'Euro Championship', rank: 5 }
    ];
    for (const r of ranks) {
        db.run(`UPDATE V3_Leagues SET importance_rank = ${r.rank} WHERE name = '${r.name}'`);
    }
};

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting US_050: Database Infrastructure & Continental Re-structuring');

    extendLeaguesSchema(db);
    const ids = createVirtualCountries(db);
    migrateInternationalLeagues(db, ids);
    setLeaguesImportance(db);

    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Migration US_050 Complete!');
    db.close();
}

run().catch(console.error);
