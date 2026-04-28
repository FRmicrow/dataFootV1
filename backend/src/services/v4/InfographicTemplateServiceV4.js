import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../../utils/logger.js';
// Reuse the canonical schema from the frontend — both run under Node, no DOM,
// no React, no JSX. Zod is dep on both sides. Single source of truth = no drift.
import {
    TemplateManifestSchema,
    toManifestSummary,
} from '../../../../frontend/src/infographic-templates/_schema.js';

/**
 * V48 Phase 2 — Read-only mirror of the frontend infographic-templates folder.
 *
 * The backend exposes:
 *   GET /api/v4/studio/templates       → list (summaries only)
 *   GET /api/v4/studio/templates/:id   → full validated manifest
 *
 * Manifests live in `frontend/src/infographic-templates/*.json` (see TSD V48
 * §3.2). The backend reads them from FS, validates each one with the same
 * Zod schema the frontend uses at boot. Invalid manifests are logged and
 * excluded from the listing — they do not crash the API.
 *
 * Manifests are loaded lazily on first call and cached in-memory. Restart
 * the backend to pick up new templates (templates are static config, not
 * runtime data).
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// backend/src/services/v4/  →  frontend/src/infographic-templates/
const TEMPLATES_DIR = path.resolve(
    __dirname,
    '../../../../frontend/src/infographic-templates'
);

let _cache = null;          // Map<id, frozen manifest>
let _errors = [];           // Array<{ file, issue }>

async function discover() {
    let files;
    try {
        files = await fs.readdir(TEMPLATES_DIR);
    } catch (err) {
        logger.error({ err, dir: TEMPLATES_DIR }, 'Templates directory unreadable');
        throw err;
    }
    return files.filter(
        (f) => f.endsWith('.json') && !f.startsWith('_')
    );
}

async function loadAll(force = false) {
    if (_cache && !force) return _cache;

    const cache = new Map();
    const errors = [];
    const files = await discover();

    for (const file of files) {
        const fullPath = path.join(TEMPLATES_DIR, file);
        let raw;
        try {
            raw = await fs.readFile(fullPath, 'utf8');
        } catch (err) {
            logger.error({ err, file: fullPath }, 'Failed to read template file');
            errors.push({ file, issue: `read error: ${err.message}` });
            continue;
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            logger.error({ err, file: fullPath }, 'Template file is not valid JSON');
            errors.push({ file, issue: `JSON parse error: ${err.message}` });
            continue;
        }

        const result = TemplateManifestSchema.safeParse(parsed);
        if (!result.success) {
            const issue = result.error.issues
                .map((i) => `${i.path.join('.')}: ${i.message}`)
                .join(' | ');
            logger.error({ file: fullPath, issue }, 'Template manifest failed Zod validation');
            errors.push({ file, issue });
            continue;
        }

        if (cache.has(result.data.id)) {
            logger.error(
                { file: fullPath, duplicateId: result.data.id },
                'Duplicate template id — second occurrence ignored'
            );
            errors.push({ file, issue: `duplicate id "${result.data.id}"` });
            continue;
        }

        cache.set(result.data.id, Object.freeze(result.data));
    }

    _cache = cache;
    _errors = errors;
    logger.info(
        { count: cache.size, errors: errors.length, dir: TEMPLATES_DIR },
        'Infographic templates loaded'
    );
    return cache;
}

export async function listSummaries() {
    const cache = await loadAll();
    return [...cache.values()].map(toManifestSummary);
}

export async function getManifest(id) {
    const cache = await loadAll();
    return cache.get(id) ?? null;
}

export async function getLoadErrors() {
    await loadAll();
    return [..._errors];
}

/**
 * Force-reload from disk on next call. Mostly for tests; in prod we
 * restart the backend to pick up new manifests.
 */
export function _resetCache() {
    _cache = null;
    _errors = [];
}

export default {
    listSummaries,
    getManifest,
    getLoadErrors,
    _resetCache,
};
