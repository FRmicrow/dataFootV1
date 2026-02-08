/**
 * Intelligent Competition Detection Service
 * 
 * This service implements a multi-step approach to accurately identify competitions
 * when importing player statistics, reducing orphaned/missing competition data.
 */

import db from '../config/database.js';

/**
 * Step 1: Try to find competition in existing V2_competitions table
 * Matches by API ID first, then by name
 */
const findExistingCompetition = (league, countryId) => {
    if (!league || !league.name) return null;

    let compRow;

    // Try by API ID first (most reliable)
    if (league.id) {
        compRow = db.get(
            "SELECT competition_id, competition_name FROM V2_competitions WHERE api_id = ?",
            [league.id]
        );
        if (compRow) {
            console.log(`✓ Found competition by API ID: ${compRow.competition_name} (ID: ${compRow.competition_id})`);
            return compRow.competition_id;
        }
    }

    // Try exact name match
    compRow = db.get(
        "SELECT competition_id, competition_name FROM V2_competitions WHERE competition_name = ?",
        [league.name]
    );

    if (compRow) {
        console.log(`✓ Found competition by name: ${compRow.competition_name} (ID: ${compRow.competition_id})`);
        return compRow.competition_id;
    }

    // Try fuzzy name match (handles slight variations)
    const fuzzyName = league.name.toLowerCase().trim();
    compRow = db.get(
        "SELECT competition_id, competition_name FROM V2_competitions WHERE LOWER(TRIM(competition_name)) = ?",
        [fuzzyName]
    );

    if (compRow) {
        console.log(`✓ Found competition by fuzzy name: ${compRow.competition_name} (ID: ${compRow.competition_id})`);
        return compRow.competition_id;
    }

    // NEW: Try country-filtered fuzzy match (prevents matching wrong country's competitions)
    if (countryId) {
        compRow = db.get(`
            SELECT competition_id, competition_name, country_id
            FROM V2_competitions 
            WHERE country_id = ? 
            AND LOWER(TRIM(competition_name)) LIKE ?
            ORDER BY level ASC
            LIMIT 1
        `, [countryId, `%${fuzzyName}%`]);

        if (compRow) {
            console.log(`✓ Found competition by country-filtered match: ${compRow.competition_name} (ID: ${compRow.competition_id})`);
            return compRow.competition_id;
        }

        // Try matching by short name
        compRow = db.get(`
            SELECT competition_id, competition_name, competition_short_name
            FROM V2_competitions 
            WHERE country_id = ? 
            AND (LOWER(TRIM(competition_short_name)) LIKE ? OR LOWER(TRIM(competition_name)) LIKE ?)
            ORDER BY level ASC
            LIMIT 1
        `, [countryId, `%${fuzzyName}%`, `%${fuzzyName}%`]);

        if (compRow) {
            console.log(`✓ Found competition by country + short name: ${compRow.competition_name} (ID: ${compRow.competition_id})`);
            return compRow.competition_id;
        }
    }

    return null;
};

/**
 * Step 2: Analyze existing data to infer competition
 * Looks for similar players (same club, same season, similar matches played)
 */
const inferCompetitionFromSimilarPlayers = (clubId, season, matchesPlayed) => {
    if (!clubId || !season || !matchesPlayed) return null;

    // Find players from same club and season with similar match count (±3 matches)
    const similarStats = db.all(`
        SELECT 
            ps.competition_id,
            c.competition_name,
            COUNT(*) as player_count,
            AVG(ps.matches_played) as avg_matches
        FROM V2_player_statistics ps
        JOIN V2_competitions c ON ps.competition_id = c.competition_id
        WHERE ps.club_id = ?
        AND ps.season = ?
        AND ps.competition_id IS NOT NULL
        AND ABS(ps.matches_played - ?) <= 3
        GROUP BY ps.competition_id, c.competition_name
        ORDER BY player_count DESC, ABS(avg_matches - ?) ASC
        LIMIT 1
    `, [clubId, season, matchesPlayed, matchesPlayed]);

    if (similarStats && similarStats.length > 0) {
        const match = similarStats[0];
        console.log(`🔍 Inferred competition from similar players: ${match.competition_name} (${match.player_count} similar players)`);
        return match.competition_id;
    }

    return null;
};

/**
 * Step 3: Analyze by club's typical competitions
 * Finds the most common competition for a club in a given season
 */
