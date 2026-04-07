import db from '../../config/database.js';
import logger from '../../utils/logger.js';

const DEFAULT_LOGO = 'https://tmssl.akamaized.net//images/logo/normal/tm.png';
const DEFAULT_PHOTO = 'https://tmssl.akamaized.net//images/foto/normal/default.jpg?lm=1';

const SORT_FIELDS = {
    goals: 'goals',
    appearances: 'appearances',
    assists: 'assists',
    minutes: 'minutes',
    name: 'name'
};

const POSITION_LABELS = {
    G: 'Goalkeeper',
    GK: 'Goalkeeper',
    GDB: 'Goalkeeper',
    D: 'Defender',
    DC: 'Defender',
    ARG: 'Defender',
    ARD: 'Defender',
    M: 'Midfielder',
    MC: 'Midfielder',
    MCG: 'Midfielder',
    MCD: 'Midfielder',
    MO: 'Midfielder',
    MOG: 'Midfielder',
    MOD: 'Midfielder',
    MDC: 'Midfielder',
    A: 'Attacker',
    FW: 'Attacker',
    BU: 'Attacker',
    AG: 'Attacker',
    AD: 'Attacker',
    AIG: 'Attacker',
    AID: 'Attacker',
    SC: 'Attacker'
};

function normalizePosition(code) {
    if (!code) return 'Unknown';
    return POSITION_LABELS[String(code).trim().toUpperCase()] || 'Unknown';
}

function getLeaguePriority(name, competitionType) {
    const n = String(name || '').toLowerCase();
    if (competitionType === 'league') {
        if (
            n.includes('ligue 1') ||
            n.includes('premier league') ||
            n.includes('eredivisie') ||
            n.includes('serie a') ||
            n.includes('bundesliga') ||
            n.includes('superlig') ||
            n.includes('eliteserien') ||
            n.includes('allsvenskan') ||
            n.includes('j1 league') ||
            (n.includes('liga') && !n.includes(' 2') && !n.includes(' 3') && !n.includes('b')) ||
            n.includes('division 1') ||
            n.includes('premier division')
        ) return 1;

        if (
            n.includes('ligue 2') ||
            n.includes('championship') ||
            n.includes('serie b') ||
            n.includes('2. bundesliga') ||
            n.includes('liga 2') ||
            n.includes('liga b') ||
            n.includes('j2 league') ||
            n.includes('division 2')
        ) return 2;

        return 3;
    }

    if (competitionType === 'cup') {
        if (n.includes('league cup') || n.includes('efl cup') || n.includes('coupe de la ligue')) return 4;
        return 5;
    }

    if (competitionType === 'super_cup') return 6;
    return 10;
}

class LeagueServiceV4 {
    async getCompetitionByName(leagueName) {
        return db.get(
            `
                SELECT
                    c.competition_id::text AS competition_id,
                    c.name,
                    c.competition_type,
                    c.source_key,
                    COALESCE(c.current_logo_url, cl.logo_url, ?) AS logo_url,
                    co.country_id::text AS country_id,
                    COALESCE(co.display_name, co.name, 'World') AS country_name,
                    co.flag_url AS country_flag,
                    COALESCE(co.display_rank_override, co.importance_rank, 999) AS country_rank
                FROM v4.competitions c
                LEFT JOIN v4.countries co ON co.country_id = c.country_id
                LEFT JOIN LATERAL (
                    SELECT logo_url
                    FROM v4.competition_logos
                    WHERE competition_id = c.competition_id
                    ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                    LIMIT 1
                ) cl ON TRUE
                WHERE c.name = ?
                ORDER BY COALESCE(c.display_rank_override, c.importance_rank, 999999), c.name ASC
                LIMIT 1
            `,
            [DEFAULT_LOGO, leagueName]
        );
    }

    async getAvailableSeasonsByCompetitionId(competitionId) {
        const rows = await db.all(
            `
                SELECT DISTINCT m.season_label
                FROM v4.matches m
                WHERE m.competition_id::text = ?
                ORDER BY m.season_label DESC
            `,
            [competitionId]
        );

        return rows.map((row) => row.season_label);
    }

