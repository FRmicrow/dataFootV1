import db from '../src/config/database.js';
import footballApi from '../src/services/footballApi.js';
import { getOrCreateCompetition } from '../src/utils/schemaHelpers.js';

async function importAllLeagues() {
    await db.init(); // Initialize database
    const season = 2024;
    console.log(`🌍 Starting import of all leagues for season ${season}...`);

    try {
        const response = await footballApi.getLeagues(season);

        if (!response || !response.response) {
            console.error('❌ Failed to fetch leagues from API');
            return;
        }

        const leaguesData = response.response;
        console.log(`📥 Fetched ${leaguesData.length} leagues/competitions.`);

        let count = 0;
        let newCount = 0;

        db.run('BEGIN TRANSACTION');

        for (const item of leaguesData) {
            const league = item.league;
            const country = item.country;

            // 1. Populate Legacy 'leagues' table (for compatibility)
            // We use the ID from API if possible, but our leagues table uses auto-increment ID mostly?
            // Actually, the schema for leagues has api_league_id.

            const existingLeague = db.get('SELECT id FROM leagues WHERE api_league_id = ?', [league.id]);
            let leagueId = existingLeague ? existingLeague.id : null;

            if (!existingLeague) {
                const result = db.run(
                    'INSERT INTO leagues (api_league_id, name, type, country, logo_url) VALUES (?, ?, ?, ?, ?)',
                    [league.id, league.name, league.type, country.name, league.logo]
                );
                leagueId = result.lastInsertRowid;
                // console.log(`  + Created legacy league: ${league.name}`);
            }

            // 2. Populate New Normalized Tables (championships, national_cups, etc.)
            // We use the helper which handles classification logic
            // Note: getOrCreateCompetition uses internal logic based on name/country.
            // But here we HAVE the explicit 'type' from API ('League' or 'Cup').
            // We should leverage that if getOrCreateCompetition relies on guessing.

            // However, getOrCreateCompetition splits by table.
            // Let's manually insert into the correct table to be precise, 
            // since we trust the API 'type' field more than name guesswork.

            let table = '';
            let type = '';

            const isInternational = country.name === 'World' || country.name === 'Europe'; // Simplified

            if (isInternational) {
                // Could be international_cups or national_team_cups
                // Distinguishing them is hard without more data, but usually "World Cup" is National Team.
                // "Champions League" is Club International.
                // API doesn't strictly distinguish Club vs National International easily in 'type'.
                // We will let getOrCreateCompetition handle international logic or use a heuristic.
                // Heuristic: If name contains "Champions League", "Europa", "Libertadores" -> International Cup (Club).
                // If name contains "World Cup", "Euro", "Copa America" -> National Team Cup.

                const name = league.name;
                if (name.includes('Champions League') || name.includes('Europa') || name.includes('Libertadores') || name.includes('Sudamericana')) {
                    table = 'international_cups';
                    type = 'international_cup';
                } else {
                    table = 'national_team_cups'; // Assume rest are national team (World Cup, etc)
                    type = 'cup'; // or national_team_cup
                }
            } else {
                if (league.type === 'League') {
                    table = 'championships';
                    type = 'championship';
                } else if (league.type === 'Cup') {
                    table = 'national_cups';
                    type = 'cup';
                }
            }

            if (table) {
                // Check if exists in the specific table
                let params = [league.name, country.name, league.logo];
                let sql = `SELECT id FROM ${table} WHERE name = ? AND country = ?`;
                // Some tables might not have country? (international_cups usually has 'World' etc in country column)
                // New schema: championships(name, country, logo_url), national_cups(name, country, logo_url)

                let existing = db.get(sql, [league.name, country.name]);

                if (!existing) {
                    db.run(`INSERT INTO ${table} (name, country, logo_url) VALUES (?, ?, ?)`, params);
                    newCount++;
                }
            }

            count++;
            if (count % 50 === 0) process.stdout.write('.');
        }

        db.run('COMMIT');
        console.log('\n✅ Import complete!');
        console.log(`   Processed: ${count}`);
        console.log(`   New Competitions Added: ${newCount}`);

    } catch (error) {
        console.error('\n❌ Error importing leagues:', error);
        try {
            if (db) db.run('ROLLBACK');
        } catch (rbError) {
            console.warn('  (Rollback failed or no transaction active)');
        }
    }
}

importAllLeagues();
