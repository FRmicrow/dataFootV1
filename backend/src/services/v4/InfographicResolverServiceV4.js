import db from '../../config/database.js';
import logger from '../../utils/logger.js';
import { FORM_VALUE_SCHEMAS } from '../../schemas/v4/resolverSchemas.js';

/**
 * V49 — Studio Infographics Phase 3 — Resolver service (read-only).
 *
 * Transforms (templateId, formValues) → { resolved, missing } using ONLY
 * read queries on v4.* tables. No INSERT/UPDATE/DELETE allowed.
 *
 * Anti-hallucination contract :
 *   - Aucun fallback hardcodé (pas de `?? 0`, pas de `?? 'Joueur inconnu'`)
 *   - Chaque champ requis du template absent → entrée explicite dans missing[]
 *   - Si l'entité référencée n'existe pas → throw EntityNotFoundError (= 404)
 *   - Si templateId inconnu → throw TemplateNotFoundError (= 422)
 *
 * See docs/features/V49-Studio-Infographics-Phase3-Resolver/technical-spec.md
 */

// ─── Custom errors (mapped to HTTP status by the controller) ────────────────

export class TemplateNotFoundError extends Error {
    constructor(templateId) {
        super(`No resolver registered for templateId="${templateId}"`);
        this.name = 'TemplateNotFoundError';
        this.templateId = templateId;
    }
}