const inferCompetitionFromClubHistory = (clubId, season) => {
    if (!clubId || !season) return null;

    // Find most common competition for this club in this season
    const clubComps = db.all(`
        SELECT 
            ps.competition_id,
            c.competition_name,
            COUNT(*) as usage_count
        FROM V2_player_statistics ps
        JOIN V2_competitions c ON ps.competition_id = c.competition_id
        WHERE ps.club_id = ?
        AND ps.season = ?
        AND ps.competition_id IS NOT NULL
        GROUP BY ps.competition_id, c.competition_name
        ORDER BY usage_count DESC
        LIMIT 1
    `, [clubId, season]);

    if (clubComps && clubComps.length > 0) {
        const match = clubComps[0];
        console.log(`🏆 Inferred competition from club history: ${match.competition_name} (${match.usage_count} players)`);
        return match.competition_id;
    }

    return null;
};

/**
 * Step 4: Get default competition for a country/league type
 * Returns the primary domestic league for a country
 */
const getDefaultDomesticLeague = (countryId) => {
    if (!countryId) return null;

    // Get the competition with lowest trophy_type_id for this country (typically the top league)
    const defaultComp = db.get(`
        SELECT competition_id, competition_name
        FROM V2_competitions
        WHERE country_id = ?
        AND trophy_type_id IS NOT NULL
        ORDER BY trophy_type_id ASC
        LIMIT 1
    `, [countryId]);

    if (defaultComp) {
        console.log(`🌍 Using default domestic league: ${defaultComp.competition_name}`);
        return defaultComp.competition_id;
    }

    return null;
};

/**
 * Main intelligent competition detection function
 * Tries multiple strategies in order of reliability
 */
export const detectCompetition = (league, clubId, season, matchesPlayed, countryId) => {
    console.log(`\n🔎 Detecting competition for: ${league?.name || 'Unknown'} (Club: ${clubId}, Season: ${season}, Country: ${countryId})`);

    // Strategy 1: Find in existing competitions table (with country filtering)
    let competitionId = findExistingCompetition(league, countryId);
    if (competitionId) return competitionId;

    // Strategy 2: Infer from similar players (same club, season, similar matches)
    competitionId = inferCompetitionFromSimilarPlayers(clubId, season, matchesPlayed);
    if (competitionId) return competitionId;

    // Strategy 3: Infer from club's most common competition in that season
    competitionId = inferCompetitionFromClubHistory(clubId, season);
    if (competitionId) return competitionId;

    // Strategy 4: Use default domestic league for the country
    if (countryId) {
        competitionId = getDefaultDomesticLeague(countryId);
        if (competitionId) return competitionId;
    }

    // If all strategies fail, return null (will be flagged for manual review)
    console.log(`❌ Could not detect competition - will flag for manual review`);
    return null;
};

/**
 * Create a new competition entry (only when absolutely necessary)
 * This should be called sparingly - most competitions should already exist
 */
export const createCompetitionIfNecessary = (league, countryId) => {
    if (!league || !league.name) return null;

    try {
        const apiId = league.id || null;
        const cName = league.country || 'World';

        // Resolve country
        const countryRow = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [cName]);
        const finalCountryId = countryRow ? countryRow.country_id : (countryId || 1);

        console.log(`⚠️ Creating new competition: ${league.name} (Country: ${cName})`);

        db.run(
            "INSERT INTO V2_competitions (competition_name, api_id, country_id) VALUES (?, ?, ?)",
            [league.name, apiId, finalCountryId]
        );

        if (apiId) {
            const compRow = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [apiId]);
            return compRow ? compRow.competition_id : null;
        } else {
            const compRow = db.get("SELECT competition_id FROM V2_competitions WHERE competition_name = ?", [league.name]);
            return compRow ? compRow.competition_id : null;
        }
    } catch (e) {
        console.error("Error creating competition:", e.message);
        return null;
    }
};

/**
 * Track unresolved competitions for manual review
 */
export const logUnresolvedCompetition = (playerId, clubId, season, leagueName, matchesPlayed) => {
    try {
        db.run(`
            INSERT OR IGNORE INTO V2_unresolved_competitions 
            (player_id, club_id, season, league_name, matches_played, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [playerId, clubId, season, leagueName, matchesPlayed]);
    } catch (e) {
        // Table might not exist yet - will be created in migration
        console.log("Note: V2_unresolved_competitions table not yet created");
    }
};

/**
 * Get all unresolved competitions for manual review interface
 */
export const getUnresolvedCompetitions = () => {
    try {
        return db.all(`
            SELECT 
                u.*,
                p.first_name,
                p.last_name,
                c.club_name,
                co.country_name
            FROM V2_unresolved_competitions u
            JOIN V2_players p ON u.player_id = p.player_id
            JOIN V2_clubs c ON u.club_id = c.club_id
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            WHERE u.resolved = 0
            ORDER BY u.matches_played DESC, u.created_at DESC
        `);
    } catch (e) {
        return [];
    }
};

export default {
    detectCompetition,
    createCompetitionIfNecessary,
    logUnresolvedCompetition,
    getUnresolvedCompetitions
};
