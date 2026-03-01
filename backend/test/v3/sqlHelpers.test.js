import { describe, it, expect } from 'vitest';
import { cleanParams } from '../../src/utils/sqlHelpers.js';

describe('sqlHelpers: cleanParams', () => {
    it('should pass primitives as is', () => {
        const input = [1, 'hello', 0, false];
        expect(cleanParams(input)).toEqual([1, 'hello', 0, false]);
    });

    it('should convert undefined and null to null', () => {
        const input = [undefined, null];
        expect(cleanParams(input)).toEqual([null, null]);
    });

    it('should stringify objects and arrays', () => {
        const obj = { key: 'value' };
        const arr = [1, 2, 3];
        const input = [obj, arr];
        expect(cleanParams(input)).toEqual([JSON.stringify(obj), JSON.stringify(arr)]);
    });

    it('should handle nested objects', () => {
        const input = [{ a: { b: 1 } }];
        expect(cleanParams(input)).toEqual([JSON.stringify({ a: { b: 1 } })]);
    });

    it('should handle empty arrays', () => {
        expect(cleanParams([])).toEqual([]);
    });
});
