import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import { DEFAULT_LOGO } from '../../config/mediaConstants.js';
import StandingsV4Service from './StandingsV4Service.js';
import { MatchPreviewDTOSchema, UpcomingMatchesDTOSchema } from '../../schemas/contentPreviewSchemas.js';

/**
 * MatchPreviewContentServiceV4
 * ─────────────────────────────
 * Produces the "Match Preview Card" DTO for V8.2.
 * Every field maps to a V4 DB query. No hardcoded values. Missing sources are
 * reported via `data_gaps` — never silently defaulted.
 *
 * The DTO is revalidated against `MatchPreviewDTOSchema` before being returned
 * by the getMatchPreview() method to guarantee contract integrity.
 */

const LATEST_CLUB_LOGOS_CTE = `
    latest_club_logos AS (
        SELECT DISTINCT ON (club_id) club_id, logo_url
        FROM v4.club_logos
        ORDER BY club_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST
    )`;

const LATEST_COMP_LOGOS_CTE = `
    latest_comp_logos AS (
        SELECT DISTINCT ON (competition_id) competition_id, logo_url
        FROM v4.competition_logos
        ORDER BY competition_id, end_year DESC NULLS LAST, start_year DESC NULLS LAST
    )`;

function extractKickoffTime(matchDate) {
    if (!matchDate) return null;
    try {
        const d = new Date(matchDate);
        const hh = String(d.getUTCHours()).padStart(2, '0');
        const mm = String(d.getUTCMinutes()).padStart(2, '0');
        if (hh === '00' && mm === '00') return null;
        return `${hh}:${mm}`;
    } catch {
        return null;
    }
}

function toFormResult(row, sideClubId) {
    // Row carries home_club_id/away_club_id/home_score/away_score
    if (row.home_score == null || row.away_score == null) return null;
    const isHome = String(row.home_club_id) === String(sideClubId);
    const gf = isHome ? row.home_score : row.away_score;
    const ga = isHome ? row.away_score : row.home_score;
    if (gf > ga) return 'W';
    if (gf < ga) return 'L';
    return 'D';
}

class MatchPreviewContentServiceV4 {

    /**
     * Core match row (FK verification happens here).
     * Returns null if match doesn't exist.
     */
    async fetchMatchCore(matchId) {
        return db.get(
            `WITH ${LATEST_CLUB_LOGOS_CTE}, ${LATEST_COMP_LOGOS_CTE}
             SELECT
                 m.match_id::text          AS match_id,
                 m.competition_id::text    AS competition_id,
                 m.season_label            AS season,
                 m.match_date              AS match_date,
                 m.matchday                AS matchday,
                 m.round_label             AS round_label,
                 m.home_club_id::text      AS home_club_id,
                 m.away_club_id::text      AS away_club_id,
                 m.home_score              AS home_score,
                 m.away_score              AS away_score,
                 comp.name                 AS competition_name,
                 COALESCE(cl.logo_url, comp.current_logo_url) AS competition_logo,
                 home.name                 AS home_name,
                 home.short_name           AS home_short_name,
                 COALESCE(hl.logo_url, home.current_logo_url) AS home_logo,
                 away.name                 AS away_name,
                 away.short_name           AS away_short_name,
                 COALESCE(al.logo_url, away.current_logo_url) AS away_logo,
                 venue.name                AS venue_name,
                 venue.city                AS venue_city
             FROM v4.matches m
             JOIN v4.competitions comp     ON comp.competition_id = m.competition_id
             JOIN v4.clubs home            ON home.club_id = m.home_club_id
             JOIN v4.clubs away            ON away.club_id = m.away_club_id
             LEFT JOIN v4.venues venue     ON venue.venue_id = m.venue_id
             LEFT JOIN latest_club_logos hl ON hl.club_id = m.home_club_id
             LEFT JOIN latest_club_logos al ON al.club_id = m.away_club_id
             LEFT JOIN latest_comp_logos cl ON cl.competition_id = m.competition_id
             WHERE m.match_id = ?::BIGINT`,
            [matchId]
        );
    }

    async fetchRecentForm(clubId, beforeDate, limit = 5) {
        const rows = await db.all(
            `SELECT
                 m.home_club_id::text AS home_club_id,
                 m.away_club_id::text AS away_club_id,
                 m.home_score,
                 m.away_score,
                 m.match_date
             FROM v4.matches m
             WHERE (m.home_club_id = ?::BIGINT OR m.away_club_id = ?::BIGINT)
               AND m.match_date < ?
               AND m.home_score IS NOT NULL
               AND m.away_score IS NOT NULL
             ORDER BY m.match_date DESC
             LIMIT ?`,
            [clubId, clubId, beforeDate, limit]
        );
        // Chronological ASC (oldest → newest) for left-to-right rendering
        return rows
            .map(r => toFormResult(r, clubId))
            .filter(Boolean)
            .reverse();
    }

