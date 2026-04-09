import db from '../../config/database.js';

/**
 * US_301: Synchronize all V3 sequences with their current max ID.
 * This prevents "duplicate key value violates unique constraint" errors 
 * that occur when the underlying sequence gets behind the actual data
 * (often after manual data imports or migrations).
 */
export const syncAllV3Sequences = async (logCallback = console.log) => {
    try {
        const cols = await db.all(`
            SELECT table_name, column_name, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name LIKE 'v3_%' 
              AND column_default LIKE 'nextval(%'
        `);

        let fixedCount = 0;
        for (const c of cols) {
            const match = c.column_default.match(/nextval\('(.+?)'::regclass\)/);
            if (!match) continue;

            const seqName = match[1];
            const query = `SELECT MAX(${c.column_name}) as max_val FROM ${c.table_name}`;
            const result = await db.get(query);

            if (result && result.max_val !== null) {
                await db.run(`SELECT setval('${seqName}', ${result.max_val}, true)`);
                fixedCount++;
            }
        }
        logCallback(`✅ Successfully synchronized ${fixedCount} database sequences.`);
        return { success: true, fixedCount };
    } catch (err) {
        logCallback(`❌ Sequence synchronization failed: ${err.message}`);
        return { success: false, error: err.message };
    }
};
