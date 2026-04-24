import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../../src/config/database.js';
import DataImportServiceV4 from '../../src/services/v4/DataImportServiceV4.js';
import logger from '../../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    try {
        await db.init();
        
        const dumpDir = path.join(__dirname, '../../../SQL-V4-Missing-Detailed');
        const files = [
            'International-Club.sql.gz',
            'International-Nation.sql.gz'
        ];

        logger.info('🚀 Starting V40 Data Import Process...');

        for (const file of files) {
            const filePath = path.join(dumpDir, file);
            await DataImportServiceV4.importSqlGz(filePath);
        }

        logger.info('🎉 V40 Import Process Completed Successfully!');
        process.exit(0);
    } catch (err) {
        logger.error({ err }, '❌ Import Process Failed');
        process.exit(1);
    }
}

main();