export class EntityNotFoundError extends Error {
    constructor(entityType, id) {
        super(`${entityType} with id=${id} not found`);
        this.name = 'EntityNotFoundError';
        this.entityType = entityType;
        this.id = id;
    }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeMissing(fieldPath, severity, humanLabel, reason) {
    return { fieldPath, severity, humanLabel, reason };
}

/**
 * Resolves the season_label to use for a given player.
 * If formValues.season === 'current', look up MAX(season_label).
 * Returns null if the player has no row at all (caller will surface
 * critical missing fields).
 */
async function resolveSeasonLabel(personId, requestedSeason) {
    if (requestedSeason !== 'current') return requestedSeason;
    const row = await db.get(
        `SELECT MAX(season_label) AS season_label
           FROM v4.player_season_xg
          WHERE person_id = ?`,
        [personId]
    );
    return row?.season_label ?? null;
}

/**
 * Aggregates `player_season_xg` rows for (personId, seasonLabel).
 * Returns null if no row exists. Otherwise returns sums + per-90 weighted
 * by minutes.
 */
async function aggregateStats(personId, seasonLabel) {
    if (!seasonLabel) return null;
    const row = await db.get(
        `SELECT
            COUNT(*)                                 AS row_count,
            SUM(apps)                                AS apps,
            SUM(minutes)                             AS minutes,
            SUM(goals)                               AS goals,
            SUM(assists)                             AS assists,
            SUM(xg)                                  AS xg,
            SUM(xa)                                  AS xa,
            CASE WHEN SUM(minutes) > 0
                 THEN (SUM(xg) * 90.0) / SUM(minutes)
                 ELSE NULL
            END                                      AS xg_90
           FROM v4.player_season_xg
          WHERE person_id = ?
            AND season_label = ?`,
        [personId, seasonLabel]
    );
    if (!row || row.row_count === '0' || row.row_count === 0) return null;
    return {
        row_count: Number(row.row_count),
        apps:      row.apps      != null ? Number(row.apps)      : null,
        minutes:   row.minutes   != null ? Number(row.minutes)   : null,
        goals:     row.goals     != null ? Number(row.goals)     : null,
        assists:   row.assists   != null ? Number(row.assists)   : null,
        xg:        row.xg        != null ? Number(row.xg)        : null,
        xa:        row.xa        != null ? Number(row.xa)        : null,
        xg_90:     row.xg_90     != null ? Number(row.xg_90)     : null,
    };
}

/**
 * Picks the club where the player spent the most minutes during a season.
 * Tie-broken by created_at desc (latest row wins).
 * Returns null if no row exists.
 */
async function topClubForSeason(personId, seasonLabel) {
    if (!seasonLabel) return null;
    return db.get(
        `SELECT psx.club_id, t.name AS club_name, t.current_logo_url AS club_logo
           FROM v4.player_season_xg psx
           JOIN v4.teams t ON psx.club_id = t.team_id
          WHERE psx.person_id = ?
            AND psx.season_label = ?
          ORDER BY psx.minutes DESC NULLS LAST, psx.created_at DESC
          LIMIT 1`,
        [personId, seasonLabel]
    );
}

/**
 * Resolves a single player block for player-comparison.
 * @returns {Promise<{ player: object, missing: object[] }>}
 */
async function resolvePlayerBlock(idx, personId, requestedSeason) {
    const missing = [];

    // 1. Identity (hard fail if person doesn't exist — that's a 404, not missing)
    const person = await db.get(
        `SELECT person_id, full_name, photo_url, birth_date, nationality_1
           FROM v4.people
          WHERE person_id = ?`,
        [personId]
    );
    if (!person) {
        throw new EntityNotFoundError('player', personId);
    }

    const player = {
        id:             Number(person.person_id),
        name:           person.full_name ?? null,
        photo:          person.photo_url ?? null,
        nationality:    person.nationality_1 ?? null,
        season_used:    null, // filled below
        // stats placeholders — populated only when present in DB
        club_name:      null,
        club_logo:      null,
        goals:          null,
        assists:        null,
        xG:             null,
        xa:             null,
        xg_90:          null,
        minutes_played: null,
        apps:           null,
    };

    // Detect missing identity fields
    if (!person.full_name) {
        missing.push(makeMissing(
            `players[${idx}].name`, 'critical',
            `Nom manquant pour le joueur id=${personId}`,
            `full_name IS NULL in v4.people for person_id=${personId}`
        ));
    }
    if (!person.photo_url) {
        missing.push(makeMissing(
            `players[${idx}].photo`, 'optional',
            `Photo manquante pour ${person.full_name ?? `joueur #${personId}`}`,
            `photo_url IS NULL in v4.people for person_id=${personId}`
        ));
    }

    // 2. Resolve actual season label (per-player when 'current')
    const seasonLabel = await resolveSeasonLabel(personId, requestedSeason);
    player.season_used = seasonLabel;

    // 3. Aggregate stats + top club
    const [stats, club] = await Promise.all([
        aggregateStats(personId, seasonLabel),
        topClubForSeason(personId, seasonLabel),
    ]);

    if (!stats) {
        // No row at all for this season → critical on all "must-have" stats
        const playerLabel = person.full_name ?? `joueur #${personId}`;
        const seasonLabelDisplay = seasonLabel ?? requestedSeason;
        missing.push(makeMissing(
            `players[${idx}].goals`, 'critical',
            `Aucune stat ${seasonLabelDisplay} pour ${playerLabel}`,
            `no row in v4.player_season_xg for person_id=${personId}, season=${seasonLabelDisplay}`
        ));
        missing.push(makeMissing(
            `players[${idx}].assists`, 'critical',
            `Passes décisives non disponibles pour ${playerLabel} (${seasonLabelDisplay})`,
            `no row in v4.player_season_xg for person_id=${personId}, season=${seasonLabelDisplay}`
        ));
        missing.push(makeMissing(
            `players[${idx}].xG`, 'critical',
            `xG non disponible pour ${playerLabel} (${seasonLabelDisplay})`,
            `no row in v4.player_season_xg for person_id=${personId}, season=${seasonLabelDisplay}`
        ));
        missing.push(makeMissing(
            `players[${idx}].minutes_played`, 'optional',
            `Minutes jouées non disponibles pour ${playerLabel} (${seasonLabelDisplay})`,
            `no row in v4.player_season_xg`
        ));
        missing.push(makeMissing(
            `players[${idx}].apps`, 'optional',
            `Apparitions non disponibles pour ${playerLabel} (${seasonLabelDisplay})`,
            `no row in v4.player_season_xg`
        ));
        missing.push(makeMissing(
            `players[${idx}].club_name`, 'optional',
            `Club non identifié pour ${playerLabel} (${seasonLabelDisplay})`,
            `no row in v4.player_season_xg`
        ));
    } else {
        // Has stats — copy what's there, surface what's NULL individually.
        player.goals          = stats.goals;
        player.assists        = stats.assists;
        player.xG             = stats.xg;
        player.xa             = stats.xa;
        player.xg_90          = stats.xg_90;
        player.minutes_played = stats.minutes;
        player.apps           = stats.apps;

        const playerLabel = person.full_name ?? `joueur #${personId}`;
        const seasonLabelDisplay = seasonLabel;

        if (stats.goals == null) {
            missing.push(makeMissing(
                `players[${idx}].goals`, 'critical',
                `Buts non disponibles pour ${playerLabel} (${seasonLabelDisplay})`,
                `goals IS NULL across all rows`
            ));
        }
        if (stats.assists == null) {
            missing.push(makeMissing(
                `players[${idx}].assists`, 'critical',
                `Passes décisives non disponibles pour ${playerLabel} (${seasonLabelDisplay})`,
                `assists IS NULL across all rows`
            ));
        }
        if (stats.xg == null) {
            missing.push(makeMissing(
                `players[${idx}].xG`, 'critical',
                `xG non disponible pour ${playerLabel} (${seasonLabelDisplay})`,
                `xg IS NULL across all rows`
            ));
        }
        if (stats.minutes == null) {
            missing.push(makeMissing(
                `players[${idx}].minutes_played`, 'optional',
                `Minutes jouées non disponibles pour ${playerLabel} (${seasonLabelDisplay})`,
                `minutes IS NULL across all rows`
            ));
        }
        if (stats.apps == null) {
            missing.push(makeMissing(
                `players[${idx}].apps`, 'optional',
                `Apparitions non disponibles pour ${playerLabel} (${seasonLabelDisplay})`,
                `apps IS NULL across all rows`
            ));
        }
    }

    if (club) {
        player.club_name = club.club_name ?? null;
        player.club_logo = club.club_logo ?? null;
        if (!club.club_name) {
            missing.push(makeMissing(
                `players[${idx}].club_name`, 'optional',
                `Nom du club inconnu pour le joueur id=${personId}`,
                `t.name IS NULL for club_id=${club.club_id}`
            ));
        }
        if (!club.club_logo) {
            missing.push(makeMissing(
                `players[${idx}].club_logo`, 'optional',
                `Logo du club manquant pour ${player.club_name ?? 'club inconnu'}`,
                `t.current_logo_url IS NULL for club_id=${club.club_id}`
            ));
        }
    }

    return { player, missing };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function resolvePlayerComparison(formValues) {
    const validated = FORM_VALUE_SCHEMAS['player-comparison'].parse(formValues);

    const [a, b] = await Promise.all([
        resolvePlayerBlock(0, validated.player_a_id, validated.season),
        resolvePlayerBlock(1, validated.player_b_id, validated.season),
    ]);

    // Top-level season = player A's resolved season (per TSD §R3)
    const topLevelSeason =
        a.player.season_used ?? b.player.season_used ?? validated.season;

    return {
        resolved: {
            season:  topLevelSeason,
            players: [a.player, b.player],
        },
        missing: [...a.missing, ...b.missing],
    };
}

const RESOLVERS = {
    'player-comparison': resolvePlayerComparison,
};

export async function resolve(templateId, formValues) {
    const resolver = RESOLVERS[templateId];
    if (!resolver) {
        throw new TemplateNotFoundError(templateId);
    }
    try {
        return await resolver(formValues);
    } catch (err) {
        if (err instanceof EntityNotFoundError || err instanceof TemplateNotFoundError) {
            throw err;
        }
        // Zod errors carry their own .issues — re-throw untouched
        if (err?.name === 'ZodError') throw err;
        // Unknown error — log + re-throw
        logger.error({ err, templateId }, 'Resolver failed unexpectedly');
        throw err;
    }
}

export default {
    resolve,
    resolvePlayerComparison,
    TemplateNotFoundError,
    EntityNotFoundError,
};
