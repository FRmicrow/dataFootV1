import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../services/v4/InfographicTemplateServiceV4.js', () => ({
    default: {
        listSummaries:  vi.fn(),
        getManifest:    vi.fn(),
        getLoadErrors:  vi.fn(),
        _resetCache:    vi.fn(),
    },
}));

vi.mock('../../utils/logger.js', () => ({
    default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { listTemplates, getTemplate } = await import('./infographicTemplateControllerV4.js');
const service = (await import('../../services/v4/InfographicTemplateServiceV4.js')).default;

function mockRes() {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
}

describe('infographicTemplateControllerV4 — listTemplates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 + { success: true, data: [...] } on happy path', async () => {
        const fakeSummaries = [
            { id: 'player-comparison', name: 'Foo', description: 'd', category: 'player',
              thumbnail: '/static/x.png', version: 1, styleVariantIds: ['a', 'b', 'c'] },
        ];
        service.listSummaries.mockResolvedValueOnce(fakeSummaries);

        const res = mockRes();
        await listTemplates({}, res);

        expect(res.json).toHaveBeenCalledWith({ success: true, data: fakeSummaries });
        expect(res.status).not.toHaveBeenCalled(); // implicit 200
    });

    it('returns 500 + internal_error when the service throws', async () => {
        service.listSummaries.mockRejectedValueOnce(new Error('FS read failed'));

        const res = mockRes();
        await listTemplates({}, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const payload = res.json.mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.error).toBe('internal_error');
    });
});

describe('infographicTemplateControllerV4 — getTemplate', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns 200 + manifest for a known id', async () => {
        const manifest = {
            id: 'player-comparison',
            version: 1,
            name: 'Foo',
            description: 'd',
            category: 'player',
            thumbnail: '/static/x.png',
            form: { fields: [] },
            resolverContract: { requiredFields: [], optionalFields: [] },
            styleVariants: [],
            outputDimensions: { width: 1200, height: 675, format: 'png', dpr: 2 },
        };
        service.getManifest.mockResolvedValueOnce(manifest);

        const res = mockRes();
        await getTemplate({ params: { id: 'player-comparison' } }, res);

        expect(res.json).toHaveBeenCalledWith({ success: true, data: manifest });
    });

    it('returns 404 for an unknown id', async () => {
        service.getManifest.mockResolvedValueOnce(null);

        const res = mockRes();
        await getTemplate({ params: { id: 'unknown-template' } }, res);

        expect(res.status).toHaveBeenCalledWith(404);
        const payload = res.json.mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.error).toBe('template_not_found');
        expect(payload.id).toBe('unknown-template');
    });

    it('returns 400 for an invalid id format (uppercase)', async () => {
        const res = mockRes();
        await getTemplate({ params: { id: 'PlayerComparison' } }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        const payload = res.json.mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.error).toBe('bad_request');
        expect(service.getManifest).not.toHaveBeenCalled();
    });

    it('returns 400 for an invalid id format (with dot)', async () => {
        const res = mockRes();
        await getTemplate({ params: { id: 'player.comparison' } }, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 500 when the service throws', async () => {
        service.getManifest.mockRejectedValueOnce(new Error('FS read failed'));

        const res = mockRes();
        await getTemplate({ params: { id: 'player-comparison' } }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        const payload = res.json.mock.calls[0][0];
        expect(payload.success).toBe(false);
        expect(payload.error).toBe('internal_error');
    });
});
