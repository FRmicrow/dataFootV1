import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

/**
 * V3 Club Profile Controller
 */

/**
 * GET /api/v3/club/:id?year=2023
 * Hybrid of searchController's getClubProfile + US_282 Summary
 */
export const getClubProfile = async (req, res) => {
    try {
        const { id } = req.params;
        const requestedYear = req.query.year ? parseInt(req.query.year) : null;

        // 1. Club info + Venue
        const club = db.get(`
            SELECT 
                t.team_id, t.api_id, t.name, t.logo_url, t.country, t.founded, t.code,
                t.accent_color, t.secondary_color, t.tertiary_color,
                v.name as venue_name, v.city as venue_city, v.capacity as venue_capacity, 
                v.image_url as venue_image, v.surface as venue_surface
            FROM V3_Teams t
            LEFT JOIN V3_Venues v ON t.venue_id = v.venue_id
            WHERE t.team_id = ?
        `, [id]);

        if (!club) {
            return res.status(404).json({ error: "Club not found" });
        }

        // 2. Seasons overview: aggregate from V3_Player_Stats + V3_Standings + V3_League_Seasons
        const seasons = db.all(`
            SELECT 
                ps.season_year,
                ps.league_id,
                l.name as league_name,
                l.logo_url as league_logo,
                l.type as competition_type,
                ls.imported_fixture_stats,
                ls.imported_player_stats,
                ls.imported_lineups,
                s.rank, s.points, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.goals_diff, s.played as league_played,
                COUNT(DISTINCT ps.player_id) as squad_size,
                SUM(ps.games_appearences) as total_appearances,
                SUM(ps.goals_total) as total_goals,
                SUM(ps.goals_assists) as total_assists,
                ROUND(AVG(CASE WHEN ps.games_rating IS NOT NULL AND ps.games_rating != '' THEN CAST(ps.games_rating AS REAL) END), 2) as avg_rating
            FROM V3_Player_Stats ps
            JOIN V3_Leagues l ON ps.league_id = l.league_id
            LEFT JOIN V3_League_Seasons ls ON ps.league_id = ls.league_id AND ps.season_year = ls.season_year
            LEFT JOIN V3_Standings s ON ps.team_id = s.team_id AND ps.league_id = s.league_id AND ps.season_year = s.season_year
            WHERE ps.team_id = ?
            GROUP BY ps.season_year, ps.league_id
            ORDER BY ps.season_year DESC, l.importance_rank ASC, l.name ASC
        `, [id]);

        // Enrich with Cup Rounds
        for (let s of seasons) {
            if (s.competition_type === 'Cup') {
                const maxRound = db.get(`
                    SELECT round FROM V3_Fixtures 
                    WHERE (home_team_id = ? OR away_team_id = ?) 
                    AND league_id = ? AND season_year = ?
                    ORDER BY date DESC LIMIT 1
                `, [id, id, s.league_id, s.season_year]);
                s.round_reached = maxRound?.round || 'Preliminary';
            }
        }

        // 3. Determine roster year
        const latestYear = seasons.length > 0 ? seasons[0].season_year : null;
        const rosterYear = requestedYear || latestYear;

        // 4. US_282: Global Season Summary (The "All" View)
        let seasonSummary = null;
        if (rosterYear) {
            // Aggregate from V3_Fixtures for accuracy on wins/losses
            const fixtureStats = db.all(`
                SELECT 
                    fixture_id, home_team_id, away_team_id, goals_home, goals_away
                FROM V3_Fixtures
                WHERE (home_team_id = ? OR away_team_id = ?) AND season_year = ?
                AND status_short IN ('FT', 'AET', 'PEN')
            `, [id, id, rosterYear]);

            let totalPlayed = fixtureStats.length;
            let wins = 0;
            let draws = 0;
            let losses = 0;
            let goalsScored = 0;
            let goalsConceded = 0;

            fixtureStats.forEach(f => {
                const isHome = f.home_team_id == id;
                const scored = (isHome ? f.goals_home : f.goals_away) || 0;
                const conceded = (isHome ? f.goals_away : f.goals_home) || 0;

                goalsScored += scored;
                goalsConceded += conceded;

                if (scored > conceded) wins++;
                else if (scored === conceded) draws++;
                else losses++;
            });

            // Find best result for the summary
            const bestLeague = seasons.filter(s => s.season_year === rosterYear && s.competition_type === 'League')
                .sort((a, b) => (a.rank || 99) - (b.rank || 99))[0];

            const bestCup = seasons.filter(s => s.season_year === rosterYear && s.competition_type === 'Cup')
                .sort((a, b) => b.round_reached.localeCompare(a.round_reached))[0]; // Simplistic

            seasonSummary = {
                total_played: totalPlayed,
                win_rate: totalPlayed > 0 ? parseFloat(((wins / totalPlayed) * 100).toFixed(1)) : 0,
                goals_scored: goalsScored,
                goals_conceded: goalsConceded,
                wins, draws, losses,
                best_result: bestLeague ? `Rank #${bestLeague.rank} (${bestLeague.league_name})` : (bestCup ? `${bestCup.round_reached} (${bestCup.league_name})` : 'N/A')
            };
        }

        const competitionId = req.query.competition && req.query.competition !== 'all' ? parseInt(req.query.competition) : null;

        // 5. Roster for selected year
        let roster = [];
        if (rosterYear) {
            let rosterSql = `
                SELECT 
                    p.player_id, p.name, p.photo_url, p.nationality,
                    ps.games_position as position,
                    SUM(ps.games_appearences) as appearances,
                    SUM(ps.goals_total) as goals,
                    SUM(ps.goals_assists) as assists,
                    ROUND(AVG(CASE WHEN ps.games_rating IS NOT NULL AND ps.games_rating != '' THEN CAST(ps.games_rating AS REAL) END), 2) as rating,
                    SUM(ps.games_minutes) as minutes,
                    GROUP_CONCAT(DISTINCT l.name) as leagues
                FROM V3_Player_Stats ps
                JOIN V3_Players p ON ps.player_id = p.player_id
                JOIN V3_Leagues l ON ps.league_id = l.league_id
                WHERE ps.team_id = ? AND ps.season_year = ?
            `;
            const rosterParams = [id, rosterYear];

            if (competitionId) {
                rosterSql += ` AND ps.league_id = ?`;
                rosterParams.push(competitionId);
            }

            rosterSql += `
                GROUP BY p.player_id
                ORDER BY 
                    CASE ps.games_position 
                        WHEN 'Goalkeeper' THEN 1 
                        WHEN 'Defender' THEN 2 
                        WHEN 'Midfielder' THEN 3 
                        WHEN 'Attacker' THEN 4 
                        ELSE 5 
                    END,
                    appearances DESC
            `;
            roster = db.all(rosterSql, rosterParams);
        }

        // 6. Available years for year selector
        const availableYears = [...new Set(seasons.map(s => s.season_year))].sort((a, b) => b - a);

        res.json({
            club,
            seasons,
            roster,
            rosterYear,
            availableYears,
            summary: seasonSummary
        });
    } catch (error) {
        console.error("Club profile error:", error);
        res.status(500).json({ error: error.message });
    }
};


