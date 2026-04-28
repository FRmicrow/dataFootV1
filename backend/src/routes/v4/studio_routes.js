import express from 'express';
import {
    listTemplates,
    getTemplate,
} from '../../controllers/v4/infographicTemplateControllerV4.js';

/**
 * V48 Phase 2 — Studio routes (Infographic Studio).
 *
 * Mounted under /api/v4/studio in v4_routes.js.
 *
 * Endpoints :
 *   GET /templates       → list summaries
 *   GET /templates/:id   → full manifest or 404
 *
 * More routes will land in subsequent phases :
 *   POST /resolve        (Phase 3 — resolver)
 *   POST /export         (Phase 4 — Puppeteer PNG)
 *   GET  /trends         (consumes v4.x_trends from V47)
 *   /tweets/*            (Phase 5 — drafts CRUD)
 */

const router = express.Router();

router.get('/templates',     listTemplates);
router.get('/templates/:id', getTemplate);

export default router;
