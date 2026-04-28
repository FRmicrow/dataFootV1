import { z } from 'zod';
import InfographicTemplateServiceV4 from '../../services/v4/InfographicTemplateServiceV4.js';
import logger from '../../utils/logger.js';

/**
 * V48 Phase 2 — controller for /api/v4/studio/templates endpoints.
 *
 * Standard response envelope :
 *   - success → { success: true,  data: ... }
 *   - error   → { success: false, error: '<code>', ...meta }
 */

// :id must be kebab-case lowercase, like the manifest schema enforces.
const templateIdParamsSchema = z.object({
    id: z.string().regex(
        /^[a-z][a-z0-9-]+$/,
        'invalid template id format (kebab-case lowercase required)'
    ),
});

export const listTemplates = async (_req, res) => {
    try {
        const summaries = await InfographicTemplateServiceV4.listSummaries();
        res.json({ success: true, data: summaries });
    } catch (err) {
        logger.error({ err }, 'Failed to list infographic templates');
        res.status(500).json({
            success: false,
            error: 'internal_error',
            message: 'Could not load infographic templates from disk',
        });
    }
};

export const getTemplate = async (req, res) => {
    let parsed;
    try {
        parsed = templateIdParamsSchema.parse(req.params);
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: 'bad_request',
            issues: err.issues ?? [{ message: err.message }],
        });
    }

    try {
        const manifest = await InfographicTemplateServiceV4.getManifest(parsed.id);
        if (!manifest) {
            return res.status(404).json({
                success: false,
                error: 'template_not_found',
                id: parsed.id,
            });
        }
        res.json({ success: true, data: manifest });
    } catch (err) {
        logger.error({ err, id: parsed.id }, 'Failed to load infographic template');
        res.status(500).json({
            success: false,
            error: 'internal_error',
            message: 'Could not load infographic template manifest',
        });
    }
};

export default { listTemplates, getTemplate };
