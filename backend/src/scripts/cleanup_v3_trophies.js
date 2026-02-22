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

    console.log('🏁 Starting V3 Trophies Deep Cleanup');

    const groupId = `TROPHY_CLEANUP_${new Date().toISOString().split('T')[0]}`;

    // 1. Delete trophies with invalid seasons (NULL, 'null', '')
    console.log('\n--- 1. Purging Trophies with Invalid Seasons ---');
    const invalidSeasons = db.exec(`
        SELECT * FROM V3_Trophies 
        WHERE season IS NULL OR season = 'null' OR season = ''
    `);

    if (invalidSeasons.length > 0) {
        const columns = invalidSeasons[0].columns;
        const rows = invalidSeasons[0].values;
        console.log(`⚠️  Found ${rows.length} trophies with invalid seasons. Logging and deleting...`);

        for (const row of rows) {
            const rowData = {};
            columns.forEach((col, i) => { rowData[col] = row[i]; });
            const id = rowData.id;

            db.run(`
                INSERT INTO V3_Cleanup_History (group_id, table_name, original_pk_id, raw_data, reason)
                VALUES (?, ?, ?, ?, ?)
            `, [groupId, 'V3_Trophies', id, JSON.stringify(rowData), 'INVALID_SEASON']);

            db.run(`DELETE FROM V3_Trophies WHERE id = ?`, [id]);
        }
        console.log(`✅ Cleaned ${rows.length} invalid season records.`);
    } else {
        console.log('✅ No trophies with invalid seasons found.');
    }

    // 2. Deduplication
    console.log('\n--- 2. Deduplicating V3_Trophies ---');
    // We identify duplicates by (player_id, league_name, trophy, season, place)
    const duplicates = db.exec(`
        SELECT player_id, league_name, trophy, season, place, COUNT(*) 
        FROM V3_Trophies 
        GROUP BY player_id, league_name, trophy, season, place 
        HAVING COUNT(*) > 1
    `);

    if (duplicates.length > 0) {
        const dupeRows = duplicates[0].values;
        console.log(`⚠️  Found ${dupeRows.length} sets of duplicates.`);

        let totalDeleted = 0;
        for (const [player_id, league_name, trophy, season, place, count] of dupeRows) {
            // Get all IDs for this set, keep the characteristically "best" one (highest ID - usually latest import)
            const idsRes = db.exec(`
                SELECT id, created_at, league_name, country, season, place, trophy, competition_id 
                FROM V3_Trophies 
                WHERE player_id = ? 
                  AND trophy = ? 
                  AND IFNULL(season, '') = ? 
                  AND IFNULL(place, '') = ?
                  AND IFNULL(league_name, '') = ?
                ORDER BY id DESC
            `, [player_id, trophy, season || '', place || '', league_name || '']);

            if (idsRes.length > 0) {
                const results = idsRes[0].values;
                // Keep the first one (highest ID), delete the rest
                const keepId = results[0][0];
                const toDelete = results.slice(1);

                for (const delRow of toDelete) {
                    const rowData = {};
                    idsRes[0].columns.forEach((col, i) => { rowData[col] = delRow[i]; });
                    const delId = rowData.id;

                    db.run(`
                        INSERT INTO V3_Cleanup_History (group_id, table_name, original_pk_id, raw_data, reason)
                        VALUES (?, ?, ?, ?, ?)
                    `, [groupId, 'V3_Trophies', delId, JSON.stringify(rowData), 'DUPLICATE_ENTRY']);

                    db.run(`DELETE FROM V3_Trophies WHERE id = ?`, [delId]);
                    totalDeleted++;
                }
            }
        }
        console.log(`✅ Deleted ${totalDeleted} duplicate trophy records.`);
    } else {
        console.log('✅ No duplicates found.');
    }

    // 3. Orphan Check
    console.log('\n--- 3. Purging Orphan Trophies (No Player) ---');
    const orphans = db.exec(`
        SELECT id FROM V3_Trophies 
        WHERE player_id NOT IN (SELECT player_id FROM V3_Players)
    `);

    if (orphans.length > 0) {
        const rows = orphans[0].values;
        console.log(`⚠️  Found ${rows.length} orphan trophies. Deleting...`);
        for (const [id] of rows) {
            db.run(`DELETE FROM V3_Trophies WHERE id = ?`, [id]);
        }
        console.log(`✅ Cleaned ${rows.length} orphan records.`);
    } else {
        console.log('✅ No orphan trophies found.');
    }

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Trophy Cleanup Complete!');
    db.close();
}

run().catch(console.error);