    async fetchSeasonXgAvg(clubId, season) {
        const row = await db.get(
            `SELECT
                 AVG(CASE WHEN m.home_club_id = ?::BIGINT THEN m.xg_home
                          WHEN m.away_club_id = ?::BIGINT THEN m.xg_away END) AS xg_avg
             FROM v4.matches m
             WHERE (m.home_club_id = ?::BIGINT OR m.away_club_id = ?::BIGINT)
               AND m.season_label = ?
               AND (CASE WHEN m.home_club_id = ?::BIGINT THEN m.xg_home
                         WHEN m.away_club_id = ?::BIGINT THEN m.xg_away END) IS NOT NULL`,
            [clubId, clubId, clubId, clubId, season, clubId, clubId]
        );
        if (!row || row.xg_avg == null) return null;
        const n = Number(row.xg_avg);
        return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
    }

    async fetchHomeAwayRecord(clubId, season, side /* 'home' | 'away' */) {
        const sideColumn = side === 'home' ? 'm.home_club_id' : 'm.away_club_id';
        const row = await db.get(
            `SELECT
                 COUNT(*) AS played,
                 SUM(CASE WHEN (${sideColumn} = ?::BIGINT AND
                                ((? = 'home' AND m.home_score > m.away_score) OR
                                 (? = 'away' AND m.away_score > m.home_score)))
                          THEN 1 ELSE 0 END) AS wins,
                 SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) AS draws,
                 SUM(CASE WHEN (${sideColumn} = ?::BIGINT AND
                                ((? = 'home' AND m.home_score < m.away_score) OR
                                 (? = 'away' AND m.away_score < m.home_score)))
                          THEN 1 ELSE 0 END) AS losses
             FROM v4.matches m
             WHERE ${sideColumn} = ?::BIGINT
               AND m.season_label = ?
               AND m.home_score IS NOT NULL
               AND m.away_score IS NOT NULL`,
            [clubId, side, side, clubId, side, side, clubId, season]
        );
        const played = Number(row?.played ?? 0);
        if (played === 0) return null;
        const wins = Number(row.wins ?? 0);
        const draws = Number(row.draws ?? 0);
        const losses = Number(row.losses ?? 0);
        return {
            played,
            wins,
            draws,
            losses,
            win_rate: Number((wins / played).toFixed(3)),
        };
    }

    async fetchH2H(homeClubId, awayClubId, beforeDate, limit = 5) {
        const rows = await db.all(
            `SELECT
                 m.match_id::text     AS match_id,
                 m.match_date         AS date,
                 comp.name            AS competition_name,
                 home.name            AS home_name,
                 away.name            AS away_name,
                 m.home_score         AS home_score,
                 m.away_score         AS away_score,
                 m.home_club_id::text AS home_club_id
             FROM v4.matches m
             JOIN v4.competitions comp ON comp.competition_id = m.competition_id
             JOIN v4.clubs home        ON home.club_id = m.home_club_id
             JOIN v4.clubs away        ON away.club_id = m.away_club_id
             WHERE ((m.home_club_id = ?::BIGINT AND m.away_club_id = ?::BIGINT)
                    OR (m.home_club_id = ?::BIGINT AND m.away_club_id = ?::BIGINT))
               AND m.match_date < ?
               AND m.home_score IS NOT NULL
               AND m.away_score IS NOT NULL
             ORDER BY m.match_date DESC
             LIMIT ?`,
            [homeClubId, awayClubId, awayClubId, homeClubId, beforeDate, limit]
        );
        if (rows.length === 0) return null;

        let home_wins = 0, away_wins = 0, draws = 0;
        for (const r of rows) {
            if (r.home_score === r.away_score) {
                draws += 1;
            } else {
                // Determine winner in the H2H "home(current)" perspective
                const currentHomeWon =
                    (String(r.home_club_id) === String(homeClubId) && r.home_score > r.away_score) ||
                    (String(r.home_club_id) === String(awayClubId) && r.home_score < r.away_score);
                if (currentHomeWon) home_wins += 1;
                else away_wins += 1;
            }
        }

        return {
            last_meetings: rows.map(r => ({
                match_id: r.match_id,
                date: r.date instanceof Date ? r.date.toISOString() : String(r.date),
                competition_name: r.competition_name,
                home_name: r.home_name,
                away_name: r.away_name,
                home_score: Number(r.home_score),
                away_score: Number(r.away_score),
            })),
            summary: {
                home_wins,
                draws,
                away_wins,
                total: rows.length,
            },
        };
    }

