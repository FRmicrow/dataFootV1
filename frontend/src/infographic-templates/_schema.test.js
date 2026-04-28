import { describe, it, expect } from 'vitest';
import { TemplateManifestSchema, toManifestSummary } from './_schema.js';

const baseManifest = {
    id:          'player-comparison',
    version:     1,
    name:        'Comparatif joueurs',
    description: 'Comparaison de deux joueurs.',
    category:    'player',
    thumbnail:   '/static/templates/player-comparison-thumb.png',
    form: {
        fields: [
            { id: 'player_a_id', type: 'player-picker', label: 'Joueur A', required: true },
            { id: 'player_b_id', type: 'player-picker', label: 'Joueur B', required: true },
            { id: 'season',      type: 'season-picker', label: 'Saison',   required: true, default: 'current' },
        ],
    },
    resolverContract: {
        requiredFields: ['players[0].name', 'players[0].goals', 'players[1].name', 'players[1].goals'],
        optionalFields: ['players[0].photo'],
    },
    styleVariants: [
        { id: 'dark-observatory', name: 'Dark Observatory', description: 'Sombre.' },
        { id: 'editorial',        name: 'Editorial',        description: 'Mag.' },
        { id: 'tactical',         name: 'Tactical',         description: 'Mat.' },
    ],
    outputDimensions: { width: 1200, height: 675, format: 'png', dpr: 2 },
};

describe('TemplateManifestSchema — happy path', () => {
    it('accepts the player-comparison reference manifest', () => {
        expect(() => TemplateManifestSchema.parse(baseManifest)).not.toThrow();
    });
});

describe('TemplateManifestSchema — id format', () => {
    it('rejects PascalCase id', () => {
        expect(() => TemplateManifestSchema.parse({ ...baseManifest, id: 'PlayerComparison' }))
            .toThrow(/kebab-case/);
    });

    it('rejects snake_case id', () => {
        expect(() => TemplateManifestSchema.parse({ ...baseManifest, id: 'player_comparison' }))
            .toThrow(/kebab-case/);
    });

    it('accepts kebab-case-with-numbers id', () => {
        expect(() => TemplateManifestSchema.parse({ ...baseManifest, id: 'top-scorers-2025' }))
            .not.toThrow();
    });
});

describe('TemplateManifestSchema — styleVariants rules', () => {
    it('rejects fewer than 3 variants', () => {
        const m = { ...baseManifest, styleVariants: baseManifest.styleVariants.slice(0, 2) };
        expect(() => TemplateManifestSchema.parse(m)).toThrow(/at least 3|>=3|>= 3/i);
    });

    it('rejects duplicate variant id', () => {
        const m = {
            ...baseManifest,
            styleVariants: [
                baseManifest.styleVariants[0],
                { ...baseManifest.styleVariants[1], id: 'dark-observatory' },
                baseManifest.styleVariants[2],
            ],
        };
        expect(() => TemplateManifestSchema.parse(m)).toThrow(/duplicate styleVariant/);
    });

    it('rejects variant id non-kebab-case', () => {
        const m = {
            ...baseManifest,
            styleVariants: [
                { id: 'DarkObservatory', name: 'X', description: 'X' },
                ...baseManifest.styleVariants.slice(1),
            ],
        };
        expect(() => TemplateManifestSchema.parse(m)).toThrow(/kebab-case/);
    });
});

describe('TemplateManifestSchema — form fields', () => {
    it('rejects duplicate field id', () => {
        const m = {
            ...baseManifest,
            form: {
                fields: [
                    baseManifest.form.fields[0],
                    { ...baseManifest.form.fields[1], id: 'player_a_id' },
                    baseManifest.form.fields[2],
                ],
            },
        };
        expect(() => TemplateManifestSchema.parse(m)).toThrow(/duplicate form field/);
    });

    it('rejects empty form fields array', () => {
        const m = { ...baseManifest, form: { fields: [] } };
        expect(() => TemplateManifestSchema.parse(m)).toThrow();
    });

    it('rejects enum field without enumValues', () => {
        const m = {
            ...baseManifest,
            form: {
                fields: [
                    { id: 'mode', type: 'enum', label: 'Mode', required: true },
                ],
            },
        };
        expect(() => TemplateManifestSchema.parse(m)).toThrow(/enumValues/);
    });

    it('accepts enum field with enumValues', () => {
        const m = {
            ...baseManifest,
            form: {
                fields: [
                    { id: 'mode', type: 'enum', label: 'Mode', required: true, enumValues: ['A', 'B'] },
                ],
            },
        };
        expect(() => TemplateManifestSchema.parse(m)).not.toThrow();
    });

    it('rejects unknown field type', () => {
        const m = {
            ...baseManifest,
            form: {
                fields: [
                    { id: 'foo', type: 'mystery-picker', label: 'X', required: true },
                ],
            },
        };
        expect(() => TemplateManifestSchema.parse(m)).toThrow();
    });
});

describe('TemplateManifestSchema — outputDimensions', () => {
    it('rejects format other than png', () => {
        const m = { ...baseManifest, outputDimensions: { ...baseManifest.outputDimensions, format: 'jpg' } };
        expect(() => TemplateManifestSchema.parse(m)).toThrow();
    });

    it('rejects dpr > 3', () => {
        const m = { ...baseManifest, outputDimensions: { ...baseManifest.outputDimensions, dpr: 4 } };
        expect(() => TemplateManifestSchema.parse(m)).toThrow();
    });
});

describe('TemplateManifestSchema — thumbnail', () => {
    it('rejects thumbnail without /static/ prefix', () => {
        const m = { ...baseManifest, thumbnail: 'https://cdn.example.com/x.png' };
        expect(() => TemplateManifestSchema.parse(m)).toThrow(/static/);
    });
});

describe('toManifestSummary', () => {
    it('strips heavy fields and exposes styleVariantIds', () => {
        const parsed = TemplateManifestSchema.parse(baseManifest);
        const summary = toManifestSummary(parsed);
        expect(summary).toEqual({
            id: 'player-comparison',
            version: 1,
            name: 'Comparatif joueurs',
            description: 'Comparaison de deux joueurs.',
            category: 'player',
            thumbnail: '/static/templates/player-comparison-thumb.png',
            styleVariantIds: ['dark-observatory', 'editorial', 'tactical'],
        });
        expect(summary.form).toBeUndefined();
        expect(summary.resolverContract).toBeUndefined();
        expect(summary.outputDimensions).toBeUndefined();
    });
});
