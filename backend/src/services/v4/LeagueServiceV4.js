import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import { DEFAULT_LOGO, DEFAULT_PHOTO } from '../../config/mediaConstants.js';
import StandingsV4Service from './StandingsV4Service.js';

// ── CTE fragments ─────────────────────────────────────────────────────────────
// Pre-fetch the latest logo for every club/competition in one pass.
// Using DISTINCT ON instead of LATERAL removes N+1 logo lookups.
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

// ─────────────────────────────────────────────────────────────────────────────

const SORT_FIELDS = {
    goals:          'goals',
    appearances:    'appearances',
    assists:        'assists',
    minutes:        'minutes',
    name:           'name',
    xg:             'xg',
    xa:             'xa',
    npxg:           'npxg',
    xg_90:          'xg_90',
    xa_90:          'xa_90',
    npxg_90:        'npxg_90',
    xg_chain:       'xg_chain',
    xg_chain_90:    'xg_chain_90',
    xg_buildup:     'xg_buildup',
    xg_buildup_90:  'xg_buildup_90',
};

const POSITION_LABELS = {
    G: 'Goalkeeper', GK: 'Goalkeeper', GDB: 'Goalkeeper',
    D: 'Defender', DC: 'Defender', ARG: 'Defender', ARD: 'Defender',
    M: 'Midfielder', MC: 'Midfielder', MCG: 'Midfielder', MCD: 'Midfielder',
    MO: 'Midfielder', MOG: 'Midfielder', MOD: 'Midfielder', MDC: 'Midfielder',
    A: 'Attacker', FW: 'Attacker', BU: 'Attacker', AG: 'Attacker',
    AD: 'Attacker', AIG: 'Attacker', AID: 'Attacker', SC: 'Attacker',
};

const COMPETITION_ALIASES = {
    'UEFA Champions League': [
        'Coupe des clubs champions européens', 
        'Champions League', 
        'UEFA Champions League',
        'Champions Cup'
    ],
    'UEFA Europa League': [
        'Coupe de l\'UEFA (- 2009)', 
        'Europa League', 
        'Coupe de l\'UEFA', 
        'UEFA Europa League',
        'UEFA Cup'
    ],
    'UEFA Conference League': [
        'UEFA Conference League', 
        'Conference League', 
        'UEFA Europa Conference League'
    ],
    'UEFA Nations League': [
        'UEFA Nations League', 
        'Ligue des nations de l\'UEFA', 
        'Nations League',
        'UEFA Nations League A',
        'UEFA Nations League B',
        'UEFA Nations League C',
        'UEFA Nations League D',
        'UEFA Nations League Finals',
        'UEFA Nations League Play-off'
    ],
    'FIFA World Cup': [
        'Coupe du monde', 
        'World Cup', 
        'FIFA World Cup'
    ],
    'UEFA Euro': [
        'Championnat d\'Europe', 
        'Euro', 
        'UEFA Euro', 
        'Championnat d\'Europe 1960'
    ],
};

function getUnifiedCompetitionName(name) {
    if (!name) return name;
    for (const [unified, aliases] of Object.entries(COMPETITION_ALIASES)) {
        if (aliases.some(a => name.toLowerCase().includes(a.toLowerCase()))) {
            return unified;
        }
    }
    return name;
}

function normalizePosition(code) {
    if (!code) return 'Unknown';
    return POSITION_LABELS[String(code).trim().toUpperCase()] || 'Unknown';
}

