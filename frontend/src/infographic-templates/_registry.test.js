import { describe, it, expect } from 'vitest';
import {
    listManifests,
    listSummaries,
    getManifest,
    getRegistryErrors,
} from './_registry.js';

describe('infographic-templates registry', () => {
    it('boots with zero validation errors', () => {
        expect(getRegistryErrors()).toEqual([]);
    });

    it('exposes the player-comparison template', () => {
        const m = getManifest('player-comparison');
        expect(m).not.toBeNull();
        expect(m.id).toBe('player-comparison');
        expect(m.styleVariants).toHaveLength(3);
        expect(m.outputDimensions.width).toBe(1200);
        expect(m.outputDimensions.height).toBe(675);
    });

    it('returns null for unknown template id', () => {
        expect(getManifest('totally-fake-template')).toBeNull();
    });

    it('listManifests returns at least one entry', () => {
        const all = listManifests();
        expect(all.length).toBeGreaterThanOrEqual(1);
        expect(all[0].id).toBeDefined();
    });

    it('listSummaries strips heavy fields', () => {
        const summaries = listSummaries();
        expect(summaries.length).toBeGreaterThanOrEqual(1);
        const s = summaries[0];
        expect(s.styleVariantIds).toBeDefined();
        expect(Array.isArray(s.styleVariantIds)).toBe(true);
        expect(s.form).toBeUndefined();
        expect(s.resolverContract).toBeUndefined();
        expect(s.outputDimensions).toBeUndefined();
    });

    it('manifests are frozen (immutable at runtime)', () => {
        const m = getManifest('player-comparison');
        expect(Object.isFrozen(m)).toBe(true);
    });
});
