import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const up = async (db) => {
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
            const sql = fs.readFileSync(filePath, 'utf8');
            db.db.exec(sql);
        } else {
            console.warn(`  ⚠️ Schema file not found: ${file}`);
        }
    }

    console.log('✅ Cleanup and V3 Baseline applied successfully.');
};