    async getLeaguesGroupedByCountry() {
        try {
            const rows = await db.all(
                `
                    SELECT
                        c.competition_id::text AS league_id,
                        c.name,
                        c.competition_type,
                        COALESCE(c.current_logo_url, cl.logo_url, ?) AS logo_url,
                        COALESCE(co.display_name, co.name, 'World') AS country_name,
                        co.flag_url AS country_flag,
                        COALESCE(co.display_rank_override, co.importance_rank, 999) AS country_rank,
                        COUNT(DISTINCT m.season_label) AS seasons_count,
                        MAX(m.season_label) AS latest_season,
                        COALESCE(c.display_rank_override, c.importance_rank, 999999) AS competition_rank
                    FROM v4.competitions c
                    LEFT JOIN v4.countries co ON co.country_id = c.country_id
                    LEFT JOIN LATERAL (
                        SELECT logo_url
                        FROM v4.competition_logos
                        WHERE competition_id = c.competition_id
                        ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                        LIMIT 1
                    ) cl ON TRUE
                    LEFT JOIN v4.matches m ON m.competition_id = c.competition_id
                    GROUP BY
                        c.competition_id, c.name, c.competition_type, c.current_logo_url,
                        cl.logo_url, co.display_name, co.name, co.flag_url, co.display_rank_override,
                        co.importance_rank, c.display_rank_override, c.importance_rank
                    HAVING COUNT(DISTINCT m.season_label) > 0
                    ORDER BY COALESCE(co.display_rank_override, co.importance_rank, 999), country_name ASC, competition_rank ASC, c.name ASC
                `,
                [DEFAULT_LOGO]
            );

            const grouped = new Map();

            for (const row of rows) {
                const countryKey = row.country_name;
                if (!grouped.has(countryKey)) {
                    grouped.set(countryKey, {
                        country_name: row.country_name,
                        country_flag: row.country_flag || null,
                        country_rank: Number(row.country_rank || 999),
                        leagues: []
                    });
                }

                grouped.get(countryKey).leagues.push({
                    league_id: row.league_id,
                    name: row.name,
                    logo_url: row.logo_url || DEFAULT_LOGO,
                    seasons_count: Number(row.seasons_count || 0),
                    latest_season: row.latest_season,
                    priority: getLeaguePriority(row.name, row.competition_type),
                    competition_rank: Number(row.competition_rank || 999999)
                });
            }

            const result = Array.from(grouped.values()).sort((a, b) => a.country_rank - b.country_rank);

            for (const country of result) {
                country.leagues.sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    if (a.competition_rank !== b.competition_rank) return a.competition_rank - b.competition_rank;
                    if (b.seasons_count !== a.seasons_count) return b.seasons_count - a.seasons_count;
                    return a.name.localeCompare(b.name);
                });
            }

