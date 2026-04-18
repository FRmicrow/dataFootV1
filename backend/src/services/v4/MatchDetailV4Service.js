import db from '../../config/database.js';
import { DEFAULT_LOGO } from '../../config/mediaConstants.js';

// Latest logo per club in a single pass — replaces N+1 LATERAL subqueries
const LATEST_CLUB_LOGOS_CTE = `
    latest_club_logos AS (
        SELECT DISTINCT ON (club_id) club_id, logo_url
        FROM v4.club_logos
        ORDER BY club_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST
    )`;

class MatchDetailV4Service {

    async getFixtureDetails(fixtureId) {
        const info = await db.get(
            `WITH ${LATEST_CLUB_LOGOS_CTE}
             SELECT
                 m.match_id::text   AS fixture_id,
                 m.match_id::text   AS match_id,
                 m.match_date       AS date,
                 m.season_label     AS season,
                 m.round_label      AS round,
                 m.matchday,
                 m.home_score       AS goals_home,
                 m.away_score       AS goals_away,
                 m.xg_home, m.xg_away,
                 m.forecast_win, m.forecast_draw, m.forecast_loss,
                 m.home_formation,  m.away_formation,
                 c.name             AS league,
                 c.name             AS league_name,
                 home.club_id::text AS home_team_id,
                 home.name          AS home_name,
                 COALESCE(hl.logo_url, home.current_logo_url, ?) AS home_logo,
                 away.club_id::text AS away_team_id,
                 away.name          AS away_name,
                 COALESCE(al.logo_url, away.current_logo_url, ?) AS away_logo,
                 venue.name         AS venue_name,
                 referee.full_name  AS referee_name
             FROM v4.matches m
             JOIN v4.competitions c    ON c.competition_id = m.competition_id
             JOIN v4.clubs home        ON home.club_id = m.home_club_id
             JOIN v4.clubs away        ON away.club_id = m.away_club_id
             LEFT JOIN v4.venues venue ON venue.venue_id = m.venue_id
             LEFT JOIN v4.people referee ON referee.person_id = m.referee_person_id
             LEFT JOIN latest_club_logos hl ON hl.club_id = m.home_club_id
             LEFT JOIN latest_club_logos al ON al.club_id = m.away_club_id
             WHERE m.match_id = ?::BIGINT`,
            [DEFAULT_LOGO, DEFAULT_LOGO, fixtureId]
        );

        return info ?? null;
    }

    async getFixtureLineups(fixtureId) {
        const DEFAULT_PHOTO = 'https://tmssl.akamaized.net//images/foto/normal/default.jpg?lm=1';
        const [rows, matchInfo] = await Promise.all([
            db.all(
                `SELECT
                     l.match_lineup_id::text AS id,
                     l.club_id::text  AS team_id,
                     l.player_id::text AS player_id,
                     l.side, l.is_starter, l.jersey_number, l.position_code, l.role_code,
                     COALESCE(p.full_name, l.player_name) AS player_name,
                     COALESCE(p.photo_url, ?) AS photo_url,
                     c.name      AS team_name
                 FROM v4.match_lineups l
                 LEFT JOIN v4.people p ON p.person_id = l.player_id
                 JOIN v4.clubs c  ON c.club_id   = l.club_id
                 WHERE l.match_id = ?::BIGINT
                 ORDER BY l.side ASC, l.is_starter DESC,
                          NULLIF(l.jersey_number, '') ASC NULLS LAST,
                          COALESCE(p.full_name, l.player_name) ASC`,
                [DEFAULT_PHOTO, fixtureId]
            ),
            db.get(
                `SELECT
                     home_club_id::text AS home_team_id,
                     away_club_id::text AS away_team_id,
                     home_formation, away_formation
                 FROM v4.matches
                 WHERE match_id = ?::BIGINT`,
                [fixtureId]
            ),
        ]);

        if (rows.length === 0) return { lineups: [] };

        const transform = (side) => {
            const teamRows = rows.filter(r => r.side === side);
            if (teamRows.length === 0) return null;
            return {
                team_id:    teamRows[0].team_id,
                team_name:  teamRows[0].team_name,
                formation:  side === 'home' ? matchInfo?.home_formation || 'N/A' : matchInfo?.away_formation || 'N/A',
                coach_name: 'N/A',
                starting_xi: teamRows
                    .filter(r => r.is_starter === true || r.is_starter === 1)
                    .map(r => ({
                        player_id: r.player_id,
                        player: { id: r.player_id, name: r.player_name, number: r.jersey_number, pos: r.position_code || r.role_code || '?', photo_url: r.photo_url },
                    })),
                substitutes: teamRows
                    .filter(r => r.is_starter === false || r.is_starter === 0)
                    .map(r => ({
                        player_id: r.player_id,
                        player: { id: r.player_id, name: r.player_name, number: r.jersey_number, pos: r.position_code || r.role_code || '?', photo_url: r.photo_url },
                    })),
            };
        };

        return { lineups: [transform('home'), transform('away')].filter(Boolean) };
    }

