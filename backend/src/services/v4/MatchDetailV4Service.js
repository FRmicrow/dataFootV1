import db from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * MatchDetailV4Service
 * Aggregates match data (info, lineups, events) from V4 tables.
 * Formatted for V3 UI component compatibility.
 */
class MatchDetailV4Service {
    /**
     * Get basic match info, teams and historical logos
     */
    async getFixtureDetails(fixtureId) {
        const info = await db.get(`
            SELECT 
                f.*, 
                th.name as home_name, 
                ta.name as away_name,
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = th.team_id 
                     AND CAST(SPLIT_PART(f.season, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                     ORDER BY start_year DESC LIMIT 1), 
                    th.logo_url
                ) as home_logo,
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = ta.team_id 
                     AND CAST(SPLIT_PART(f.season, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                     ORDER BY start_year DESC LIMIT 1), 
                    ta.logo_url
                ) as away_logo
            FROM V4_Fixtures f
            JOIN V4_Teams th ON th.team_id = f.home_team_id
            JOIN V4_Teams ta ON ta.team_id = f.away_team_id
            WHERE f.fixture_id = $1
        `, [fixtureId]);

        if (!info) return null;

        return {
            ...info,
            league_name: info.league
        };
    }

    /**
     * Get match lineups grouped and formatted for V3 parity
     */
    async getFixtureLineups(fixtureId) {
        const rows = await db.all(`
            SELECT l.*, p.name as player_name
            FROM V4_Fixture_Lineups l
            JOIN V4_Players p ON p.player_id = l.player_id
            WHERE l.fixture_id = $1
            ORDER BY l.side, l.is_starter DESC, l.numero ASC
        `, [fixtureId]);

        if (rows.length === 0) return { lineups: [] };

        const transform = (teamRows) => {
            if (!teamRows.length) return null;
            
            const starters = teamRows.filter(r => r.is_starter === 1 || r.is_starter === true).map(r => ({
                player: { id: r.player_id, name: r.player_name, number: r.numero, pos: r.position_code }
            }));
            const subs = teamRows.filter(r => r.is_starter === 0 || r.is_starter === false).map(r => ({
                player: { id: r.player_id, name: r.player_name, number: r.numero, pos: r.position_code }
            }));
            
            return {
                team_id: teamRows[0].team_id,
                team_name: 'N/A', 
                formation: 'N/A',
                coach_name: 'N/A',
                starting_xi: starters,
                substitutes: subs
            };
        };

        const homeRows = rows.filter(r => r.side === 'home');
        const awayRows = rows.filter(r => r.side === 'away');

        const homeLineup = transform(homeRows);
        const awayLineup = transform(awayRows);

        const teams = await db.all(`
            SELECT team_id, name FROM V4_Teams WHERE team_id IN (
                SELECT home_team_id FROM V4_Fixtures WHERE fixture_id = $1
                UNION
                SELECT away_team_id FROM V4_Fixtures WHERE fixture_id = $1
            )
        `, [fixtureId]);
        
        if (homeLineup) {
            const team = teams.find(t => t.team_id === homeLineup.team_id);
            homeLineup.team_name = team?.name || 'Home';
        }
        if (awayLineup) {
            const team = teams.find(t => t.team_id === awayLineup.team_id);
            awayLineup.team_name = team?.name || 'Away';
        }

        return {
            lineups: [homeLineup, awayLineup].filter(Boolean)
        };
    }

    /**
     * Get match events formatted for V3 parity
     */
    async getFixtureEvents(fixtureId) {
        const events = await db.all(`
            SELECT e.*, p.name as player_name, a.name as assist_name,
                (SELECT CASE WHEN side = 'home' THEN 1 ELSE 0 END FROM V4_Fixture_Lineups WHERE fixture_id = $1 AND player_id = e.player_id LIMIT 1) as is_home_team
            FROM V4_Fixture_Events e
            LEFT JOIN V4_Players p ON p.player_id = e.player_id
            LEFT JOIN V4_Players a ON a.player_id = e.assist_id
            WHERE e.fixture_id = $1
            ORDER BY e.time_elapsed ASC, e.id ASC
        `, [fixtureId]);

        return events;
    }

    /**
     * Get tactical stats
     */
    async getFixtureTacticalStats(fixtureId) {
        return [];
    }

    /**
     * Get player tactical stats
     */
    async getFixturePlayerTacticalStats(fixtureId) {
        return [];
    }
}

export default new MatchDetailV4Service();