/**
 * Helper to calculate tactical metrics for a set of fixtures
 */
const calculateTacticalMetrics = (fixtures, teamId) => {
    if (fixtures.length === 0) return null;

    const fixtureIds = fixtures.map(f => f.fixture_id);

    // Aggregate from V3_Fixture_Stats
    const stats = db.get(`
        SELECT 
            AVG(CAST(SUBSTR(ball_possession, 1, LENGTH(ball_possession)-1) AS REAL)) as avg_possession,
            AVG(shots_total) as avg_shots,
            AVG(shots_on_goal) as avg_shots_on_target,
            AVG(pass_accuracy_pct) as avg_pass_accuracy,
            AVG(corner_kicks) as avg_corners,
            AVG(yellow_cards) as avg_yellow_cards,
            AVG(red_cards) as avg_red_cards,
            SUM(shots_total) as total_shots
        FROM V3_Fixture_Stats
        WHERE team_id = ? AND fixture_id IN (${fixtureIds.join(',')})
    `, [teamId]);

    let totalGoals = 0;
    let totalConceded = 0;
    let cleanSheets = 0;
    let wins = 0;
    let points = 0;

    fixtures.forEach(f => {
        const isHome = f.home_team_id == teamId;
        const scored = (isHome ? f.goals_home : f.goals_away) || 0;
        const conceded = (isHome ? f.goals_away : f.goals_home) || 0;

        totalGoals += scored;
        totalConceded += conceded;
        if (conceded === 0) cleanSheets++;

        if (scored > conceded) {
            wins++;
            points += 3;
        } else if (scored === conceded) {
            points += 1;
        }
    });

    return {
        possession: parseFloat((stats.avg_possession || 0).toFixed(1)),
        shots_per_match: parseFloat((stats.avg_shots || 0).toFixed(1)),
        shots_on_target_per_match: parseFloat((stats.avg_shots_on_target || 0).toFixed(1)),
        pass_accuracy: parseFloat((stats.avg_pass_accuracy || 0).toFixed(1)),
        corners_per_match: parseFloat((stats.avg_corners || 0).toFixed(1)),
        discipline: {
            yellow_cards: parseFloat((stats.avg_yellow_cards || 0).toFixed(1)),
            red_cards: parseFloat((stats.avg_red_cards || 0).toFixed(2))
        },
        shot_conversion: stats.total_shots > 0 ? parseFloat(((totalGoals / stats.total_shots) * 100).toFixed(1)) : 0,
        clean_sheet_pct: parseFloat(((cleanSheets / fixtures.length) * 100).toFixed(1)),
        goals_conceded_per_match: parseFloat((totalConceded / fixtures.length).toFixed(2)),
        goals_scored_per_match: parseFloat((totalGoals / fixtures.length).toFixed(2)),
        points_per_match: parseFloat((points / fixtures.length).toFixed(2)),
        win_rate: parseFloat(((wins / fixtures.length) * 100).toFixed(1)),
        match_count: fixtures.length
    };
};

