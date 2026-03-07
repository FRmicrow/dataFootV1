import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Splits a SQL file into individual statements and runs each one via client.run().
 * This is required for PostgreSQL (pg) which does not support multi-statement exec.
 */
async function runSqlFile(client, filePath) {
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split on semicolons
    const rawStatements = sql.split(';');

    for (const raw of rawStatements) {
        const stmt = raw.trim();
        // Skip empty statements (like those caused by trailing semicolons)
        if (!stmt || stmt.length === 0) continue;

        // If it's JUST comments, skip it (optional but cleaner)
        if (stmt.split('\n').every(line => line.trim().startsWith('--') || line.trim() === '')) continue;
        try {
            await client.run(stmt);
        } catch (err) {
            console.error(`❌ Statement Failed: ${stmt.substring(0, 100)}...`);
            console.error(`❌ Error Message: ${err.message}`);

            // In PostgreSQL, any error aborts the transaction. 
            // We cannot "silently skip" and continue on the same client.
            throw err;
        }
    }
}

export const up = async (client) => {
    const schemaDir = path.join(__dirname, '../../../sql/schema');
    console.log('📜 Cleaning up Legacy V2 and Applying Baseline SQL Schemas...');

    const schemaFiles = [
        'V3_Cleanup_V2.sql',
        'V3_Baseline.sql'
    ];

    for (const file of schemaFiles) {
        const filePath = path.join(schemaDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`  📄 Applying ${file}...`);
            await runSqlFile(client, filePath);
        } else {
            console.warn(`  ⚠️ Schema file not found: ${file}`);
        }
    }

    console.log('✅ Cleanup and V3 Baseline applied successfully.');
};
