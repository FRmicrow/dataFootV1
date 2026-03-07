import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';

class FixtureRepository extends BaseRepository {
    constructor() {
        super(db, 'V3_Fixtures');
    }

    async getFixtureDetails(id) {
        return await this.db.get(`
            SELECT f.*, 
                   t1.name as home_name, t1.logo_url as home_logo,
                   t2.name as away_name, t2.logo_url as away_logo,
                   l.name as league_name, l.logo_url as league_logo,
                   v.name as venue_name, v.city as venue_city
            FROM V3_Fixtures f
            JOIN V3_Teams t1 ON f.home_team_id = t1.team_id
            JOIN V3_Teams t2 ON f.away_team_id = t2.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Venues v ON f.venue_id = v.venue_id
            WHERE f.fixture_id = ?
        `, [id]);
    }

    async getFixtureEvents(fixtureId) {
        return await this.db.all(`
            SELECT 
                fe.*,
                (CASE 
                    WHEN fe.team_id = f.home_team_id THEN 1 
                    WHEN t_home.api_id = fe.team_id THEN 1
                    ELSE 0 
                 END) as is_home_team
            FROM V3_Fixture_Events fe
            JOIN V3_Fixtures f ON fe.fixture_id = f.fixture_id
            LEFT JOIN V3_Teams t_home ON f.home_team_id = t_home.team_id
            WHERE fe.fixture_id = ?
            ORDER BY fe.time_elapsed ASC, fe.extra_minute ASC
        `, [fixtureId]);
    }

    async getFixtureTacticalStats(fixtureId) {
        return await this.db.all(`
            SELECT 
                ts.*,
                t.name as team_name,
                t.logo_url as team_logo,
                (CASE WHEN ts.team_id = f.home_team_id THEN 'home' ELSE 'away' END) as side
            FROM V3_Fixture_Stats ts
            JOIN V3_Fixtures f ON ts.fixture_id = f.fixture_id
            JOIN V3_Teams t ON ts.team_id = t.team_id
            WHERE ts.fixture_id = ?
        `, [fixtureId]);
    }



    async getEventCandidates() {
        return await this.db.all(`
            SELECT 
                l.name as league_name,
                l.logo_url,
                c.name as country_name,
                f.league_id,
                f.season_year,
                COUNT(f.fixture_id) as total_fixtures,
                (SELECT COUNT(*) FROM V3_Fixtures f2 
                 LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Events) fe ON f2.fixture_id = fe.fixture_id
                 WHERE f2.league_id = f.league_id AND f2.season_year = f.season_year 
                 AND f2.status_short IN ('FT', 'AET', 'PEN') AND fe.fixture_id IS NULL) as missing_events
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON f.league_id = l.league_id
            LEFT JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE f.status_short IN ('FT', 'AET', 'PEN')
            GROUP BY f.league_id, f.season_year
            HAVING missing_events > 0
            ORDER BY c.importance_rank ASC, l.name ASC
        `);
    }
    async getFixturePlayerTacticalStats(fixtureId) {
        return await this.db.all(`
            SELECT 
                ps.*,
                p.name as player_name,
                p.photo_url as player_photo,
                p.api_id as player_api_id,
                t.name as team_name,
                (CASE WHEN ps.team_id = f.home_team_id THEN 'home' ELSE 'away' END) as side
            FROM V3_Fixture_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            JOIN V3_Teams t ON ps.team_id = t.team_id
            JOIN V3_Fixtures f ON ps.fixture_id = f.fixture_id
            WHERE ps.fixture_id = ?
        `, [fixtureId]);
    }
}

export default new FixtureRepository();

