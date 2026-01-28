
import db from '../config/database.js';

export const getPalmaresHierarchy = (req, res) => {
    try {
        // Fetch all competitions joined with country info
        // V2_competitions: competition_id, competition_name, competition_short_name, trophy_type_id, country_id, level, is_active
        // V2_countries: country_id, country_name, continent
        const query = `
            SELECT 
                c.competition_id as id, 
                c.competition_name as name, 
                c.competition_short_name as shortName,
                c.level,
                co.country_name as country,
                co.continent,
                c.trophy_type_id as type
            FROM V2_competitions c
            LEFT JOIN V2_countries co ON c.country_id = co.country_id
            ORDER BY co.country_name, c.level, c.competition_name
        `;

        const competitions = db.all(query);

        // Define hierarchy structure
        const hierarchy = {
            Europe: [],
            Countries: {}
        };

        const countryPriority = ['England', 'Spain', 'Germany', 'Italy', 'France', 'Portugal'];

        competitions.forEach(comp => {
            // Determine category
            // If no country, assume International/Continental (Europe)
            if (!comp.country) {
                // Heuristic: check continent if available, or assume Europe/World
                hierarchy.Europe.push(comp);
            } else {
                // If European country, add to country list?
                // Check if continent is 'Europe'. V2_countries has 'continent' column.
                // Or just use the country name key.
                const countryName = comp.country;
                if (!hierarchy.Countries[countryName]) {
                    hierarchy.Countries[countryName] = [];
                }
                hierarchy.Countries[countryName].push(comp);
            }
        });

        // Sort each country's competitions by level (1 is highest)
        Object.keys(hierarchy.Countries).forEach(country => {
            hierarchy.Countries[country].sort((a, b) => {
                if (a.level !== b.level) return a.level - b.level;
                return a.name.localeCompare(b.name);
            });
        });

        res.json({ hierarchy, countryPriority });
    } catch (error) {
        console.error("Error fetching palmares hierarchy:", error);
        res.status(500).json({ error: "Failed to fetch hierarchy" });
    }
};

export const getTrophyHistory = (req, res) => {
    const { trophyId } = req.params;
    const { yearStart, yearEnd } = req.query;

    try {
        let query = `
            SELECT 
                ct.season, 
                ct.year,
                c.club_id as club_id, 
                c.club_name, 
                c.club_logo_url
            FROM V2_club_trophies ct
            JOIN V2_clubs c ON ct.club_id = c.club_id
            WHERE ct.competition_id = ? AND ct.is_runner_up = 0
        `;

        const params = [trophyId];

        if (yearStart) {
            query += " AND ct.year >= ?";
            params.push(yearStart);
        }
        if (yearEnd) {
            query += " AND ct.year <= ?";
            params.push(yearEnd);
        }

        query += " ORDER BY ct.year DESC";

        const rows = db.all(query, params);

        // Map to format
        const history = rows.map(row => ({
            seasonId: row.year.toString(), // Use year as season ID for simplification if no specific season ID
            year: row.year.toString(),
            yearLabel: row.season,
            winner: {
                club_id: row.club_id,
                club_name: row.club_name,
                logo_url: row.club_logo_url,
                id: row.club_id // Frontend compat
            }
        }));

        res.json(history);
    } catch (error) {
        console.error("Error fetching trophy history:", error);
        res.status(500).json({ error: "Failed to fetch history" });
    }
};

export const updateTrophyWinner = (req, res) => {
    // V2 update not yet implemented in this request scope, keeping stub or adapting minimally
    res.status(501).json({ error: "Update not permitted in V2 mode yet" });
};
