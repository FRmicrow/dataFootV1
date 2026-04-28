import { describe, it, expect, beforeEach, vi } from 'vitest';
import InfographicTemplateServiceV4 from './InfographicTemplateServiceV4.js';

vi.mock('../../utils/logger.js', () => ({
    default: {
        info:  vi.fn(),
        warn:  vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe('InfographicTemplateServiceV4 — real FS read', () => {
    beforeEach(() => {
        InfographicTemplateServiceV4._resetCache();
    });

    it('listSummaries returns at least the player-comparison template', async () => {
        const summaries = await InfographicTemplateServiceV4.listSummaries();
        expect(summaries.length).toBeGreaterThanOrEqual(1);
        const pc = summaries.find((s) => s.id === 'player-comparison');
        expect(pc).toBeDefined();
        expect(pc.name).toBe('Comparatif joueurs');
        expect(pc.styleVariantIds).toEqual(['dark-observatory', 'editorial', 'tactical']);
    });

    it('summaries do not leak the heavy fields (form / resolverContract / outputDimensions)', async () => {
        const summaries = await InfographicTemplateServiceV4.listSummaries();
        for (const s of summaries) {
            expect(s.form).toBeUndefined();
            expect(s.resolverContract).toBeUndefined();
            expect(s.outputDimensions).toBeUndefined();
        }
    });

    it('getManifest returns the full validated manifest for a known id', async () => {
        const m = await InfographicTemplateServiceV4.getManifest('player-comparison');
        expect(m).not.toBeNull();
        expect(m.id).toBe('player-comparison');
        expect(m.outputDimensions).toEqual({ width: 1200, height: 675, format: 'png', dpr: 2 });
        expect(m.form.fields.length).toBeGreaterThanOrEqual(1);
        expect(Object.isFrozen(m)).toBe(true);
    });

    it('getManifest returns null for an unknown id', async () => {
        const m = await InfographicTemplateServiceV4.getManifest('totally-fake-template-12345');
        expect(m).toBeNull();
    });

    it('getLoadErrors is empty when all manifests are valid', async () => {
        await InfographicTemplateServiceV4.listSummaries();
        const errs = await InfographicTemplateServiceV4.getLoadErrors();
        expect(errs).toEqual([]);
    });

    it('subsequent calls hit the cache (same Map identity)', async () => {
        const a = await InfographicTemplateServiceV4.getManifest('player-comparison');
        const b = await InfographicTemplateServiceV4.getManifest('player-comparison');
        expect(a).toBe(b); // strict reference equality — proves cache hit
    });
});
