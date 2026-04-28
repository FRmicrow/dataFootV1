
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';
import db from '../src/config/database.js';
import logger from '../src/utils/logger.js';

async function recoverCompetitions() {
    await db.init();
    logger.info('🚀 Starting competition URL recovery...');

    const sqlFiles = [
        '../SQL-V4-Missing-Detailed-Fixed/Angleterre.sql',
        '../SQL-V4-Missing-Detailed-Fixed/International-Club.sql',
        '../SQL-V4-Missing-Detailed-Fixed/International-Nation.sql'
    ];

    let totalUpdated = 0;

    for (const file of sqlFiles) {
        const absolutePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(absolutePath)) {
            logger.warn(`File not found: ${absolutePath}`);
            continue;
        }

        logger.info(`📥 Processing ${file}...`);
        
        // Extract the COPY block
        const output = execSync(`sed -n '/COPY v4.competitions/,/\\\\./p' "${absolutePath}"`).toString();
        const lines = output.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('COPY') || line.startsWith('\\.') || !line.trim()) continue;
            
            const parts = line.split('\t');
            // Column mapping from SQL file:
            // 0: competition_id, 1: country_id, 2: name, 3: competition_type, 4: source_key, 5: current_logo_url, 6: source_url, 7: source_code
            const compId = parts[0];
            const sourceUrl = parts[6] === '\\N' ? null : parts[6];
            const sourceCode = parts[7] === '\\N' ? null : parts[7];

            if (sourceUrl || sourceCode) {
                const result = await db.run(
                    'UPDATE v4.competitions SET source_url = ?, source_code = ? WHERE competition_id = ?',
                    [sourceUrl, sourceCode, compId]
                );
                if (result.changes > 0) totalUpdated++;
            }
        }
    }

    logger.info(`✨ Recovery complete. Updated ${totalUpdated} competitions.`);
    process.exit(0);
}

recoverCompetitions().catch(err => {
    logger.error(err);
    process.exit(1);
});
