
import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function fixLigue1Split() {
    await db.init();
    logger.info('🚀 Starting Ligue 1 split repair...');

    const frenchLigue1Id = '6899188781832966663';
    
    const stats = await db.all(`
        SELECT co.country_id, co.display_name as country, COUNT(*) as match_count 
        FROM v4.matches m 
        JOIN v4.teams t ON m.home_team_id = t.team_id 
        JOIN v4.countries co ON t.country_id = co.country_id 
        WHERE m.competition_id = $1
        GROUP BY co.country_id, co.display_name
    `, [frenchLigue1Id]);

    for (const stat of stats) {
        if (stat.country === 'France') continue;

        logger.info(`Fixing ${stat.match_count} matches for ${stat.country}...`);

        const tmCodes = {
            'Tunisie': 'TU1',
            'Algerie': 'ALG1',
            'Senegal': 'SN1'
        };
        const code = tmCodes[stat.country] || null;
        const sourceUrl = code ? `https://www.transfermarkt.fr/slug/startseite/wettbewerb/${code}` : null;
        const logoUrl = code ? `https://tmssl.akamaized.net//images/logo/mediumsmall/${code.toLowerCase()}.png` : null;

        const newCompId = (BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000))).toString();
        
        await db.run(`
            INSERT INTO v4.competitions (competition_id, country_id, name, competition_type, source_key, current_logo_url, source_url, importance_rank)
            VALUES ($1, $2, $3, 'league', $4, $5, $6, $7)
        `, [
            newCompId,
            stat.country_id, 
            'Ligue 1', 
            `${stat.country.toLowerCase()}-ligue1`,
            logoUrl,
            sourceUrl,
            stat.country === 'Algerie' || stat.country === 'Tunisie' ? 160 : 350
        ]);

        logger.info(`Created new competition ${newCompId} for ${stat.country}`);

        // 2. Move matches
        const moveResult = await db.run(`
            UPDATE v4.matches 
            SET competition_id = $1 
            WHERE competition_id = $2 
              AND home_team_id IN (SELECT team_id FROM v4.teams WHERE country_id = $3)
        `, [newCompId, frenchLigue1Id, stat.country_id]);

        logger.info(`✅ Moved ${moveResult.changes} matches to ${stat.country} Ligue 1`);
    }

    logger.info('🏁 Ligue 1 split repair complete.');
    process.exit(0);
}

fixLigue1Split().catch(err => {
    logger.error(err);
    process.exit(1);
});
