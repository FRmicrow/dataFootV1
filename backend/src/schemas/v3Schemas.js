import { z } from 'zod';

export const importLeagueSchema = z.object({
    body: z.object({
        leagueId: z.coerce.number().positive(),
        season: z.coerce.number().min(2000).max(2030),
        forceApiId: z.boolean().optional()
    })
});

export const searchSchema = z.object({
    query: z.object({
        q: z.string().min(2, "Search query must be at least 2 characters"),
        type: z.enum(['all', 'player', 'club']).default('all').optional(),
        country: z.string().optional()
    })
});

export const importBatchSchema = z.object({
    body: z.object({
        selection: z.array(z.object({
            leagueId: z.number(),
            seasons: z.array(z.number()),
            forceApiId: z.boolean().optional()
        })).min(1, "Batch must contain at least one item")
    })
});
