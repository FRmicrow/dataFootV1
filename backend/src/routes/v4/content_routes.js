import express from 'express';
import {
    getMatchPreviewV4,
    getUpcomingMatchesV4,
} from '../../controllers/v4/matchPreviewContentControllerV4.js';
import { validateRequest } from '../../middleware/validateRequest.js';
import {
    matchPreviewParamsSchema,
    upcomingMatchesQuerySchema,
} from '../../schemas/contentPreviewSchemas.js';

const router = express.Router();

/**
 * V8.2 — Content endpoints for Match Preview Card
 * All routes are GET-only, read-only.
 *
 * IMPORTANT: /upcoming must be declared BEFORE /:matchId to avoid
 *            "/:matchId" catching the literal "upcoming".
 */
router.get(
    '/content/match-preview/upcoming',
    validateRequest(upcomingMatchesQuerySchema),
    getUpcomingMatchesV4
);

router.get(
    '/content/match-preview/:matchId',
    validateRequest(matchPreviewParamsSchema),
    getMatchPreviewV4
);

export default router;
