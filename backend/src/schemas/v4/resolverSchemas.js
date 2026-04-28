import { z } from 'zod';

/**
 * V49 — Studio Infographics Phase 3 — Resolver formValues schemas.
 *
 * Each registered template that exposes a resolver must have a Zod schema
 * for its `formValues` here. The dispatcher in InfographicResolverServiceV4
 * uses FORM_VALUE_SCHEMAS to validate before any DB call.
 */

// Match the season-picker contract: '2025-26' or 'current'
export const SeasonLabelSchema = z.string().regex(
    /^(\d{4}-\d{2}|current)$/,
    "season must be 'current' or 'YYYY-YY' (e.g. '2025-26')"
);

export const PlayerComparisonFormSchema = z.object({
    player_a_id: z.coerce.number().int().positive(),
    player_b_id: z.coerce.number().int().positive(),
    season:      SeasonLabelSchema,
}).refine(
    (v) => v.player_a_id !== v.player_b_id,
    { message: 'player_a_id and player_b_id must differ' }
);

/**
 * Single source of truth — the resolver dispatcher uses this map to
 * pick the right schema. Templates without an entry here are rejected
 * with a TemplateNotFoundError, even if their JSON exists.
 */
export const FORM_VALUE_SCHEMAS = {
    'player-comparison': PlayerComparisonFormSchema,
    // 'match-recap':    ..., (Phase 4+ futur)
};
