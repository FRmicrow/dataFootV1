import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting US_050: Continental Re-structuring Phase 2 (Deep Clean)');

    const ids = {};
    const countriesRes = db.exec("SELECT country_id, name FROM V3_Countries WHERE name IN ('Europe', 'South America', 'North America', 'Asia', 'Africa', 'Oceania', 'World', 'Spain', 'England', 'France', 'Italy', 'Germany', 'Brazil', 'Mexico', 'Portugal')");
    countriesRes[0].values.forEach(v => { ids[v[1]] = v[0]; });

    const worldId = ids['World'];
    console.log(`World Country ID: ${worldId}`);

    const migrations = [
        { target: 'Europe', patterns: ['UEFA %', 'Euro %', 'Europa %', 'Nations League%', 'Champions League%', 'Qualification Europe', 'WC Qualification Europe', 'UEFA World Cup Qualifiers', 'UEFA%'] },
        { target: 'South America', patterns: ['CONMEBOL%', 'Libertadores%', 'Sudamericana%', 'Copa America%', 'WC Qualification South America', 'CONMEBOL World Cup Qualifiers', 'Recopa%'] },
        { target: 'North America', patterns: ['CONCACAF %', 'Gold Cup%', 'Leagues Cup', 'MLS%', 'Qualification CONCACAF', 'CONCACAF%'] },
        { target: 'Asia', patterns: ['AFC %', 'Asian %', 'AFC%', 'AFF %', 'SAFF %', 'Qualification Asia', 'WC Qualification Asia'] },
        { target: 'Africa', patterns: ['CAF %', 'Africa Cup%', 'CAF%', 'African Nations%', 'Qualification Africa', 'WC Qualification Africa'] },
        { target: 'Oceania', patterns: ['OFC %', 'Oceania %', 'OFC%', 'Qualification Oceania'] },
        // Fix mislabeled "(World)" or generic competitions under World
        { target: 'Spain', patterns: ['La Liga%', 'Copa del Rey%', 'Super Cup (Spain)%'] },
        { target: 'England', patterns: ['Premier League%', 'FA Cup%', 'League Cup%', 'Championship (England)%'] },
        { target: 'France', patterns: ['Ligue 1%', 'Ligue 2%', 'Coupe de France%', 'Coupe de la Ligue%'] },
        { target: 'Italy', patterns: ['Serie A%', 'Coppa Italia%', 'Super Cup (Italy)%'] },
        { target: 'Germany', patterns: ['Bundesliga%', 'DFB Pokal%'] },
        { target: 'Brazil', patterns: ['Serie A (Brazil)%', 'Copa do Brasil%', 'Paulista%', 'Carioca%'] },
        { target: 'Portugal', patterns: ['Primeira Liga%'] },
        { target: 'Mexico', patterns: ['Liga MX%', 'Copa MX%'] }
    ];

    for (const m of migrations) {
        const targetId = ids[m.target];
        if (!targetId) {
            console.log(`⚠️  Target country ${m.target} not found, skipping.`);
            continue;
        }

        for (const p of m.patterns) {
            db.run(`
                UPDATE V3_Leagues 
                SET country_id = ${targetId} 
                WHERE country_id = ${worldId} 
                  AND (name LIKE '${p}' OR name LIKE '%${p}%' OR name LIKE '${p.replace('%', '')} (%)')
            `);
        }
        console.log(`✅ Migrated items for ${m.target}`);
    }

    // Final cleanup: remove '(World)' suffix from names if they are now properly linked
    console.log('\n--- Cleaning up League Names ---');
    db.run(`UPDATE V3_Leagues SET name = REPLACE(name, ' (World)', '') WHERE name LIKE '% (World)%'`);
    console.log('✅ Removed (World) suffix from league names');

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Deep Clean Complete!');
    db.close();
}

run().catch(console.error);
