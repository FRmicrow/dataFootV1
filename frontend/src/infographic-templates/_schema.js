import { z } from 'zod';

/**
 * V48 — Studio Infographics Phase 2 — Template Manifest Schema.
 *
 * Source de vérité du format des templates JSON dans
 *   frontend/src/infographic-templates/<id>.json
 *
 * Validé au boot par _registry.js. Le backend possède une copie de ce
 * schéma dans backend/src/services/v4/InfographicTemplateServiceV4.js
 * et doit rester synchronisé (cf. TSD V48 §3.2 — single source of truth
 * côté frontend, le backend est un miroir lecture seule).
 */

const FIELD_TYPES = [
    'player-picker', 'club-picker', 'match-picker',
    'competition-picker', 'season-picker',
    'text', 'number', 'enum',
];

const KEBAB_CASE_RE = /^[a-z][a-z0-9-]+$/;
const SNAKE_CASE_FIELD_RE = /^[a-z][a-z0-9_]*$/;
const STATIC_THUMB_RE = /^\/static\//;

export const TemplateFieldSchema = z.object({
    id:         z.string().regex(SNAKE_CASE_FIELD_RE, 'field id must be snake_case lowercase'),
    type:       z.enum(FIELD_TYPES),
    label:      z.string().min(1),
    required:   z.boolean(),
    default:    z.unknown().optional(),
    enumValues: z.array(z.string()).optional(),
}).refine(
    (f) => f.type !== 'enum' || (Array.isArray(f.enumValues) && f.enumValues.length > 0),
    { message: 'enum field requires non-empty enumValues' }
);

export const StyleVariantSchema = z.object({
    id:          z.string().regex(KEBAB_CASE_RE, 'variant id must be kebab-case lowercase'),
    name:        z.string().min(1),
    description: z.string().min(1),
});

export const TemplateManifestSchema = z.object({
    id:          z.string().regex(KEBAB_CASE_RE, 'template id must be kebab-case lowercase'),
    version:     z.number().int().positive(),
    name:        z.string().min(1),
    description: z.string().min(1),
    category:    z.enum(['player', 'club', 'match', 'league', 'season']),
    thumbnail:   z.string().regex(STATIC_THUMB_RE, 'thumbnail must start with /static/'),

    form: z.object({
        fields: z.array(TemplateFieldSchema).min(1),
    }),

    resolverContract: z.object({
        requiredFields: z.array(z.string()).min(1),
        optionalFields: z.array(z.string()),
    }),

    // Visual manifesto imposes ≥3 distinct variants
    styleVariants: z.array(StyleVariantSchema).min(3),

    outputDimensions: z.object({
        width:  z.number().int().positive(),
        height: z.number().int().positive(),
        format: z.literal('png'),
        dpr:    z.number().int().min(1).max(3),
    }),
}).refine(
    (m) => new Set(m.styleVariants.map(v => v.id)).size === m.styleVariants.length,
    { message: 'duplicate styleVariant id inside the same template' }
).refine(
    (m) => new Set(m.form.fields.map(f => f.id)).size === m.form.fields.length,
    { message: 'duplicate form field id inside the same template' }
);

/**
 * Returns a "summary" projection of a manifest, suitable for the gallery
 * endpoint (GET /api/v4/studio/templates). Strips `form`, `resolverContract`,
 * `outputDimensions` to keep the listing payload small.
 */
export function toManifestSummary(manifest) {
    return {
        id:               manifest.id,
        version:          manifest.version,
        name:             manifest.name,
        description:      manifest.description,
        category:         manifest.category,
        thumbnail:        manifest.thumbnail,
        styleVariantIds:  manifest.styleVariants.map(v => v.id),
    };
}
