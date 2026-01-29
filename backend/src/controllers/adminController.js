import db from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';

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

export const getCountries = async (req, res) => {
    try {
        const countries = db.all("SELECT * FROM V2_countries ORDER BY country_name");
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

export const deleteClub = async (req, res) => {
    const { clubId } = req.body;

    if (!clubId) {
        return res.status(400).json({ error: 'Club ID is required' });
    }

    try {
        // Cascade delete related records
        db.run("DELETE FROM V2_player_statistics WHERE club_id = ?", [clubId]);
        db.run("DELETE FROM V2_club_trophies WHERE club_id = ?", [clubId]);
        db.run("DELETE FROM V2_player_club_history WHERE club_id = ?", [clubId]);

        // Delete club
        db.run("DELETE FROM V2_clubs WHERE club_id = ?", [clubId]);

        res.json({ success: true, message: 'Club deleted successfully' });
    } catch (error) {
        console.error('Error deleting club:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
