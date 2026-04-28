
import { z } from 'zod';

export const ResolutionContextSchema = z.object({
    source: z.string(),
    sourceId: z.string(),
    name: z.string().optional(),
    
    // People specific
    nationality: z.string().optional(),
    birthDate: z.string().optional(), // ISO or YYYY-MM-DD
    lastClubId: z.number().optional().or(z.string().transform(v => parseInt(v, 10))),
    
    // Team specific
    countryId: z.number().optional().or(z.string().transform(v => parseInt(v, 10))),
});

export const EntityType = {
    TEAM: 'team',
    PERSON: 'person',
    COMPETITION: 'competition',
    VENUE: 'venue'
};
