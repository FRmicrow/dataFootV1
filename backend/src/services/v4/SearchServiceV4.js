import db from '../../config/database.js';
import { DEFAULT_LOGO, DEFAULT_PHOTO } from '../../config/mediaConstants.js';

class SearchServiceV4 {
    async globalSearch(query, options = {}) {
        const { limit = 20, type = 'all' } = options;
        const results = {
            competitions: [],
            teams: [],
            people: []
        };

        const searchQuery = `%${query}%`;

        // 1. Search Competitions
        if (type === 'all' || type === 'competition') {
            results.competitions = await db.all(
                `SELECT 
                    c.competition_id::text as id,
                    c.name,
                    c.competition_type as type,
                    COALESCE(c.current_logo_url, ?) as logo_url,
                    co.display_name as country_name,
                    co.flag_url as country_flag,
                    (SELECT MAX(season_label) FROM v4.matches m WHERE m.competition_id = c.competition_id) as latest_season
                 FROM v4.competitions c
                 LEFT JOIN v4.countries co ON c.country_id = co.country_id
                 WHERE c.name ILIKE ?
                 ORDER BY c.importance_rank ASC, c.name ASC
                 LIMIT ?`,
                [DEFAULT_LOGO, searchQuery, 10]
            );
        }

        // 2. Search Teams
        if (type === 'all' || type === 'team') {
            results.teams = await db.all(
                `SELECT 
                    t.team_id::text as id,
                    t.name,
                    COALESCE(t.current_logo_url, ?) as logo_url,
                    co.display_name as country_name,
                    co.flag_url as country_flag
                 FROM v4.teams t
                 LEFT JOIN v4.countries co ON t.country_id = co.country_id
                 WHERE t.name ILIKE ? OR t.short_name ILIKE ?
                 ORDER BY t.name ASC
                 LIMIT ?`,
                [DEFAULT_LOGO, searchQuery, searchQuery, limit]
            );
        }

        // 3. Search People
        if (type === 'all' || type === 'player' || type === 'person') {
            results.people = await db.all(
                `SELECT 
                    p.person_id::text as id,
                    p.full_name as name,
                    COALESCE(p.photo_url, ?) as photo_url,
                    co.display_name as nationality_name,
                    co.flag_url as nationality_flag,
                    (SELECT t.name FROM v4.match_lineups ml 
                     JOIN v4.teams t ON ml.team_id = t.team_id 
                     WHERE ml.player_id = p.person_id 
                     LIMIT 1) as current_team_name
                 FROM v4.people p
                 LEFT JOIN v4.countries co ON p.nationality_1 = co.name
                 WHERE p.full_name ILIKE ?
                 ORDER BY p.importance_rank ASC, p.full_name ASC
                 LIMIT ?`,
                [DEFAULT_PHOTO, searchQuery, limit]
            );
        }

        return results;
    }

    async getSearchCountries() {
        return db.all(
            `SELECT 
                country_id::text as id,
                display_name as name,
                flag_url,
                importance_rank
             FROM v4.countries
             WHERE importance_rank IS NOT NULL
             ORDER BY importance_rank ASC`
        );
    }
}

export default new SearchServiceV4();
