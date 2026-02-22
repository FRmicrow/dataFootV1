import db from '../../config/database.js';

/**
 * US_070: High-Density League API & Ranking Aggregator
 * Delivers a structured hierarchy: International (Global/Continental) vs National (Domestic)
 */

const CACHE_KEY = 'v3_structured_leagues';
let cache = {
    data: null,
    timestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getStructuredLeagues = async (req, res) => {
    try {
        const now = Date.now();
        if (cache.data && (now - cache.timestamp < CACHE_TTL)) {
            return res.json(cache.data);
        }

        // Fetch all leagues that have at least one imported season
        // We join with countries to get ranks and continents
        const sql = `
            SELECT 
                l.league_id, 
                l.api_id, 
                l.name as league_name, 
                l.type as league_type, 
                l.logo_url, 
                l.importance_rank as league_rank,
                c.name as country_name, 
                c.continent, 
                c.importance_rank as country_rank, 
                c.flag_url,
                (SELECT COUNT(*) FROM V3_League_Seasons ls WHERE ls.league_id = l.league_id AND ls.imported_players = 1) as seasons_count
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE EXISTS (
                SELECT 1 FROM V3_League_Seasons ls 
                WHERE ls.league_id = l.league_id 
                AND ls.imported_players = 1
            )
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC
        `;

        const rows = db.all(sql);

        const structured = {
            international: {
                global: [],
                continental: {} // Keyed by continent name
            },
            national: [] // List of countries with their leagues
        };

        const nationalMap = {};

        rows.forEach(row => {
            const league = {
                id: row.league_id,
                api_id: row.api_id,
                name: row.league_name,
                type: row.league_type,
                logo: row.logo_url,
                rank: row.league_rank,
                is_cup: row.league_type?.toLowerCase() === 'cup',
                seasons_count: row.seasons_count
            };

            const isVirtual = row.country_name === row.continent;
            const isWorld = row.country_name === 'World';

            if (isVirtual) {
                if (isWorld) {
                    structured.international.global.push(league);
                } else {
                    const continent = row.continent || 'Other';
                    if (!structured.international.continental[continent]) {
                        structured.international.continental[continent] = [];
                    }
                    structured.international.continental[continent].push(league);
                }
            } else {
                // National
                if (!nationalMap[row.country_name]) {
                    nationalMap[row.country_name] = {
                        name: row.country_name,
                        flag: row.flag_url,
                        rank: row.country_rank,
                        continent: row.continent,
                        leagues: []
                    };
                    structured.national.push(nationalMap[row.country_name]);
                }
                nationalMap[row.country_name].leagues.push(league);
            }
        });

        // Final sorting for national list (already sorted by SQL but let's be sure)
        structured.national.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

        cache = {
            data: structured,
            timestamp: now
        };

        res.json(structured);

    } catch (error) {
        console.error("Error in getStructuredLeagues:", error);
        res.status(500).json({ error: "Failed to aggregate structured leagues" });
    }
};
