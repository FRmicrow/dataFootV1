import db from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const logger = createChildLogger('XgV4Service');

const XgV4Service = {
    /**
     * Returns xG stats for all clubs in a competition/season.
     * @param {string} competitionId
     * @param {string} season  e.g. "2023/2024"
     * @returns {Promise<Array>}
     */
    /**
     * Returns team-season xG from UnderStat data for a league/season.
     * Uses league name lookup (same pattern as LeagueServiceV4).
     * @param {string} leagueName  e.g. "Premier League"
     * @param {string} season      e.g. "2022-2023"
     * @returns {Promise<Array>}
     */
    async getTeamSeasonXg(leagueName, season) {
        const rows = await db.all(
            `SELECT
                tsx.id,
                tsx.competition_id::text,
                tsx.season_label,
                tsx.club_id::text,
                c.name             AS club_name,
                COALESCE(cl.logo_url, c.current_logo_url) AS club_logo,
                tsx.position,
                tsx.matches,
                tsx.wins,
                tsx.draws,
                tsx.losses,
                tsx.goals,
                tsx.goals_against,
                tsx.points,
                tsx.xg,
                tsx.npxg,
                tsx.xga,
                tsx.npxga,
                tsx.npxgd,
                tsx.ppda,
                tsx.ppda_allowed,
                tsx.deep,
                tsx.deep_allowed,
                tsx.xpts
             FROM v4.team_season_xg tsx
             JOIN v4.competitions comp ON comp.competition_id = tsx.competition_id
             JOIN v4.clubs c ON c.club_id = tsx.club_id
             LEFT JOIN LATERAL (
                 SELECT logo_url FROM v4.club_logos
                 WHERE club_id = c.club_id
                 ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                 LIMIT 1
             ) cl ON TRUE
             WHERE comp.name = $1
               AND tsx.season_label = $2
             ORDER BY tsx.position ASC NULLS LAST, tsx.xg DESC NULLS LAST`,
            [leagueName, season]
        );
        return rows;
    },

    async getXgByCompetitionSeason(competitionId, season) {
        const rows = await db.all(
            `SELECT
                lsx.id,
                lsx.competition_id::text,
                lsx.season_label,
                lsx.club_id::text,
                c.name             AS club_name,
                c.current_logo_url AS club_logo,
                lsx.xg_for,
                lsx.xg_against,
                lsx.xg_points,
                lsx.np_xg,
                lsx.ppda
             FROM v4.league_season_xg lsx
             JOIN v4.clubs c ON c.club_id = lsx.club_id
             WHERE lsx.competition_id = ?
               AND lsx.season_label   = ?
             ORDER BY lsx.xg_for DESC NULLS LAST`,
            [competitionId, season]
        );
        return rows;
    },
};

export default XgV4Service;
