/**
 * V47 Phase 1 — Cross-language integration test.
 *
 * Spawns the Python scraper in offline mode (--input-html) against each
 * fixture, validates that the JSON it emits round-trips through Zod
 * (TrendsPayloadSchema), and that the documented exit codes are correct.
 *
 * This is the only place where the Python and Node sides of the pipeline
 * are exercised together. If this test breaks, the Python/Node contract
 * has drifted.
 *
 * The test is skipped when:
 *   - python3 isn't on PATH
 *   - the bs4 module is missing (venv not set up)
 * Otherwise it is fast (~50ms per fixture).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { TrendsPayloadSchema } from '../../../src/schemas/v4/trendsSchema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRAPER = resolve(__dirname, 'scrape-x-trends.py');
const FIX_DIR = resolve(__dirname, 'fixtures');

const SCRAPER_EXIT = {
    OK: 0,
    LOGIN_WALL: 4,
    DOM_CHANGED: 7,
    NO_TRENDS: 8,
};

function runScraper(inputHtmlPath) {
    return spawnSync('python3', [SCRAPER, '--input-html', inputHtmlPath], {
        encoding: 'utf8',
        timeout: 10_000,
    });
}

function pythonAvailable() {
    const r = spawnSync('python3', ['-c', 'import bs4'], { encoding: 'utf8' });
    return r.status === 0;
}

const SHOULD_SKIP = !pythonAvailable() || !existsSync(SCRAPER);

describe.skipIf(SHOULD_SKIP)('Python ↔ Node cross-language contract', () => {
    beforeAll(() => {
        if (SHOULD_SKIP) {
            // eslint-disable-next-line no-console
            console.warn(
                '[cross-lang.test] Skipped — python3 + bs4 not available. ' +
                'Run: cd backend/scripts/v4/trends && python3 -m venv .venv && ' +
                'source .venv/bin/activate && pip install -r requirements.txt'
            );
        }
    });

    it('happy fixture → exit 0, valid TrendsPayload, 5 trends', () => {
        const r = runScraper(`${FIX_DIR}/x-explore-sports-happy.html`);
        expect(r.status).toBe(SCRAPER_EXIT.OK);

        let payload;
        expect(() => { payload = JSON.parse(r.stdout); }).not.toThrow();

        // Round-trip through Zod
        const parsed = TrendsPayloadSchema.parse(payload);
        expect(parsed.trends).toHaveLength(5);
        expect(parsed.trends[0].trend_label).toBe('Mbappé');
        expect(parsed.trends[0].trend_type).toBe('topic');
        expect(parsed.trends[0].post_count).toBe(142_000);
        expect(parsed.trends[1].trend_type).toBe('hashtag');
        expect(parsed.trends[2].trend_type).toBe('event');
        expect(parsed.source_url).toBe('https://x.com/explore/tabs/sports');
        expect(parsed.scraper_version).toMatch(/^v\d+\.\d+\.\d+$/);
    });

    it('login-wall fixture → exit 4', () => {
        const r = runScraper(`${FIX_DIR}/x-explore-sports-login-wall.html`);
        expect(r.status).toBe(SCRAPER_EXIT.LOGIN_WALL);
        expect(r.stderr).toMatch(/Login wall/i);
    });

    it('no-cards fixture → exit 7 (DOM changed)', () => {
        const r = runScraper(`${FIX_DIR}/x-explore-sports-no-cards.html`);
        expect(r.status).toBe(SCRAPER_EXIT.DOM_CHANGED);
        expect(r.stderr).toMatch(/DOM structure|matched zero/i);
    });

    it('empty-cards fixture → exit 8 (no trends parsed)', () => {
        const r = runScraper(`${FIX_DIR}/x-explore-sports-empty-cards.html`);
        expect(r.status).toBe(SCRAPER_EXIT.NO_TRENDS);
        expect(r.stderr).toMatch(/none parsed|stale/i);
    });
});
