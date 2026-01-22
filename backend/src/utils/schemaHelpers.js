import db from '../config/database.js';

/**
 * Schema Helper Functions
 * These functions help interact with the new normalized schema
 */

/**
 * Find or create a country by name
 * Returns country_id or null
 */
export function getOrCreateCountry(countryName) {
    if (!countryName || countryName === 'World') return null;

    let country = db.get('SELECT id FROM countries WHERE name = ?', [countryName]);
    if (country) return country.id;

    // Try to create it
    try {
        const code = countryName.substring(0, 2).toUpperCase();
        const result = db.run('INSERT OR IGNORE INTO countries (name, code) VALUES (?, ?)', [countryName, code]);
        country = db.get('SELECT id FROM countries WHERE name = ?', [countryName]);
        return country ? country.id : null;
    } catch (e) {
        console.warn(`⚠️  Could not create country: ${countryName}`);
        return null;
    }
}

/**
 * Get or create club
 * Returns club object with id
 */
export function getOrCreateClub(apiTeamId, teamName, logoUrl, countryName) {
    // Check if club exists
    let club = db.get('SELECT id FROM clubs WHERE api_team_id = ?', [apiTeamId]);
    if (club) return club;

    // Get or create country
    const countryId = getOrCreateCountry(countryName) || getOrCreateCountry('Unknown');

    if (!countryId) {
        console.warn(`⚠️  Cannot create club without country: ${teamName}`);
        return null;
    }

    // Create club
    const result = db.run(
        'INSERT INTO clubs (api_team_id, name, logo_url, country_id) VALUES (?, ?, ?, ?)',
        [apiTeamId, teamName, logoUrl, countryId]
    );

    return { id: result.lastInsertRowid };
}

/**
 * Get or create national team
 * Returns national_team object with id
 */
export function getOrCreateNationalTeam(apiTeamId, teamName, countryName) {
    // Check if national team exists
    let team = db.get('SELECT id FROM national_teams WHERE api_team_id = ?', [apiTeamId]);
    if (team) return team;

    // Get or create country (use team name if no country provided)
    const countryId = getOrCreateCountry(countryName || teamName);

    if (!countryId) {
        console.warn(`⚠️  Cannot create national team without country: ${teamName}`);
        return null;
    }

    // Create national team
    const result = db.run(
        'INSERT INTO national_teams (api_team_id, name, country_id) VALUES (?, ?, ?)',
        [apiTeamId, teamName, countryId]
    );

    return { id: result.lastInsertRowid };
}

/**
 * Classify and store competition in appropriate table
 * Returns { table: 'championships'|'national_cups'|'international_cups'|'national_team_cups', id: number }
 */
export function getOrCreateCompetition(apiLeagueId, leagueName, country) {
    const name = leagueName.toLowerCase();

    // Check if it's a national team competition
    const isNationalTeamCup = name.includes('world cup') ||
        name.includes('euro') ||
        name.includes('copa america') ||
        name.includes('friendlies') ||
        name.includes('qualifiers') ||
        name.includes('nations league') ||
        name.includes('afcon') ||
        name.includes('asian cup') ||
        name.includes('conmebol');

    if (isNationalTeamCup) {
        // Check if exists
        let cup = db.get('SELECT id FROM national_team_cups WHERE api_league_id = ?', [apiLeagueId]);
        if (cup) return { table: 'national_team_cups', id: cup.id };

        // Create
        const result = db.run(
            'INSERT INTO national_team_cups (api_league_id, name, region) VALUES (?, ?, ?)',
            [apiLeagueId, leagueName, country || 'International']
        );
        return { table: 'national_team_cups', id: result.lastInsertRowid };
    }

    // Check if it's an international club cup
    const isInternationalCup = name.includes('champions league') ||
        name.includes('europa league') ||
        name.includes('conference league') ||
        name.includes('uefa super cup') ||
        name.includes('club world cup') ||
        name.includes('libertadores') ||
        name.includes('sudamericana');

    if (isInternationalCup) {
        // Check if exists
        let cup = db.get('SELECT id FROM international_cups WHERE api_league_id = ?', [apiLeagueId]);
        if (cup) return { table: 'international_cups', id: cup.id };

        // Create
        const result = db.run(
            'INSERT INTO international_cups (api_league_id, name, region) VALUES (?, ?, ?)',
            [apiLeagueId, leagueName, country || 'UEFA']
        );
        return { table: 'international_cups', id: result.lastInsertRowid };
    }

    // Check if it's a national cup
    const isNationalCup = name.includes('cup') ||
        name.includes('coupe') ||
        name.includes('copa del rey') ||
        name.includes('copa') ||
        name.includes('pokal') ||
        name.includes('coppa') ||
        name.includes('shield');

    if (isNationalCup) {
        // Check if exists
        let cup = db.get('SELECT id FROM national_cups WHERE api_league_id = ?', [apiLeagueId]);
        if (cup) return { table: 'national_cups', id: cup.id };

        // Create
        const countryId = getOrCreateCountry(country);
        if (!countryId) {
            console.warn(`⚠️  Cannot create national cup without country: ${leagueName}`);
            return null;
        }

        const result = db.run(
            'INSERT INTO national_cups (api_league_id, name, country_id) VALUES (?, ?, ?)',
            [apiLeagueId, leagueName, countryId]
        );
        return { table: 'national_cups', id: result.lastInsertRowid };
    }

    // Default to championship
    // Check if exists
    let championship = db.get('SELECT id FROM championships WHERE api_league_id = ?', [apiLeagueId]);
    if (championship) return { table: 'championships', id: championship.id };

    // Create
    const countryId = getOrCreateCountry(country);
    if (!countryId) {
        console.warn(`⚠️  Cannot create championship without country: ${leagueName}`);
        return null;
    }

    const result = db.run(
        'INSERT INTO championships (api_league_id, name, country_id) VALUES (?, ?, ?)',
        [apiLeagueId, leagueName, countryId]
    );
    return { table: 'championships', id: result.lastInsertRowid };
}
