import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const up = async (db) => {
    const schemaDir = path.join(__dirname, '../../../sql/schema');
    const schemaFiles = [
        '01_V2_schema.sql',
        '02_V3_schema.sql',
        '03_V3_experimental_schema.sql',
        '04_V3_Tactical_Stats.sql',
        '05_V3_Import_Status.sql'
    ];

    console.log('📜 Applying Baseline SQL Schemas...');

    for (const file of schemaFiles) {
        const filePath = path.join(schemaDir, file);
        if (fs.existsSync(filePath)) {
            console.log(`  📄 Applying ${file}...`);
            const sql = fs.readFileSync(filePath, 'utf8');
            // Use the raw better-sqlite3 instance to execute multiple statements
            db.db.exec(sql);
        } else {
            console.warn(`  ⚠️ Schema file not found: ${file}`);
        }
    }
    
    console.log('✅ Baseline Schemas applied successfully.');
};
