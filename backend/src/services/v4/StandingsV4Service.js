import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import { DEFAULT_LOGO } from '../../config/mediaConstants.js';

const LATEST_CLUB_LOGOS_CTE = `
    latest_club_logos AS (
        SELECT DISTINCT ON (club_id) club_id, logo_url
        FROM v4.club_logos
        ORDER BY club_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST
    )`;

class StandingsV4Service {
    async calculateStandings(competitionIds, season) {
        const ids = Array.isArray(competitionIds) ? competitionIds : [competitionIds];
        try {
            const fixtures = await db.all(
                `WITH ${LATEST_CLUB_LOGOS_CTE}
                 SELECT
                     m.match_id::text        AS fixture_id,
                     m.match_date            AS date,
                     m.round_label           AS round,
                     m.home_score            AS goals_home,
                     m.away_score            AS goals_away,
                     m.home_club_id::text    AS home_team_id,
                     m.away_club_id::text    AS away_team_id,
                     home.name               AS home_name,
                     home.slug               AS home_slug,
                     away.name               AS away_name,
                     away.slug               AS away_slug,
                     COALESCE(hl.logo_url, home.current_logo_url, ?) AS home_logo_url,
                     COALESCE(al.logo_url, away.current_logo_url, ?) AS away_logo_url,
                     c.name                  AS comp_name
                 FROM v4.matches m
                 JOIN v4.clubs home              ON home.club_id = m.home_club_id
                 JOIN v4.clubs away              ON away.club_id = m.away_club_id
                 JOIN v4.competitions c          ON c.competition_id = m.competition_id
                 LEFT JOIN latest_club_logos hl  ON hl.club_id = m.home_club_id
                 LEFT JOIN latest_club_logos al  ON al.club_id = m.away_club_id
                 WHERE m.competition_id IN (${ids.map(() => '?::BIGINT').join(', ')})
                   AND m.season_label   = ?
                   AND m.home_score IS NOT NULL
                   AND m.away_score IS NOT NULL
                 ORDER BY m.match_date ASC NULLS LAST, m.match_id ASC`,
                [DEFAULT_LOGO, DEFAULT_LOGO, ...ids, season]
            );

            const teams = {};

            const getTeam = (id, name, logo, slug) => {
                if (!teams[id]) {
                    teams[id] = {
                        team_id: id,
                        team_name: name,
                        team_slug: slug,
                        team_logo: logo || DEFAULT_LOGO,
                        played: 0,
                        win: 0,
                        draw: 0,
                        lose: 0,
                        goals_for: 0,
                        goals_against: 0,
                        goals_diff: 0,
                        points: 0,
                        group_name: null
                    };
                }
                return teams[id];
            };

            for (const fixture of fixtures) {
                const home = getTeam(fixture.home_team_id, fixture.home_name, fixture.home_logo_url, fixture.home_slug);
                const away = getTeam(fixture.away_team_id, fixture.away_name, fixture.away_logo_url, fixture.away_slug);

                // For international tournaments, assign group if round is 'Groupe X'
                if (fixture.round?.startsWith('Groupe ')) {
                    let prefix = '';
                    if (fixture.comp_name.includes(' Nations League ')) {
                        // Extract A, B, C or D from "UEFA Nations League A"
                        const parts = fixture.comp_name.split(' ');
                        prefix = parts[parts.length - 1] + ' - ';
                    }
                    home.group_name = prefix + fixture.round;
                    away.group_name = prefix + fixture.round;
                } else if (fixture.round?.includes('Relégation') || fixture.round?.includes('Barrage')) {
                    home.group_name = 'Barrages / Relégation';
                    away.group_name = 'Barrages / Relégation';
                } else if (!home.group_name) {
                    home.group_name = 'Classement';
                }
                if (!away.group_name) {
                    away.group_name = 'Classement';
                }

                home.played += 1;
                away.played += 1;
                home.goals_for += Number(fixture.goals_home || 0);
                home.goals_against += Number(fixture.goals_away || 0);
                away.goals_for += Number(fixture.goals_away || 0);
                away.goals_against += Number(fixture.goals_home || 0);

                if (Number(fixture.goals_home) > Number(fixture.goals_away)) {
                    home.win += 1;
                    home.points += 3;
                    away.lose += 1;
                } else if (Number(fixture.goals_home) < Number(fixture.goals_away)) {
                    away.win += 1;
                    away.points += 3;
                    home.lose += 1;
                } else {
                    home.draw += 1;
                    away.draw += 1;
                    home.points += 1;
                    away.points += 1;
                }
            }

            const standings = Object.values(teams)
                .map((team) => ({
                    ...team,
                    goals_diff: team.goals_for - team.goals_against
                }))
                .sort((a, b) => {
                    // First sort by group
                    if (a.group_name !== b.group_name) {
                        return (a.group_name || '').localeCompare(b.group_name || '');
                    }
                    // Then by points/GD
                    if (b.points !== a.points) return b.points - a.points;
                    if (b.goals_diff !== a.goals_diff) return b.goals_diff - a.goals_diff;
                    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
                    return a.team_name.localeCompare(b.team_name);
                });

            standings.forEach((team, index) => {
                team.rank = index + 1;
            });

            return standings;
        } catch (error) {
            logger.error({ err: error, competitionId, season }, 'V4 standings calculation error');
            throw error;
        }
    }

    async listAvailableCompetitions() {
        return db.all(
            `
                SELECT DISTINCT c.name AS league, m.season_label AS season
                FROM v4.matches m
                JOIN v4.competitions c ON c.competition_id = m.competition_id
                ORDER BY c.name ASC, m.season_label DESC
                LIMIT 200
            `
        );
    }
}

export default new StandingsV4Service();
