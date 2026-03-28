import db from '../../src/config/database.js';

async function audit() {
    try {
        await db.init();
        console.log('--- FINAL 60-SEASON IDENTITY AUDIT ---');
        const seasons = await db.all("SELECT DISTINCT season_year FROM v3_fixtures WHERE league_id = 1 ORDER BY season_year DESC");
        for (const { season_year } of seasons) {
            const teams = await db.all(`
                SELECT DISTINCT t.team_id, t.name, t.data_source
                FROM v3_fixtures f
                JOIN v3_teams t ON (f.home_team_id = t.team_id OR f.away_team_id = t.team_id)
                WHERE f.league_id = 1 AND f.season_year = $1
            `, [season_year]);
            console.log(`Season ${season_year} (${teams.length} teams):`);
            teams.forEach(t => console.log(`  - [${t.team_id}] ${t.name} (${t.data_source})`));
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
audit();
