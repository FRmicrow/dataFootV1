import db from '../src/config/database.js';
import footballApi from '../src/services/footballApi.js';

async function importReferenceData() {
    console.log('🌍 Starting Reference Data Import...');
    await db.init();

    try {
        // ---------------------------------------------------------
        // 1. COUNTRIES
        // ---------------------------------------------------------
        console.log('\n--- Importing Countries ---');
        const countriesData = await footballApi.getCountries();
        if (countriesData && countriesData.response) {
            const countries = countriesData.response;
            console.log(`📥 Fetched ${countries.length} countries.`);

            // Insert into 'countries' table
            for (const c of countries) {
                // Determine flag/code if available, but primarily Name.
                // API returns { name: "France", code: "FR", flag: "url" }
                // Schema: countries(name, code, flag_url)

                db.run(
                    'INSERT OR IGNORE INTO countries (name, code, flag_url) VALUES (?, ?, ?)',
                    [c.name, c.code, c.flag]
                );
            }
            console.log('✅ Countries imported.');
        } else {
            console.error('❌ Failed to fetch countries.');
        }

        // ---------------------------------------------------------
        // 2. LEAGUES
        // ---------------------------------------------------------
        console.log('\n--- Importing Leagues ---');
        const season = 2024;
        const leaguesResponse = await footballApi.getLeagues(season);
        let targetLeagueIds = []; // To store IDs of major leagues for Team import

        // Define target leagues for Team Import (approximate names)
        const targetLeagues = [
            { name: 'Premier League', country: 'England' },
            { name: 'Ligue 1', country: 'France' },
            { name: 'La Liga', country: 'Spain' }, // Often just 'La Liga' or 'Primera Division'
            { name: 'Bundesliga', country: 'Germany' },
            { name: 'Serie A', country: 'Italy' },
            { name: 'Primeira Liga', country: 'Portugal' }, // 'Liga Portugal'
            { name: 'Eredivisie', country: 'Netherlands' }
        ];

        if (leaguesResponse && leaguesResponse.response) {
            const leaguesList = leaguesResponse.response;
            console.log(`📥 Fetched ${leaguesList.length} leagues for ${season}.`);



            for (const item of leaguesList) {
                const league = item.league;
                const country = item.country;

                // Insert into legacy 'leagues' table
                // Note: Schema might vary, checking legacy schema usage: 
                // typically: api_league_id, name, country. 
                // We use INSERT OR IGNORE based on api_league_id usually?
                // Or just name?
                // Let's use name/country as key or api_league_id.
                // Legacy schema likely has api_league_id UNIQUE.

                db.run(
                    'INSERT OR IGNORE INTO leagues (api_league_id, name, country) VALUES (?, ?, ?)',
                    [league.id, league.name, country.name]
                );

                // Also populate New Tables: championships, national_cups, etc.
                // Need to get country_id for foreign key
                let countryId = null;
                if (country.name !== 'World' && country.name !== 'Europe') {
                    const countryRecord = db.get('SELECT id FROM countries WHERE name = ?', [country.name]);
                    countryId = countryRecord ? countryRecord.id : null;
                }

                let table = '';
                let isInternational = false;

                if (country.name === 'World' || country.name === 'Europe') {
                    isInternational = true;
                    if (league.type === 'Cup') table = 'international_cups';
                } else if (countryId) {
                    if (league.type === 'League') table = 'championships';
                    else if (league.type === 'Cup') table = 'national_cups';
                }

                if (table) {
                    if (isInternational) {
                        // International competitions: api_league_id, name, region
                        db.run(`INSERT OR IGNORE INTO ${table} (api_league_id, name, region) VALUES (?, ?, ?)`,
                            [league.id, league.name, country.name]);
                    } else {
                        // National competitions: api_league_id, name, country_id
                        db.run(`INSERT OR IGNORE INTO ${table} (api_league_id, name, country_id) VALUES (?, ?, ?)`,
                            [league.id, league.name, countryId]);
                    }
                }

                // Check for Target Leagues
                const isTarget = targetLeagues.some(tl =>
                    league.name.includes(tl.name) && country.name === tl.country
                );
                // Extra check for La Liga which might be strictly 'La Liga'
                // Extra check for Liga Portugal
                const isLigaPortugal = (league.name.includes('Liga Portugal') && country.name === 'Portugal');

                if (isTarget || isLigaPortugal) {
                    // Only top tier! usually 'type': 'League'.
                    // Avoid 'Premier League 2' etc.
                    // API 'league.type' is 'League'.
                    // We can check if it's the main one? Hard without ID.
                    // But assume names are specific enough or we accept 2nd tiers.
                    // 'Premier League' is specific. 'Bundesliga' includes '2. Bundesliga'.
                    // We'll exclude '2' or 'Women' if we want strict?
                    // User said "Get all team from ... premier league".
                    // I'll filter strictly if possible.
                    if (!league.name.includes('Women') && !league.name.includes('2') && !league.name.includes('U21')) {
                        targetLeagueIds.push({ id: league.id, name: league.name, country: country.name });
                    }
                }
            }
            console.log('✅ Leagues imported.');
        } else {
            console.error('❌ Failed to fetch leagues.');
        }

        // ---------------------------------------------------------
        // 3. TEAMS (Targeted)
        // ---------------------------------------------------------
        console.log('\n--- Importing Teams for Major Leagues ---');
        console.log(`Targets found: ${targetLeagueIds.map(l => `${l.name} (${l.country})`).join(', ')}`);

        for (const target of targetLeagueIds) {
            console.log(`Fetching teams for ${target.name}...`);
            const teamsResponse = await footballApi.getTeamsFromLeague(target.id, season);

            if (teamsResponse && teamsResponse.response) {
                const teamsList = teamsResponse.response;
                console.log(`  -> Found ${teamsList.length} teams.`);

                // db.run('BEGIN TRANSACTION'); // Per league transaction
                // Avoid big transaction for API loop

                for (const item of teamsList) {
                    const team = item.team;
                    // Insert into 'clubs' (New Table)
                    // Schema: clubs(name, logo_url, country)
                    // We also have api_team_id? No, schema was (id, name, logo_url, country).
                    // We should check duplicates by name?

                    // We'll use INSERT OR IGNORE on Name?
                    // Or check existence.

                    // Get country_id for this team
                    const countryRecord = db.get('SELECT id FROM countries WHERE name = ?', [target.country]);
                    if (countryRecord) {
                        // Insert into 'clubs' with api_team_id and country_id
                        db.run('INSERT OR IGNORE INTO clubs (api_team_id, name, logo_url, country_id) VALUES (?, ?, ?, ?)',
                            [team.id, team.name, team.logo, countryRecord.id]);
                    }

                    // Also populate Legacy 'teams' table? User said "Fill up the DB with the team name".
                    // Legacy 'teams' has api_team_id.
                    db.run('INSERT OR IGNORE INTO teams (api_team_id, name, logo_url) VALUES (?, ?, ?)',
                        [team.id, team.name, team.logo]);
                }
                // db.run('COMMIT');
            } else {
                console.warn(`  ❌ Failed to fetch teams for ${target.name}`);
            }
        }
        console.log('✅ Teams imported.');

    } catch (error) {
        console.error('\n❌ Error during import:', error);
    }
}

importReferenceData();
