import 'dotenv/config';
import db from '../../src/config/database.js';

async function finalizeMapping() {
    try {
        await db.init();
        const targets = {
            'Nancy': 'Nancy',
            'Saint-Etienne': 'Saint-Etienne',
            'Sochaux': 'Sochaux',
            'Lyon': 'Lyon',
            'Paris': 'Paris',
            'Rennes': 'Rennes',
            'Toulouse': 'Toulouse'
        };

        for (const [key, search] of Object.entries(targets)) {
            const matches = await db.all("SELECT team_id, name, country, scout_rank FROM v3_teams WHERE name ILIKE $1 ORDER BY scout_rank DESC NULLS LAST", [`%${search}%`]);
            console.log(`\nResults for ${key}:`);
            matches.slice(0, 10).forEach(m => console.log(`- ${m.name} (ID: ${m.team_id}, Rank: ${m.scout_rank}, Country: ${m.country})`));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

finalizeMapping();
