import db from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * StandingsV4Service
 * Calculates league tables on-the-fly from V4_Fixtures.
 */
class StandingsV4Service {
    /**
     * Calculate standings for a specific league and season
     */
    async calculateStandings(leagueName, season) {
        try {
            // Fetch all COMPLETED fixtures for this league and season
            const fixtures = await db.all(`
                SELECT f.*, th.name as home_name, ta.name as away_name,
                    COALESCE(
                        (SELECT logo_url FROM V4_Club_Logos 
                         WHERE team_id = th.team_id 
                         AND CAST(SPLIT_PART(f.season, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                         ORDER BY start_year DESC
                         LIMIT 1), 
                        th.logo_url
                    ) as home_logo_url,
                    COALESCE(
                        (SELECT logo_url FROM V4_Club_Logos 
                         WHERE team_id = ta.team_id 
                         AND CAST(SPLIT_PART(f.season, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                         ORDER BY start_year DESC
                         LIMIT 1), 
                        ta.logo_url
                    ) as away_logo_url
                FROM V4_Fixtures f
                JOIN V4_Teams th ON th.team_id = f.home_team_id
                JOIN V4_Teams ta ON ta.team_id = f.away_team_id
                WHERE f.league = $1 AND f.season = $2
                  AND f.goals_home IS NOT NULL 
                  AND f.goals_away IS NOT NULL
                ORDER BY f.date ASC
            `, [leagueName, season]);

            const teams = {};

            const getTeam = (id, name, logo) => {
                if (!teams[id]) {
                    teams[id] = {
                        team_id: id,
                        team_name: name,
                        team_logo: logo || 'https://tmssl.akamaized.net//images/logo/normal/tm.png',
                        played: 0,
                        win: 0,
                        draw: 0,
                        lose: 0,
                        goals_for: 0,
                        goals_against: 0,
                        goals_diff: 0,
                        points: 0,
                        group_name: 'General Standings'
                    };
                }
                return teams[id];
            };

            for (const f of fixtures) {
                const home = getTeam(f.home_team_id, f.home_name, f.home_logo_url);
                const away = getTeam(f.away_team_id, f.away_name, f.away_logo_url);

                home.played++;
                away.played++;
                home.goals_for += f.goals_home;
                home.goals_against += f.goals_away;
                away.goals_for += f.goals_away;
                away.goals_against += f.goals_home;

                if (f.goals_home > f.goals_away) {
                    home.win++;
                    home.points += 3;
                    away.lose++;
                } else if (f.goals_home < f.goals_away) {
                    away.win++;
                    away.points += 3;
                    home.lose++;
                } else {
                    home.draw++;
                    home.points += 1;
                    away.draw++;
                    away.points += 1;
                }
            }

            // Convert to array and calculate diff, then sort
            const standings = Object.values(teams).map(t => {
                t.goals_diff = t.goals_for - t.goals_against;
                return t;
            });

            // Sort by points, then gd, then gf
            standings.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.goals_diff !== a.goals_diff) return b.goals_diff - a.goals_diff;
                return b.goals_for - a.goals_for;
            });

            // Assign ranks
            standings.forEach((t, i) => t.rank = i + 1);

            return standings;

        } catch (error) {
            logger.error({ err: error, leagueName, season }, 'V4 standings calculation error');
            throw error;
        }
    }

    /**
     * Get unique leagues and seasons available in V4
     */
    async listAvailableCompetitions() {
        return db.all(`
            SELECT DISTINCT league, season 
            FROM V4_Fixtures 
            ORDER BY league, season DESC
        `);
    }
}

export default new StandingsV4Service();
