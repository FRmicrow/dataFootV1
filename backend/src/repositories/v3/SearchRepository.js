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
    globalSearch(query, limit = 50) {
        const searchTerm = `%${query}%`;

        // 1. Search Players
        const players = this.db.all(`
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
                    WHEN LOWER(p.name) = LOWER(?) THEN 0
                    WHEN LOWER(p.lastname) = LOWER(?) THEN 1
                    WHEN LOWER(p.lastname) LIKE LOWER(?) || ' %' THEN 1
                    WHEN p.name LIKE ? OR p.lastname LIKE ? THEN 2
                    ELSE 3
                END as relevance_priority,
                COALESCE(c.importance_rank, 999) as country_importance
            FROM V3_Players p
            LEFT JOIN V3_Countries c ON p.nationality = c.name
            WHERE p.name LIKE ? OR p.firstname LIKE ? OR p.lastname LIKE ?
            ORDER BY relevance_priority ASC, scout_rank DESC, country_importance ASC, p.name ASC
            LIMIT ?
        `, cleanParams([query, query, query, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit]));

        // 2. Search Teams
        const teams = this.db.all(`
            SELECT 
                t.team_id,
                t.api_id,
                t.name,
                t.logo_url,
                t.country,
                t.scout_rank,
                c.flag_url as country_flag,
                CASE 
                    WHEN LOWER(t.name) = LOWER(?) THEN 0
                    WHEN t.name LIKE ? THEN 1
                    ELSE 2
                END as relevance_priority,
                COALESCE(c.importance_rank, 999) as country_importance
            FROM V3_Teams t
            LEFT JOIN V3_Countries c ON t.country = c.name
            WHERE t.name LIKE ?
            ORDER BY relevance_priority ASC, scout_rank DESC, country_importance ASC, t.name ASC
            LIMIT ?
        `, cleanParams([query, searchTerm, searchTerm, limit]));

        return {
            players: players.map(({ relevance_priority, scout_rank, country_importance, ...rest }) => rest),
            clubs: teams.map(({ relevance_priority, scout_rank, country_importance, ...rest }) => rest)
        };
    }

    getSearchCountries() {
        return this.db.all(`
            SELECT DISTINCT c.name, c.flag_url, c.importance_rank 
            FROM V3_Countries c
            JOIN V3_Players p ON p.nationality = c.name
            WHERE c.name IS NOT NULL 
            ORDER BY c.importance_rank ASC, c.name ASC
        `);
    }
}

export default new SearchRepository();
