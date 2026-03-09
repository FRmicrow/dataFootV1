import BaseRepository from './BaseRepository.js';
import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

class ClubRepository extends BaseRepository {
    constructor() {
        super(db, 'V3_Teams');
    }

    async getClubProfileWithVenue(id) {
        return await this.db.get(`
            SELECT t.*, v.name as venue_name, v.city as venue_city, v.capacity as venue_capacity, v.image_url as venue_image
            FROM V3_Teams t
            LEFT JOIN V3_Venues v ON t.venue_id = v.venue_id
            WHERE t.team_id = $1
        `, cleanParams([id]));
    }

    async getClubMatches(teamId, options = {}) {
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
            WHERE (f.home_team_id = $1 OR f.away_team_id = $1)
        `;
        const params = [teamId];

        let paramIdx = 2;
        if (year) {
            sql += ` AND f.season_year = $${paramIdx++}`;
            params.push(year);
        }
        if (competition && competition !== 'all') {
            sql += ` AND f.league_id = $${paramIdx++}`;
            params.push(competition);
        }

        sql += ` ORDER BY f.date DESC LIMIT $${paramIdx}`;
        params.push(limit);

        return await this.db.all(sql, params);
    }


    async getClubTacticalSummary(teamId, options = {}) {
        const { year, competition } = options;

        const [all, home, away] = await Promise.all([
            this.#fetchTacticalStats(teamId, 'all', year, competition),
            this.#fetchTacticalStats(teamId, 'home', year, competition),
            this.#fetchTacticalStats(teamId, 'away', year, competition)
        ]);

        return {
            all: await this.#finalizeTacticalStats(teamId, all, 'all', year, competition),
            home: await this.#finalizeTacticalStats(teamId, home, 'home', year, competition),
            away: await this.#finalizeTacticalStats(teamId, away, 'away', year, competition)
        };
    }

    async #fetchTacticalStats(teamId, venueCondition, year, competition) {
        let sql = `
            SELECT 
                COUNT(DISTINCT fs.fixture_id) as matches,
                AVG(CAST(NULLIF(REPLACE(fs.ball_possession, '%', ''), '') AS FLOAT)) as possession,
                AVG(fs.pass_accuracy_pct) as pass_accuracy,
                AVG(fs.shots_total) as shots_per_match,
                AVG(fs.shots_on_goal) as shots_on_target_per_match,
                AVG(fs.corner_kicks) as corners_per_match,
                AVG(fs.goalkeeper_saves) as saves_per_match,
                AVG(fs.yellow_cards) as yellow_cards_per_match,
                AVG(f.goals_home) as goals_home,
                AVG(f.goals_away) as goals_away
            FROM V3_Fixture_Stats fs
            JOIN V3_Fixtures f ON fs.fixture_id = f.fixture_id
            WHERE fs.team_id = $1
        `;
        const params = [teamId];
        let paramIdx = 2;

        if (year) {
            sql += ` AND f.season_year = $${paramIdx++}`;
            params.push(year);
        }
        if (competition && competition !== 'all') {
            sql += ` AND f.league_id = $${paramIdx++}`;
            params.push(competition);
        }
        if (venueCondition === 'home') {
            sql += ` AND f.home_team_id = $${paramIdx++}`;
            params.push(teamId);
        } else if (venueCondition === 'away') {
            sql += ` AND f.away_team_id = $${paramIdx++}`;
            params.push(teamId);
        }

        const row = await this.db.get(sql, cleanParams(params));
        return this._formatTacticalRow(row);
    }

    _formatTacticalRow(row) {
        if (!row) return null;
        const keys = ['possession', 'pass_accuracy', 'shots_per_match', 'shots_on_target_per_match', 'corners_per_match', 'saves_per_match', 'yellow_cards_per_match'];
        keys.forEach(k => {
            row[k] = row[k] ? Number.parseFloat(Number(row[k]).toFixed(1)) : 0;
        });
        return row;
    }

    async #finalizeTacticalStats(teamId, s, venue, year, competition) {
        if (!s) return null;

        let goalsSql = `
            SELECT 
                SUM(CASE WHEN home_team_id = $1 THEN goals_home ELSE goals_away END) as scored,
                SUM(CASE WHEN home_team_id = $1 THEN goals_away ELSE goals_home END) as conceded,
                SUM(CASE WHEN home_team_id = $1 AND goals_away = 0 THEN 1 WHEN away_team_id = $1 AND goals_home = 0 THEN 1 ELSE 0 END) as clean_sheets,
                SUM(CASE WHEN (home_team_id = $1 AND goals_home > goals_away) OR (away_team_id = $1 AND goals_away > goals_home) THEN 1 ELSE 0 END) as wins,
                COUNT(fixture_id) as played
            FROM V3_Fixtures
            WHERE (home_team_id = $1 OR away_team_id = $1) AND status_short IN ('FT', 'AET', 'PEN')
        `;
        let goalsParams = [teamId];
        let gIdx = 2;

        if (year) { goalsSql += ` AND season_year = $${gIdx++}`; goalsParams.push(year); }
        if (competition && competition !== 'all') { goalsSql += ` AND league_id = $${gIdx++}`; goalsParams.push(competition); }
        if (venue === 'home') { goalsSql += ` AND home_team_id = $${gIdx++}`; goalsParams.push(teamId); }
        if (venue === 'away') { goalsSql += ` AND away_team_id = $${gIdx++}`; goalsParams.push(teamId); }

        const g = await this.db.get(goalsSql, cleanParams(goalsParams));

        const matchesPlayed = Number.parseInt(g.played, 10) || 0;
        s.goals_scored_per_match = matchesPlayed > 0 ? Number.parseFloat((Number(g.scored) / matchesPlayed).toFixed(2)) : 0;
        s.goals_conceded_per_match = matchesPlayed > 0 ? Number.parseFloat((Number(g.conceded) / matchesPlayed).toFixed(2)) : 0;
        s.clean_sheet_pct = matchesPlayed > 0 ? Number.parseFloat(((Number(g.clean_sheets) / matchesPlayed) * 100).toFixed(1)) : 0;
        s.win_rate = matchesPlayed > 0 ? Math.min(100, Number.parseFloat(((Number(g.wins) / matchesPlayed) * 100).toFixed(1))) : 0;
        s.shot_conversion = s.shots_per_match > 0 ? Number.parseFloat(((s.goals_scored_per_match / s.shots_per_match) * 100).toFixed(1)) : 0;

        s.touches_per_match = "-";
        s.big_chances_per_match = "-";

        return s;
    }

    async getClubSeasons(teamId) {
        return await this.db.all(`
            SELECT DISTINCT 
                l.league_id, 
                l.name as league_name, 
                l.logo_url as league_logo,
                l.type as competition_type,
                l.importance_rank,
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
            WHERE ps.team_id = $1
            ORDER BY ls.season_year DESC, l.importance_rank ASC
        `, cleanParams([teamId]));
    }

    async getClubSummary(teamId, year = null, leagueId = null) {
        let sql = `
            SELECT 
                SUM(played) as total_played,
                SUM(win) as total_wins,
                SUM(goals_for) as goals_scored,
                SUM(goals_against) as goals_conceded,
                CASE WHEN SUM(played) > 0 THEN (CAST(SUM(win) AS FLOAT) / SUM(played)) * 100 ELSE 0 END as win_rate
            FROM V3_Standings
            WHERE team_id = $1
        `;
        const params = [teamId];
        let pIdx = 2;

        if (year) {
            sql += ` AND season_year = $${pIdx++}`;
            params.push(year);
        }
        if (leagueId) {
            sql += ` AND league_id = $${pIdx++}`;
            params.push(leagueId);
        }

        return await this.db.get(sql, cleanParams(params));
    }

    async getClubRoster(teamId, year, leagueId = null) {
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
                AVG(CAST(NULLIF(ps.games_rating, 'N/A') AS FLOAT))::numeric as rating
            FROM V3_Player_Stats ps
            JOIN V3_Players p ON ps.player_id = p.player_id
            WHERE ps.team_id = $1 AND ps.season_year = $2
        `;
        const params = [teamId, year];
        let pIdx = 3;

        if (leagueId) {
            sql += ` AND ps.league_id = $${pIdx++}`;
            params.push(leagueId);
        }

        sql += ` GROUP BY p.player_id, p.name, p.photo_url, p.nationality, p.position, p.age ORDER BY appearances DESC, p.name ASC`;
        return await this.db.all(sql, cleanParams(params));
    }
}

export default new ClubRepository();
