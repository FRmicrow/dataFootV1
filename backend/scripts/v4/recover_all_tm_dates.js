
import db from '../../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import TransfermarktScraperService from '../../src/services/v4/TransfermarktScraperService.js';
import logger from '../../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    try {
        await db.init();
        
        // 1. Fetch all competitions that have missing dates
        const competitions = await db.all(`
            SELECT c.competition_id, c.name, COUNT(*) as missing_count
            FROM v4.matches m
            JOIN v4.competitions c ON m.competition_id = c.competition_id
            WHERE m.match_date IS NULL AND m.source_match_id IS NOT NULL
            GROUP BY c.competition_id, c.name
            ORDER BY missing_count DESC
        `);

        logger.info({ competitionCount: competitions.length }, '🌍 Global Recovery Started');
        console.log('\n--- GLOBAL PROGRESS TRACKER ---');

        for (const comp of competitions) {
            console.log(`\n🏆 Processing League: ${comp.name} (${comp.missing_count} missing dates)`);
            
            // Process the whole league
            // The service handles limit internally if needed, but here we go for the full league
            const result = await TransfermarktScraperService.recoverMissingDates(comp.competition_id, comp.missing_count);
            
            console.log(`✅ Completed ${comp.name}: ${result.repaired} repaired, ${result.skipped} skipped.`);
            
            // Short break between leagues
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        logger.info('🏁 Global Recovery Finished');
        process.exit(0);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}

main();
