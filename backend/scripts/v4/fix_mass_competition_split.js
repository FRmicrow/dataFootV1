
import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function fixMassSplit() {
    await db.init();
    logger.info('🚀 Starting MASS competition split repair...');

    const SAUDI_TARGET_ID = '3059078367418546488';
    const SAUDI_SOURCE_ID = '1848880603703307437';

    // 1. Merge Saudi Arabia countries
    logger.info('🇸🇦 Merging "Arabie" into "Arabie saoudite"...');
    await db.run('UPDATE v4.teams SET country_id = $1 WHERE country_id = $2', [SAUDI_TARGET_ID, SAUDI_SOURCE_ID]);
    await db.run('UPDATE v4.competitions SET country_id = $1 WHERE country_id = $2', [SAUDI_TARGET_ID, SAUDI_SOURCE_ID]);
    await db.run('DELETE FROM v4.countries WHERE country_id = $1', [SAUDI_SOURCE_ID]);

    // 2. Identify and Split Mixed Competitions
    const COMPS_TO_CHECK = ['Bundesliga', 'Premier Liga', 'Superliga', 'Ligue 1', 'Saudi Pro League', 'Saudi First Division League'];
    
    for (const name of COMPS_TO_CHECK) {
        logger.info(`🔍 Checking ${name}...`);

        const comps = await db.all('SELECT competition_id, country_id FROM v4.competitions WHERE name = $1', [name]);
        for (const comp of comps) {
            const stats = await db.all(`
                SELECT co.country_id, co.display_name as country, COUNT(*) as match_count 
                FROM v4.matches m 
                JOIN v4.teams t ON m.home_team_id = t.team_id 
                JOIN v4.countries co ON t.country_id = co.country_id 
                WHERE m.competition_id = $1
                GROUP BY co.country_id, co.display_name
            `, [comp.competition_id]);

            if (stats.length <= 1) continue;

            logger.info(`Found ${stats.length} countries mixed in ${name} (ID: ${comp.competition_id})`);

            // The country assigned to the competition is the "canonical" one
            for (const stat of stats) {
                if (stat.country_id === comp.country_id) continue;

                logger.info(`Splitting ${stat.match_count} matches for ${stat.country} out of ${name}...`);

                // Create new competition
                const tmCodes = {
                    'Autriche': 'A1',
                    'Ukraine': 'UKR1',
                    'Russie': 'RU1',
                    'Danemark': 'DK1',
                    'Allemagne': 'L1'
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
                    name, 
                    `${stat.country.toLowerCase()}-${name.toLowerCase().replace(/\s+/g, '-')}`,
                    logoUrl,
                    sourceUrl,
                    150 // Default D1 rank
                ]);

                // Move matches
                const moveResult = await db.run(`
                    UPDATE v4.matches 
                    SET competition_id = $1 
                    WHERE competition_id = $2 
                      AND home_team_id IN (SELECT team_id FROM v4.teams WHERE country_id = $3)
                `, [newCompId, comp.competition_id, stat.country_id]);

                logger.info(`✅ Moved ${moveResult.changes} matches to new ${name} (${stat.country})`);
            }
        }
    }

    logger.info('🏁 Mass split repair complete.');
    process.exit(0);
}

fixMassSplit().catch(err => {
    logger.error(err);
    process.exit(1);
});
