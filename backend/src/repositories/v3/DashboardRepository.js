import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';

class DashboardRepository extends BaseRepository {
    constructor() {
        super(db, null); // No single table for dashboard
    }

    async getVolumetrics() {
        // Run all queries concurrently for better performance
        const [leagues, players, clubs, fixtures, seasons] = await Promise.all([
            this.db.get("SELECT COUNT(*) as count FROM V3_Leagues"),
            this.db.get("SELECT COUNT(*) as count FROM V3_Players"),
            this.db.get("SELECT COUNT(*) as count FROM V3_Teams"),
            this.db.get("SELECT COUNT(*) as count FROM V3_Fixtures"),
            this.db.get("SELECT COUNT(*) as count FROM V3_League_Seasons WHERE imported_players = true")
        ]);

        return {
            total_leagues: parseInt(leagues.count, 10),
            total_players: parseInt(players.count, 10),
            total_clubs: parseInt(clubs.count, 10),
            total_fixtures: parseInt(fixtures.count, 10),
            imported_seasons: parseInt(seasons.count, 10)
        };
    }

    async getContinentalDistribution() {
        return await this.db.all(`
            SELECT c.continent, COUNT(*) as count
            FROM V3_Leagues l
            JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE EXISTS (SELECT 1 FROM V3_League_Seasons ls WHERE ls.league_id = l.league_id AND ls.imported_players = true)
            GROUP BY c.continent
        `);
    }

    async getTopPlayerNationalities(limit = 10) {
        return await this.db.all(`
            SELECT c.name, COUNT(*) as count
            FROM V3_Players p
            JOIN V3_Countries c ON p.nationality = c.name
            GROUP BY c.name
            ORDER BY count DESC
            LIMIT ?
        `, [limit]);
    }

    async getFixtureTrends() {
        return await this.db.all(`
            SELECT TO_CHAR(date, 'YYYY') as year, COUNT(*) as count
            FROM V3_Fixtures
            WHERE date IS NOT NULL
            GROUP BY year
            ORDER BY year ASC
        `);
    }
}

export default new DashboardRepository();
