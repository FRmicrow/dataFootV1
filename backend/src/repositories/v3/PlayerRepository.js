import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

class PlayerRepository extends BaseRepository {
    constructor() {
        super(db, 'V3_Players');
    }

    async getPlayerProfile(id) {
        return await this.findOne({ player_id: id });
    }

    async getPlayerStats(playerId) {
        return await this.db.all(`
            SELECT ps.*, t.name as team_name, t.logo_url as team_logo, l.name as league_name
            FROM V3_Player_Stats ps
            JOIN V3_Teams t ON ps.team_id = t.team_id
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            WHERE ps.player_id = ?
            ORDER BY ps.season_year DESC
        `, cleanParams([playerId]));
    }

    async getPlayerTrophies(playerId) {
        return await this.db.all(`
            SELECT t.*, c.flag_small_url as country_flag
            FROM V3_Trophies t
            LEFT JOIN V3_Countries c ON t.country = c.name
            WHERE t.player_id = ?
            ORDER BY t.season DESC
        `, cleanParams([playerId]));
    }

    async getCareerTotals(playerId) {
        return await this.db.all(`
            SELECT 
                ps.team_id,
                t.name as team_name,
                t.logo_url as team_logo,
                SUM(ps.games_appearences) as total_matches,
                SUM(ps.goals_total) as total_goals,
                SUM(ps.goals_assists) as total_assists,
                ROUND(AVG(CAST(NULLIF(ps.games_rating, 'N/A') AS FLOAT))::numeric, 2) as avg_rating
            FROM V3_Player_Stats ps
            JOIN V3_Teams t ON ps.team_id = t.team_id
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            WHERE ps.player_id = ?
            GROUP BY ps.team_id, t.name, t.logo_url
        `, cleanParams([playerId]));
    }

    async getCurrentContext(playerId) {
        // Find latest team and league
        const latest = await this.db.get(`
            SELECT ps.team_id, t.name as team_name, t.logo_url as team_logo, 
                   t.accent_color, t.secondary_color, t.tertiary_color,
                   ps.league_id, l.name as league_name
            FROM V3_Player_Stats ps
            JOIN V3_Teams t ON ps.team_id = t.team_id
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            WHERE ps.player_id = ?
            ORDER BY ps.season_year DESC, ps.created_at DESC
            LIMIT 1
        `, cleanParams([playerId]));

        if (!latest) return null;

        return {
            status: 'Active',
            team: {
                id: latest.team_id,
                name: latest.team_name,
                logo_url: latest.team_logo,
                accent_color: latest.accent_color,
                secondary_color: latest.secondary_color,
                tertiary_color: latest.tertiary_color
            },
            league: {
                id: latest.league_id,
                name: latest.league_name
            }
        };
    }
}



export default new PlayerRepository();
