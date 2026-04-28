
import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function renameLeagues() {
    await db.init();
    logger.info('🚀 Renaming conflicting leagues to avoid aggregation...');

    const updates = [
        { country: 'Tunisie', oldName: 'Ligue 1', newName: 'Ligue Professionnelle 1' },
        { country: 'Algerie', oldName: 'Ligue 1', newName: 'Ligue Professionnelle 1' },
        { country: 'Senegal', oldName: 'Ligue 1', newName: 'Ligue 1 (Sénégal)' },
        { country: 'Autriche', oldName: 'Bundesliga', newName: 'Bundesliga (Autriche)' },
        { country: 'Ukraine', oldName: 'Premier Liga', newName: 'Premier Liga (Ukraine)' }
    ];

    for (const update of updates) {
        const result = await db.run(`
            UPDATE v4.competitions 
            SET name = $1 
            WHERE name = $2 
              AND country_id IN (SELECT country_id FROM v4.countries WHERE display_name = $3)
        `, [update.newName, update.oldName, update.country]);

        if (result.changes > 0) {
            logger.info(`✅ Renamed ${update.oldName} to ${update.newName} for ${update.country}`);
        } else {
            logger.warn(`⚠️ No competition found for ${update.oldName} in ${update.country}`);
        }
    }

    logger.info('🏁 Renaming complete.');
    process.exit(0);
}

renameLeagues().catch(err => {
    logger.error(err);
    process.exit(1);
});
