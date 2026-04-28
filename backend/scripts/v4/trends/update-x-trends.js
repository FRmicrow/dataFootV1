import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import db from '../../../src/config/database.js';
import logger from '../../../src/utils/logger.js';
import { TrendsPayloadSchema } from '../../../src/schemas/v4/trendsSchema.js';

/**
 * V47 — update-x-trends.js — Writer Node for v4.x_trends
 *
 * Pipeline contract:
 *   stdin (or --input=PATH) → JSON payload (see TrendsPayloadSchema)
 *   stdout                  → human-readable summary line, then JSON summary
 *   exit 0                  → success (committed or dry-run rollback as expected)
 *   exit 1                  → validation or DB error (transaction rolled back)
 *   exit 2                  → bad CLI args
 *
 * Hard rules (data-ingestion-standards.md):
 *   - Zod first, before opening any transaction
 *   - Business key dedup: (trend_label, captured_at::date in UTC)
 *   - Single transaction, ROLLBACK on any error or if --dry-run
 *   - Parameterized queries only
 *   - Structured pino logs (no console.*)
 */

const CLI_OPTS = {
    'input':   { type: 'string', short: 'i' },
    'dry-run': { type: 'boolean' },
    'help':    { type: 'boolean', short: 'h' },
};

function printHelpAndExit(code = 0) {
    const help = [
        'Usage: node update-x-trends.js [options]',
        '',
        'Reads a TrendsPayload JSON from stdin (or --input=PATH) and upserts',
        'into v4.x_trends. Idempotent on (trend_label, captured_at::date).',
        '',
        'Options:',
        '  -i, --input=PATH     Read JSON from file instead of stdin',
        '      --dry-run        Validate + open transaction, then ROLLBACK',
        '  -h, --help           Show this message',
        '',
        'Exit codes:',
        '  0  success',
        '  1  validation or DB error',
        '  2  bad CLI args',
    ].join('\n');
    process.stdout.write(help + '\n');
    process.exit(code);
}

function parseCliArgs() {
    try {
        const { values } = parseArgs({ options: CLI_OPTS, strict: true });
        if (values.help) printHelpAndExit(0);
        return values;
    } catch (err) {
        process.stderr.write(`Bad CLI arguments: ${err.message}\n`);
        printHelpAndExit(2);
    }
}

async function readStdinJson() {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString('utf8').trim();
    if (!raw) throw new Error('stdin is empty — no JSON payload received');
    try {
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(`stdin is not valid JSON: ${err.message}`);
    }
}

function readFileJson(path) {
    const raw = readFileSync(path, 'utf8').trim();
    if (!raw) throw new Error(`File ${path} is empty`);
    try {
        return JSON.parse(raw);
    } catch (err) {
        throw new Error(`File ${path} is not valid JSON: ${err.message}`);
    }
}

/**
 * Upsert a validated TrendsPayload into v4.x_trends.
 * All-or-nothing transaction. Returns counters.
 */
export async function upsertTrendsPayload(payload, { dryRun = false } = {}) {
    const validated = TrendsPayloadSchema.parse(payload);

    const client = await db.getTransactionClient();
    let inserted = 0;
    let updated = 0;

    try {
        await client.beginTransaction();

        for (const trend of validated.trends) {
            // Business key check: (trend_label, captured_at::date in UTC)
            const existing = await client.get(
                `SELECT id
                   FROM v4.x_trends
                  WHERE trend_label = ?
                    AND ((captured_at AT TIME ZONE 'UTC')::date)
                      = ((?::timestamptz AT TIME ZONE 'UTC')::date)`,
                [trend.trend_label, validated.captured_at]
            );

            if (existing?.id) {
                await client.run(
                    `UPDATE v4.x_trends
                        SET rank_position = ?,
                            post_count    = ?,
                            trend_type    = ?,
                            source_url    = ?,
                            captured_at   = ?,
                            raw_payload   = ?,
                            updated_at    = NOW()
                      WHERE id = ?`,
                    [
                        trend.rank_position,
                        trend.post_count,
                        trend.trend_type,
                        validated.source_url,
                        validated.captured_at,
                        JSON.stringify(trend),
                        existing.id,
                    ]
                );
                updated++;
            } else {
                await client.run(
                    `INSERT INTO v4.x_trends
                       (trend_label, trend_type, rank_position, post_count,
                        captured_at, source_url, raw_payload)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        trend.trend_label,
                        trend.trend_type,
                        trend.rank_position,
                        trend.post_count,
                        validated.captured_at,
                        validated.source_url,
                        JSON.stringify(trend),
                    ]
                );
                inserted++;
            }
        }

        if (dryRun) {
            await client.rollback();
            logger.info(
                { inserted, updated, total: validated.trends.length, dry_run: true },
                'X trends upsert simulated — transaction rolled back (--dry-run)'
            );
        } else {
            await client.commit();
            logger.info(
                { inserted, updated, total: validated.trends.length },
                'X trends upserted'
            );
        }

        return {
            inserted,
            updated,
            skipped: 0,
            errors: 0,
            total: validated.trends.length,
            dry_run: Boolean(dryRun),
        };
    } catch (err) {
        try {
            await client.rollback();
        } catch (rollbackErr) {
            logger.error({ err: rollbackErr }, 'Rollback failed after upsert error');
        }
        logger.error({ err }, 'X trends upsert failed — rollback');
        throw err;
    } finally {
        client.release();
    }
}

async function main() {
    const args = parseCliArgs();
    const dryRun = Boolean(args['dry-run']);

    let payload;
    try {
        payload = args.input ? readFileJson(args.input) : await readStdinJson();
    } catch (err) {
        logger.error({ err }, 'Failed to read input payload');
        process.exit(1);
    }

    try {
        await db.init();
    } catch (err) {
        logger.error({ err }, 'Database connection failed');
        process.exit(1);
    }

    try {
        const result = await upsertTrendsPayload(payload, { dryRun });
        // Machine-parseable summary on stdout (consumable by orchestrator)
        process.stdout.write(JSON.stringify(result) + '\n');
        process.exit(0);
    } catch (err) {
        // Logger already wrote a structured error; emit a short summary too
        process.stderr.write(
            JSON.stringify({
                ok: false,
                error: err?.message ?? String(err),
                kind: err?.name ?? 'Error',
                issues: err?.issues ?? undefined,
            }) + '\n'
        );
        process.exit(1);
    }
}

// Run only when invoked directly (not when imported by tests)
const invokedDirectly = (() => {
    try {
        return import.meta.url === `file://${process.argv[1]}`;
    } catch {
        return false;
    }
})();

if (invokedDirectly) {
    main();
}
