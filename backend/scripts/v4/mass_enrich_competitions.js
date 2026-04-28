
import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function massEnrich() {
    await db.init();
    logger.info('🚀 Starting MASS competition enrichment from logo URLs...');

    const competitions = await db.all(`
        SELECT competition_id, name, competition_type, current_logo_url, source_url, source_id 
        FROM v4.competitions 
        WHERE current_logo_url LIKE '%tmssl.akamaized.net%'
    `);

    logger.info(`Found ${competitions.length} competitions with Transfermarkt logos.`);

    let updatedCount = 0;
    for (const comp of competitions) {
        // Extract code from .../mediumsmall/CODE.png
        const match = comp.current_logo_url.match(/\/mediumsmall\/([^/.]+)\.png/);
        if (match && match[1]) {
            const code = match[1].toUpperCase();
            
            // Guess if it's a cup or league for URL
            const isCup = 
                comp.competition_type === 'cup' || 
                comp.competition_type === 'super_cup' || 
                comp.name.toLowerCase().includes('cup') || 
                comp.name.toLowerCase().includes('coupe') || 
                comp.name.toLowerCase().includes('pokal') || 
                comp.name.toLowerCase().includes('trophy');

            const baseUrl = isCup 
                ? `https://www.transfermarkt.fr/slug/startseite/pokalwettbewerb/${code}`
                : `https://www.transfermarkt.fr/slug/startseite/wettbewerb/${code}`;

            await db.run(`
                UPDATE v4.competitions 
                SET source_id = ?, 
                    source_url = COALESCE(source_url, ?)
                WHERE competition_id = ?
            `, [code, baseUrl, comp.competition_id]);
            updatedCount++;
        }
    }

    logger.info(`🏁 Mass enrichment complete. Updated ${updatedCount} competitions.`);
    process.exit(0);
}

massEnrich().catch(err => {
    logger.error(err);
    process.exit(1);
});
