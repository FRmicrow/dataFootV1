import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';

class LeagueRepository extends BaseRepository {
    constructor() {
        super(db, 'V3_Leagues');
    }

    /**
     * Get all leagues with their country name
     */
    async getAllLeaguesWithCountry() {
        return await this.db.all(`
            SELECT l.*, c.name as country_name
            FROM V3_Leagues l
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            ORDER BY l.importance_rank ASC, l.name ASC
        `);
    }

    /**
     * Find by API ID
     */
    async findByApiId(apiId) {
        return await this.findOne({ api_id: apiId });
    }

    /**
     * US_070: High-Density League API & Ranking Aggregator
     */
    async getStructuredLeaguesData() {
        return await this.db.all(`
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
                (SELECT COUNT(*) FROM V3_League_Seasons ls WHERE ls.league_id = l.league_id AND ls.imported_players = true) as seasons_count,
                
                (SELECT t.name 
                 FROM V3_Standings rs 
                 JOIN V3_Teams t ON rs.team_id = t.team_id
                 WHERE rs.league_id = l.league_id 
                 ORDER BY rs.season_year DESC, rs.rank ASC LIMIT 1) as leader_name,
                 
                (SELECT t.logo_url 
                 FROM V3_Standings rs 
                 JOIN V3_Teams t ON rs.team_id = t.team_id
                 WHERE rs.league_id = l.league_id 
                 ORDER BY rs.season_year DESC, rs.rank ASC LIMIT 1) as leader_logo,
                 
                (SELECT rs.played 
                 FROM V3_Standings rs 
                 WHERE rs.league_id = l.league_id AND rs.rank = 1 
                 ORDER BY rs.season_year DESC LIMIT 1) as current_matchday,

                (SELECT f.round 
                 FROM V3_Fixtures f 
                 WHERE f.league_id = l.league_id
                 AND f.season_year = (SELECT MAX(season_year) FROM V3_Fixtures WHERE league_id = l.league_id)
                 AND f.status_short NOT IN ('FT', 'AET', 'CANC', 'ABD', 'AWD', 'WO')
                 ORDER BY f.timestamp ASC LIMIT 1) as next_round_name,
                 
                (SELECT f.round 
                 FROM V3_Fixtures f 
                 WHERE f.league_id = l.league_id
                 ORDER BY f.timestamp DESC LIMIT 1) as last_round_name
                 
            FROM V3_Leagues l
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE l.name NOT LIKE '%Consolidated%'
            ORDER BY c.importance_rank ASC, l.type DESC, l.importance_rank ASC, l.name ASC
        `);
    }

    /**
     * Get list of fully imported leagues with their seasons
     */
    async getImportedLeaguesData() {
        return await this.db.all(`
            SELECT 
                l.league_id, l.api_id, l.name, l.type as league_type, l.logo_url, 
                c.name as country_name, c.flag_url, c.importance_rank,
                STRING_AGG(ls.season_year::TEXT, ',') as years_csv
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
            WHERE ls.imported_players = true
            GROUP BY l.league_id, l.api_id, l.name, l.type, l.logo_url, c.name, c.flag_url, c.importance_rank
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC
        `);
    }

    /**
     * Get list of discovered leagues waiting for import
     */
    async getDiscoveredLeaguesData() {
        return await this.db.all(`
            SELECT 
                l.league_id, l.api_id, l.name, l.logo_url, c.name as country_name, c.flag_url,
                STRING_AGG(ls.season_year::TEXT, ',') as years_csv
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            JOIN V3_League_Seasons ls ON l.league_id = ls.league_id
            WHERE l.is_discovered = true 
              AND (ls.sync_status = 'PARTIAL_DISCOVERY' OR ls.sync_status = 'PARTIAL')
              AND ls.imported_players = false
            GROUP BY l.league_id, l.api_id, l.name, l.logo_url, c.name, c.flag_url, c.importance_rank
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, l.name ASC
        `);
    }
}

export default new LeagueRepository();
