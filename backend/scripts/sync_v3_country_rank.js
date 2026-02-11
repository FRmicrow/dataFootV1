/**
 * IMPROVEMENT_26 – V3 Country Rank Sync
 * ======================================
 * Reads `importance_rank` (and bonus metadata) from V2_countries in database.sqlite
 * and writes it into V3_Countries in database_v3_test.sqlite.
 *
 * Uses the project's own sql.js-based DB wrappers so both databases are loaded
 * with the same driver — no native sqlite3 dependency required.
 *
 * Usage:  node backend/scripts/sync_v3_country_rank.js
 */

import db from '../src/config/database.js';     // V2
import dbV3 from '../src/config/database_v3.js';   // V3

// ── Name-mapping table ──────────────────────────────────────────────
// V2 names that differ from V3 names (V2 → V3)
const NAME_ALIASES = {
    'United States': 'USA',
    'Saudi Arabia': 'Saudi-Arabia',
    // Add more if new discrepancies appear
};

async function main() {
    console.log('🚀 IMPROVEMENT-26: Country Rank Sync (V2 → V3)');
    console.log('─'.repeat(55));

    // 1. Boot both databases
    await db.init();
    await dbV3.init();

    // ── Step 1: Schema migration ─────────────────────────────────────
    console.log('\n📐 [1/3] Ensuring V3_Countries has all required columns…');

    const columnsToAdd = [
        { name: 'importance_rank', type: 'INTEGER DEFAULT 999' },
        { name: 'continent', type: 'TEXT' },
        { name: 'flag_small_url', type: 'TEXT' },
    ];

    const tableInfo = dbV3.all('PRAGMA table_info(V3_Countries)');
    const existing = new Set(tableInfo.map(c => c.name));

    for (const col of columnsToAdd) {
        if (!existing.has(col.name)) {
            dbV3.run(`ALTER TABLE V3_Countries ADD COLUMN ${col.name} ${col.type}`);
            console.log(`   ➕ Added column: ${col.name}`);
        } else {
            console.log(`   ✓  Column exists: ${col.name}`);
        }
    }

    // ── Step 2: Sync data ────────────────────────────────────────────
    console.log('\n🔄 [2/3] Syncing from V2_countries → V3_Countries…');

    const v2Countries = db.all(`
        SELECT country_name, country_code, importance_rank, flag_url, flag_small_url, continent
        FROM V2_countries
    `);

    let updated = 0;
    let inserted = 0;
    let skipped = 0;

    for (const v2 of v2Countries) {
        // Resolve the V3 name (may differ from V2)
        const v3Name = NAME_ALIASES[v2.country_name] || v2.country_name;

        const v3Row = dbV3.get('SELECT country_id FROM V3_Countries WHERE name = ?', [v3Name]);

        if (v3Row) {
            dbV3.run(`
                UPDATE V3_Countries
                SET importance_rank = ?,
                    flag_url        = COALESCE(flag_url, ?),
                    flag_small_url  = ?,
                    continent       = ?,
                    code            = COALESCE(code, ?)
                WHERE country_id = ?
            `, [
                v2.importance_rank,
                v2.flag_url,
                v2.flag_small_url,
                v2.continent,
                v2.country_code,
                v3Row.country_id,
            ]);
            updated++;
        } else {
            // Country not yet in V3 — insert it so the rank is available if it appears later
            dbV3.run(`
                INSERT INTO V3_Countries (name, code, importance_rank, flag_url, flag_small_url, continent)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                v3Name,
                v2.country_code,
                v2.importance_rank,
                v2.flag_url,
                v2.flag_small_url,
                v2.continent,
            ]);
            inserted++;
        }
    }

    // Any V3 country that had NO V2 match keeps its default 999
    const unmatched = dbV3.all('SELECT name FROM V3_Countries WHERE importance_rank IS NULL OR importance_rank = 0');
    for (const row of unmatched) {
        dbV3.run('UPDATE V3_Countries SET importance_rank = 999 WHERE name = ?', [row.name]);
        skipped++;
    }

    console.log(`   📊 Updated: ${updated} | Inserted: ${inserted} | Fallback 999: ${skipped}`);

    // ── Step 3: Verification ─────────────────────────────────────────
    console.log('\n✅ [3/3] Verification – Top 15 countries by rank:');
    const top = dbV3.all('SELECT name, importance_rank FROM V3_Countries ORDER BY importance_rank ASC LIMIT 15');
    top.forEach((r, i) => {
        console.log(`   ${String(i + 1).padStart(2)}. ${r.name.padEnd(20)} rank = ${r.importance_rank}`);
    });

    // Force-save to disk
    dbV3.save(true);
    db.save(true);

    console.log('\n🎉 Country Rank Sync complete!');
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