export const getClubTacticalSummary = async (req, res) => {
    try {
        const { id: teamId } = req.params;
        const { year, competition, history } = req.query;

        // Base Query for fixtures
        let fixtureSql = `
            SELECT fixture_id, home_team_id, away_team_id, goals_home, goals_away, season_year
            FROM V3_Fixtures
            WHERE (home_team_id = ? OR away_team_id = ?)
            AND status_short IN ('FT', 'AET', 'PEN')
        `;
        const fixtureParams = [teamId, teamId];

        if (competition && competition !== 'all') {
            fixtureSql += " AND league_id = ?";
            fixtureParams.push(competition);
        }

        if (year) {
            fixtureSql += " AND season_year = ?";
            fixtureParams.push(year);
        }

        const allFixtures = db.all(fixtureSql, fixtureParams);

        if (history === 'true') {
            // Group fixtures by year
            const years = [...new Set(allFixtures.map(f => f.season_year))].sort((a, b) => b - a);
            const historyData = {};

            years.forEach(y => {
                const yearFixtures = allFixtures.filter(f => f.season_year === y);
                if (yearFixtures.length > 0) {
                    historyData[y] = calculateTacticalMetrics(yearFixtures, teamId);
                }
            });
            return res.json(historyData);
        }

        // Single year view
        if (allFixtures.length === 0) {
            return res.json({ all: null, home: null, away: null });
        }

        const homeFixtures = allFixtures.filter(f => f.home_team_id == teamId);
        const awayFixtures = allFixtures.filter(f => f.away_team_id == teamId);

        res.json({
            all: calculateTacticalMetrics(allFixtures, teamId),
            home: calculateTacticalMetrics(homeFixtures, teamId),
            away: calculateTacticalMetrics(awayFixtures, teamId)
        });

    } catch (error) {
        console.error("Error in getClubTacticalSummary:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/club/:id/matches?year=2023&competition=...
 * US_285: Match Archives
 */
export const getClubMatches = async (req, res) => {
    try {
        const { id: teamId } = req.params;
        const { year, competition, venue_type } = req.query; // venue_type: 'home', 'away', 'all'

        if (!year) return res.status(400).json({ error: "Missing year parameter" });

        let sql = `
            SELECT 
                f.fixture_id, f.date, f.round, f.status_short,
                f.home_team_id, f.away_team_id,
                f.goals_home, f.goals_away,
                l.name as league_name, l.logo_url as league_logo,
                ht.name as home_name, ht.logo_url as home_logo,
                at.name as away_name, at.logo_url as away_logo
            FROM V3_Fixtures f
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            WHERE (f.home_team_id = ? OR f.away_team_id = ?) AND f.season_year = ?
        `;
        const params = [teamId, teamId, year];

        if (competition) {
            sql += " AND f.league_id = ?";
            params.push(competition);
        }

        if (venue_type === 'home') {
            sql += " AND f.home_team_id = ?";
            params.push(teamId);
        } else if (venue_type === 'away') {
            sql += " AND f.away_team_id = ?";
            params.push(teamId);
        }

        sql += " ORDER BY f.date DESC";

        const matches = db.all(sql, params);

        // Process matches to add W/D/L perspective
        const processed = matches.map(m => {
            const isHome = m.home_team_id == teamId;
            const scoreOwn = isHome ? m.goals_home : m.goals_away;
            const scoreOpp = isHome ? m.goals_away : m.goals_home;

            let result = 'D';
            if (scoreOwn > scoreOpp) result = 'W';
            else if (scoreOwn < scoreOpp) result = 'L';

            return {
                ...m,
                side: isHome ? 'Home' : 'Away',
                opponent: isHome ? { name: m.away_name, logo: m.away_logo, id: m.away_team_id } : { name: m.home_name, logo: m.home_logo, id: m.home_team_id },
                result,
                score: `${m.goals_home} - ${m.goals_away}`
            };
        });

        res.json(processed);
    } catch (error) {
        console.error("Error in getClubMatches:", error);
        res.status(500).json({ error: error.message });
    }
};
