import { TemplateManifestSchema, toManifestSummary } from './_schema.js';

/**
 * V48 — Studio Infographics Phase 2 — Template Registry.
 *
 * Auto-discovers every <id>.json in this directory at build time via
 * Vite's `import.meta.glob`. Validates each manifest against the Zod
 * schema. Invalid manifests are logged and skipped (the app keeps
 * starting — a buggy template should never break the whole UI).
 *
 * The registry is intentionally a frozen Map keyed by `id`. To add a
 * new template:
 *   1. Drop a new <kebab-id>.json in this directory
 *   2. Restart the dev server (or rebuild)
 *
 * No runtime mutation. No DB. No fetching.
 */

// Vite glob — eager so manifests are bundled and synchronously available.
const MANIFEST_MODULES = import.meta.glob('./*.json', { eager: true });

const _registry = new Map();
const _errors = [];

for (const [path, mod] of Object.entries(MANIFEST_MODULES)) {
    const data = mod?.default ?? mod;
    const result = TemplateManifestSchema.safeParse(data);

    if (!result.success) {
        const issues = result.error.issues
            .map(i => `${i.path.join('.')}: ${i.message}`)
            .join(' | ');
        _errors.push({ path, issues });
        // eslint-disable-next-line no-console
        console.error(`[infographic-templates] Manifest invalid (${path}): ${issues}`);
        continue;
    }

    if (_registry.has(result.data.id)) {
        _errors.push({ path, issues: `duplicate id "${result.data.id}"` });
        // eslint-disable-next-line no-console
        console.error(`[infographic-templates] Duplicate template id: ${result.data.id} (in ${path})`);
        continue;
    }

    _registry.set(result.data.id, Object.freeze(result.data));
}

/**
 * Returns the array of full manifests (frozen objects).
 * Order is insertion order, which matches alphabetical filename order
 * in practice (Vite's glob is deterministic).
 */
export function listManifests() {
    return [..._registry.values()];
}

/**
 * Returns the array of manifest summaries (id, name, description,
 * category, thumbnail, styleVariantIds). Suitable for a gallery UI
 * or for the GET /api/v4/studio/templates listing endpoint mirror.
 */
export function listSummaries() {
    return [..._registry.values()].map(toManifestSummary);
}

/**
 * Returns the full manifest for a given id, or null if absent / invalid.
 */
export function getManifest(id) {
    return _registry.get(id) ?? null;
}

/**
 * Returns the list of validation errors collected at boot. Useful for
 * a future admin/debug UI. Empty array in a healthy build.
 */
export function getRegistryErrors() {
    return [..._errors];
}
