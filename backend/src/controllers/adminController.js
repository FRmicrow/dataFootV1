import db from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { detectCompetition, createCompetitionIfNecessary, logUnresolvedCompetition } from '../services/competitionDetectionService.js';

dotenv.config();

// Ensure Key is loaded
const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

export const getDuplicateClubs = async (req, res) => {
    try {
        const { countryId } = req.query;

        // Fetch all clubs for the target country (or all if countryId is null)
        let sql = `
            SELECT 
                c.club_id, c.club_name, c.club_logo_url, c.country_id, co.country_name
            FROM V2_clubs c
            JOIN V2_countries co ON c.country_id = co.country_id
            WHERE LENGTH(c.club_name) > 2
        `;

        const params = [];
        if (countryId) {
            sql += ` AND c.country_id = ?`;
            params.push(countryId);
        }

        sql += ` ORDER BY co.country_name, c.club_name`;

        const allClubs = db.all(sql, params);
        const duplicates = [];

        // JS-based fuzzy matching
        for (let i = 0; i < allClubs.length; i++) {
            for (let j = i + 1; j < allClubs.length; j++) {
                const c1 = allClubs[i];
                const c2 = allClubs[j];

                // Must be same country - DISABLED per user request for global duplicate finding
                // if (c1.country_id !== c2.country_id) continue;

                const name1 = c1.club_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const name2 = c2.club_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

                // 1. Exact match
                if (name1 === name2) {
                    duplicates.push(createPair(c1, c2, "Exact Match"));
                    continue;
                }

                // 2. Comma containment
                if (name1.includes(name2) || name2.includes(name1)) {
                    duplicates.push(createPair(c1, c2, "Containment"));
                    continue;
                }

                // 3. Word Intersection
                const words1 = name1.split(/[\s-]+/).filter(w => w.length > 2);
                const words2 = name2.split(/[\s-]+/).filter(w => w.length > 2);

                const stopWords = ["the", "and", "fc", "fk", "sc", "sv", "as", "ac", "cd", "cf", "club", "city", "united", "sporting", "real", "athletic", "atletico", "olympique", "stade", "racing", "union", "inter"];

                const filteredWords1 = words1.filter(w => !stopWords.includes(w));
                const filteredWords2 = words2.filter(w => !stopWords.includes(w));

                const intersection = filteredWords1.filter(w => filteredWords2.includes(w));
                if (intersection.length > 0) {
                    duplicates.push(createPair(c1, c2, `Word Match: ${intersection.join(', ')}`));
                }
            }
        }

        res.json(duplicates);
    } catch (error) {
        console.error('Error fetching duplicate clubs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

function createPair(c1, c2, reason) {
    return {
        id1: c1.club_id,
        name1: c1.club_name,
        logo1: c1.club_logo_url,
        id2: c2.club_id,
        name2: c2.club_name,
        logo2: c2.club_logo_url,
        country_id: c1.country_id,
        country_name: c1.country_name,
        reason
    };
}

export const mergeClubs = async (req, res) => {
    const { targetId, sourceId } = req.body;

    if (!targetId || !sourceId) {
        return res.status(400).json({ error: 'Target ID and Source ID are required' });
    }

    try {
        const target = db.get("SELECT * FROM V2_clubs WHERE club_id = ?", [targetId]);
        const source = db.get("SELECT * FROM V2_clubs WHERE club_id = ?", [sourceId]);

        if (!target || !source) {
            return res.status(404).json({ error: 'Club not found' });
        }

        // 1. Merge Club Details
        const updates = [];
        const params = [];

        const fields = ['club_short_name', 'city', 'stadium_name', 'stadium_capacity', 'founded_year', 'club_logo_url'];
        fields.forEach(field => {
            if (!target[field] && source[field]) {
                updates.push(`${field} = ?`);
                params.push(source[field]);
            }
        });

        if (updates.length > 0) {
            params.push(targetId);
            db.run(`UPDATE V2_clubs SET ${updates.join(', ')} WHERE club_id = ?`, params);
        }

        // 2. Resolve Conflicts & Update Foreign Keys
        db.run(`DELETE FROM V2_player_statistics WHERE club_id = ? AND EXISTS (SELECT 1 FROM V2_player_statistics T2 WHERE T2.club_id = ? AND T2.player_id = V2_player_statistics.player_id AND T2.competition_id = V2_player_statistics.competition_id AND T2.season = V2_player_statistics.season)`, [sourceId, targetId]);
        db.run("UPDATE V2_player_statistics SET club_id = ? WHERE club_id = ?", [targetId, sourceId]);

        db.run(`DELETE FROM V2_club_trophies WHERE club_id = ? AND EXISTS (SELECT 1 FROM V2_club_trophies T2 WHERE T2.club_id = ? AND T2.competition_id = V2_club_trophies.competition_id AND T2.year = V2_club_trophies.year)`, [sourceId, targetId]);
        db.run("UPDATE V2_club_trophies SET club_id = ? WHERE club_id = ?", [targetId, sourceId]);

        db.run(`DELETE FROM V2_player_club_history WHERE club_id = ? AND EXISTS (SELECT 1 FROM V2_player_club_history T2 WHERE T2.club_id = ? AND T2.player_id = V2_player_club_history.player_id AND T2.season_start = V2_player_club_history.season_start)`, [sourceId, targetId]);
        db.run("UPDATE V2_player_club_history SET club_id = ? WHERE club_id = ?", [targetId, sourceId]);

        // 3. Delete Source
        db.run("DELETE FROM V2_clubs WHERE club_id = ?", [sourceId]);

        res.json({ message: 'Clubs merged successfully' });
    } catch (error) {
        console.error('Error merging clubs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getRegionLeagues = async (req, res) => {
    const { region } = req.query;
    if (!region) return res.status(400).json({ error: 'Region is required' });

    try {
        console.log(`Fetching leagues for region: ${region}`);

        let countries = [];
        let countryNames = new Set();

        // 1. Get Countries for Region (if not World)
        if (region !== 'World') {
            countries = db.all("SELECT country_name FROM V2_countries WHERE continent = ? ORDER BY importance_rank ASC", [region]);
            countryNames = new Set(countries.map(c => c.country_name));
        }

        // 2. Fetch ALL Leagues
        const apiRes = await axios.get(`${API_BASE_URL}/leagues`, {
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });
        const allLeagues = apiRes.data.response;

        // 3. Filter & Group
        const result = {
            international: [],
            countries: []
        };

        const countryMap = new Map(); // name -> { name, leagues: [] }

        // Initialize country map
        countries.forEach(c => {
            countryMap.set(c.country_name, { name: c.country_name, leagues: [] });
        });

        const EUROPEAN_CUP_IDS = [2, 3, 848]; // CL, EL, Conference

        for (const item of allLeagues) {
            const l = item.league;
            const c = item.country;

            // International (Europe context)
            if (region === 'Europe' && c.name === 'World') {
                if (EUROPEAN_CUP_IDS.includes(l.id) ||
                    l.name.includes('Champions League') ||
                    l.name.includes('Europa') ||
                    l.name.includes('Euro') ||
                    l.name.includes('UEFA')) {
                    if (!result.international.find(i => i.league.id === l.id)) {
                        result.international.push(item);
                    }
                }
            }

            // International (World context)
            if (region === 'World' && c.name === 'World') {
                if (l.id === 1 || // World Cup
                    l.name.toLowerCase().includes('world cup') ||
                    l.name.toLowerCase().includes('fifa')) {
                    if (!result.international.find(i => i.league.id === l.id)) {
                        result.international.push(item);
                    }
                }
            }

            // Country Leagues
            if (countryNames.has(c.name)) {
                if (countryMap.has(c.name)) {
                    const countryEntry = countryMap.get(c.name);
                    countryEntry.leagues.push(item);
                }
            }
        }

        // Convert Map to Array
        result.countries = Array.from(countryMap.values()).filter(c => c.leagues.length > 0);

        res.json(result);

    } catch (error) {
        console.error('Error fetching region leagues:', error);
        res.status(500).json({ error: 'Failed to fetch leagues' });
    }
};

export const getCountries = async (req, res) => {
    try {
        const { region } = req.query;
        let sql = "SELECT * FROM V2_countries";
        const params = [];

        if (region) {
            sql += " WHERE continent = ?";
            params.push(region);
            sql += " ORDER BY importance_rank ASC";
        } else {
            sql += " ORDER BY country_name";
        }

        const countries = await db.all(sql, params);
        res.json(countries);
    } catch (error) {
        console.error('Error fetching countries:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

export const getClubsMissingInfo = async (req, res) => {
    try {
        // Find clubs missing stadium, city, or founded_year
        const sql = `
            SELECT 
                c.club_id, c.club_name, c.club_logo_url, c.country_id, co.country_name,
                c.city, c.stadium_name, c.founded_year
            FROM V2_clubs c
            JOIN V2_countries co ON c.country_id = co.country_id
            WHERE (c.city IS NULL OR c.city = '')
               OR (c.stadium_name IS NULL OR c.stadium_name = '')
               OR (c.founded_year IS NULL)
            ORDER BY c.club_name
        `;
        const clubs = db.all(sql);
        res.json(clubs);
    } catch (error) {
        console.error('Error fetching clubs missing info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateClubData = async (req, res) => {
    const { clubId, clubName, countryName } = req.body;

    if (!clubId || !clubName) {
        return res.status(400).json({ error: 'Club ID and Name required' });
    }

    try {
        // 1. Call API-Football
        // Search by name. Note: This might return multiple results.
        const searchName = clubName.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Normalize for API search
        const apiUrl = `${API_BASE_URL}/teams?name=${encodeURIComponent(searchName)}`;

        console.log(`fetching missing data for ${clubName} (${apiUrl})`);

        const apiRes = await axios.get(apiUrl, {
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });

        const teams = apiRes.data.response;
        if (!teams || teams.length === 0) {
            return res.json({ success: false, message: 'No team found in API' });
        }

        // 2. Find the best match (if multiple)
        // If countryName provided, filter by it
        let limitDetails = null;
        if (countryName) {
            const countryMatch = teams.find(t => t.team.country && t.team.country.toLowerCase() === countryName.toLowerCase());
            if (countryMatch) limitDetails = countryMatch;
        }

        // Fallback to first result if no country match or country not provided
        if (!limitDetails) limitDetails = teams[0];

        const { team, venue } = limitDetails;

        // 3. Update DB (Trust API as source of truth for all fields)
        const updates = [];
        const params = [];

        // Always update properties if API returns them
        if (team.founded) {
            updates.push("founded_year = ?");
            params.push(team.founded);
        }
        if (venue && venue.name) {
            updates.push("stadium_name = ?");
            params.push(venue.name);
        }
        if (venue && venue.capacity) {
            updates.push("stadium_capacity = ?");
            params.push(venue.capacity);
        }
        if (venue && venue.city) {
            updates.push("city = ?");
            params.push(venue.city);
        }
        if (team.logo) {
            updates.push("club_logo_url = ?");
            params.push(team.logo);
        }

        if (updates.length > 0) {
            params.push(clubId);
            db.run(`UPDATE V2_clubs SET ${updates.join(', ')} WHERE club_id = ?`, params);
            res.json({ success: true, updated: updates });
        } else {
            res.json({ success: true, message: 'No info found in API response to update', dataFound: limitDetails });
        }

    } catch (error) {
        console.error('Error updating club data from API:', error?.response?.data || error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

// ... (previous code)

export const deleteClub = async (req, res) => {
    // ... (previous code)
};

// --- Competition Management ---

export const getUncategorizedCompetitions = (req, res) => {
    try {
        const comps = db.all("SELECT * FROM V2_competitions WHERE trophy_type_id IS NULL ORDER BY competition_name ASC");
        res.json(comps);
    } catch (error) {
        console.error("Error fetching uncategorized competitions:", error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const getTrophyTypes = (req, res) => {
    try {
        const types = db.all("SELECT * FROM V2_trophy_type ORDER BY type_order ASC");
        res.json(types);
    } catch (error) {
        console.error("Error fetching trophy types:", error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const updateCompetitionTrophyType = (req, res) => {
    const { competitionId, trophyTypeId } = req.body;
    if (!competitionId || !trophyTypeId) return res.status(400).json({ error: 'Missing fields' });

    try {
        db.run("UPDATE V2_competitions SET trophy_type_id = ? WHERE competition_id = ?", [trophyTypeId, competitionId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating competition:", error);
        res.status(500).json({ error: 'Update failed' });
    }
};

export const getApiLeagues = async (req, res) => {
    const { country } = req.query;
    try {
        console.log(`Fetching API leagues for country: ${country}`);
        // Use helper with rate limit handling
        const response = await callApiWithRateLimit(`${API_BASE_URL}/leagues`, {
            params: { country: country },
            headers: {
                'x-rapidapi-key': API_KEY,
                'x-rapidapi-host': 'v3.football.api-sports.io'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching API leagues:', error.message);
        res.status(500).json({ error: 'Failed to fetch leagues' });
    }
};

export const importLeaguePlayers = async (req, res) => {
    const { leagueId, season, force } = req.body;

    if (!leagueId || !season) {
        return res.status(400).json({ error: 'League ID and Season required' });
    }

    try {
        // 0. Check Import Status
        const statusRow = db.get("SELECT status FROM V2_import_status WHERE league_id = ? AND season = ?", [leagueId, season]);
        if (statusRow && statusRow.status === 'COMPLETED' && !force) {
            console.log(`Skipping import for League ${leagueId}, Season ${season} (Already Completed)`);
            return res.json({ success: true, skipped: true, message: 'Already imported previously.' });
        }

        console.log(`Starting import for League ${leagueId}, Season ${season}`);

        // Update Status to IN_PROGRESS
        const now = new Date().toISOString();
        if (statusRow) {
            db.run("UPDATE V2_import_status SET status = 'IN_PROGRESS', updated_at = ? WHERE league_id = ? AND season = ?", [now, leagueId, season]);
        } else {
            db.run("INSERT INTO V2_import_status (league_id, season, status, updated_at) VALUES (?, ?, 'IN_PROGRESS', ?)", [leagueId, season, now]);
        }

        let page = 1;
        let totalPages = 1;
        let totalImported = 0;

        do {
            const apiRes = await axios.get(`${API_BASE_URL}/players`, {
                params: {
                    league: leagueId,
                    season: season,
                    page: page
                },
                headers: {
                    'x-rapidapi-key': API_KEY,
                    'x-rapidapi-host': 'v3.football.api-sports.io'
                }
            });

            if (!apiRes.data.response) break;

            totalPages = apiRes.data.paging.total;
            const playersData = apiRes.data.response; // Array of { player, statistics }

            for (const item of playersData) {
                const p = item.player;
                const stats = item.statistics; // Array of stats for this season/league

                // 1. Upsert Country (Nationality)
                // Assuming p.nationality is a string like "France". 
                // We need to find country_id in V2_countries.
                let countryRow = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [p.nationality]);
                if (!countryRow) {
                    db.run("INSERT OR IGNORE INTO V2_countries (country_name, country_code) VALUES (?, ?)", [p.nationality, null]);
                    countryRow = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [p.nationality]);
                }
                const nationalityId = countryRow ? countryRow.country_id : 1;

                // 2. Upsert Player
                let playerRow = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [p.id]);

                // OPTIMIZATION: If player already exists, we skip updating basic info to save DB writes
                // The user requested: "if the player has already been imported... do not import it again"
                // We interpret this as: Don't re-process the Player table, but we MUST process stats below.

                if (playerRow) {
                    // Skip UPDATE, proceed to use playerId
                } else {
                    // Try fallback by name + dob
                    // Handle missing DOB gracefully
                    const dob = p.birth.date || '1900-01-01';

                    let fallbackRow = db.get("SELECT player_id FROM V2_players WHERE first_name = ? AND last_name = ? AND date_of_birth = ?", [p.firstname, p.lastname, dob]);

                    if (fallbackRow) {
                        // Found by fallback, update api_id
                        db.run("UPDATE V2_players SET api_id = ? WHERE player_id = ?", [p.id, fallbackRow.player_id]);
                        playerRow = fallbackRow;
                    } else {
                        // Insert New Player
                        db.run(`INSERT INTO V2_players (
                            first_name, last_name, date_of_birth, nationality_id, photo_url, height_cm, weight_kg, api_id, position, birth_country, birth_place
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [p.firstname, p.lastname, dob, nationalityId, p.photo, parseInt(p.height) || null, parseInt(p.weight) || null, p.id, stats[0]?.games?.position || null, p.birth.country, p.birth.place]
                        );
                        // Fetch ID
                        playerRow = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [p.id]);
                    }
                }

                if (!playerRow) continue; // Should not happen
                const playerId = playerRow.player_id;

                // 3. Process Statistics (and Club History implicitly)
                for (const stat of stats) {
                    // Need Club ID
                    const team = stat.team;
                    if (!team.id) continue;


                    let clubRow = db.get("SELECT club_id, club_name FROM V2_clubs WHERE api_id = ?", [team.id]);

                    if (!clubRow) {
                        // Fallback: Try Name Match (Normalized)
                        // Fetch all clubs without API ID or all clubs? Better to query specific name?
                        // Precise string match first
                        clubRow = db.get("SELECT club_id, club_name FROM V2_clubs WHERE club_name = ?", [team.name]);

                        if (!clubRow) {
                            // Try normalized match (Removing accents, lower case)
                            const normalizedTeamName = team.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                            // This is expensive in SQL if not stored. 
                            // We'll try a limited fuzzy approach: just loose equality in JS if we fetched all? 
                            // No, too slow. 
                            // Let's rely on standard name or "exact" match for now.
                            // Or simple "LIKE"?
                        }

                        if (clubRow) {
                            // Found by name -> Update API ID mapping
                            db.run("UPDATE V2_clubs SET api_id = ? WHERE club_id = ?", [team.id, clubRow.club_id]);
                        } else {
                            // Create Club stub if it absolutely doesn't exist
                            try {
                                db.run("INSERT INTO V2_clubs (club_name, api_id, club_logo_url, country_id, is_active) VALUES (?, ?, ?, ?, 1)", [team.name, team.id, team.logo, 1]); // 'World' default for country if unknown
                                clubRow = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
                            } catch (e) { console.error("Club insert error", e); }
                        }
                    }

                    if (clubRow) {
                        const clubId = clubRow.club_id;

                        // Upsert Statistics
                        // Start with delete for safe overwrite of this season/comp stats?
                        // Unique(player_id, club_id, competition_id, season)

                        // We need competition_id mapping too (V2_competitions).
                        // API returns league.id. We checked V2_competitions earlier, no api_id.
                        // I added api_id column. Now I must map.
                        let compRow = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [stat.league.id]);
                        if (!compRow) {
                            // Try name match or create?
                            // Create dummy competition if needed
                            try {
                                db.run("INSERT OR IGNORE INTO V2_competitions (competition_name, api_id, country_id) VALUES (?, ?, ?)", [stat.league.name, stat.league.id, 1]);
                                compRow = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [stat.league.id]);
                            } catch (e) { }
                        }
                        const compId = compRow ? compRow.competition_id : null;

                        try {
                            // Check for existing statistic entry
                            // Handle NULL competition_id carefully in SQL check (IS NULL vs = ?)
                            let existingStat;
                            if (compId) {
                                existingStat = db.get(
                                    "SELECT stat_id FROM V2_player_statistics WHERE player_id=? AND club_id=? AND competition_id=? AND season=?",
                                    [playerId, clubId, compId, season.toString()]
                                );
                            } else {
                                existingStat = db.get(
                                    "SELECT stat_id FROM V2_player_statistics WHERE player_id=? AND club_id=? AND competition_id IS NULL AND season=?",
                                    [playerId, clubId, season.toString()]
                                );
                            }

                            if (existingStat) {
                                // Update existing
                                db.run(`UPDATE V2_player_statistics SET 
                                    matches_played=?, matches_started=?, minutes_played=?,
                                    goals=?, assists=?, yellow_cards=?, red_cards=?,
                                    penalty_goals=?, penalty_misses=?
                                    WHERE stat_id=?`,
                                    [
                                        stat.games.appearences || 0,
                                        stat.games.lineups || 0,
                                        stat.games.minutes || 0,
                                        stat.goals.total || 0,
                                        stat.goals.assists || 0,
                                        stat.cards.yellow || 0,
                                        stat.cards.red || 0,
                                        stat.penalty.scored || 0,
                                        stat.penalty.missed || 0,
                                        existingStat.stat_id
                                    ]
                                );
                            } else {
                                // Insert new
                                db.run(`INSERT INTO V2_player_statistics (
                                    player_id, club_id, competition_id, season, year,
                                    matches_played, matches_started, minutes_played,
                                    goals, assists, yellow_cards, red_cards,
                                    penalty_goals, penalty_misses
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        playerId, clubId, compId || null,
                                        season.toString(), parseInt(season),
                                        stat.games.appearences || 0,
                                        stat.games.lineups || 0,
                                        stat.games.minutes || 0,
                                        stat.goals.total || 0,
                                        stat.goals.assists || 0,
                                        stat.cards.yellow || 0,
                                        stat.cards.red || 0,
                                        stat.penalty.scored || 0,
                                        stat.penalty.missed || 0
                                    ]
                                );
                            }
                        } catch (e) {
                            console.error("Error saving stats:", e);
                            // Continue to next stat to avoid breaking the whole import
                        }

                        // Upsert History
                        // "In season X, played for Y".
                        const histExists = db.get("SELECT 1 FROM V2_player_club_history WHERE player_id=? AND club_id=? AND season_start=?", [playerId, clubId, season.toString()]);
                        if (!histExists) {
                            db.run("INSERT INTO V2_player_club_history (player_id, club_id, season_start, year_start, is_loan) VALUES (?, ?, ?, ?, ?)", [playerId, clubId, season.toString(), parseInt(season), 0]);
                        }
                    }



                }
            }

            totalImported += playersData.length;
            page++;
            if (page > totalPages) break;

        } while (page <= totalPages);

        // Update Status to COMPLETED
        db.run("UPDATE V2_import_status SET status = 'COMPLETED', imported_players = ?, updated_at = ? WHERE league_id = ? AND season = ?", [totalImported, new Date().toISOString(), leagueId, season]);

        res.json({ success: true, importedCount: totalImported, message: 'Import successful' });


    } catch (error) {
        console.error('Import error:', error);

        // Update Status to FAILED?
        db.run("UPDATE V2_import_status SET status = 'FAILED', updated_at = ? WHERE league_id = ? AND season = ?", [new Date().toISOString(), leagueId, season]);

        res.status(500).json({ error: 'Import failed', details: error.message });
    }
};

export const clearPlayerData = async (req, res) => {
    try {
        console.log("Clearing all player data...");
        db.run("DELETE FROM V2_player_statistics");
        db.run("DELETE FROM V2_player_club_history");
        db.run("DELETE FROM V2_players");
        db.run("DELETE FROM V2_import_status"); // Clear status too

        res.json({ success: true, message: 'All player data cleared successfully.' });
    } catch (error) {
        console.error("Error clearing data:", error);
        res.status(500).json({ error: 'Failed to clear data' });
    }
};

export const getImportStatus = (req, res) => {
    try {
        const statuses = db.all("SELECT * FROM V2_import_status ORDER BY updated_at DESC");
        res.json(statuses);
    } catch (error) {
        console.error("Error fetching import status:", error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getClubsByCountry = (req, res) => {
    const { country } = req.query;
    if (!country) return res.status(400).json({ error: 'Country name required' });

    try {
        const clubs = db.all(`
            SELECT c.club_id, c.club_name, c.api_id, c.club_logo_url
            FROM V2_clubs c
            JOIN V2_countries co ON c.country_id = co.country_id
            WHERE co.country_name = ?
            ORDER BY c.club_name
        `, [country]);
        res.json(clubs);
    } catch (error) {
        console.error("Error fetching clubs:", error);
        res.status(500).json({ error: 'Internal error' });
    }
};

// --- Helper Functions for Data Persistence ---

const upsertPlayerRecord = (p, stats) => {
    // 1. Upsert Country
    let countryRow = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [p.nationality]);
    if (!countryRow) {
        db.run("INSERT OR IGNORE INTO V2_countries (country_name, country_code) VALUES (?, ?)", [p.nationality, null]);
        countryRow = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [p.nationality]);
    }
    const nationalityId = countryRow ? countryRow.country_id : 1;

    // 2. Upsert Player
    let playerRow = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [p.id]);

    if (!playerRow) {
        const dob = p.birth.date || '1900-01-01';
        let fallbackRow = db.get("SELECT player_id FROM V2_players WHERE first_name = ? AND last_name = ? AND date_of_birth = ?", [p.firstname, p.lastname, dob]);

        if (fallbackRow) {
            db.run("UPDATE V2_players SET api_id = ? WHERE player_id = ?", [p.id, fallbackRow.player_id]);
            playerRow = fallbackRow;
        } else {
            db.run(`INSERT INTO V2_players (
                first_name, last_name, date_of_birth, nationality_id, photo_url, height_cm, weight_kg, api_id, position, birth_country, birth_place
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [p.firstname, p.lastname, dob, nationalityId, p.photo, parseInt(p.height) || null, parseInt(p.weight) || null, p.id, stats[0]?.games?.position || null, p.birth.country, p.birth.place]
            );
            playerRow = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [p.id]);
        }
    }
    return playerRow ? playerRow.player_id : null;
};

const upsertClub = (team) => {
    if (!team.id) return null;
    let clubRow = db.get("SELECT club_id, club_name FROM V2_clubs WHERE api_id = ?", [team.id]);
    if (!clubRow) {
        clubRow = db.get("SELECT club_id, club_name FROM V2_clubs WHERE club_name = ?", [team.name]);
        if (clubRow) {
            db.run("UPDATE V2_clubs SET api_id = ? WHERE club_id = ?", [team.id, clubRow.club_id]);
        } else {
            try {
                db.run("INSERT INTO V2_clubs (club_name, api_id, club_logo_url, country_id, is_active) VALUES (?, ?, ?, ?, 1)", [team.name, team.id, team.logo, 1]);
                clubRow = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
            } catch (e) { }
        }
    }
    return clubRow ? clubRow.club_id : null;
};

const upsertCompetition = (league, clubId, season, matchesPlayed, countryId) => {
    // Import the intelligent detection service

    if (!league || !league.name) return null;

    // Use intelligent detection with multiple strategies
    let competitionId = detectCompetition(league, clubId, season, matchesPlayed, countryId);

    if (competitionId) {
        return competitionId;
    }

    // Only create new competition if it's from a major league (has API ID)
    // This prevents creating duplicate entries for friendly matches, etc.
    if (league.id) {
        console.log(`⚠️ Creating new competition with API ID: ${league.name} (ID: ${league.id})`);
        return createCompetitionIfNecessary(league, countryId);
    }

    // For competitions without API ID, don't create - return null for manual review
    console.log(`⚠️ Competition without API ID not created: ${league.name} - flagging for manual review`);
    return null;
};

const upsertPlayerStats = (playerId, stat, year) => {
    const clubId = upsertClub(stat.team);
    if (!clubId) return;

    // Get club's country for better competition detection
    const clubInfo = db.get("SELECT country_id FROM V2_clubs WHERE club_id = ?", [clubId]);
    const countryId = clubInfo ? clubInfo.country_id : null;

    // Pass additional context for intelligent detection
    const matchesPlayed = stat.games.appearences || 0;
    const compId = upsertCompetition(stat.league, clubId, year.toString(), matchesPlayed, countryId);

    // If competition couldn't be detected, log for manual review
    if (!compId && stat.league && stat.league.name) {
        logUnresolvedCompetition(playerId, clubId, year.toString(), stat.league.name, matchesPlayed);
    }

    const existingStat = db.get(
        "SELECT stat_id FROM V2_player_statistics WHERE player_id=? AND club_id=? AND competition_id IS ? AND season=?",
        [playerId, clubId, compId || null, year.toString()]
    );

    if (existingStat) {
        db.run(`UPDATE V2_player_statistics SET 
            matches_played=?, matches_started=?, minutes_played=?,
            goals=?, assists=?, yellow_cards=?, red_cards=?,
            penalty_goals=?, penalty_misses=?
            WHERE stat_id=?`,
            [
                stat.games.appearences || 0, stat.games.lineups || 0, stat.games.minutes || 0,
                stat.goals.total || 0, stat.goals.assists || 0,
                stat.cards.yellow || 0, stat.cards.red || 0,
                stat.penalty.scored || 0, stat.penalty.missed || 0,
                existingStat.stat_id
            ]
        );
    } else {
        db.run(`INSERT INTO V2_player_statistics (
            player_id, club_id, competition_id, season, year,
            matches_played, matches_started, minutes_played,
            goals, assists, yellow_cards, red_cards,
            penalty_goals, penalty_misses
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                playerId, clubId, compId || null,
                year.toString(), year,
                stat.games.appearences || 0, stat.games.lineups || 0, stat.games.minutes || 0,
                stat.goals.total || 0, stat.goals.assists || 0,
                stat.cards.yellow || 0, stat.cards.red || 0,
                stat.penalty.scored || 0, stat.penalty.missed || 0
            ]
        );
    }
    const histExists = db.get("SELECT 1 FROM V2_player_club_history WHERE player_id=? AND club_id=? AND season_start=?", [playerId, clubId, year.toString()]);
    if (!histExists) {
        db.run("INSERT INTO V2_player_club_history (player_id, club_id, season_start, year_start, is_loan) VALUES (?, ?, ?, ?, ?)", [playerId, clubId, year.toString(), year, 0]);
    }
};

async function callApiWithRateLimit(url, config) {
    try {
        const response = await axios.get(url, config);

        // Rate Limit Handling
        const remaining = response.headers['x-ratelimit-requests-remaining'];

        if (remaining && parseInt(remaining) < 20) {
            console.warn(`⚠️ API Rate Limit Warning: Only ${remaining} requests remaining! Pausing for 10 seconds...`);
            await new Promise(r => setTimeout(r, 10000));
        }

        return response;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.error("⛔ API Rate Limit Exceeded (429). Waiting 60 seconds...");
            await new Promise(r => setTimeout(r, 60000));
            return callApiWithRateLimit(url, config); // Retry
        }
        throw error;
    }
};

export const importClubPlayers = async (req, res) => {
    const { clubId, yearStart, yearEnd } = req.body;
    if (!clubId || !yearStart || !yearEnd) return res.status(400).json({ error: 'Required fields missing' });

    try {
        const club = db.get("SELECT api_id, club_name FROM V2_clubs WHERE club_id = ?", [clubId]);
        if (!club || !club.api_id) return res.status(404).json({ error: 'Club API ID not found' });

        const apiTeamId = club.api_id;
        const start = parseInt(yearStart);
        const end = parseInt(yearEnd);
        let totalImported = 0;

        console.log(`Starting Club Import: ${club.club_name} (${start}-${end})`);

        for (let year = start; year <= end; year++) {
            let page = 1;
            let totalPages = 1;

            console.log(` > Processing ${year}...`);

            do {
                const apiRes = await callApiWithRateLimit(`${API_BASE_URL}/players`, {
                    params: { team: apiTeamId, season: year, page: page },
                    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
                });

                if (!apiRes.data.response) break;
                totalPages = apiRes.data.paging.total;
                const playersData = apiRes.data.response;

                for (const item of playersData) {
                    const playerId = upsertPlayerRecord(item.player, item.statistics);
                    if (!playerId) continue;

                    for (const stat of item.statistics) {
                        upsertPlayerStats(playerId, stat, year);
                    }
                }

                totalImported += playersData.length;
                page++;
            } while (page <= totalPages);
        }

        res.json({ success: true, importedCount: totalImported });
    } catch (error) {
        console.error("Club import error:", error);
        res.status(500).json({ error: 'Import failed', details: error.message });
    }
};

export const importDeepLeaguePlayers = async (req, res) => {
    const { leagueId, startYear, endYear } = req.body;
    if (!leagueId || !startYear || !endYear) return res.status(400).json({ error: 'Missing parameters' });

    try {
        const start = parseInt(startYear);
        const end = parseInt(endYear);
        const uniqueApiIds = new Set();

        console.log(`🚀 Deep Import: Scanning League ${leagueId} from ${start} to ${end}...`);

        // Phase 1: Identify Players
        for (let year = start; year <= end; year++) {
            let page = 1;
            let totalPages = 1;

            do {
                const apiRes = await callApiWithRateLimit(`${API_BASE_URL}/players`, {
                    params: { league: leagueId, season: year, page: page },
                    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
                });

                if (!apiRes.data.response) break;
                totalPages = apiRes.data.paging.total;

                apiRes.data.response.forEach(item => uniqueApiIds.add(item.player.id));
                page++;
            } while (page <= totalPages); // Corrected loop condition
        }

        const totalPlayers = uniqueApiIds.size;
        console.log(`🔍 Found ${totalPlayers} unique players. Starting Deep Import...`);
        let processedCount = 0;
        let skippedCount = 0;
        let importedCount = 0;

        // Phase 2: Deep Import Per Player
        for (const playerApiId of uniqueApiIds) {
            processedCount++;
            if (processedCount % 10 === 0) console.log(`Processing player ${processedCount}/${totalPlayers} (Skipped: ${skippedCount}, Imported: ${importedCount})...`);

            try {
                // Check Identity & DB ID
                let dbPlayerId = null;
                const playerRow = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [playerApiId]);
                if (playerRow) dbPlayerId = playerRow.player_id;

                // If player is not in DB, we MUST fetch at least one stats entry to create them. 
                // But we don't know seasons yet. Get seasons first.

                // 1. Get Available Seasons
                const seasonsRes = await callApiWithRateLimit(`${API_BASE_URL}/players/seasons`, {
                    params: { player: playerApiId },
                    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
                });

                const seasons = seasonsRes.data.response;

                // 2. Fetch Stats for EACH season
                for (const seasonYear of seasons) {

                    if (dbPlayerId) {
                        // Check if ANY stats exist for this player in this season.
                        // BUT: If the existing stats have NULL competition_id, we should re-import to fix them.
                        const validStatsExist = db.get(
                            "SELECT 1 FROM V2_player_statistics WHERE player_id = ? AND season = ? AND competition_id IS NOT NULL LIMIT 1",
                            [dbPlayerId, seasonYear.toString()]
                        );

                        // If we have valid stats (with competition IDs), we can skip.
                        // If we have stats but they are NULL competition, validStatsExist will be false, so we proceed to re-import.
                        // If we have NO stats, validStatsExist is false, so we proceed.

                        // Wait, if we have stats with NULL competition, we want to update them or add new ones?
                        // upsertPlayerStats uses INSERT or UPDATE. 
                        // If we re-fetch, upsertCompetition will now return a valid ID (hopefully).
                        // Then upsertPlayerStats will likely INSERT a new row because the unique constraint text includes competition_id.
                        // Or if we match by player+club+season, we might behave differently.
                        // Let's look at upsertPlayerStats: 
                        // SELECT stat_id FROM V2_player_statistics WHERE player_id=? AND club_id=? AND competition_id IS ? AND season=?
                        // If the new one has a competition ID and the old one didn't, it will indeed Insert a NEW row.
                        // Takes care of "repairing" by adding the better version. 
                        // We might end up with duplicates (one null, one valid) but better than missing data.
                        // We can clean up nulls later.

                        if (validStatsExist) {
                            skippedCount++;
                            continue; // SKIP only if we have good data
                        }
                    }

                    // Fetch Details
                    await new Promise(r => setTimeout(r, 200)); // Throttle slightly

                    const statsRes = await callApiWithRateLimit(`${API_BASE_URL}/players`, {
                        params: { id: playerApiId, season: seasonYear },
                        headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
                    });

                    const playersData = statsRes.data.response;
                    if (playersData && playersData.length > 0) {
                        for (const item of playersData) {
                            const pid = upsertPlayerRecord(item.player, item.statistics);
                            if (pid) {
                                dbPlayerId = pid;
                                for (const stat of item.statistics) {
                                    upsertPlayerStats(pid, stat, seasonYear);
                                    importedCount++;
                                }
                            }
                        }
                    }
                }

            } catch (err) {
                console.error(`Failed to process player ${playerApiId}:`, err.message);
            }
        }

        console.log(`✅ Deep Import Completed. Processed: ${processedCount}, Skipped Seasons: ${skippedCount}, Imported Stats: ${importedCount}`);
        res.json({ success: true, scannedPlayers: totalPlayers, processed: processedCount, importedStats: importedCount });

    } catch (error) {
        console.error("Deep Import Error:", error);
        res.status(500).json({ error: 'Deep import crashed', details: error.message });
    }
};

export const getClubSeasonStats = (req, res) => {
    const { clubId, season } = req.query;
    if (!clubId || !season) return res.status(400).json({ error: 'Club ID and Season required' });

    try {
        const sql = `
            SELECT 
                p.player_id, p.first_name, p.last_name, p.photo_url, p.position,
                c.competition_id, c.competition_name, c.trophy_type_id,
                s.matches_played, s.goals, s.assists, s.yellow_cards, s.red_cards, s.minutes_played
            FROM V2_player_statistics s
            JOIN V2_players p ON s.player_id = p.player_id
            LEFT JOIN V2_competitions c ON s.competition_id = c.competition_id
            WHERE s.club_id = ? AND s.season = ?
        `;

        const stats = db.all(sql, [clubId, season.toString()]);
        res.json(stats);
    } catch (error) {
        console.error("Error fetching club season stats:", error);
        res.status(500).json({ error: 'Internal error' });
    }
};

export const scanClubCountries = async (req, res) => {
    try {
        console.log("Scanning clubs for country mismatches...");

        // 1. Get all clubs with API IDs
        const clubs = db.all(`
            SELECT c.club_id, c.club_name, c.api_id, c.club_logo_url, c.country_id, co.country_name 
            FROM V2_clubs c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            WHERE c.api_id IS NOT NULL
        `);

        const mismatches = [];
        let checked = 0;

        // Limit check to avoid huge delays
        // In a real scenario, this should be a background job.
        // We will scan the first 100 or until we find some issues.

        for (const club of clubs) {
            if (checked >= 50) break; // Arbitrary limit for demo/safety

            try {
                // Throttle
                await new Promise(r => setTimeout(r, 200));

                const apiRes = await callApiWithRateLimit(`${API_BASE_URL}/teams`, {
                    params: { id: club.api_id },
                    headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
                });

                checked++;
                const teamData = apiRes.data.response[0];
                if (teamData) {
                    const apiCountry = teamData.team.country;
                    const dbCountry = club.country_name || 'Unknown';

                    if (apiCountry !== dbCountry) {
                        // Attempt to find the country ID for the API country
                        let correctCountry = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [apiCountry]);

                        // If country doesn't exist in our DB, we might want to suggest creating it?
                        // For now just return null if not found.

                        mismatches.push({
                            club_id: club.club_id,
                            club_name: club.club_name,
                            club_logo_url: club.club_logo_url,
                            db_country_name: dbCountry,
                            api_country_name: apiCountry,
                            suggested_country_id: correctCountry ? correctCountry.country_id : null
                        });
                    }
                }
            } catch (e) {
                console.error(`Error scanning club ${club.club_name}:`, e.message);
            }
        }

        res.json({ success: true, count: mismatches.length, mismatches });

    } catch (error) {
        console.error("Scan failed:", error);
        res.status(500).json({ error: 'Scan failed' });
    }
};

export const fixClubCountry = (req, res) => {
    const { clubId, countryId } = req.body;
    if (!clubId || !countryId) return res.status(400).json({ error: 'Missing IDs' });

    try {
        db.run("UPDATE V2_clubs SET country_id = ? WHERE club_id = ?", [countryId, clubId]);
        res.json({ success: true });
    } catch (error) {
        console.error("Fix failed:", error);
        res.status(500).json({ error: 'Database update failed' });
    }
};

/**
 * Import Single Player (Deep) - Fetches ALL available seasons and statistics
 */
export const importSinglePlayerDeep = async (req, res) => {
    const { playerId } = req.params;
    
    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
    }

    try {
        const playerApiId = parseInt(playerId);
        console.log(`🚀 Deep Import: Starting for player API ID ${playerApiId}...`);

        // Check if player exists in DB
        let dbPlayerId = null;
        const playerRow = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [playerApiId]);
        if (playerRow) dbPlayerId = playerRow.player_id;

        // 1. Get Available Seasons
        const seasonsRes = await callApiWithRateLimit(`${API_BASE_URL}/players/seasons`, {
            params: { player: playerApiId },
            headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
        });

        const seasons = seasonsRes.data.response;
        
        if (!seasons || seasons.length === 0) {
            return res.status(404).json({ error: 'No seasons found for this player' });
        }

        console.log(`📅 Found ${seasons.length} seasons for player ${playerApiId}`);

        let importedSeasons = 0;
        let skippedSeasons = 0;

        // 2. Fetch Stats for EACH season
        for (const seasonYear of seasons) {
            if (dbPlayerId) {
                // Check if valid stats exist for this season
                const validStatsExist = db.get(
                    "SELECT 1 FROM V2_player_statistics WHERE player_id = ? AND season = ? AND competition_id IS NOT NULL LIMIT 1",
                    [dbPlayerId, seasonYear.toString()]
                );

                if (validStatsExist) {
                    skippedSeasons++;
                    continue;
                }
            }

            // Fetch player stats for this season
            await new Promise(r => setTimeout(r, 200)); // Throttle

            const statsRes = await callApiWithRateLimit(`${API_BASE_URL}/players`, {
                params: { id: playerApiId, season: seasonYear },
                headers: { 'x-rapidapi-key': API_KEY, 'x-rapidapi-host': 'v3.football.api-sports.io' }
            });

            if (!statsRes.data.response || statsRes.data.response.length === 0) {
                console.log(`⚠️ No data for season ${seasonYear}`);
                continue;
            }

            const playerData = statsRes.data.response[0];

            // Create/Update player record if needed
            if (!dbPlayerId) {
                dbPlayerId = upsertPlayerRecord(playerData.player);
            }

            // Import statistics for each team/league in this season
            if (playerData.statistics && playerData.statistics.length > 0) {
                playerData.statistics.forEach(stat => {
                    upsertPlayerStats(dbPlayerId, stat, seasonYear);
                });
                importedSeasons++;
            }
        }

        console.log(`✅ Deep Import Complete for player ${playerApiId}: ${importedSeasons} seasons imported, ${skippedSeasons} skipped`);

        res.json({
            success: true,
            message: 'Player imported successfully',
            playerId: dbPlayerId,
            seasonsImported: importedSeasons,
            seasonsSkipped: skippedSeasons,
            totalSeasons: seasons.length
        });

    } catch (error) {
        console.error('❌ Error importing player:', error.message);
        res.status(500).json({
            error: 'Failed to import player',
            details: error.message
        });
    }
};
