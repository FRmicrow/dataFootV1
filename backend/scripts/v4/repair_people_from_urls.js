import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

async function repairPeople() {
    await db.init();
    logger.info('Starting People repair from Source URLs...');

    // 1. Find players in lineups who are missing in people table OR have no name
    const orphans = await db.all(`
        SELECT DISTINCT l.player_id, l.player_source_url
        FROM v4.match_lineups l
        WHERE l.player_source_url IS NOT NULL 
          AND l.player_source_url != ''
          AND (
            NOT EXISTS (SELECT 1 FROM v4.people p WHERE p.person_id = l.player_id)
            OR EXISTS (SELECT 1 FROM v4.people p WHERE p.person_id = l.player_id AND (p.full_name IS NULL OR p.full_name = ''))
          )
    `);

    logger.info(`Found ${orphans.length} potential players to repair/create.`);

    let repaired = 0;
    let created = 0;

    for (const orphan of orphans) {
        try {
            // Extract name from URL: https://www.transfermarkt.fr/cafu/profil/spieler/5937 -> cafu
            // We can do better by replacing hyphens with spaces and capitalizing
            const url = orphan.player_source_url;
            const match = url.match(/\/([^\/]+)\/profil\/spieler/);
            if (!match) continue;

            let name = match[1]
                .replace(/-/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Clean up some common prefixes
            name = name.replace(/%C3%A9/g, 'é')
                       .replace(/%C3%A1/g, 'á')
                       .replace(/%C3%B3/g, 'ó')
                       .replace(/%C3%AD/g, 'í')
                       .replace(/%C3%BA/g, 'ú')
                       .replace(/%C3%B1/g, 'ñ');

            // Check if person exists
            const existing = await db.get('SELECT person_id FROM v4.people WHERE person_id = ?', [orphan.player_id]);

            if (existing) {
                await db.run('UPDATE v4.people SET full_name = ? WHERE person_id = ?', [name, orphan.player_id]);
                repaired++;
            } else {
                // Create minimal record
                // We use ON CONFLICT DO NOTHING because of the unique name index
                await db.run(`
                    INSERT INTO v4.people (person_id, full_name, person_type, source_tm_id)
                    VALUES (?, ?, 'player', ?)
                    ON CONFLICT DO NOTHING
                `, [orphan.player_id, name, url.split('/').pop()]);
                created++;
            }
        } catch (err) {
            logger.error(`Failed to process ${orphan.player_source_url}: ${err.message}`);
        }
    }

    logger.info(`Done! Repaired: ${repaired}, Created: ${created}`);
    process.exit(0);
}

repairPeople().catch(err => {
    console.error(err);
    process.exit(1);
});
