import { z } from 'zod';

/**
 * Zod schemas for V8.2 — Match Preview Card content endpoints.
 *
 * Two responsibilities:
 *  1. Validate incoming HTTP requests (params/query) — used with validateRequest middleware.
 *  2. Validate the DTO the service produces BEFORE sending it back — guarantees no malformed
 *     payload ever reaches the frontend and enforces the "no hallucinated data" contract.
 */

// ─── Request schemas ─────────────────────────────────────────────────────────

const isoDate = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(?:T.*)?$/, 'Invalid ISO date (expected YYYY-MM-DD or ISO 8601)');

export const matchPreviewParamsSchema = z.object({
    params: z.object({
        matchId: z.string().min(1, 'matchId is required'),
    }),
    query: z.object({}).passthrough(),
    body: z.object({}).passthrough(),
});

export const upcomingMatchesQuerySchema = z.object({
    params: z.object({}).passthrough(),
    query: z.object({
        limit: z
            .preprocess(
                (v) => (typeof v === 'string' ? parseInt(v, 10) : v),
                z.number().int().min(1).max(100).optional()
            ),
        fromDate: isoDate.optional(),
        toDate: isoDate.optional(),
        competitionId: z.string().min(1).optional(),
    }),
    body: z.object({}).passthrough(),
});

// ─── DTO schemas (response validation) ───────────────────────────────────────

const FormResultSchema = z.enum(['W', 'D', 'L']);

const StandingsSchema = z.object({
    position: z.number().int(),
    played: z.number().int(),
    points: z.number().int(),
    wins: z.number().int(),
    draws: z.number().int(),
    losses: z.number().int(),
    goals_for: z.number().int(),
    goals_against: z.number().int(),
    goal_diff: z.number().int(),
}).nullable();

const HomeAwayRecordSchema = z.object({
    played: z.number().int(),
    wins: z.number().int(),
    draws: z.number().int(),
    losses: z.number().int(),
    win_rate: z.number().min(0).max(1),
}).nullable();

export const ClubBlockSchema = z.object({
    club_id: z.string(),
    name: z.string(),
    short_name: z.string().nullable(),
    logo_url: z.string().url().nullable(),
    primary_color: z.string().nullable(),
    standings: StandingsSchema,
    recent_form: z.array(FormResultSchema).max(5),
    season_xg_avg: z.number().nullable(),
    home_away_record: HomeAwayRecordSchema,
});

export const H2HItemSchema = z.object({
    match_id: z.string(),
    date: z.string(),
    competition_name: z.string(),
    home_name: z.string(),
    away_name: z.string(),
    home_score: z.number().int(),
    away_score: z.number().int(),
});

export const H2HBlockSchema = z.object({
    last_meetings: z.array(H2HItemSchema).max(5),
    summary: z.object({
        home_wins: z.number().int(),
        draws: z.number().int(),
        away_wins: z.number().int(),
        total: z.number().int(),
    }),
}).nullable();

export const PredictionBlockSchema = z.object({
    probs: z.object({
        home_win: z.number().min(0).max(1),
        draw: z.number().min(0).max(1),
        away_win: z.number().min(0).max(1),
    }),
    confidence_score: z.number().min(0).max(1),
    model_name: z.string(),
    created_at: z.string(),
}).nullable();

export const DataGapSchema = z.enum([
    'standings',
    'recent_form',
    'h2h',
    'ml_prediction',
    'venue',
    'competition_logo',
    'club_logos',
    'xg',
    'home_away_record',
]);

export const MatchPreviewDTOSchema = z.object({
    match: z.object({
        match_id: z.string(),
        competition_id: z.string(),
        competition_name: z.string(),
        competition_logo: z.string().url().nullable(),
        season: z.string(),
        matchday: z.number().int().nullable(),
        round_label: z.string().nullable(),
        match_date: z.string(),
        kickoff_time: z.string().nullable(),
        venue_name: z.string().nullable(),
        venue_city: z.string().nullable(),
    }),
    home: ClubBlockSchema,
    away: ClubBlockSchema,
    h2h: H2HBlockSchema,
    prediction: PredictionBlockSchema,
    data_gaps: z.array(DataGapSchema),
    generated_at: z.string(),
});

export const UpcomingMatchItemSchema = z.object({
    match_id: z.string(),
    match_date: z.string(),
    kickoff_time: z.string().nullable(),
    competition_id: z.string(),
    competition_name: z.string(),
    competition_logo: z.string().url().nullable(),
    home_club_id: z.string(),
    home_name: z.string(),
    home_logo: z.string().url().nullable(),
    away_club_id: z.string(),
    away_name: z.string(),
    away_logo: z.string().url().nullable(),
    venue_name: z.string().nullable(),
});

export const UpcomingMatchesDTOSchema = z.object({
    matches: z.array(UpcomingMatchItemSchema),
    total: z.number().int(),
    from_date: z.string(),
    to_date: z.string(),
});
