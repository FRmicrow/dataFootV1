import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';

class LeagueRepository extends BaseRepository {
    constructor() {
        super(db, 'V3_Leagues');
    }

    /**
     * Get all leagues with their country name
     */
    getAllLeaguesWithCountry() {
        return this.db.all(`
            SELECT l.*, c.name as country_name
            FROM V3_Leagues l
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            ORDER BY l.importance_rank ASC, l.name ASC
        `);
    }

    /**
     * Find by API ID
     */
    findByApiId(apiId) {
        return this.findOne({ api_id: apiId });
    }

    /**
     * US_070: High-Density League API & Ranking Aggregator
     */
    getStructuredLeaguesData() {
        return this.db.all(`
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
        `);
    }

    /**
     * Get list of fully imported leagues with their seasons
     */
    getImportedLeaguesData() {
        return this.db.all(`
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
    }

    /**
     * Get list of discovered leagues waiting for import
     */
    getDiscoveredLeaguesData() {
        return this.db.all(`
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
    }
}

export default new LeagueRepository();