            return result;
        } catch (error) {
            logger.error({ err: error }, 'LeagueServiceV4.getLeaguesGroupedByCountry error');
            throw error;
        }
    }

    async getTopScorers(competitionId, season) {
        return db.all(
            `
                WITH ranked_goals AS (
                    SELECT
                        e.player_id::text AS player_id,
                        p.full_name AS player_name,
                        COALESCE(lineup.club_id, m.home_club_id)::text AS team_id,
                        COUNT(*) AS goals_total
                    FROM v4.match_events e
                    JOIN v4.matches m ON m.match_id = e.match_id
                    JOIN v4.competitions c ON c.competition_id = m.competition_id
                    JOIN v4.people p ON p.person_id = e.player_id
                    LEFT JOIN LATERAL (
                        SELECT club_id
                        FROM v4.match_lineups l
                        WHERE l.match_id = e.match_id AND l.player_id = e.player_id
                        LIMIT 1
                    ) lineup ON TRUE
                    WHERE m.competition_id::text = ?
                      AND m.season_label = ?
                      AND e.event_type = 'goal'
                      AND e.player_id IS NOT NULL
                    GROUP BY e.player_id, p.full_name, lineup.club_id, m.home_club_id
                )
                SELECT
                    rg.player_id,
                    rg.player_name,
                    rg.goals_total,
                    cl.club_id::text AS team_id,
                    cl.name AS team_name,
                    COALESCE(lg.logo_url, cl.current_logo_url, ?) AS team_logo,
                    ? AS photo_url,
                    NULL::numeric AS xg
                FROM ranked_goals rg
                LEFT JOIN v4.clubs cl ON cl.club_id::text = rg.team_id
                LEFT JOIN LATERAL (
                    SELECT logo_url
                    FROM v4.club_logos
                    WHERE club_id = cl.club_id
                    ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                    LIMIT 1
                ) lg ON TRUE
                ORDER BY rg.goals_total DESC, rg.player_name ASC
                LIMIT 10
            `,
            [competitionId, season, DEFAULT_LOGO, DEFAULT_PHOTO]
        );
    }

    async getTopAssists(competitionId, season) {
        return db.all(
            `
                WITH ranked_assists AS (
                    SELECT
                        e.related_player_id::text AS player_id,
                        p.full_name AS player_name,
                        COALESCE(lineup.club_id, m.home_club_id)::text AS team_id,
                        COUNT(*) AS goals_assists
                    FROM v4.match_events e
                    JOIN v4.matches m ON m.match_id = e.match_id
                    JOIN v4.competitions c ON c.competition_id = m.competition_id
                    JOIN v4.people p ON p.person_id = e.related_player_id
                    LEFT JOIN LATERAL (
                        SELECT club_id
                        FROM v4.match_lineups l
                        WHERE l.match_id = e.match_id AND l.player_id = e.related_player_id
                        LIMIT 1
                    ) lineup ON TRUE
                    WHERE m.competition_id::text = ?
                      AND m.season_label = ?
                      AND e.event_type = 'goal'
                      AND e.related_player_id IS NOT NULL
                    GROUP BY e.related_player_id, p.full_name, lineup.club_id, m.home_club_id
                )
                SELECT
                    ra.player_id,
                    ra.player_name,
                    ra.goals_assists,
                    cl.club_id::text AS team_id,
                    cl.name AS team_name,
                    COALESCE(lg.logo_url, cl.current_logo_url, ?) AS team_logo,
                    ? AS photo_url,
                    NULL::numeric AS xa
                FROM ranked_assists ra
                LEFT JOIN v4.clubs cl ON cl.club_id::text = ra.team_id
                LEFT JOIN LATERAL (
                    SELECT logo_url
                    FROM v4.club_logos
                    WHERE club_id = cl.club_id
                    ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                    LIMIT 1
                ) lg ON TRUE
                ORDER BY ra.goals_assists DESC, ra.player_name ASC
                LIMIT 10
            `,
            [competitionId, season, DEFAULT_LOGO, DEFAULT_PHOTO]
        );
    }

    async getSeasonPlayers(competitionId, season, filters = {}) {
        const rows = await db.all(
            `
                WITH player_club_stats AS (
                    SELECT
                        l.player_id::text AS player_id,
                        l.club_id::text AS team_id,
                        COUNT(DISTINCT l.match_id) AS appearances,
                        COUNT(DISTINCT CASE WHEN l.is_starter THEN l.match_id END) AS starts,
                        MAX(NULLIF(l.jersey_number, '')) AS number,
                        MODE() WITHIN GROUP (ORDER BY COALESCE(NULLIF(l.position_code, ''), NULLIF(l.role_code, '')))
                            FILTER (WHERE COALESCE(NULLIF(l.position_code, ''), NULLIF(l.role_code, '')) IS NOT NULL) AS primary_position_code
                    FROM v4.match_lineups l
                    JOIN v4.matches m ON m.match_id = l.match_id
                    JOIN v4.competitions c ON c.competition_id = m.competition_id
                    WHERE m.competition_id::text = ?
                      AND m.season_label = ?
                    GROUP BY l.player_id, l.club_id
                ),
                goal_counts AS (
                    SELECT
                        e.player_id::text AS player_id,
                        lineup.club_id::text AS team_id,
                        COUNT(*) AS goals
                    FROM v4.match_events e
                    JOIN v4.matches m ON m.match_id = e.match_id
                    JOIN v4.competitions c ON c.competition_id = m.competition_id
                    LEFT JOIN LATERAL (
                        SELECT club_id
                        FROM v4.match_lineups l
                        WHERE l.match_id = e.match_id AND l.player_id = e.player_id
                        LIMIT 1
                    ) lineup ON TRUE
                    WHERE m.competition_id::text = ?
                      AND m.season_label = ?
                      AND e.event_type = 'goal'
                      AND e.player_id IS NOT NULL
                    GROUP BY e.player_id, lineup.club_id
                ),
                assist_counts AS (
                    SELECT
                        e.related_player_id::text AS player_id,
                        lineup.club_id::text AS team_id,
                        COUNT(*) AS assists
                    FROM v4.match_events e
                    JOIN v4.matches m ON m.match_id = e.match_id
                    JOIN v4.competitions c ON c.competition_id = m.competition_id
                    LEFT JOIN LATERAL (
                        SELECT club_id
                        FROM v4.match_lineups l
                        WHERE l.match_id = e.match_id AND l.player_id = e.related_player_id
                        LIMIT 1
                    ) lineup ON TRUE
                    WHERE m.competition_id::text = ?
                      AND m.season_label = ?
                      AND e.event_type = 'goal'
                      AND e.related_player_id IS NOT NULL
                    GROUP BY e.related_player_id, lineup.club_id
                )
                SELECT
                    pcs.player_id,
                    p.full_name AS name,
                    pcs.team_id,
                    cl.name AS team_name,
                    COALESCE(lg.logo_url, cl.current_logo_url, ?) AS team_logo,
                    pcs.number,
                    pcs.appearances,
                    pcs.starts,
                    pcs.appearances * 90 AS minutes,
                    COALESCE(gc.goals, 0) AS goals,
                    COALESCE(ac.assists, 0) AS assists,
                    pcs.primary_position_code,
                    ? AS photo_url,
                    NULL::numeric AS xg,
                    NULL::numeric AS xa
                FROM player_club_stats pcs
                JOIN v4.people p ON p.person_id::text = pcs.player_id
                LEFT JOIN v4.clubs cl ON cl.club_id::text = pcs.team_id
                LEFT JOIN goal_counts gc ON gc.player_id = pcs.player_id AND COALESCE(gc.team_id, '') = COALESCE(pcs.team_id, '')
                LEFT JOIN assist_counts ac ON ac.player_id = pcs.player_id AND COALESCE(ac.team_id, '') = COALESCE(pcs.team_id, '')
                LEFT JOIN LATERAL (
                    SELECT logo_url
                    FROM v4.club_logos
                    WHERE club_id = cl.club_id
                    ORDER BY end_year DESC NULLS LAST, start_year DESC NULLS LAST
                    LIMIT 1
                ) lg ON TRUE
                WHERE (?::text IS NULL OR pcs.team_id = ?::text)
            `,
            [
                competitionId,
                season,
                competitionId,
                season,
                competitionId,
                season,
                DEFAULT_LOGO,
                DEFAULT_PHOTO,
                filters.teamId || null,
                filters.teamId || null
            ]
        );

        const withPositions = rows.map((row) => ({
            ...row,
            position: normalizePosition(row.primary_position_code)
        }));

        const filtered = filters.position && filters.position !== 'ALL'
            ? withPositions.filter((row) => row.position === filters.position)
            : withPositions;

        const sortField = SORT_FIELDS[filters.sortBy] || SORT_FIELDS.goals;
        const direction = filters.order === 'ASC' ? 1 : -1;

        filtered.sort((a, b) => {
            const left = a[sortField];
            const right = b[sortField];

            if (sortField === 'name') {
                return direction * String(left || '').localeCompare(String(right || ''));
            }

            const delta = Number(left || 0) - Number(right || 0);
            if (delta !== 0) return direction * delta;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        return filtered.slice(0, 100);
    }

    async getTeamSquad(leagueName, season, teamId) {
        const players = await this.getSeasonPlayers(leagueName, season, {
            teamId,
            sortBy: 'appearances',
            order: 'DESC'
        });

        const positionOrder = {
            Goalkeeper: 1,
            Defender: 2,
            Midfielder: 3,
            Attacker: 4,
            Unknown: 5
        };

        return players.sort((a, b) => {
            const posA = positionOrder[a.position] || 99;
            const posB = positionOrder[b.position] || 99;
            if (posA !== posB) return posA - posB;
            return Number(b.appearances || 0) - Number(a.appearances || 0);
        });
    }

    async getFixtures(competitionId, season) {
        return db.all(
            `
                SELECT
                    m.match_id::text AS fixture_id,
                    m.match_date AS date,
                    m.season_label AS season,
                    m.round_label AS round,
                    m.matchday,
                    m.home_score AS goals_home,
                    m.away_score AS goals_away,
                    CASE
                        WHEN m.home_score IS NULL OR m.away_score IS NULL THEN
                            CASE WHEN m.match_date > CURRENT_DATE THEN 'NS' ELSE 'TBD' END
                        ELSE 'FT'
                    END AS status_short,
                    m.home_club_id::text AS home_team_id,
                    home.name AS home_team,
                    COALESCE(hl.logo_url, home.current_logo_url, ?) AS home_team_logo,
                    m.away_club_id::text AS away_team_id,
                    away.name AS away_team,
                    COALESCE(al.logo_url, away.current_logo_url, ?) AS away_team_logo
                FROM v4.matches m
                JOIN v4.competitions c ON c.competition_id = m.competition_id
                JOIN v4.clubs home ON home.club_id = m.home_club_id
                JOIN v4.clubs away ON away.club_id = m.away_club_id
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
                WHERE m.competition_id::text = ?
                  AND m.season_label = ?
                ORDER BY m.match_date ASC NULLS LAST, m.match_id ASC
            `,
            [DEFAULT_LOGO, DEFAULT_LOGO, competitionId, season]
        );
    }
}

export default new LeagueServiceV4();
