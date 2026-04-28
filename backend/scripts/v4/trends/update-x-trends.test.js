import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the database module BEFORE importing the writer.
// We replace getTransactionClient with a controllable factory per-test.
vi.mock('../../../src/config/database.js', () => {
    return {
        default: {
            init: vi.fn(),
            getTransactionClient: vi.fn(),
        },
    };
});

// Mute logger during tests
vi.mock('../../../src/utils/logger.js', () => ({
    default: {
        info:  vi.fn(),
        warn:  vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

const { upsertTrendsPayload } = await import('./update-x-trends.js');
const db = (await import('../../../src/config/database.js')).default;

const PAYLOAD = {
    captured_at:     '2026-04-27T14:32:00Z',
    source_url:      'https://x.com/explore/tabs/sports',
    scraper_version: 'v47.1.0',
    user_agent:      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605',
    trends: [
        { rank_position: 1, trend_label: 'Mbappé', trend_type: 'topic', post_count: 142000 },
        { rank_position: 2, trend_label: 'Haaland', trend_type: 'topic', post_count: 98000  },
    ],
};

/**
 * Helper to build a mocked transaction client that records every call
 * and lets each test override get/run behavior.
 */
function makeMockClient({ getImpl, runImpl } = {}) {
    const calls = [];
    return {
        beginTransaction: vi.fn(async () => { calls.push('BEGIN'); }),
        commit:           vi.fn(async () => { calls.push('COMMIT'); }),
        rollback:         vi.fn(async () => { calls.push('ROLLBACK'); }),
        release:          vi.fn(()    => { calls.push('RELEASE'); }),
        get:              vi.fn(async (...args) => {
            calls.push(['GET', args]);
            return getImpl ? await getImpl(...args) : undefined;
        }),
        run:              vi.fn(async (...args) => {
            calls.push(['RUN', args]);
            return runImpl ? await runImpl(...args) : { changes: 1 };
        }),
        _calls: calls,
    };
}

describe('upsertTrendsPayload', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('T1 — table empty: inserts every trend, commits, returns counters', async () => {
        const client = makeMockClient({ getImpl: async () => undefined });
        db.getTransactionClient.mockResolvedValue(client);

        const result = await upsertTrendsPayload(PAYLOAD, { dryRun: false });

        expect(result).toEqual({
            inserted: 2, updated: 0, skipped: 0, errors: 0, total: 2, dry_run: false,
        });
        expect(client.beginTransaction).toHaveBeenCalledTimes(1);
        expect(client.commit).toHaveBeenCalledTimes(1);
        expect(client.rollback).not.toHaveBeenCalled();
        expect(client.release).toHaveBeenCalledTimes(1);
        // 2 GET (existence) + 2 RUN (insert)
        expect(client.get).toHaveBeenCalledTimes(2);
        expect(client.run).toHaveBeenCalledTimes(2);
    });

    it('T2 — re-running same payload updates instead of inserting', async () => {
        let callCount = 0;
        const client = makeMockClient({
            // Both labels already exist
            getImpl: async (sql, params) => {
                callCount++;
                return { id: 100 + callCount };
            },
        });
        db.getTransactionClient.mockResolvedValue(client);

        const result = await upsertTrendsPayload(PAYLOAD, { dryRun: false });

        expect(result).toEqual({
            inserted: 0, updated: 2, skipped: 0, errors: 0, total: 2, dry_run: false,
        });
        expect(client.commit).toHaveBeenCalledTimes(1);
        // Each RUN must be an UPDATE, not INSERT
        for (const call of client.run.mock.calls) {
            expect(call[0]).toMatch(/^\s*UPDATE/);
        }
    });

    it('T3 — duplicate label in payload: rejects before opening tx', async () => {
        await expect(upsertTrendsPayload({
            ...PAYLOAD,
            trends: [PAYLOAD.trends[0], { ...PAYLOAD.trends[1], trend_label: 'Mbappé' }],
        }, { dryRun: false })).rejects.toThrow(/Duplicate trend_label/);
        expect(db.getTransactionClient).not.toHaveBeenCalled();
    });

    it('T4 — rank_position = 0 → Zod rejects', async () => {
        await expect(upsertTrendsPayload({
            ...PAYLOAD,
            trends: [{ ...PAYLOAD.trends[0], rank_position: 0 }],
        }, { dryRun: false })).rejects.toThrow();
        expect(db.getTransactionClient).not.toHaveBeenCalled();
    });

    it('T5 — invalid trend_type → Zod rejects', async () => {
        await expect(upsertTrendsPayload({
            ...PAYLOAD,
            trends: [{ ...PAYLOAD.trends[0], trend_type: 'person' }],
        }, { dryRun: false })).rejects.toThrow();
        expect(db.getTransactionClient).not.toHaveBeenCalled();
    });

    it('T6 — non-x.com source_url → Zod rejects', async () => {
        await expect(upsertTrendsPayload({
            ...PAYLOAD,
            source_url: 'https://twitter.com/explore/tabs/sports',
        }, { dryRun: false })).rejects.toThrow(/x\.com domain/);
        expect(db.getTransactionClient).not.toHaveBeenCalled();
    });

    it('T7 — DB error mid-transaction: rolls back, releases, re-throws', async () => {
        const client = makeMockClient({
            getImpl: async () => undefined,
            runImpl: async () => { throw new Error('connection lost'); },
        });
        db.getTransactionClient.mockResolvedValue(client);

        await expect(upsertTrendsPayload(PAYLOAD, { dryRun: false }))
            .rejects.toThrow(/connection lost/);

        expect(client.beginTransaction).toHaveBeenCalledTimes(1);
        expect(client.commit).not.toHaveBeenCalled();
        expect(client.rollback).toHaveBeenCalledTimes(1);
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it('T8 — --dry-run: validates + opens tx + runs queries, then ROLLBACK', async () => {
        const client = makeMockClient({ getImpl: async () => undefined });
        db.getTransactionClient.mockResolvedValue(client);

        const result = await upsertTrendsPayload(PAYLOAD, { dryRun: true });

        expect(result.dry_run).toBe(true);
        expect(result.inserted).toBe(2);
        expect(result.total).toBe(2);
        // The INSERTs ran inside the transaction
        expect(client.run).toHaveBeenCalledTimes(2);
        // But we ROLLBACK rather than COMMIT
        expect(client.commit).not.toHaveBeenCalled();
        expect(client.rollback).toHaveBeenCalledTimes(1);
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});
