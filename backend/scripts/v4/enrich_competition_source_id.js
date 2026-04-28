
import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const TOP_COMPETITION_MAPPING = {
    'Premier League': { id: 'GB1', url: 'https://www.transfermarkt.fr/premier-league/startseite/wettbewerb/GB1' },
    'Ligue 1': { id: 'FR1', url: 'https://www.transfermarkt.fr/ligue-1/startseite/wettbewerb/FR1' },
    'Bundesliga': { id: 'L1', url: 'https://www.transfermarkt.fr/bundesliga/startseite/wettbewerb/L1' },
    'Serie A': { id: 'IT1', url: 'https://www.transfermarkt.fr/serie-a/startseite/wettbewerb/IT1' },
    'LaLiga': { id: 'ES1', url: 'https://www.transfermarkt.fr/la-liga/startseite/wettbewerb/ES1' },
    'Eredivisie': { id: 'NL1', url: 'https://www.transfermarkt.fr/eredivisie/startseite/wettbewerb/NL1' },
    'Liga Portugal': { id: 'PO1', url: 'https://www.transfermarkt.fr/liga-nos/startseite/wettbewerb/PO1' },
    'Jupiler Pro League': { id: 'BE1', url: 'https://www.transfermarkt.fr/jupiler-pro-league/startseite/wettbewerb/BE1' },
    'Süper Lig': { id: 'TR1', url: 'https://www.transfermarkt.fr/super-lig/startseite/wettbewerb/TR1' },
    'Premiership': { id: 'SC1', url: 'https://www.transfermarkt.fr/scottish-premiership/startseite/wettbewerb/SC1' },
    'Ligue 2': { id: 'FR2', url: 'https://www.transfermarkt.fr/ligue-2/startseite/wettbewerb/FR2' },
    'Championship': { id: 'GB2', url: 'https://www.transfermarkt.fr/championship/startseite/wettbewerb/GB2' },
    '2. Bundesliga': { id: 'L2', url: 'https://www.transfermarkt.fr/2-bundesliga/startseite/wettbewerb/L2' }
};

async function enrichSourceId() {
    await db.init();
    logger.info('🚀 Starting competition source_id enrichment with TOP mapping...');

    // 1. Hardcoded mapping for top leagues
    let hardcodedCount = 0;
    for (const [name, data] of Object.entries(TOP_COMPETITION_MAPPING)) {
        const result = await db.run(`
            UPDATE v4.competitions 
            SET source_id = ?, source_url = COALESCE(source_url, ?)
            WHERE name = ? OR name = ?
        `, [data.id, data.url, name, name.replace(' (France)', '').replace(' (England)', '')]);
        if (result.changes > 0) hardcodedCount++;
    }
    logger.info(`✅ Applied hardcoded mapping for ${hardcodedCount} leagues`);

    // 2. Copy from source_code
    const copyResult = await db.run(`
        UPDATE v4.competitions 
        SET source_id = source_code 
        WHERE source_code IS NOT NULL AND source_id IS NULL
    `);
    logger.info(`✅ Copied ${copyResult.changes} IDs from source_code`);

    // 3. Extract from source_url
    const withUrl = await db.all(`
        SELECT competition_id, source_url 
        FROM v4.competitions 
        WHERE source_id IS NULL AND source_url IS NOT NULL
    `);

    let extractedCount = 0;
    for (const comp of withUrl) {
        const match = comp.source_url.match(/\/(?:wettbewerb|pokalwettbewerb)\/([^/]+)/);
        if (match && match[1]) {
            const code = match[1].split('/')[0].split('?')[0];
            await db.run(
                'UPDATE v4.competitions SET source_id = ? WHERE competition_id = ?',
                [code, comp.competition_id]
            );
            extractedCount++;
        }
    }
    logger.info(`✅ Extracted ${extractedCount} IDs from source_url`);

    logger.info('🏁 Enrichment complete.');
    process.exit(0);
}

enrichSourceId().catch(err => {
    logger.error(err);
    process.exit(1);
});