    async getFixtureEvents(fixtureId) {
        return db.all(
            `SELECT
                 e.match_event_id::text AS id,
                 e.event_order,
                 e.minute_label         AS time_elapsed,
                 NULL::integer          AS extra_minute,
                 e.event_type           AS type,
                 e.detail,
                 e.score_at_event,
                 player.full_name       AS player_name,
                 related.full_name      AS assist_name,
                 CASE WHEN e.side = 'home' THEN 1 ELSE 0 END AS is_home_team
             FROM v4.match_events e
             LEFT JOIN v4.people player  ON player.person_id  = e.player_id
             LEFT JOIN v4.people related ON related.person_id = e.related_player_id
             WHERE e.match_id = ?::BIGINT
             ORDER BY e.event_order ASC, e.match_event_id ASC`,
            [fixtureId]
        );
    }

    async getFixtureTacticalStats(fixtureId) {
        const ms = await db.get(
            `SELECT
                home_score_ht, away_score_ht,
                home_poss_ft, away_poss_ft,
                home_poss_1h, away_poss_1h,
                home_poss_2h, away_poss_2h,
                home_shots_ft, away_shots_ft,
                home_shots_1h, away_shots_1h,
                home_shots_2h, away_shots_2h,
                home_shots_ot_ft, away_shots_ot_ft,
                home_shots_ot_1h, away_shots_ot_1h,
                home_shots_ot_2h, away_shots_ot_2h,
                home_corners_ft, away_corners_ft,
                home_corners_1h, away_corners_1h,
                home_corners_2h, away_corners_2h,
                home_yellows_ft, away_yellows_ft,
                home_yellows_1h, away_yellows_1h,
                home_yellows_2h, away_yellows_2h
             FROM v4.match_stats
             WHERE match_id = ?::BIGINT`,
            [fixtureId]
        );

        const odds = await db.get(
            `SELECT
                odds_home, odds_draw, odds_away,
                over_05, under_05, over_15, under_15,
                over_25, under_25, over_35, under_35,
                over_45, under_45,
                btts_yes, btts_no
             FROM v4.match_odds
             WHERE match_id = ?::BIGINT`,
            [fixtureId]
        );

        if (!ms && !odds) return { stats: null, odds: null };

        const stats = ms ? [
            {
                side: 'home',
                ball_possession:    ms.home_poss_ft,
                ball_possession_1h: ms.home_poss_1h,
                ball_possession_2h: ms.home_poss_2h,
                shots_total:        ms.home_shots_ft,
                shots_1h:           ms.home_shots_1h,
                shots_2h:           ms.home_shots_2h,
                shots_on_goal:      ms.home_shots_ot_ft,
                shots_on_goal_1h:   ms.home_shots_ot_1h,
                shots_on_goal_2h:   ms.home_shots_ot_2h,
                corner_kicks:       ms.home_corners_ft,
                corner_kicks_1h:    ms.home_corners_1h,
                corner_kicks_2h:    ms.home_corners_2h,
                yellow_cards:       ms.home_yellows_ft,
                yellow_cards_1h:    ms.home_yellows_1h,
                yellow_cards_2h:    ms.home_yellows_2h,
                score_ht:           ms.home_score_ht,
            },
            {
                side: 'away',
                ball_possession:    ms.away_poss_ft,
                ball_possession_1h: ms.away_poss_1h,
                ball_possession_2h: ms.away_poss_2h,
                shots_total:        ms.away_shots_ft,
                shots_1h:           ms.away_shots_1h,
                shots_2h:           ms.away_shots_2h,
                shots_on_goal:      ms.away_shots_ot_ft,
                shots_on_goal_1h:   ms.away_shots_ot_1h,
                shots_on_goal_2h:   ms.away_shots_ot_2h,
                corner_kicks:       ms.away_corners_ft,
                corner_kicks_1h:    ms.away_corners_1h,
                corner_kicks_2h:    ms.away_corners_2h,
                yellow_cards:       ms.away_yellows_ft,
                yellow_cards_1h:    ms.away_yellows_1h,
                yellow_cards_2h:    ms.away_yellows_2h,
                score_ht:           ms.away_score_ht,
            },
        ] : null;

        return { stats, odds: odds ?? null };
    }

    // @STUB: Not yet implemented. Placeholder returns empty array.
    // TODO V5: Implement tactical stats per player (position heatmaps, pass completion, duels, etc.)
    async getFixturePlayerTacticalStats() {
        return [];
    }
}

export default new MatchDetailV4Service();