    async fetchPrediction(matchId) {
        const row = await db.get(
            `SELECT prediction_json, confidence_score, model_name, created_at
             FROM v4.ml_predictions
             WHERE match_id = ?::BIGINT
             ORDER BY created_at DESC
             LIMIT 1`,
            [matchId]
        );
        if (!row) return null;

        let parsed;
        try {
            parsed = typeof row.prediction_json === 'string'
                ? JSON.parse(row.prediction_json)
                : row.prediction_json;
        } catch {
            logger.warn({ matchId }, 'MatchPreview: failed to parse prediction_json');
            return null;
        }

        // Support both { "1","N","2" } and { "home_win","draw","away_win" } shapes
        const home = Number(parsed?.home_win ?? parsed?.['1']);
        const draw = Number(parsed?.draw ?? parsed?.N);
        const away = Number(parsed?.away_win ?? parsed?.['2']);

        if (![home, draw, away].every(Number.isFinite)) {
            logger.warn({ matchId, parsed }, 'MatchPreview: prediction_json missing 1/N/2');
            return null;
        }

        return {
            probs: {
                home_win: Math.max(0, Math.min(1, home)),
                draw: Math.max(0, Math.min(1, draw)),
                away_win: Math.max(0, Math.min(1, away)),
            },
            confidence_score: Math.max(0, Math.min(1, Number(row.confidence_score ?? 0))),
            model_name: row.model_name || 'unknown',
            created_at: row.created_at instanceof Date
                ? row.created_at.toISOString()
                : String(row.created_at),
        };
    }

    async findStandingsRow(competitionId, season, clubId) {
        try {
            const standings = await StandingsV4Service.calculateStandings(competitionId, season);
            if (!Array.isArray(standings) || standings.length === 0) return null;
            const found = standings.find(t => String(t.team_id) === String(clubId));
            if (!found) return null;
            return {
                position: Number(found.rank ?? found.position ?? 0) || 0,
                played: Number(found.played ?? 0),
                points: Number(found.points ?? 0),
                wins: Number(found.win ?? found.wins ?? 0),
                draws: Number(found.draw ?? found.draws ?? 0),
                losses: Number(found.lose ?? found.losses ?? 0),
                goals_for: Number(found.goals_for ?? 0),
                goals_against: Number(found.goals_against ?? 0),
                goal_diff: Number(found.goals_diff ?? found.goal_diff ?? 0),
            };
        } catch (err) {
            logger.warn({ err, competitionId, season, clubId }, 'MatchPreview: standings lookup failed');
            return null;
        }
    }

    /**
     * Assemble the full Match Preview DTO for a given match.
     * Returns { data: DTO } on success, { notFound: true } if match doesn't exist.
     * DTO is revalidated with Zod before being returned.
     */
    async getMatchPreview(matchId) {
        const core = await this.fetchMatchCore(matchId);
        if (!core) return { notFound: true };

        const gaps = new Set();
        if (!core.venue_name) gaps.add('venue');
        if (!core.competition_logo) gaps.add('competition_logo');
        if (!core.home_logo || !core.away_logo) gaps.add('club_logos');

        const matchDate = core.match_date instanceof Date
            ? core.match_date.toISOString()
            : String(core.match_date);

        // Kick off all concurrent lookups
        const [
            homeStandings, awayStandings,
            homeForm, awayForm,
            homeXg, awayXg,
            homeRecord, awayRecord,
            h2h,
            prediction,
        ] = await Promise.all([
            this.findStandingsRow(core.competition_id, core.season, core.home_club_id),
            this.findStandingsRow(core.competition_id, core.season, core.away_club_id),
            this.fetchRecentForm(core.home_club_id, matchDate),
            this.fetchRecentForm(core.away_club_id, matchDate),
            this.fetchSeasonXgAvg(core.home_club_id, core.season),
            this.fetchSeasonXgAvg(core.away_club_id, core.season),
            this.fetchHomeAwayRecord(core.home_club_id, core.season, 'home'),
            this.fetchHomeAwayRecord(core.away_club_id, core.season, 'away'),
            this.fetchH2H(core.home_club_id, core.away_club_id, matchDate),
            this.fetchPrediction(matchId),
        ]);

        if (!homeStandings || !awayStandings) gaps.add('standings');
        if (homeForm.length < 5 || awayForm.length < 5) gaps.add('recent_form');
        if (homeXg == null || awayXg == null) gaps.add('xg');
        if (!homeRecord || !awayRecord) gaps.add('home_away_record');
        if (!h2h) gaps.add('h2h');
        if (!prediction) gaps.add('ml_prediction');

        const dto = {
            match: {
                match_id: core.match_id,
                competition_id: core.competition_id,
                competition_name: core.competition_name,
                competition_logo: core.competition_logo || null,
                season: core.season,
                matchday: core.matchday != null ? Number(core.matchday) : null,
                round_label: core.round_label || null,
                match_date: matchDate,
                kickoff_time: extractKickoffTime(core.match_date),
                venue_name: core.venue_name || null,
                venue_city: core.venue_city || null,
            },
            home: {
                club_id: core.home_club_id,
                name: core.home_name,
                short_name: core.home_short_name || null,
                logo_url: core.home_logo || null,
                primary_color: null,
                standings: homeStandings,
                recent_form: homeForm,
                season_xg_avg: homeXg,
                home_away_record: homeRecord,
            },
            away: {
                club_id: core.away_club_id,
                name: core.away_name,
                short_name: core.away_short_name || null,
                logo_url: core.away_logo || null,
                primary_color: null,
                standings: awayStandings,
                recent_form: awayForm,
                season_xg_avg: awayXg,
                home_away_record: awayRecord,
            },
            h2h,
            prediction,
            data_gaps: Array.from(gaps).sort(),
            generated_at: new Date().toISOString(),
        };

        // Server-side contract validation — prevents malformed payloads leaking to FE
        const parsed = MatchPreviewDTOSchema.safeParse(dto);
        if (!parsed.success) {
            logger.error(
                { err: parsed.error, matchId, issues: parsed.error.issues },
                'MatchPreview DTO failed Zod validation'
            );
            throw new Error('MatchPreview DTO shape invariant violated — see logs');
        }

        return { data: parsed.data };
    }

