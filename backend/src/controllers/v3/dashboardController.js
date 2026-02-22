import db from '../../config/database.js';
import { HealthIntelligenceService } from '../../services/v3/HealthIntelligenceService.js';

/**
 * V3 Dashboard Controller
 * Provides high-level stats about V3 data.
 */

export const getV3Stats = async (req, res) => {
    try {
        // 1. Volumetrics (US_110)
        const volumetrics = {
            total_leagues: db.get("SELECT COUNT(*) as count FROM V3_Leagues").count,
            total_players: db.get("SELECT COUNT(*) as count FROM V3_Players").count,
            total_clubs: db.get("SELECT COUNT(*) as count FROM V3_Teams").count,
            total_fixtures: db.get("SELECT COUNT(*) as count FROM V3_Fixtures").count,
            imported_seasons: db.get("SELECT COUNT(*) as count FROM V3_League_Seasons WHERE imported_players = 1").count
        };

        // 2. Continental Distribution (Leagues)
        const distribution = db.all(`
            SELECT c.continent, COUNT(*) as count
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE EXISTS (SELECT 1 FROM V3_League_Seasons ls WHERE ls.league_id = l.league_id AND ls.imported_players = 1)
            GROUP BY c.continent
        `);

        // 3. Health Intelligence Score (US_113)
        const health = HealthIntelligenceService.calculateScore();

        // 4. Distribution: Players by Country (Top 10) - for Charts
        const players_by_country = db.all(`
            SELECT c.name, COUNT(*) as count
            FROM V3_Players p
            JOIN V3_Countries c ON p.nationality = c.name
            GROUP BY c.name
            ORDER BY count DESC
            LIMIT 10
        `);

        // 5. Fixture Growth Trends (US_112)
        const fixture_trends = db.all(`
            SELECT strftime('%Y', date) as year, COUNT(*) as count
            FROM V3_Fixtures
            WHERE date IS NOT NULL
            GROUP BY year
            ORDER BY year ASC
        `);

        res.json({
            volumetrics,
            distribution,
            players_by_country,
            fixture_trends,
            health_summary: {
                score: health.score,
                coverage_percent: health.coverage_percent,
                orphans: health.details.orphans,
                partial_seasons: health.details.missing_fixture_seasons
            }
        });
    } catch (error) {
        console.error("Error fetching V3 Intelligence Hub stats:", error);
        res.status(500).json({ error: "Failed to fetch aggregated intelligence" });
    }
};

/**
 * Get list of fully imported leagues (for Navigation)
 */
export const getImportedLeagues = async (req, res) => {
    try {
        const rows = db.all(`
            SELECT 
                l.league_id, l.api_id, l.name, l.type as league_type, l.logo_url, 
                c.name as country_name, c.flag_url, c.importance_rank,
                GROUP_CONCAT(ls.season_year) as years_csv
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
            WHERE ls.imported_players = 1
            GROUP BY l.league_id
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC
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
        const rows = db.all(`
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
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC
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
