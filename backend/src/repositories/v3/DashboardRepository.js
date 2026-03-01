import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';

class DashboardRepository extends BaseRepository {
    constructor() {
        super(db, null); // No single table for dashboard
    }

    getVolumetrics() {
        return {
            total_leagues: this.db.get("SELECT COUNT(*) as count FROM V3_Leagues").count,
            total_players: this.db.get("SELECT COUNT(*) as count FROM V3_Players").count,
            total_clubs: this.db.get("SELECT COUNT(*) as count FROM V3_Teams").count,
            total_fixtures: this.db.get("SELECT COUNT(*) as count FROM V3_Fixtures").count,
            imported_seasons: this.db.get("SELECT COUNT(*) as count FROM V3_League_Seasons WHERE imported_players = 1").count
        };
    }

    getContinentalDistribution() {
        return this.db.all(`
            SELECT c.continent, COUNT(*) as count
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE EXISTS (SELECT 1 FROM V3_League_Seasons ls WHERE ls.league_id = l.league_id AND ls.imported_players = 1)
            GROUP BY c.continent
        `);
    }

    getTopPlayerNationalities(limit = 10) {
        return this.db.all(`
            SELECT c.name, COUNT(*) as count
            FROM V3_Players p
            JOIN V3_Countries c ON p.nationality = c.name
            GROUP BY c.name
            ORDER BY count DESC
            LIMIT ?
        `, [limit]);
    }

    getFixtureTrends() {
        return this.db.all(`
            SELECT strftime('%Y', date) as year, COUNT(*) as count
            FROM V3_Fixtures
            WHERE date IS NOT NULL
            GROUP BY year
            ORDER BY year ASC
        `);
    }
}

export default new DashboardRepository();
