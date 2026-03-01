import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

class ClubRepository extends BaseRepository {
    constructor() {
        super(db, 'V3_Teams');
    }

    getClubProfileWithVenue(id) {
        return this.db.get(`
            SELECT t.*, v.name as venue_name, v.city as venue_city, v.capacity as venue_capacity, v.image_url as venue_image
            FROM V3_Teams t
            LEFT JOIN V3_Venues v ON t.venue_id = v.venue_id
            WHERE t.team_id = ?
        `, cleanParams([id]));
    }

    getClubMatches(teamId, options = {}) {
        const { year, competition, limit = 20 } = options;

        let sql = `
            SELECT f.fixture_id, f.date, f.status_short as status,
                   f.home_team_id as home_id, f.away_team_id as away_id,
                   f.goals_home as home_goals, f.goals_away as away_goals,
                   t1.name as home_name, t1.logo_url as home_logo,
                   t2.name as away_name, t2.logo_url as away_logo,
                   l.name as league_name, l.logo_url as league_logo
            FROM V3_Fixtures f
            JOIN V3_Teams t1 ON f.home_team_id = t1.team_id
            JOIN V3_Teams t2 ON f.away_team_id = t2.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            WHERE (f.home_team_id = ? OR f.away_team_id = ?)
        `;
        const params = [teamId, teamId];

        if (year) {
            sql += ` AND f.season_year = ?`;
            params.push(year);
        }
        if (competition && competition !== 'all') {
            sql += ` AND f.league_id = ?`;
            params.push(competition);
        }

        sql += ` ORDER BY f.date DESC LIMIT ?`;
        params.push(limit);

        return this.db.all(sql, params);
    }


    getClubTacticalSummary(teamId, options = {}) {
        const { year, competition } = options;

        const fetchStats = (venueCondition = '') => {
            let sql = `
                SELECT 
                    COUNT(DISTINCT fs.fixture_id) as matches,
                    AVG(CAST(REPLACE(fs.ball_possession, '%', '') AS FLOAT)) as possession,
                    AVG(fs.pass_accuracy_pct) as pass_accuracy,
                    AVG(fs.shots_total) as shots_per_match,
                    AVG(fs.shots_on_goal) as shots_on_target_per_match,
                    AVG(fs.corner_kicks) as corners_per_match,
                    AVG(fs.goalkeeper_saves) as saves_per_match,
                    AVG(fs.yellow_cards) as yellow_cards_per_match,
                    AVG(f.goals_home) as goals_home, -- Placeholder for more complex aggregation if needed
                    AVG(f.goals_away) as goals_away
                FROM V3_Fixture_Stats fs
                JOIN V3_Fixtures f ON fs.fixture_id = f.fixture_id
                WHERE fs.team_id = ?
            `;
            const params = [teamId];

            if (year) {
                sql += ` AND f.season_year = ?`;
                params.push(year);
            }
            if (competition && competition !== 'all') {
                sql += ` AND f.league_id = ?`;
                params.push(competition);
            }
            if (venueCondition === 'home') {
                sql += ` AND f.home_team_id = ?`;
                params.push(teamId);
            } else if (venueCondition === 'away') {
                sql += ` AND f.away_team_id = ?`;
                params.push(teamId);
            }

            const row = this.db.get(sql, cleanParams(params));

            // Post-process some values
            if (row) {
                row.possession = row.possession ? parseFloat(row.possession.toFixed(1)) : 0;
                row.pass_accuracy = row.pass_accuracy ? parseFloat(row.pass_accuracy.toFixed(1)) : 0;
                row.shots_per_match = row.shots_per_match ? parseFloat(row.shots_per_match.toFixed(1)) : 0;
                row.shots_on_target_per_match = row.shots_on_target_per_match ? parseFloat(row.shots_on_target_per_match.toFixed(1)) : 0;
                row.corners_per_match = row.corners_per_match ? parseFloat(row.corners_per_match.toFixed(1)) : 0;
                row.saves_per_match = row.saves_per_match ? parseFloat(row.saves_per_match.toFixed(1)) : 0;
                row.yellow_cards_per_match = row.yellow_cards_per_match ? parseFloat(row.yellow_cards_per_match.toFixed(1)) : 0;

                // For goal conversion, we need goals Scored
                // This is a rough estimate based on average goals in those matches where they were home or away
                // Better approach: SUM(CASE WHEN side=home THEN goals_home ELSE goals_away END)
            }
            return row;
        };

        const all = fetchStats('all');
        const home = fetchStats('home');
        const away = fetchStats('away');

        // Calculate missing fields for frontend compatibility
        const finalize = (s, venue) => {
            if (!s) return null;

            // Get raw goals for this team
            let goalsSql = `
                SELECT 
                    SUM(CASE WHEN home_team_id = ? THEN goals_home ELSE goals_away END) as scored,
                    SUM(CASE WHEN home_team_id = ? THEN goals_away ELSE goals_home END) as conceded,
                    SUM(CASE WHEN home_team_id = ? AND goals_away = 0 THEN 1 WHEN away_team_id = ? AND goals_home = 0 THEN 1 ELSE 0 END) as clean_sheets,
                    SUM(CASE WHEN (home_team_id = ? AND goals_home > goals_away) OR (away_team_id = ? AND goals_away > goals_home) THEN 1 ELSE 0 END) as wins
                FROM V3_Fixtures
                WHERE (home_team_id = ? OR away_team_id = ?) AND status_short = 'FT'
            `;
            let goalsParams = [teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId];

            if (year) { goalsSql += ` AND season_year = ?`; goalsParams.push(year); }
            if (competition && competition !== 'all') { goalsSql += ` AND league_id = ?`; goalsParams.push(competition); }
            if (venue === 'home') { goalsSql += ` AND home_team_id = ?`; goalsParams.push(teamId); }
            if (venue === 'away') { goalsSql += ` AND away_team_id = ?`; goalsParams.push(teamId); }

            const g = this.db.get(goalsSql, cleanParams(goalsParams));

            s.goals_scored_per_match = s.matches > 0 ? parseFloat((g.scored / s.matches).toFixed(2)) : 0;
            s.goals_conceded_per_match = s.matches > 0 ? parseFloat((g.conceded / s.matches).toFixed(2)) : 0;
            s.clean_sheet_pct = s.matches > 0 ? parseFloat(((g.clean_sheets / s.matches) * 100).toFixed(1)) : 0;
            s.win_rate = s.matches > 0 ? parseFloat(((g.wins / s.matches) * 100).toFixed(1)) : 0;
            s.shot_conversion = s.shots_per_match > 0 ? parseFloat(((s.goals_scored_per_match / s.shots_per_match) * 100).toFixed(1)) : 0;

            // Placeholders for fields not in DB yet
            s.touches_per_match = "-";
            s.big_chances_per_match = "-";

            return s;
        };

        return {
            all: finalize(all, 'all'),
            home: finalize(home, 'home'),
            away: finalize(away, 'away')
        };
    }

