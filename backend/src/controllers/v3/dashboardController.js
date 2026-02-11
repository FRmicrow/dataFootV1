import dbV3 from '../../config/database_v3.js';

/**
 * V3 Dashboard Controller
 * Provides high-level stats about V3 data.
 */

export const getV3Stats = async (req, res) => {
    try {
        const leagueCount = dbV3.get("SELECT COUNT(*) as count FROM V3_Leagues").count;
        const playerCount = dbV3.get("SELECT COUNT(*) as count FROM V3_Players").count;
        const teamCount = dbV3.get("SELECT COUNT(*) as count FROM V3_Teams").count;
        const seasonCount = dbV3.get("SELECT COUNT(*) as count FROM V3_League_Seasons WHERE imported_players = 1").count;

        res.json({
            leagues: leagueCount,
            players: playerCount,
            teams: teamCount,
            importedSeasons: seasonCount
        });
    } catch (error) {
        console.error("Error fetching V3 stats:", error);
        res.status(500).json({ error: "Failed to fetch V3 stats" });
    }
};

/**
 * Get list of fully imported leagues (for Navigation)
 */
export const getImportedLeagues = async (req, res) => {
    try {
        const rows = dbV3.all(`
            SELECT 
                l.league_id, l.api_id, l.name, l.type as league_type, l.logo_url, 
                c.name as country_name, c.flag_url, c.importance_rank,
                GROUP_CONCAT(ls.season_year) as years_csv
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
            WHERE ls.imported_players = 1
            GROUP BY l.league_id
            ORDER BY c.importance_rank ASC, l.type ASC, l.name ASC
        `);

        const leagues = rows.map(row => ({
            league_id: row.league_id,
            api_id: row.api_id,
            name: row.name,
            league_type: row.league_type || 'League',
            logo_url: row.logo_url,
            country_name: row.country_name,
            country_rank: row.importance_rank || 999,
            flag_url: row.flag_url,
            years_imported: row.years_csv ? [...new Set(row.years_csv.split(','))].map(y => parseInt(y)).sort((a, b) => b - a) : []
        }));

        res.json(leagues);
    } catch (error) {
        console.error("Error fetching imported leagues:", error);
        res.status(500).json({ error: "Failed to fetch imported leagues" });
    }
};

/**
 * Get list of auto-discovered leagues waiting for full import
 */
export const getDiscoveredLeagues = async (req, res) => {
    try {
        const rows = dbV3.all(`
            SELECT 
                l.league_id, l.api_id, l.name, l.logo_url, c.name as country_name, c.flag_url,
                GROUP_CONCAT(ls.season_year) as years_csv
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
            WHERE l.is_discovered = 1 
              AND (ls.sync_status = 'PARTIAL_DISCOVERY' OR ls.sync_status = 'PARTIAL')
              AND ls.imported_players = 0
            GROUP BY l.league_id
            ORDER BY c.name ASC, l.name ASC
        `);

        // Group by country for cleaner frontend
        const byCountry = {};
        rows.forEach(row => {
            const country = row.country_name || 'World';
            if (!byCountry[country]) {
                byCountry[country] = {
                    name: country,
                    flag: row.flag_url,
                    leagues: []
                };
            }
            byCountry[country].leagues.push({
                league_id: row.league_id,
                api_id: row.api_id,
                name: row.name,
                logo_url: row.logo_url,
                seasons: row.years_csv ? [...new Set(row.years_csv.split(','))].map(y => parseInt(y)).sort((a, b) => b - a) : []
            });
        });

        res.json(Object.values(byCountry).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        console.error("Error fetching discovered leagues:", error);
        res.status(500).json({ error: "Failed to fetch discovered leagues" });
    }
};
