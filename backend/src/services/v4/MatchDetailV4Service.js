import db from '../../config/database.js';

const DEFAULT_LOGO = 'https://tmssl.akamaized.net//images/logo/normal/tm.png';

class MatchDetailV4Service {
    async getFixtureDetails(fixtureId) {
        const info = await db.get(
            `
                SELECT
                    m.match_id::text AS fixture_id,
                    m.match_id::text AS match_id,
                    m.match_date AS date,
                    m.season_label AS season,
                    m.round_label AS round,
                    m.matchday,
                    m.home_score AS goals_home,
                    m.away_score AS goals_away,
                    m.home_formation,
                    m.away_formation,
                    c.name AS league,
                    c.name AS league_name,
                    home.club_id::text AS home_team_id,
                    home.name AS home_name,
                    COALESCE(hl.logo_url, home.current_logo_url, ?) AS home_logo,
                    away.club_id::text AS away_team_id,
                    away.name AS away_name,
                    COALESCE(al.logo_url, away.current_logo_url, ?) AS away_logo,
                    venue.name AS venue_name,
                    referee.full_name AS referee_name
                FROM v4.matches m
                JOIN v4.competitions c ON c.competition_id = m.competition_id
                JOIN v4.clubs home ON home.club_id = m.home_club_id
                JOIN v4.clubs away ON away.club_id = m.away_club_id
                LEFT JOIN v4.venues venue ON venue.venue_id = m.venue_id
                LEFT JOIN v4.people referee ON referee.person_id = m.referee_person_id
                LEFT JOIN LATERAL (
                    SELECT logo_url
                    FROM v4.club_logos
                    WHERE club_id = home.club_id
                    ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                    LIMIT 1
                ) hl ON TRUE
                LEFT JOIN LATERAL (
                    SELECT logo_url
                    FROM v4.club_logos
                    WHERE club_id = away.club_id
                    ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                    LIMIT 1
                ) al ON TRUE
                WHERE m.match_id::text = ?
            `,
            [DEFAULT_LOGO, DEFAULT_LOGO, fixtureId]
        );

        if (!info) return null;

        return info;
    }

    async getFixtureLineups(fixtureId) {
        const rows = await db.all(
            `
                SELECT
                    l.match_lineup_id::text AS id,
                    l.club_id::text AS team_id,
                    l.player_id::text AS player_id,
                    l.side,
                    l.is_starter,
                    l.jersey_number,
                    l.position_code,
                    l.role_code,
                    p.full_name AS player_name,
                    c.name AS team_name
                FROM v4.match_lineups l
                JOIN v4.people p ON p.person_id = l.player_id
                JOIN v4.clubs c ON c.club_id = l.club_id
                WHERE l.match_id::text = ?
                ORDER BY l.side ASC, l.is_starter DESC, NULLIF(l.jersey_number, '') ASC NULLS LAST, p.full_name ASC
            `,
            [fixtureId]
        );

        if (rows.length === 0) {
            return { lineups: [] };
        }

        const matchInfo = await db.get(
            `
                SELECT
                    home_club_id::text AS home_team_id,
                    away_club_id::text AS away_team_id,
                    home_formation,
                    away_formation
                FROM v4.matches
                WHERE match_id::text = ?
            `,
            [fixtureId]
        );

        const transform = (side) => {
            const teamRows = rows.filter((row) => row.side === side);
            if (teamRows.length === 0) return null;

            return {
                team_id: teamRows[0].team_id,
                team_name: teamRows[0].team_name,
                formation: side === 'home' ? matchInfo?.home_formation || 'N/A' : matchInfo?.away_formation || 'N/A',
                coach_name: 'N/A',
                starting_xi: teamRows
                    .filter((row) => row.is_starter === true || row.is_starter === 1)
                    .map((row) => ({
                        player_id: row.player_id,
                        player: {
                            id: row.player_id,
                            name: row.player_name,
                            number: row.jersey_number,
                            pos: row.position_code || row.role_code || '?'
                        }
                    })),
                substitutes: teamRows
                    .filter((row) => row.is_starter === false || row.is_starter === 0)
                    .map((row) => ({
                        player_id: row.player_id,
                        player: {
                            id: row.player_id,
                            name: row.player_name,
                            number: row.jersey_number,
                            pos: row.position_code || row.role_code || '?'
                        }
                    }))
            };
        };

        const homeLineup = transform('home');
        const awayLineup = transform('away');

        return {
            lineups: [homeLineup, awayLineup].filter(Boolean)
        };
    }

    async getFixtureEvents(fixtureId) {
        return db.all(
            `
                SELECT
                    e.match_event_id::text AS id,
                    e.event_order,
                    e.minute_label AS time_elapsed,
                    NULL::integer AS extra_minute,
                    e.event_type AS type,
                    e.detail,
                    e.score_at_event,
                    player.full_name AS player_name,
                    related.full_name AS assist_name,
                    CASE WHEN e.side = 'home' THEN 1 ELSE 0 END AS is_home_team
                FROM v4.match_events e
                LEFT JOIN v4.people player ON player.person_id = e.player_id
                LEFT JOIN v4.people related ON related.person_id = e.related_player_id
                WHERE e.match_id::text = ?
                ORDER BY e.event_order ASC, e.match_event_id ASC
            `,
            [fixtureId]
        );
    }

    async getFixtureTacticalStats() {
        return [];
    }

    async getFixturePlayerTacticalStats() {
        return [];
    }
}

export default new MatchDetailV4Service();
