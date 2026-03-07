import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

import db from './src/config/database.js';

async function repairSequences() {
    try {
        await db.init();

        console.log('🛠️ Starting Comprehensive Sequence Repair...');

        // Find all sequences associated with V3 tables
        const cols = await db.all(`
            SELECT table_name, column_name, column_default 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name LIKE 'v3_%' 
              AND column_default LIKE 'nextval(%'
        `);

        console.log(`🔍 Found ${cols.length} sequences to check.`);

        for (const c of cols) {
            const match = c.column_default.match(/nextval\('(.+?)'::regclass\)/);
            if (!match) continue;

            const seqName = match[1];
            const tableName = c.table_name;
            const colName = c.column_name;

            // Get current max ID
            const result = await db.get(`SELECT MAX(${colName}) as max_val FROM ${tableName}`);
            const maxId = result.max_val;

            if (maxId === null) {
                console.log(`   ⏭️ Table ${tableName} is empty, skipping sequence ${seqName}.`);
                continue;
            }

            // Get current sequence value
            const seqResult = await db.get(`SELECT last_value FROM ${seqName}`);
            const currentSeq = seqResult.last_value;

            if (maxId >= currentSeq) {
                console.log(`   ⚙️ Adjusting ${seqName}: Current ${currentSeq} -> Required ${maxId + 1}`);
                // In PostgreSQL, setval(seq, val, true) sets the last_value and makes nextval return val+1
                await db.run(`SELECT setval('${seqName}', ${maxId}, true)`);
                console.log(`   ✅ Sequence ${seqName} synchronized to ${maxId}.`);
            } else {
                console.log(`   👍 Sequence ${seqName} is already healthy (${currentSeq} > ${maxId}).`);
            }
        }

        console.log('\n🎉 Sequence Repair Complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Sequence Repair Failed:', error);
        process.exit(1);
    }
}

repairSequences();