    getClubSeasons(teamId) {
        return this.db.all(`
            SELECT DISTINCT 
                l.league_id, 
                l.name as league_name, 
                l.logo_url as league_logo,
                l.type as competition_type,
                ls.season_year,
                ls.imported_lineups,
                ls.imported_fixture_stats,
                st.rank,
                st.played,
                st.win,
                st.draw,
                st.lose,
                st.goals_for,
                st.goals_against,
                st.status as round_reached
            FROM V3_Player_Stats ps
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            JOIN V3_League_Seasons ls ON (ps.league_id = ls.league_id AND ps.season_year = ls.season_year)
            LEFT JOIN V3_Standings st ON (ps.league_id = st.league_id AND ps.season_year = st.season_year AND ps.team_id = st.team_id)
            WHERE ps.team_id = ?
            ORDER BY ls.season_year DESC, l.importance_rank ASC
        `, cleanParams([teamId]));
    }

    getClubSummary(teamId, year = null, leagueId = null) {
        let sql = `
            SELECT 
                SUM(played) as total_played,
                SUM(win) as total_wins,
                SUM(goals_for) as goals_scored,
                SUM(goals_against) as goals_conceded,
                CASE WHEN SUM(played) > 0 THEN (CAST(SUM(win) AS FLOAT) / SUM(played)) * 100 ELSE 0 END as win_rate
            FROM V3_Standings
            WHERE team_id = ?
        `;
        const params = [teamId];

        if (year) {
            sql += ` AND season_year = ?`;
            params.push(year);
        }
        if (leagueId) {
            sql += ` AND league_id = ?`;
            params.push(leagueId);
        }

        return this.db.get(sql, cleanParams(params));
    }

    getClubRoster(teamId, year, leagueId = null) {
        let sql = `
            SELECT 
                p.player_id, p.name, p.photo_url, p.nationality, p.position, p.age,
                SUM(ps.games_appearences) as appearances,
                SUM(ps.games_lineups) as lineups,
                SUM(ps.games_minutes) as minutes,
                SUM(ps.goals_total) as goals,
                SUM(ps.goals_assists) as assists,
                SUM(ps.cards_yellow) as yellow_cards,
                SUM(ps.cards_red) as red_cards,
                AVG(CAST(NULLIF(ps.games_rating, 'N/A') AS FLOAT)) as rating
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            WHERE ps.team_id = ? AND ps.season_year = ?
        `;
        const params = [teamId, year];

        if (leagueId) {
            sql += ` AND ps.league_id = ?`;
            params.push(leagueId);
        }

        sql += ` GROUP BY p.player_id ORDER BY appearances DESC, p.name ASC`;
        return this.db.all(sql, cleanParams(params));
    }
}




export default new ClubRepository();
