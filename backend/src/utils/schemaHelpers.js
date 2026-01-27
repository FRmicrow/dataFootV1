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
import { CLUB_MAPPINGS } from './clubMappings.js';

// ... (other imports)

// ...

/**
 * Get or create club
 * Returns club object with id
 */
export function getOrCreateClub(apiTeamId, teamName, logoUrl, countryName) {
    // 1. Normalize the name using the mapping
    const normalizedName = CLUB_MAPPINGS[teamName] || teamName;

    // Check if club exists by API ID
    let club = db.get('SELECT id FROM clubs WHERE api_team_id = ?', [apiTeamId]);
    if (club) {
        // Optional: Update name if it doesn't match normalized (self-correction)
        // db.run('UPDATE clubs SET name = ? WHERE id = ?', [normalizedName, club.id]);
        return club;
    }

    // Check if club exists by normalized name (to catch duplicates from different sources)
    club = db.get('SELECT id FROM clubs WHERE name = ?', [normalizedName]);
    if (club) {
        // If we found it by name but it didn't have this API ID, we should update the API ID?
        // Or maybe this is a different team?
        // For safety, let's assume if names match exactly (after normalization), it's the same club.
        // We can backfill the api_team_id if it's missing.
        if (apiTeamId) {
            db.run('UPDATE clubs SET api_team_id = ? WHERE id = ? AND api_team_id IS NULL', [apiTeamId, club.id]);
        }
        return club;
    }

    // Get or create country
    const countryId = getOrCreateCountry(countryName) || getOrCreateCountry('Unknown');

    if (!countryId) {
        console.warn(`⚠️  Cannot create club without country: ${teamName}`);
        return null;
    }

    // Create club
    const result = db.run(
        'INSERT INTO clubs (api_team_id, name, logo_url, country_id) VALUES (?, ?, ?, ?)',
        [apiTeamId, normalizedName, logoUrl, countryId]
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
