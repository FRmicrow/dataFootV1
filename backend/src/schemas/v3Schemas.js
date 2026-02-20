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
            leagueId: z.coerce.number(),
            seasons: z.array(z.coerce.number()),
            forceApiId: z.boolean().optional()
        })).min(1, "Batch must contain at least one item")
    })
});

export const initSeasonsSchema = z.object({
    body: z.object({
        leagueId: z.coerce.number().positive(),
        startYear: z.coerce.number().min(2000).max(2030),
        endYear: z.coerce.number().min(2000).max(2030)
    }).refine(data => data.startYear <= data.endYear, {
        message: "Start year must be before or equal to end year",
        path: ["endYear"]
    })
});

export const syncEventsSchema = z.object({
    body: z.object({
        fixture_ids: z.array(z.coerce.number()).optional(),
        league_id: z.coerce.number().optional(),
        season_year: z.coerce.number().optional(),
        limit: z.coerce.number().optional()
    }).refine(data => {
        return (data.fixture_ids && data.fixture_ids.length > 0) || (data.league_id && data.season_year);
    }, {
        message: "Must provide either fixture_ids OR (league_id and season_year)",
        path: ["league_id"]
    })
});

export const importLineupsSchema = z.object({
    body: z.object({
        league_id: z.coerce.number(),
        season_year: z.coerce.number(),
        limit: z.coerce.number().optional()
    })
});

export const predictionsSyncSchema = z.object({
    body: z.object({
        // Flexible schema allowing partial updates or full sync logic if params are defined later
        force: z.boolean().optional()
    })
});

export const studioQuerySchema = z.object({
    body: z.object({
        metric: z.string().min(1, "Metric is required"),
        primaryDimension: z.string().min(1, "Primary dimension is required"),
        secondaryDimension: z.string().optional(),
        aggregation: z.enum(['Sum', 'Avg', 'Count', 'Max', 'Min']).default('Sum'),
        limit: z.coerce.number().min(1).max(500).default(50),
        filters: z.array(z.object({
            field: z.string(),
            operator: z.string(),
            value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.array(z.number())])
        })).optional()
    })
});

export const studioRankingsSchema = z.object({
    body: z.object({
        metric: z.string().min(1, "Metric is required"),
        season: z.coerce.number().optional(),
        minMinutes: z.coerce.number().optional(),
        limit: z.coerce.number().min(1).max(100).default(20)
    })
});

export const syncCareerSchema = z.object({
    params: z.object({
        id: z.coerce.number().positive()
    })
});

export const healthFixSchema = z.object({
    body: z.object({
        issueId: z.string().min(1, "Issue ID is required"),
        type: z.string().min(1, "Issue type is required")
    })
});

export const healthFixAllSchema = z.object({
    body: z.object({
        issues: z.array(z.object({
            id: z.string(),
            type: z.string()
        })).optional() // Depending on implementation, might accept payload or fix everything found
    })
});

export const healthRevertSchema = z.object({
    params: z.object({
        groupId: z.string().min(10, "Invalid rework group ID") // Assuming timestamp based like 'cleanup_YYYYMMDD_HHMMSS'
    })
});

export const healthCheckLeagueSchema = z.object({
    body: z.object({
        leagueName: z.string().min(3, "League name too short")
    })
});

export const healthCheckDeepSchema = z.object({
    body: z.object({
        leagueId: z.coerce.number().optional()
    })
});

export const importTrophiesSchema = z.object({
    body: z.object({
        playerIds: z.array(z.coerce.number()).min(1, "Must provide at least one player ID")
    })
});

export const preferencesSchema = z.object({
    body: z.object({
        favorite_leagues: z.array(z.coerce.number()).optional(),
        favorite_teams: z.array(z.coerce.number()).optional(),
        tracked_leagues: z.array(z.coerce.number()).optional()
    })
});
