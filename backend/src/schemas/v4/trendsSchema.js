import { z } from 'zod';

/**
 * V47 — Studio Infographics Phase 1 — Trends Scraper.
 *
 * Zod schema for the JSON payload produced by `scrape-x-trends.py` and
 * consumed by `update-x-trends.js`. Used internally by the writer (not by
 * an HTTP request middleware), so the shape is the raw payload — not
 * { params, query, body } like v4Schemas.js.
 *
 * Aligned with the contract in:
 *   docs/features/V47-Studio-Infographics-Phase1-Trends/technical-spec.md §3
 *
 * Hard rules:
 *   - trend_label : 1..280 chars, trimmed
 *   - rank_position : 1..50, unique within a payload
 *   - trend_label : unique within a payload (case-insensitive)
 *   - trend_type : enum hashtag | topic | event
 *   - source_url : must be on x.com domain
 */

export const TREND_TYPES = ['hashtag', 'topic', 'event'];

export const TrendItemSchema = z.object({
    rank_position: z.number().int().min(1).max(50),
    trend_label:   z.string().trim().min(1).max(280),
    trend_type:    z.enum(TREND_TYPES),
    post_count:    z.number().int().nonnegative().nullable(),
});

export const TrendsPayloadSchema = z.object({
    captured_at:     z.string().datetime({ offset: true }),
    source_url:      z.string().url().refine(
        (u) => /^https:\/\/(?:www\.)?x\.com\//i.test(u),
        { message: 'source_url must be on x.com domain' }
    ),
    scraper_version: z.string().regex(/^v\d+\.\d+\.\d+$/, {
        message: 'scraper_version must follow vMAJOR.MINOR.PATCH (e.g. v47.1.0)'
    }),
    user_agent:      z.string().min(10).max(512),
    trends:          z.array(TrendItemSchema).min(1).max(50),
})
    .refine(
        (p) => new Set(p.trends.map(t => t.trend_label.toLowerCase())).size === p.trends.length,
        { message: 'Duplicate trend_label inside the same payload' }
    )
    .refine(
        (p) => new Set(p.trends.map(t => t.rank_position)).size === p.trends.length,
        { message: 'Duplicate rank_position inside the same payload' }
    );

/**
 * @typedef {z.infer<typeof TrendItemSchema>} TrendItem
 * @typedef {z.infer<typeof TrendsPayloadSchema>} TrendsPayload
 */
