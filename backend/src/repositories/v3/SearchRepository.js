import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

class SearchRepository extends BaseRepository {
    constructor() {
        super(db, null);
    }

    /**
     * Search players and teams in V3 with relevance sorting and scout_rank
     */
    async globalSearch(query, limit = 50) {
        const searchTerm = `%${query}%`;

        // 1. Search Players
        const playersPromise = this.db.all(`
            SELECT 
                p.player_id,
                p.api_id,
                p.name,
                p.firstname,
                p.lastname,
                p.nationality,
                c.flag_url as nationality_flag,
                p.photo_url,
                p.age,
                p.scout_rank,
                CASE 
                    -- Priority 0: Exact match or word boundary
                    WHEN p.name ILIKE $1 
                      OR p.name ILIKE $1 || ' %' 
                      OR p.name ILIKE '% ' || $1 
                      OR p.name ILIKE '% ' || $1 || ' %' THEN 0
                    
                    -- Priority 1: Exact lastname or word boundary in lastname
                    WHEN p.lastname ILIKE $1 
                      OR p.lastname ILIKE $1 || ' %' 
                      OR p.lastname ILIKE '% ' || $1 
                      OR p.lastname ILIKE '% ' || $1 || ' %' THEN 1
                    
                    -- Priority 2: Partial match
                    WHEN p.name ILIKE $2 OR p.lastname ILIKE $2 THEN 2
                    ELSE 3
                END as relevance_priority,
                COALESCE(c.importance_rank, 999) as country_importance
            FROM V3_Players p
            LEFT JOIN V3_Countries c ON p.nationality = c.name
            WHERE p.name ILIKE $2 OR p.firstname ILIKE $2 OR p.lastname ILIKE $2
            ORDER BY relevance_priority ASC, scout_rank DESC, country_importance ASC, p.name ASC
            LIMIT $3
        `, cleanParams([query, searchTerm, limit]));

        // 2. Search Teams
        const teamsPromise = this.db.all(`
            SELECT 
                t.team_id,
                t.api_id,
                t.name,
                t.logo_url,
                t.country,
                t.scout_rank,
                c.flag_url as country_flag,
                CASE 
                    WHEN t.name ILIKE $1 
                      OR t.name ILIKE $1 || ' %' 
                      OR t.name ILIKE '% ' || $1 
                      OR t.name ILIKE '% ' || $1 || ' %' THEN 0
                    WHEN t.name ILIKE $2 THEN 1
                    ELSE 2
                END as relevance_priority,
                COALESCE(c.importance_rank, 999) as country_importance
            FROM V3_Teams t
            LEFT JOIN V3_Countries c ON t.country = c.name
            WHERE t.name ILIKE $2
            ORDER BY relevance_priority ASC, scout_rank DESC, country_importance ASC, t.name ASC
            LIMIT $3
        `, cleanParams([query, searchTerm, limit]));

        const [players, teams] = await Promise.all([playersPromise, teamsPromise]);

        return {
            players: players.map(({ relevance_priority, scout_rank, country_importance, ...rest }) => rest),
            clubs: teams.map(({ relevance_priority, scout_rank, country_importance, ...rest }) => rest)
        };
    }

    async getSearchCountries() {
        return await this.db.all(`
            SELECT DISTINCT c.name, c.flag_url, c.importance_rank 
            FROM V3_Countries c
            JOIN V3_Players p ON p.nationality = c.name
            WHERE c.name IS NOT NULL 
            ORDER BY c.importance_rank ASC, c.name ASC
        `);
    }
}

export default new SearchRepository();
