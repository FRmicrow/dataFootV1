import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';

class SearchRepository extends BaseRepository {
    constructor() {
        super(db, null);
    }

    /**
     * Search players and teams in V3
     */
    globalSearch(query, limit = 50) {
        const searchTerm = `%${query}%`;

        // Search Players
        const players = this.db.all(`
            SELECT 
                'player' as type,
                player_id as id,
                api_id,
                name,
                firstname,
                lastname,
                nationality,
                photo_url as image,
                age
            FROM V3_Players
            WHERE name LIKE ? OR firstname LIKE ? OR lastname LIKE ?
            LIMIT ?
        `, [searchTerm, searchTerm, searchTerm, limit]);

        // Search Teams
        const teams = this.db.all(`
            SELECT 
                'team' as type,
                team_id as id,
                api_id,
                name,
                logo_url as image
            FROM V3_Teams
            WHERE name LIKE ?
            LIMIT ?
        `, [searchTerm, limit]);

        return [...players, ...teams];
    }

    getSearchCountries() {
        return this.db.all("SELECT DISTINCT nationality FROM V3_Players WHERE nationality IS NOT NULL ORDER BY nationality ASC");
    }
}

export default new SearchRepository();
