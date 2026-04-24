import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function populateEditions() {
    await db.init();
    logger.info('Starting season to edition mapping...');

    // 1. Identify International Roots (World Cup, Euro, etc.)
    const roots = await db.all(`
        SELECT competition_id, name 
        FROM v4.competitions 
        WHERE name IN ('Coupe du monde', 'World Cup', 'Championnat d''Europe', 'Euro', 'Qualifications Euro', 'UEFA Champions League', 'UEFA Europa League')
    `);

    for (const root of roots) {
        logger.info(`Processing editions for root: ${root.name}`);
        
        // Get all related competition IDs
        const related = await db.all(`
            WITH RECURSIVE mapping AS (
                SELECT competition_id as comp_id FROM v4.competitions WHERE competition_id = ?
                UNION ALL
                SELECT r.source_id FROM mapping m JOIN v4.competition_relations r ON r.target_id = m.comp_id
            )
            SELECT comp_id FROM mapping
        `, [root.competition_id]);
        
        const compIds = related.map(r => r.comp_id);

        // Get all seasons for these comps
        const seasons = await db.all(`
            SELECT DISTINCT season_label 
            FROM v4.matches 
            WHERE competition_id IN (${compIds.join(',')})
        `);

        for (const s of seasons) {
            const label = s.season_label;
            let edition = null;

            // Extract all years from label (e.g. "1997-1998" -> [1997, 1998])
            const years = label.match(/\d{4}/g)?.map(y => parseInt(y)) || [];
            if (years.length === 0) continue;
            const latestYear = years[years.length - 1];

            if (root.name.includes('monde') || root.name.includes('World Cup')) {
                // World Cup: 1930 + 4*n. Check if any year in label is an edition year.
                const editionYearFound = years.find(y => (y - 1930) % 4 === 0);
                if (editionYearFound) {
                    edition = editionYearFound.toString();
                } else {
                    // Fallback: use the next upcoming edition
                    const offset = (latestYear - 1930) % 4;
                    edition = (latestYear + (4 - offset)).toString();
                }
            } else if (root.name.includes('Europe') || root.name.includes('Euro')) {
                // Euro: 1960 + 4*n.
                const editionYearFound = years.find(y => (y - 1960) % 4 === 0);
                if (editionYearFound) {
                    edition = editionYearFound.toString();
                } else {
                    const offset = (latestYear - 1960) % 4;
                    edition = (latestYear + (4 - offset)).toString();
                }
                // Handle 2020 special case
                if (edition === '2021' || latestYear === 2020 || latestYear === 2021) edition = '2020';
            } else {
                // For regular leagues (UCL, etc.), edition is just the year
                edition = latestYear.toString();
            }

            if (edition) {
                await db.run(`
                    INSERT INTO v4.season_editions (competition_id, season_label, edition_label)
                    VALUES (?, ?, ?)
                    ON CONFLICT (competition_id, season_label) DO UPDATE SET edition_label = EXCLUDED.edition_label
                `, [root.competition_id, label, edition]);
            }
        }
    }

    logger.info('Season mapping complete.');
    process.exit(0);
}

populateEditions().catch(err => {
    console.error(err);
    process.exit(1);
});
