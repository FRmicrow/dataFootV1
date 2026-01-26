import footballApi from '../src/services/footballApi.js';
import db from '../src/config/database.js';

/**
 * Tag teams that are playing in main leagues for 2025 season
 * This will identify teams in: Premier League, La Liga, Bundesliga, Serie A, Ligue 1
 */

const MAIN_LEAGUES = [
    { id: 39, name: 'Premier League', country: 'England' },
    { id: 140, name: 'La Liga', country: 'Spain' },
    { id: 78, name: 'Bundesliga', country: 'Germany' },
    { id: 135, name: 'Serie A', country: 'Italy' },
    { id: 61, name: 'Ligue 1', country: 'France' }
];

const SEASON = 2025;

async function tagMainLeagueTeams() {
    try {
        await db.init();
        console.log(`🏆 Tagging teams playing in main leagues for ${SEASON} season...\n`);

        let totalTagged = 0;

        for (const league of MAIN_LEAGUES) {
            console.log(`\n📍 Processing ${league.name} (ID: ${league.id})...`);

            try {
                // Fetch teams for this league and season
                console.log(`  Fetching teams for ${league.name}, season ${SEASON}...`);
                const response = await footballApi.getTeamsByLeague(league.id, SEASON);

                if (!response.response || response.response.length === 0) {
                    console.log(`  ⚠️ No teams found for ${league.name} in ${SEASON}`);
                    continue;
                }

                console.log(`  ✓ Found ${response.response.length} teams in league`);

                let tagged = 0;
                for (const teamData of response.response) {
                    const apiTeamId = teamData.team.id;
                    const teamName = teamData.team.name;

                    // Find this team in our database
                    const dbTeam = db.get('SELECT id FROM clubs WHERE api_team_id = ?', [apiTeamId]);

                    if (dbTeam) {
                        // Tag this team with the main league
                        db.run('UPDATE clubs SET main_league_id = ? WHERE id = ?', [league.id, dbTeam.id]);
                        tagged++;
                        console.log(`    ✓ Tagged: ${teamName}`);
                    } else {
                        console.log(`    ⏭️ Not in database: ${teamName}`);
                    }

                    // Small delay to avoid overwhelming console
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                console.log(`  ✅ Tagged ${tagged} teams in ${league.name}`);
                totalTagged += tagged;

            } catch (error) {
                console.error(`  ❌ Error processing ${league.name}:`, error.message);
            }
        }

        console.log(`\n✅ Tagging complete! Tagged ${totalTagged} teams total`);

        // Show summary
        const summary = db.all(`
            SELECT main_league_id, COUNT(*) as count
            FROM clubs
            WHERE main_league_id IS NOT NULL
            GROUP BY main_league_id
            ORDER BY main_league_id
        `);

        console.log('\n📊 Summary by league:');
        const leagueNames = {
            39: 'Premier League',
            140: 'La Liga',
            78: 'Bundesliga',
            135: 'Serie A',
            61: 'Ligue 1'
        };
        summary.forEach(s => {
            console.log(`  ${leagueNames[s.main_league_id]}: ${s.count} teams`);
        });

    } catch (error) {
        console.error('❌ Error tagging teams:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

tagMainLeagueTeams().then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
});