function getLeaguePriority(name, competitionType) {
    const n = String(name || '').toLowerCase();
    if (competitionType === 'league') {
        // First-tier leagues (priority 1)
        // Check for exact top leagues, excluding second divisions
        if (
            n === 'ligue 1' || n === 'premier league' ||
            n === 'eredivisie' || n === 'serie a' ||
            n === 'bundesliga' || n === 'superlig' ||
            n === 'eliteserien' || n === 'allsvenskan' ||
            n === 'j1 league' ||
            n === 'division 1' || n === 'premier division' ||
            (n.includes('liga') && !n.includes('2') && !n.includes('3') && !n.includes('b'))
        ) return 1;

        // Second-tier leagues (priority 2)
        if (
            n === 'ligue 2' || n === 'championship' ||
            n === 'serie b' || n === '2. bundesliga' || n === '2 bundesliga' ||
            n.includes('liga 2') || n.includes('liga b') ||
            n === 'j2 league' || n === 'division 2'
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

const formatSeasonLabelV4 = (label, competitionName = '', competitionType = '') => {
    if (!label) return '';
    const n = String(competitionName || '').toLowerCase();
    const isInternational = competitionType === 'international' ||
                           n.includes('europe') || 
                           n.includes('world cup') || 
                           n.includes('nations league') ||
                           n.includes('euro') ||
                           n.includes('coupe du monde');
    
    if (isInternational) {
        // If range like "2023-2024", take second year
        if (label.includes('-')) {
            const parts = label.split('-');
            let yearPart = parts[parts.length - 1].trim();
            // Handle Euro 2020 -> 2021 exception
            if (yearPart === '2020' && (n.includes('euro') || n.includes('europe'))) {
                return '2021';
            }
            return yearPart;
        }
        // Handle single year labels
        if (label === '2020' && (n.includes('euro') || n.includes('europe'))) {
            return '2021';
        }
        return label;
    }
    return label;
};

const resolveSeasonFromDisplay = (displayLabel, competitionName = '', competitionType = '') => {
    if (!displayLabel) return null;
    const n = String(competitionName || '').toLowerCase();
    // Reverse Euro 2021 -> 2020 for DB query
    if (displayLabel === '2021' && (n.includes('euro') || n.includes('europe'))) {
        return '2020';
    }
    return displayLabel;
};

const getSeasonCondition = (col, value, isInternational) => {
    if (isInternational && value && value.length === 4 && !value.includes('-')) {
        // Match exact year or end of a range
        return `(${col} = '${value}' OR ${col} LIKE '%-${value}')`;
    }
    return `${col} = '${value}'`;
};

// ─────────────────────────────────────────────────────────────────────────────

class LeagueServiceV4 {

    formatSeasonLabel(label, competitionName = '', competitionType = '') {
        return formatSeasonLabelV4(label, competitionName, competitionType);
    }

    async resolveSeason(displayLabel, competitionId, competitionName = '', competitionType = '') {
        if (!displayLabel) return null;
        const n = String(competitionName || '').toLowerCase();
        const ids = Array.isArray(competitionId) ? competitionId : [competitionId];
        
        // Special case for Euro 2021 -> 2020
        let searchLabel = displayLabel;
        if (displayLabel === '2021' && (n.includes('euro') || n.includes('europe'))) {
            searchLabel = '2020';
        }
        
        try {
            // 1. Try exact match across all related IDs
            const exact = await db.get(
                `SELECT season_label FROM v4.matches 
                 WHERE competition_id IN (${ids.map(() => '?::BIGINT').join(', ')}) 
                   AND season_label = ? LIMIT 1`,
                [...ids, searchLabel]
            );
            if (exact) return exact.season_label;
            
            // 2. If international and searchLabel is a 4-digit year, try matching end of range
            const isInternational = competitionType === 'international' ||
                                   n.includes('europe') || 
                                   n.includes('world cup') || 
                                   n.includes('nations league') ||
                                   n.includes('euro') ||
                                   n.includes('coupe du monde');
                                   
            if (isInternational && searchLabel.length === 4 && !searchLabel.includes('-')) {
                const fuzzy = await db.get(
                    `SELECT season_label FROM v4.matches 
                     WHERE competition_id IN (${ids.map(() => '?::BIGINT').join(', ')}) 
                       AND season_label LIKE '%' || ? LIMIT 1`,
                    [...ids, searchLabel]
                );
                if (fuzzy) return fuzzy.season_label;
            }
        } catch (err) {
            logger.warn({ err, competitionId, displayLabel }, 'Failed to resolve season label from DB');
        }
        
        return searchLabel;
    }

    async getCompetitionByName(leagueName) {
        const unified = getUnifiedCompetitionName(leagueName);
        const aliases = COMPETITION_ALIASES[unified] || [leagueName];
        
        const rows = await db.all(
            `WITH ${LATEST_COMP_LOGOS_CTE}
             SELECT
                 c.competition_id::text AS competition_id,
                 c.name,
                 c.competition_type,
                 c.source_key,
                 COALESCE(c.current_logo_url, lcl.logo_url, ?) AS logo_url,
                 co.country_id::text AS country_id,
                 COALESCE(co.display_name, co.name, 'World') AS country_name,
                 co.flag_url AS country_flag,
                 COALESCE(co.display_rank_override, co.importance_rank, 999) AS country_rank
             FROM v4.competitions c
             LEFT JOIN v4.countries co ON co.country_id = c.country_id
             LEFT JOIN latest_comp_logos lcl ON lcl.competition_id = c.competition_id
             WHERE c.name = ? OR c.name IN (${aliases.map(() => '?').join(', ')})
             ORDER BY c.competition_id DESC`,
            [DEFAULT_LOGO, leagueName, ...aliases]
        );

        if (!rows || rows.length === 0) return null;

        const primary = rows.find(r => r.name === unified) || rows[0];
        return {
            ...primary,
            all_ids: rows.map(r => r.competition_id)
        };
    }

    async getAvailableSeasonsByCompetitionId(competitionId, competitionName = '', competitionType = '') {
        const unified = getUnifiedCompetitionName(competitionName);
        const aliases = COMPETITION_ALIASES[unified] || [competitionName];

        const rows = await db.all(
            `SELECT DISTINCT m.season_label
             FROM v4.matches m
             JOIN v4.competitions c ON c.competition_id = m.competition_id
             WHERE m.competition_id = ?::BIGINT 
                OR c.name IN (${aliases.map(() => '?').join(', ')})
             ORDER BY m.season_label DESC`,
            [competitionId, ...aliases]
        );
        return rows.map(r => formatSeasonLabelV4(r.season_label, competitionName, competitionType));
    }

    async getLeaguesGroupedByCountry() {
        try {
            const rows = await db.all(
                `WITH ${LATEST_COMP_LOGOS_CTE},
                 current_season_progress AS (
                     SELECT
                         m.competition_id,
                         m.season_label,
                         MAX(m.matchday) AS current_matchday,
                         COUNT(DISTINCT m.match_id) FILTER (WHERE m.home_score IS NOT NULL) AS played_matches,
                         COUNT(DISTINCT m.match_id) AS total_matches,
                         MAX(m.round_label) FILTER (WHERE m.home_score IS NOT NULL) AS latest_round_label
                     FROM v4.matches m
                     WHERE (m.competition_id, m.season_label) IN (
                         SELECT competition_id, MAX(season_label) FROM v4.matches GROUP BY competition_id
                     )
                     GROUP BY m.competition_id, m.season_label
                 )
                 SELECT
                     c.competition_id::text AS league_id,
                     c.name,
                     c.competition_type,
                     COALESCE(c.current_logo_url, lcl.logo_url, ?) AS logo_url,
                     COALESCE(co.display_name, co.name, 'World') AS country_name,
                     co.flag_url AS country_flag,
                     COALESCE(co.display_rank_override, co.importance_rank, 999) AS country_rank,
                     COUNT(DISTINCT m.season_label) AS seasons_count,
                     MAX(m.season_label) AS latest_season,
                     COALESCE(c.importance_rank, 999999) AS competition_rank,
                     CASE WHEN c.competition_type = 'league' THEN cp.current_matchday ELSE NULL END AS current_matchday,
                     CASE WHEN c.competition_type = 'league' THEN cp.total_matches ELSE NULL END AS total_matchdays,
                     cp.latest_round_label
                 FROM v4.competitions c
                 LEFT JOIN v4.countries co ON co.country_id = c.country_id
                 LEFT JOIN latest_comp_logos lcl ON lcl.competition_id = c.competition_id
                 LEFT JOIN v4.matches m ON m.competition_id = c.competition_id
                 LEFT JOIN current_season_progress cp
                     ON cp.competition_id = c.competition_id
                     AND cp.season_label = (SELECT MAX(season_label) FROM v4.matches WHERE competition_id = c.competition_id)
                 WHERE NOT EXISTS (
                     SELECT 1 FROM v4.competition_relations cr 
                     WHERE cr.source_id = c.competition_id 
                       AND cr.relation_type = 'QUALIFICATION'
                 )
                 AND c.name NOT ILIKE '%Qualif%' 
                 AND c.name NOT ILIKE '%Qualification%'
                 AND c.name NOT ILIKE '%Barrages%'
                 GROUP BY
                     c.competition_id, c.name, c.competition_type, c.current_logo_url,
                     lcl.logo_url, co.display_name, co.name, co.flag_url,
                     co.display_rank_override, co.importance_rank,
                     c.importance_rank,
                     cp.current_matchday, cp.total_matches, cp.latest_round_label
                 HAVING COUNT(DISTINCT m.season_label) > 0
                 ORDER BY
                     COALESCE(co.display_rank_override, co.importance_rank, 999),
                     country_name ASC,
                     competition_rank ASC,
                     c.name ASC`,
                [DEFAULT_LOGO]
            );

            const grouped = new Map();
            for (const row of rows) {
                const unifiedName = getUnifiedCompetitionName(row.name);
                const countryKey = row.country_name;
                
                if (!grouped.has(countryKey)) {
                    grouped.set(countryKey, {
                        country_name: row.country_name,
                        country_flag: row.country_flag || null,
                        country_rank: Number(row.country_rank || 999),
                        leagues: new Map(), // Use Map to group by unified name
                    });
                }
                
                const countryData = grouped.get(countryKey);
                
                if (countryData.leagues.has(unifiedName)) {
                    const existing = countryData.leagues.get(unifiedName);
                    // Add seasons
                    existing.seasons_count += Number(row.seasons_count || 0);
                    // If this entry is more recent, update metadata
                    if (row.latest_season > existing.latest_season) {
                        existing.league_id = row.league_id;
                        existing.latest_season = row.latest_season;
                        existing.latest_round_label = row.latest_round_label || null;
                        existing.current_matchday = row.current_matchday ? Number(row.current_matchday) : null;
                        existing.total_matchdays = row.total_matchdays ? Number(row.total_matchdays) : null;
                    }
                } else {
                    countryData.leagues.set(unifiedName, {
                        league_id:       row.league_id,
                        name:            unifiedName, // Use unified name
                        competition_type: row.competition_type,
                        logo_url:        row.logo_url || DEFAULT_LOGO,
                        seasons_count:   Number(row.seasons_count || 0),
                        latest_season:   row.latest_season,
                        priority:        getLeaguePriority(unifiedName, row.competition_type),
                        competition_rank: Number(row.competition_rank || 999999),
                        current_matchday: row.current_matchday ? Number(row.current_matchday) : null,
                        total_matchdays:  row.total_matchdays ? Number(row.total_matchdays) : null,
                        latest_round_label: row.latest_round_label || null,
                        leader: null,
                    });
                }
            }

            // Convert Maps back to arrays and sort
            const result = [];
            for (const country of grouped.values()) {
                const leaguesArray = Array.from(country.leagues.values());
                result.push({
                    ...country,
                    leagues: leaguesArray
                });
            }

            // Parallelize leader calculation for all leagues
            const leaderPromises = [];
            const leaderIndex = []; // Array of { country, leagueIdx }

            for (const country of result) {
                for (let i = 0; i < country.leagues.length; i++) {
                    const league = country.leagues[i];
                    if (league.competition_type === 'league' && league.latest_season) {
                        leaderIndex.push({ country, leagueIdx: i });
                        leaderPromises.push(
                            StandingsV4Service.calculateStandings(
                                BigInt(league.league_id),
                                league.latest_season
                            ).catch((err) => {
                                logger.warn({ err, competition_id: league.league_id }, 'Failed to calculate standings for leader');
                                return null; // Gracefully handle error
                            })
                        );
                    }
                }
            }

            // Resolve all leader calculations in parallel
            if (leaderPromises.length > 0) {
                const standings = await Promise.all(leaderPromises);
                for (let i = 0; i < standings.length; i++) {
                    const leaderStandings = standings[i];
                    const { country, leagueIdx } = leaderIndex[i];
                    if (leaderStandings && leaderStandings.length > 0) {
                        const leader = leaderStandings[0];
                        country.leagues[leagueIdx].leader = {
                            club_id: leader.team_id,
                            name: leader.team_name,
                            logo_url: leader.team_logo || DEFAULT_LOGO,
                        };
                    }
                }
            }

            result.sort((a, b) => a.country_rank - b.country_rank);
            for (const country of result) {
                country.leagues.sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    if (a.competition_rank !== b.competition_rank) return a.competition_rank - b.competition_rank;
                    if (b.seasons_count !== a.seasons_count) return b.seasons_count - a.seasons_count;
                    return a.name.localeCompare(b.name);
                });
                
                // Format latest_season for internationals
                for (const league of country.leagues) {
                    league.latest_season_display = formatSeasonLabelV4(league.latest_season, league.name, league.competition_type);
                }
            }
            return result;
        } catch (error) {
            logger.error({ err: error }, 'LeagueServiceV4.getLeaguesGroupedByCountry error');
            throw error;
        }
    }

    async getTopScorers(competitionId, season) {
        const ids = Array.isArray(competitionId) ? competitionId : [competitionId];
        return db.all(
            `WITH
             ${LATEST_CLUB_LOGOS_CTE},
             -- Step 1: count goals per player (fast: uses idx_v4_match_events_match_goal)
             goal_counts AS (
                 SELECT e.player_id, COUNT(*) AS goals_total
                 FROM v4.match_events e
                 JOIN v4.matches m ON m.match_id = e.match_id
                 WHERE m.competition_id IN (${ids.map(() => '?::BIGINT').join(', ')})
                   AND m.season_label   = ?
                   AND e.event_type     = 'goal'
                   AND e.player_id IS NOT NULL
                 GROUP BY e.player_id
                 ORDER BY goals_total DESC
                 LIMIT 10
             ),
             -- Step 2: resolve team only for the 10 players we need
             top_teams AS (
                 SELECT DISTINCT ON (l.player_id)
                     l.player_id::text AS player_id,
                     l.team_id::text   AS team_id
                 FROM v4.match_lineups l
                 JOIN v4.matches m ON m.match_id = l.match_id
                 WHERE l.player_id IN (SELECT player_id FROM goal_counts)
                   AND m.competition_id IN (${ids.map(() => '?::BIGINT').join(', ')})
                   AND m.season_label   = ?
                 ORDER BY l.player_id, l.match_id DESC
             )
             SELECT
                 gc.player_id::text                              AS player_id,
                 p.full_name                                     AS player_name,
                 gc.goals_total,
                 tt.team_id,
                 cl.name                                         AS team_name, cl.slug AS team_slug,
                 COALESCE(ll.logo_url, cl.current_logo_url, ?)  AS team_logo,
                 COALESCE(p.photo_url, ?)                        AS photo_url,
                 psx.xg, psx.npxg, psx.xg_90
             FROM goal_counts gc
             JOIN v4.people p              ON p.person_id = gc.player_id
             LEFT JOIN top_teams tt        ON tt.player_id = gc.player_id::text
             LEFT JOIN v4.teams cl         ON cl.team_id::text = tt.team_id
             LEFT JOIN latest_club_logos ll ON ll.club_id = cl.team_id
             LEFT JOIN v4.player_season_xg psx
                 ON psx.person_id    = gc.player_id
                AND psx.team_id::text = tt.team_id
                AND psx.season_label = ?
             ORDER BY gc.goals_total DESC, p.full_name ASC`,
            [...ids, season, ...ids, season, DEFAULT_LOGO, DEFAULT_PHOTO, season]
        );
    }

    async getTopAssists(competitionId, season) {
        const ids = Array.isArray(competitionId) ? competitionId : [competitionId];
        return db.all(
            `WITH
             ${LATEST_CLUB_LOGOS_CTE},
             assist_counts AS (
                 SELECT e.related_player_id AS player_id, COUNT(*) AS goals_assists
                 FROM v4.match_events e
                 JOIN v4.matches m ON m.match_id = e.match_id
                 WHERE m.competition_id IN (${ids.map(() => '?::BIGINT').join(', ')})
                   AND m.season_label   = ?
                   AND e.event_type     = 'goal'
                   AND e.related_player_id IS NOT NULL
                 GROUP BY e.related_player_id
                 ORDER BY goals_assists DESC
                 LIMIT 10
             ),
             top_teams AS (
                 SELECT DISTINCT ON (l.player_id)
                     l.player_id::text AS player_id,
                     l.team_id::text   AS team_id
                 FROM v4.match_lineups l
                 JOIN v4.matches m ON m.match_id = l.match_id
                 WHERE l.player_id IN (SELECT player_id FROM assist_counts)
                   AND m.competition_id IN (${ids.map(() => '?::BIGINT').join(', ')})
                   AND m.season_label   = ?
                 ORDER BY l.player_id, l.match_id DESC
             )
             SELECT
                 ac.player_id::text                              AS player_id,
                 p.full_name                                     AS player_name,
                 ac.goals_assists,
                 tt.team_id,
                 cl.name                                         AS team_name, cl.slug AS team_slug,
                 COALESCE(ll.logo_url, cl.current_logo_url, ?)  AS team_logo,
                 COALESCE(p.photo_url, ?)                        AS photo_url,
                 psx.xa, psx.xg, psx.xg_chain
             FROM assist_counts ac
             JOIN v4.people p              ON p.person_id = ac.player_id
             LEFT JOIN top_teams tt        ON tt.player_id = ac.player_id::text
             LEFT JOIN v4.teams cl         ON cl.team_id::text = tt.team_id
             LEFT JOIN latest_club_logos ll ON ll.club_id = cl.team_id
             LEFT JOIN v4.player_season_xg psx
                 ON psx.person_id     = ac.player_id
                AND psx.team_id::text = tt.team_id
                AND psx.season_label  = ?
             ORDER BY ac.goals_assists DESC, p.full_name ASC`,
            [...ids, season, ...ids, season, DEFAULT_LOGO, DEFAULT_PHOTO, season]
        );
    }

    async getSeasonPlayers(competitionId, season, filters = {}) {
        const ids = Array.isArray(competitionId) ? competitionId : [competitionId];
        const rows = await db.all(
            `WITH
             ${LATEST_CLUB_LOGOS_CTE},
             -- Player appearances per club this season
             player_club_stats AS (
                 SELECT
                     l.player_id::text  AS player_id,
                     l.team_id::text    AS team_id,
                     COUNT(DISTINCT l.match_id) AS appearances,
                     COUNT(DISTINCT CASE WHEN l.is_starter THEN l.match_id END) AS starts,
                     MAX(NULLIF(l.jersey_number, '')) AS number,
                     MODE() WITHIN GROUP (
                         ORDER BY COALESCE(NULLIF(l.position_code, ''), NULLIF(l.role_code, ''))
                     ) FILTER (
                         WHERE COALESCE(NULLIF(l.position_code, ''), NULLIF(l.role_code, '')) IS NOT NULL
                     ) AS primary_position_code
                 FROM v4.match_lineups l
                 JOIN v4.matches m ON m.match_id = l.match_id
                 WHERE m.competition_id IN (${ids.map(() => '?::BIGINT').join(', ')}) 
                   AND m.season_label = ?
                 GROUP BY l.player_id, l.team_id
             ),
             goal_assist_events AS (
                 SELECT e.player_id::text AS scorer_id, e.related_player_id::text AS assistant_id
                 FROM v4.match_events e
                 JOIN v4.matches m ON m.match_id = e.match_id
                 WHERE m.competition_id IN (${ids.map(() => '?::BIGINT').join(', ')})
                   AND m.season_label   = ?
                   AND e.event_type     = 'goal'
             ),
             goal_counts AS (
                 SELECT scorer_id AS player_id, COUNT(*) AS goals
                 FROM goal_assist_events WHERE scorer_id IS NOT NULL
                 GROUP BY scorer_id
             ),
             assist_counts AS (
                 SELECT assistant_id AS player_id, COUNT(*) AS assists
                 FROM goal_assist_events WHERE assistant_id IS NOT NULL
                 GROUP BY assistant_id
             )
             SELECT
                 pcs.player_id,
                 p.full_name                                     AS name,
                 pcs.team_id,
                 cl.name                                         AS team_name, cl.slug AS team_slug,
                 COALESCE(ll.logo_url, cl.current_logo_url, ?)  AS team_logo,
                 pcs.number,
                 pcs.appearances,
                 pcs.starts,
                 pcs.appearances * 90                            AS minutes,
                 COALESCE(gc.goals, 0)                           AS goals,
                 COALESCE(ac.assists, 0)                         AS assists,
                 pcs.primary_position_code,
                 COALESCE(p.photo_url, ?)                        AS photo_url,
                 psx.xg, psx.xa, psx.npxg,
                 psx.xg_90, psx.xa_90, psx.npxg_90,
                 psx.xg_chain, psx.xg_chain_90,
                 psx.xg_buildup, psx.xg_buildup_90,
                 psx.apps AS xg_apps, psx.minutes AS xg_minutes
             FROM player_club_stats pcs
             JOIN v4.people p              ON p.person_id::text = pcs.player_id
             LEFT JOIN v4.teams cl         ON cl.team_id::text  = pcs.team_id
             LEFT JOIN latest_club_logos ll ON ll.club_id = cl.team_id
             LEFT JOIN goal_counts gc      ON gc.player_id = pcs.player_id
             LEFT JOIN assist_counts ac    ON ac.player_id = pcs.player_id
             LEFT JOIN v4.player_season_xg psx
                 ON psx.person_id::text = pcs.player_id
                AND psx.team_id::text   = pcs.team_id
                AND psx.season_label    = ?
             WHERE (?::text IS NULL OR pcs.team_id = ?::text)`,
            [
                ...ids, season,   // player_club_stats
                ...ids, season,   // goal_assist_events
                DEFAULT_LOGO,
                DEFAULT_PHOTO,
                season,                  // psx join
                filters.teamId || null,
                filters.teamId || null,
            ]
        );

        const withPositions = rows.map(row => ({
            ...row,
            position: normalizePosition(row.primary_position_code),
        }));

        const filtered = filters.position && filters.position !== 'ALL'
            ? withPositions.filter(row => row.position === filters.position)
            : withPositions;

        const sortField = SORT_FIELDS[filters.sortBy] || SORT_FIELDS.goals;
        const direction = filters.order === 'ASC' ? 1 : -1;

        filtered.sort((a, b) => {
            if (sortField === 'name') {
                return direction * String(a.name || '').localeCompare(String(b.name || ''));
            }
            const delta = Number(a[sortField] || 0) - Number(b[sortField] || 0);
            if (delta !== 0) return direction * delta;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        return filtered.slice(0, 100);
    }

    async getTeamSquad(leagueName, season, teamId) {
        const players = await this.getSeasonPlayers(leagueName, season, {
            teamId,
            sortBy: 'appearances',
            order: 'DESC',
        });

        const positionOrder = { Goalkeeper: 1, Defender: 2, Midfielder: 3, Attacker: 4, Unknown: 5 };
        return players.sort((a, b) => {
            const posA = positionOrder[a.position] || 99;
            const posB = positionOrder[b.position] || 99;
            if (posA !== posB) return posA - posB;
            return Number(b.appearances || 0) - Number(a.appearances || 0);
        });
    }

    async getFixtures(competitionIds, season) {
        const ids = Array.isArray(competitionIds) ? competitionIds : [competitionIds];
        
        // 1. Get the main competitions and their sub-competitions (Qualifiers, Groups, etc.)
        const comps = await db.all(
            `SELECT source_id AS comp_id, relation_type, NULL as name
             FROM v4.competition_relations
             WHERE target_id IN (${ids.map(() => '?::BIGINT').join(', ')})
               AND relation_type IN ('QUALIFICATION', 'SUB_COMPETITION')
             UNION
             SELECT competition_id AS comp_id, 'MAIN' AS relation_type, name
             FROM v4.competitions
             WHERE competition_id IN (${ids.map(() => '?::BIGINT').join(', ')})`,
            [...ids, ...ids]
        );
        
        if (comps.length === 0) return [];
        
        // Build multi-season array to catch qualifications that started up to 2 years prior
        let seasons = [season];
        const isInternational = comps.some(c => c.relation_type === 'MAIN' && !String(c.name || '').toLowerCase().includes('league')); // Approximation
        const competitionName = comps.find(c => c.relation_type === 'MAIN')?.name || '';
        const n = String(competitionName || '').toLowerCase();
        const isWorldCupOrEuro = n.includes('world cup') || n.includes('coupe du monde') || n.includes('euro') || n.includes('championnat d\'europe');
        
        if (isInternational && isWorldCupOrEuro) {
            const startYear = parseInt(season.split('-')[0], 10);
            seasons = [
                season,
                `${startYear - 1}-${startYear}`,
                `${startYear - 2}-${startYear - 1}`,
                String(startYear - 1),
                String(startYear - 2)
            ];
        }
        
        const conditions = comps.map(() => {
            return `(m.competition_id = ?::BIGINT AND m.season_label IN (${seasons.map(() => '?').join(', ')}))`;
        });
        
        const params = [DEFAULT_LOGO, DEFAULT_LOGO];
        for (const c of comps) {
            params.push(c.comp_id, ...seasons);
        }

        return db.all(
            `WITH
             ${LATEST_CLUB_LOGOS_CTE}
             SELECT
                 m.match_id::text   AS fixture_id,
                 m.match_date       AS date,
                 m.season_label     AS season,
                 m.round_label      AS round,
                 m.matchday,
                 m.home_score       AS goals_home,
                 m.away_score       AS goals_away,
                 CASE
                     WHEN m.home_score IS NULL OR m.away_score IS NULL THEN
                         CASE WHEN m.match_date > CURRENT_DATE THEN 'NS' ELSE 'TBD' END
                     ELSE 'FT'
                 END AS status_short,
                 m.home_team_id::text AS home_team_id,
                 home.name            AS home_team,
                 home.slug            AS home_team_slug,
                 COALESCE(hl.logo_url, home.current_logo_url, ?) AS home_team_logo,
                 m.away_team_id::text AS away_team_id,
                 away.name            AS away_team,
                 away.slug            AS away_team_slug,
                 COALESCE(al.logo_url, away.current_logo_url, ?) AS away_team_logo,
                 m.xg_home, m.xg_away,
                 m.forecast_win, m.forecast_draw, m.forecast_loss,
                 c.name               AS competition_name,
                 c.competition_type   AS competition_type
             FROM v4.matches m
             JOIN v4.teams home             ON home.team_id = m.home_team_id
             JOIN v4.teams away             ON away.team_id = m.away_team_id
             JOIN v4.competitions c         ON c.competition_id = m.competition_id
             LEFT JOIN latest_club_logos hl ON hl.club_id = m.home_team_id
             LEFT JOIN latest_club_logos al ON al.club_id = m.away_team_id
             WHERE (${conditions.join(' OR ')})
             ORDER BY m.match_date ASC NULLS LAST, m.match_id ASC`,
            params
        );
    }

    async getPlayerSeasonStats(competitionId, season, personId) {
        const row = await db.get(
            `WITH ${LATEST_CLUB_LOGOS_CTE}
             SELECT
                 p.person_id::text,
                 p.full_name        AS name,
                 COALESCE(p.photo_url, ?) AS photo_url,
                 c.name             AS club_name,
                 COALESCE(ll.logo_url, c.current_logo_url) AS club_logo,
                 psx.apps,
                 psx.minutes,
                 psx.goals,
                 psx.npg,
                 psx.assists,
                 psx.xg, psx.npxg, psx.xa,
                 psx.xg_chain, psx.xg_buildup,
                 psx.xg_90, psx.npxg_90, psx.xa_90,
                 psx.xg_chain_90, psx.xg_buildup_90,
                 COUNT(DISTINCT ml.match_id)::int AS lineup_apps,
                 SUM(CASE WHEN me.event_type = 'goal'       AND me.player_id = p.person_id THEN 1 ELSE 0 END)::int AS lineup_goals,
                 SUM(CASE WHEN me.event_type = 'card'       AND me.player_id = p.person_id THEN 1 ELSE 0 END)::int AS yellow_cards,
                 SUM(CASE WHEN me.event_type = 'red_card'   AND me.player_id = p.person_id THEN 1 ELSE 0 END)::int AS red_cards
             FROM v4.people p
             JOIN v4.match_lineups ml ON ml.player_id = p.person_id
             JOIN v4.matches m        ON m.match_id = ml.match_id
                                     AND m.competition_id = ?::BIGINT
                                     AND m.season_label   = ?
             JOIN v4.teams c          ON c.team_id = ml.team_id
             LEFT JOIN latest_club_logos ll ON ll.club_id = c.team_id
             LEFT JOIN v4.player_season_xg psx
                    ON psx.person_id     = p.person_id
                   AND psx.competition_id = m.competition_id
                   AND psx.season_label  = ?
             LEFT JOIN v4.match_events me
                    ON me.match_id  = m.match_id
                   AND me.player_id = p.person_id
             WHERE p.person_id = ?::BIGINT
             GROUP BY
                 p.person_id, p.full_name, p.photo_url,
                 c.name, ll.logo_url, c.current_logo_url,
                 psx.apps, psx.minutes, psx.goals, psx.npg, psx.assists,
                 psx.xg, psx.npxg, psx.xa, psx.xg_chain, psx.xg_buildup,
                 psx.xg_90, psx.npxg_90, psx.xa_90, psx.xg_chain_90, psx.xg_buildup_90
             LIMIT 1`,
            [DEFAULT_PHOTO, competitionId, season, season, personId]
        );
        return row ?? null;
    }

    async getCoverageByCompetition() {
        const rows = await db.all(`
            SELECT
                c.competition_id::text,
                c.name                  AS competition_name,
                COALESCE(co.name, 'International') AS country_name,
                c.competition_type,
                COALESCE(co.display_rank_override, co.importance_rank, 999) AS country_rank,
                COALESCE(c.display_rank_override, c.importance_rank, 999999) AS competition_rank,
                m.season_label,
                COUNT(m.match_id)                                               AS total_matches,
                COUNT(CASE WHEN m.home_score IS NOT NULL THEN 1 END)            AS with_score,
                COUNT(CASE WHEN m.scraped_events_at IS NOT NULL THEN 1 END)     AS with_events,
                COUNT(CASE WHEN m.scraped_lineups_at IS NOT NULL THEN 1 END)    AS with_lineups,
                COUNT(CASE WHEN m.scraped_stats_at IS NOT NULL THEN 1 END)      AS with_stats,
                COUNT(CASE WHEN m.xg_home IS NOT NULL THEN 1 END)               AS with_xg
            FROM v4.matches m
            JOIN v4.competitions c ON c.competition_id = m.competition_id
            LEFT JOIN v4.countries co ON co.country_id = c.country_id
            WHERE m.season_label IS NOT NULL
            GROUP BY c.competition_id, c.name, co.name, c.competition_type,
                     co.display_rank_override, co.importance_rank,
                     c.display_rank_override, c.importance_rank,
                     m.season_label
            ORDER BY
                COALESCE(co.display_rank_override, co.importance_rank, 999),
                COALESCE(c.display_rank_override, c.importance_rank, 999999),
                c.name,
                m.season_label
        `);

        // Regroup by competition
        const map = new Map();
        for (const row of rows) {
            if (!map.has(row.competition_id)) {
                map.set(row.competition_id, {
                    competition_id: row.competition_id,
                    competition_name: row.competition_name,
                    country_name: row.country_name,
                    competition_type: row.competition_type,
                    seasons: [],
                });
            }
            map.get(row.competition_id).seasons.push({
                season_label:  row.season_label,
                total_matches: Number(row.total_matches),
                with_score:    Number(row.with_score),
                with_events:   Number(row.with_events),
                with_lineups:  Number(row.with_lineups),
                with_stats:    Number(row.with_stats),
                with_xg:       Number(row.with_xg),
            });
        }

        return Array.from(map.values());
    }
}

export default new LeagueServiceV4();
