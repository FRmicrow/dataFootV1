import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import { DEFAULT_LOGO, DEFAULT_PHOTO } from '../../config/mediaConstants.js';

const LATEST_CLUB_LOGOS_CTE = `
    latest_club_logos AS (
        SELECT DISTINCT ON (team_id) team_id AS club_id, logo_url
        FROM v4.team_logos
        ORDER BY team_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST
    )`;

const LATEST_COMP_LOGOS_CTE = `
    latest_comp_logos AS (
        SELECT DISTINCT ON (competition_id) competition_id, logo_url
        FROM v4.competition_logos
        ORDER BY competition_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST
    )`;

class ClubServiceV4 {
    async getClubProfile(identifier) {
        return db.get(
            `WITH ${LATEST_CLUB_LOGOS_CTE}
             SELECT
                c.team_id AS club_id,
                c.name,
                c.name AS official_name,
                c.short_name,
                NULL AS founded,
                NULL AS accent_color,
                NULL AS secondary_color,
                NULL AS tertiary_color,
                NULL AS description,
                NULL AS venue_name,
                NULL AS venue_city,
                NULL AS venue_capacity,
                NULL AS venue_image_url,
                c.current_logo_url,
                COALESCE(lcl.logo_url, c.current_logo_url, ?) as logo_url,
                co.display_name as country_name,
                co.flag_url as country_flag
             FROM v4.teams c
             LEFT JOIN latest_club_logos lcl ON c.team_id = lcl.club_id
             LEFT JOIN v4.countries co ON c.country_id = co.country_id
             WHERE c.team_id::text = ?
                OR c.slug = ?
                OR LOWER(REGEXP_REPLACE(c.short_name, '[^a-zA-Z0-9]+', '-', 'g')) = ?`,
            [DEFAULT_LOGO, identifier, identifier, identifier]
        );
    }

    async getClubSeasons(clubId) {
        return db.all(
            `WITH ${LATEST_COMP_LOGOS_CTE}
             SELECT DISTINCT 
                m.season_label,
                comp.competition_id::text,
                comp.name as competition_name,
                comp.competition_type,
                COALESCE(lcl.logo_url, comp.current_logo_url) as competition_logo
             FROM v4.matches m
             JOIN v4.competitions comp ON m.competition_id = comp.competition_id
             LEFT JOIN latest_comp_logos lcl ON comp.competition_id = lcl.competition_id
             WHERE m.home_team_id = ? OR m.away_team_id = ?
             ORDER BY m.season_label DESC, comp.name ASC`,
            [clubId, clubId]
        );
    }

    async getClubSquad(clubId, seasonLabel, competitionId = null) {
        let query = `
            WITH player_stats AS (
                SELECT 
                    ml.player_id,
                    COUNT(DISTINCT ml.match_id) as appearances,
                    COUNT(DISTINCT CASE WHEN ml.is_starter THEN ml.match_id END) as starts,
                    MAX(ml.jersey_number) as number,
                    MODE() WITHIN GROUP (ORDER BY NULLIF(ml.position_code, '')) as position_code,
                    MODE() WITHIN GROUP (ORDER BY NULLIF(ml.role_code, '')) as position
                FROM v4.match_lineups ml
                JOIN v4.matches m ON ml.match_id = m.match_id
                WHERE ml.club_id = ? AND m.season_label = ?
        `;
        const params = [clubId, seasonLabel];

        if (competitionId) {
            query += ` AND m.competition_id = ?`;
            params.push(competitionId);
        }

        query += `
                GROUP BY ml.player_id
            )
            SELECT
                ps.player_id,
                ps.appearances,
                ps.starts,
                ps.number,
                ps.position_code,
                ps.position,
                p.full_name as name,
                COALESCE(p.photo_url, ?) as photo,
                NULL as nationality,
                NULL as age
            FROM player_stats ps
            JOIN v4.people p ON ps.player_id = p.person_id
            ORDER BY ps.appearances DESC, p.full_name ASC
        `;
        params.push(DEFAULT_PHOTO);

        return db.all(query, params);
    }

    async getClubMatches(clubId, options = {}) {
        const { seasonLabel, competitionId, limit = 20 } = options;
        
        let query = `
            WITH ${LATEST_CLUB_LOGOS_CTE}
            SELECT 
                m.match_id::text as fixture_id,
                m.home_team_id::text as home_club_id,
                m.away_team_id::text as away_club_id,
                m.match_date as date,
                m.home_score as goals_home,
                m.away_score as goals_away,
                m.season_label,
                m.round_label,
                m.matchday,
                hc.name as home_name,
                ac.name as away_name,
                COALESCE(hcl.logo_url, hc.current_logo_url) as home_logo,
                COALESCE(acl.logo_url, ac.current_logo_url) as away_logo,
                comp.name as league_name
            FROM v4.matches m
            JOIN v4.teams hc ON m.home_team_id = hc.team_id
            JOIN v4.teams ac ON m.away_team_id = ac.team_id
            JOIN v4.competitions comp ON m.competition_id = comp.competition_id
            LEFT JOIN latest_club_logos hcl ON hc.team_id = hcl.club_id
            LEFT JOIN latest_club_logos acl ON ac.team_id = acl.club_id
            WHERE (m.home_team_id = ? OR m.away_team_id = ?)
        `;
        const params = [clubId, clubId];

        if (seasonLabel) {
            query += ` AND m.season_label = ?`;
            params.push(seasonLabel);
        }
        if (competitionId) {
            query += ` AND m.competition_id = ?`;
            params.push(competitionId);
        }

        query += ` ORDER BY m.match_date DESC LIMIT ?`;
        params.push(limit);

        return db.all(query, params);
    }

    async getClubSummary(clubId, seasonLabel, competitionId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_played,
                SUM(CASE WHEN (m.home_team_id = ? AND m.home_score > m.away_score) OR (m.away_team_id = ? AND m.away_score > m.home_score) THEN 1 ELSE 0 END) as total_wins,
                SUM(CASE WHEN m.home_team_id = ? THEN m.home_score ELSE m.away_score END) as goals_scored,
                SUM(CASE WHEN m.home_team_id = ? THEN m.away_score ELSE m.home_score END) as goals_conceded,
                AVG(m.xg_home + m.xg_away) as avg_total_xg
            FROM v4.matches m
            WHERE (m.home_team_id = ? OR m.away_team_id = ?)
              AND m.home_score IS NOT NULL
              AND m.season_label = ?
        `;
        const params = [clubId, clubId, clubId, clubId, clubId, clubId, seasonLabel];

        if (competitionId) {
            query += ` AND m.competition_id = ?`;
            params.push(competitionId);
        }

        return db.get(query, params);
    }
}

export default new ClubServiceV4();
