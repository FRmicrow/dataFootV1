
import db from '../../src/config/database.js';
import scraper from '../../src/services/v4/TransfermarktScraperService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../src/utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function updateWithRetry(personId, details, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            await db.run(`
                UPDATE v4.people
                SET 
                    birth_date = CASE 
                        WHEN $1 ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE($1, 'DD/MM/YYYY')
                        ELSE birth_date
                    END,
                    birth_place = $2,
                    birth_country = $3,
                    height = $4,
                    preferred_foot = $5,
                    main_position = $6,
                    photo_url = COALESCE(photo_url, $7),
                    nationality_1 = $8,
                    nationality_2 = $9,
                    nationality_3 = $10,
                    nationality_4 = $11,
                    original_name = COALESCE(original_name, $12)
                WHERE person_id = $13
            `, [
                details.birth_date,
                details.birth_place,
                details.birth_country,
                details.height,
                details.preferred_foot,
                details.main_position,
                details.photo_url,
                details.nationalities[0] || null,
                details.nationalities[1] || null,
                details.nationalities[2] || null,
                details.nationalities[3] || null,
                details.original_name,
                personId
            ]);
            return true;
        } catch (err) {
            if (i === retries - 1) throw err;
            logger.warn(`⚠️ DB Update failed (attempt ${i + 1}/${retries}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

async function main() {
    try {
        await db.init();
        logger.info('🚀 Starting People Data Repair (Coaches Pass)...');

        const limit = 10000;
        const concurrency = 15;
        
        // Find coaches with TM ID but missing data
        const people = await db.all(`
            SELECT person_id, source_tm_id, full_name, person_type
            FROM v4.people
            WHERE source_tm_id <> ''
              AND person_type = 'coach'
              AND birth_date IS NULL
            LIMIT $1
        `, [limit]);

        logger.info(`Found ${people.length} coaches to repair.`);

        for (let i = 0; i < people.length; i += concurrency) {
            const batch = people.slice(i, i + concurrency);
            
            await Promise.all(batch.map(async (person) => {
                try {
                    const details = await scraper.fetchPlayerProfile(person.source_tm_id, person.person_type);
                    if (details) {
                        await updateWithRetry(person.person_id, details);
                        logger.info({ name: person.full_name, tmId: person.source_tm_id }, '✅ Coach Enriched');
                    } else {
                        logger.warn({ name: person.full_name, tmId: person.source_tm_id }, '⚠️ Failed to fetch coach details');
                    }
                } catch (err) {
                    logger.error({ name: person.full_name, tmId: person.source_tm_id, err: err.message }, '❌ Error processing coach');
                }
            }));

            if (scraper.errorCount >= scraper.MAX_ERRORS) {
                logger.error('🛑 Circuit breaker triggered. Stopping run.');
                break;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        logger.info('🏁 Coach Data Repair Finished.');
        process.exit(0);
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}

main();
