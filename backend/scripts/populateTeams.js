import footballApi from '../src/services/footballApi.js';
import db from '../src/config/database.js';

/**
 * Populate teams from specific countries
 * Countries: France, England, Germany, Italy, Spain, Portugal
 */

const TARGET_COUNTRIES = ['France', 'England', 'Germany', 'Italy', 'Spain', 'Portugal'];

async function populateTeams() {
    try {
        await db.init();
        console.log('🌍 Starting team population for:', TARGET_COUNTRIES.join(', '));

        let totalTeams = 0;

        for (const country of TARGET_COUNTRIES) {
            console.log(`\n📍 Fetching teams from ${country}...`);

            const response = await footballApi.getTeamsByCountry(country);

            if (!response.response || response.response.length === 0) {
                console.log(`  ⚠️ No teams found for ${country}`);
                continue;
            }

            const teams = response.response;
            console.log(`  ✓ Found ${teams.length} teams in ${country}`);

            // Get or create country
            let countryRecord = db.get('SELECT id FROM countries WHERE name = ?', [country]);
            if (!countryRecord) {
                db.run('INSERT INTO countries (name, code) VALUES (?, ?)', [country, country.substring(0, 2).toUpperCase()]);
                countryRecord = db.get('SELECT id FROM countries WHERE name = ?', [country]);
            }

            for (const teamData of teams) {
                const team = teamData.team;

                // Check if team already exists
                const existing = db.get('SELECT id FROM clubs WHERE api_team_id = ?', [team.id]);

                if (!existing) {
                    db.run(
                        `INSERT INTO clubs (api_team_id, name, logo_url, country_id) 
                         VALUES (?, ?, ?, ?)`,
                        [
                            team.id,
                            team.name,
                            team.logo,
                            countryRecord.id
                        ]
                    );
                    totalTeams++;
                    console.log(`  ✓ Added: ${team.name}`);
                } else {
                    console.log(`  ⏭️ Skipped (exists): ${team.name}`);
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        console.log(`\n✅ Population complete! Added ${totalTeams} new teams`);

        // Show summary
        const summary = db.all(`
            SELECT co.name as country, COUNT(c.id) as team_count
            FROM clubs c
            JOIN countries co ON c.country_id = co.id
            WHERE co.name IN ('France', 'England', 'Germany', 'Italy', 'Spain', 'Portugal')
            GROUP BY co.name
            ORDER BY co.name
        `);

        console.log('\n📊 Summary by country:');
        summary.forEach(s => console.log(`  ${s.country}: ${s.team_count} teams`));

    } catch (error) {
        console.error('❌ Error populating teams:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the population
populateTeams().then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
});
