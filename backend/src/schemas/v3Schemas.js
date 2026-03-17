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
            seasons: z.array(z.union([
                z.coerce.number(),
                z.object({
                    year: z.coerce.number(),
                    pillars: z.array(z.string()).optional()
                })
            ])),
            forceApiId: z.boolean().optional(),
            forceRefresh: z.boolean().optional()
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
        stat: z.string().min(1, "Stat key is required"),
        filters: z.object({
            years: z.array(z.coerce.number()).length(2, "Years range [min, max] is required"),
            leagues: z.array(z.coerce.number()).optional(),
            countries: z.array(z.string()).optional(),
            teams: z.array(z.coerce.number()).optional()
        }),
        selection: z.object({
            mode: z.enum(['top_n', 'manual']),
            value: z.coerce.number().optional(),
            players: z.array(z.coerce.number()).optional()
        }).optional(),
        options: z.object({
            cumulative: z.boolean().optional()
        }).optional()
    })
});

export const studioRankingsSchema = z.object({
    body: z.object({
        league_id: z.coerce.number().positive(),
        season: z.coerce.number().min(2000).max(2030)
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

export const mergeSchema = z.object({
    body: z.object({
        id1: z.coerce.number().positive(),
        id2: z.coerce.number().positive(),
        confidence: z.coerce.number().min(0).max(100).optional()
    })
});

export const duplicatesSchema = z.object({
    query: z.object({
        threshold: z.coerce.number().min(0).max(100).optional()
    })
});

export const prescriptionExecuteSchema = z.object({
    body: z.object({
        id: z.coerce.number().positive()
    })
});

export const prescriptionListSchema = z.object({
    query: z.object({
        status: z.enum(['PENDING', 'RESOLVED', 'IGNORED']).optional(),
        type: z.string().optional()
    })
});
export const toggleMonitoringSchema = z.object({
    params: z.object({
        id: z.coerce.number().positive()
    }),
    body: z.object({
        enabled: z.boolean()
    })
});

export const bulkOddsSchema = z.object({
    body: z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    })
});

export const mlTrainSchema = z.object({
    body: z.object({
        force: z.boolean().optional()
    })
});

export const tacticalStatsSchema = z.object({
    body: z.object({
        leagueId: z.coerce.number().positive(),
        season: z.coerce.number().min(2000).max(2030),
        limit: z.coerce.number().optional()
    })
});

export const leagueIdParamSchema = z.object({
    params: z.object({
        id: z.coerce.number().positive()
    })
});

export const simulationStatusSchema = z.object({
    query: z.object({
        leagueId: z.coerce.number().positive(),
        seasonYear: z.coerce.number().min(2000).max(2030),
        horizon: z.enum(['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING']).optional(),
        simId: z.coerce.number().positive().optional(),
    })
});

export const simulationStartSchema = z.object({
    body: z.object({
        leagueId: z.coerce.number().positive(),
        seasonYear: z.coerce.number().min(2000).max(2030),
        mode: z.enum(['STATIC', 'WALK_FORWARD']).optional(),
        horizon: z.enum(['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING']).optional(),
    })
});

export const simulationReadinessSchema = z.object({
    query: z.object({
        leagueId: z.coerce.number().positive(),
        seasonYear: z.coerce.number().min(2000).max(2030),
    })
});

export const simulationIdParamSchema = z.object({
    params: z.object({
        simId: z.coerce.number().positive(),
    })
});

export const breedingSchema = z.object({
    body: z.object({
        leagueId: z.coerce.number().positive()
    })
});

export const breedingStatusSchema = z.object({
    query: z.object({
        leagueId: z.coerce.number().positive()
    })
});

export const leagueIdV3ParamSchema = z.object({
    params: z.object({
        leagueId: z.coerce.number().positive()
    })
});

export const roiRequestSchema = z.object({
    body: z.object({
        portfolioSize: z.number().positive(),
        stakePerBet: z.number().positive(),
        leagueId: z.number().optional(),
        seasonYear: z.number().optional(),
        markets: z.union([z.string(), z.array(z.string())]).optional()
    })
});

export const edgesTopQuerySchema = z.object({
    query: z.object({
        minEdge: z.coerce.number().min(0).max(100).optional(),
        minConfidence: z.coerce.number().min(0).max(100).optional(),
        limit: z.coerce.number().min(1).max(100).optional(),
        leagueId: z.coerce.number().optional(),
        markets: z.string().optional()
    })
});

export const createSubmodelSchema = z.object({
    body: z.object({
        displayName: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        baseModelType: z.enum(['FT_RESULT', 'HT_RESULT', 'CORNERS_TOTAL', 'CARDS_TOTAL']),
        leagueId: z.number().optional(),
        seasonYear: z.number().min(2015).max(2030).optional(),
        horizonType: z.enum(['FULL_HISTORICAL', '5Y_ROLLING', '3Y_ROLLING']).default('FULL_HISTORICAL'),
        trainNow: z.boolean().default(false)
    })
});
