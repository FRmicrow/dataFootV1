import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

class LeagueSeasonRepository extends BaseRepository {
    constructor() {
        super(db, 'V3_League_Seasons');
    }

    /**
     * Get detailed status of all seasons for a league
     */
    getSeasonsStatusByLeague(leagueId) {
        return this.db.all(`
            SELECT 
                ls.*,
                l.name as league_name
            FROM V3_League_Seasons ls
            JOIN V3_Leagues l ON ls.league_id = l.league_id
            WHERE ls.league_id = ?
            ORDER BY ls.season_year DESC
        `, cleanParams([leagueId]));
    }

    /**
     * Find a season with its league info
     */
    getFullSeasonInfo(leagueId, seasonYear) {
        return this.db.get(`
            SELECT ls.*, l.name, l.type, l.logo_url
            FROM V3_League_Seasons ls
            JOIN V3_Leagues l ON ls.league_id = l.league_id
            WHERE ls.league_id = ? AND ls.season_year = ?
        `, cleanParams([leagueId, seasonYear]));
    }

    /**
     * Update import flags safely
     */
    updateImportStatus(leagueId, seasonYear, updates) {
        return this.update({ league_id: leagueId, season_year: seasonYear }, updates);
    }
}

export default new LeagueSeasonRepository();