    /**
     * List upcoming (not-yet-played) matches for the studio picker.
     */
    async getUpcomingMatches({ limit = 50, fromDate, toDate, competitionId } = {}) {
        const resolvedFrom = fromDate || new Date().toISOString().slice(0, 10);
        const resolvedTo = toDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            .toISOString().slice(0, 10);

        const params = [];
        let compFilter = '';
        if (competitionId) {
            compFilter = 'AND m.competition_id = ?::BIGINT';
            params.push(competitionId);
        }

        const rows = await db.all(
            `WITH ${LATEST_CLUB_LOGOS_CTE}, ${LATEST_COMP_LOGOS_CTE}
             SELECT
                 m.match_id::text        AS match_id,
                 m.match_date            AS match_date,
                 m.competition_id::text  AS competition_id,
                 comp.name               AS competition_name,
                 COALESCE(cl.logo_url, comp.current_logo_url) AS competition_logo,
                 m.home_club_id::text    AS home_club_id,
                 home.name               AS home_name,
                 COALESCE(hl.logo_url, home.current_logo_url) AS home_logo,
                 m.away_club_id::text    AS away_club_id,
                 away.name               AS away_name,
                 COALESCE(al.logo_url, away.current_logo_url) AS away_logo,
                 venue.name              AS venue_name
             FROM v4.matches m
             JOIN v4.competitions comp      ON comp.competition_id = m.competition_id
             JOIN v4.clubs home             ON home.club_id = m.home_club_id
             JOIN v4.clubs away             ON away.club_id = m.away_club_id
             LEFT JOIN v4.venues venue      ON venue.venue_id = m.venue_id
             LEFT JOIN latest_club_logos hl ON hl.club_id = m.home_club_id
             LEFT JOIN latest_club_logos al ON al.club_id = m.away_club_id
             LEFT JOIN latest_comp_logos cl ON cl.competition_id = m.competition_id
             WHERE m.home_score IS NULL
               AND m.away_score IS NULL
               AND m.match_date >= ?::DATE
               AND m.match_date < (?::DATE + INTERVAL '1 day')
               ${compFilter}
             ORDER BY m.match_date ASC, m.match_id ASC
             LIMIT ?`,
            [resolvedFrom, resolvedTo, ...params, limit]
        );

        const matches = rows.map(r => ({
            match_id: r.match_id,
            match_date: r.match_date instanceof Date
                ? r.match_date.toISOString()
                : String(r.match_date),
            kickoff_time: extractKickoffTime(r.match_date),
            competition_id: r.competition_id,
            competition_name: r.competition_name,
            competition_logo: r.competition_logo || null,
            home_club_id: r.home_club_id,
            home_name: r.home_name,
            home_logo: r.home_logo || DEFAULT_LOGO,
            away_club_id: r.away_club_id,
            away_name: r.away_name,
            away_logo: r.away_logo || DEFAULT_LOGO,
            venue_name: r.venue_name || null,
        }));

        const payload = {
            matches,
            total: matches.length,
            from_date: resolvedFrom,
            to_date: resolvedTo,
        };

        const parsed = UpcomingMatchesDTOSchema.safeParse(payload);
        if (!parsed.success) {
            logger.error({ err: parsed.error }, 'Upcoming matches DTO failed Zod validation');
            throw new Error('Upcoming matches DTO shape invariant violated');
        }

        return parsed.data;
    }
}

export default new MatchPreviewContentServiceV4();
