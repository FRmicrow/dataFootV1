import logger from '../../utils/logger.js';

/**
 * V47 — Phase 1 — Studio Infographics
 *
 * Creates v4.x_trends, the table that stores football trends scraped from
 * https://x.com/explore/tabs/sports. Consumed (read-only) by the future
 * suggestion algorithm of the Infographic Studio.
 *
 * Business key : (trend_label, captured_at::date)
 *   → a given trend can move in rank during the same day, but only one row
 *     per trend per UTC day. The writer (update-x-trends.js) UPDATEs an
 *     existing row instead of creating a duplicate.
 *
 * Migration is fully additive. The down() drops the table — never run in
 * production without explicit user approval (see .claude/rules/protection BDD).
 */

async function v4TableExists(db, tableName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'v4' AND table_name = $1
        ) AS exists`,
        [tableName]
    );
    return Boolean(row?.exists);
}

export const up = async (db) => {
    logger.info({}, '🚀 Starting migration: V47 X.com Trends — Phase 1');

    // Ensure schema v4 exists (defensive — should already be there)
    await db.run(`CREATE SCHEMA IF NOT EXISTS v4`);

    // 1. Create v4.x_trends table
    if (!(await v4TableExists(db, 'x_trends'))) {
        await db.run(`
            CREATE TABLE v4.x_trends (
                id              BIGSERIAL PRIMARY KEY,
                trend_label     TEXT        NOT NULL,
                trend_type      TEXT        NOT NULL
                                CHECK (trend_type IN ('hashtag', 'topic', 'event')),
                rank_position   INTEGER     NOT NULL
                                CHECK (rank_position BETWEEN 1 AND 50),
                post_count      INTEGER
                                CHECK (post_count IS NULL OR post_count >= 0),
                captured_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                source_url      TEXT        NOT NULL,
                raw_payload     JSONB,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);
        logger.info({}, '✅ Created table v4.x_trends');
    } else {
        logger.info({}, 'ℹ️ Table v4.x_trends already exists — skipping CREATE');
    }

    // 2. UNIQUE business key — (trend_label, captured_at::date)
    //    Allows updating rank/post_count within the same day, prevents
    //    duplicates across multiple intra-day runs.
    await db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_x_trends_label_day
            ON v4.x_trends (trend_label, ((captured_at AT TIME ZONE 'UTC')::date))
    `);
    logger.info({}, '✅ Created UNIQUE index uq_x_trends_label_day');

    // 3. Index for fast 7-day window queries (the verifier and the future
    //    suggestion algorithm both filter on captured_at >= NOW() - INTERVAL '7d')
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_x_trends_recent
            ON v4.x_trends (captured_at DESC)
    `);
    logger.info({}, '✅ Created index idx_x_trends_recent');

    // 4. Index for type-based filtering (e.g. only events, only hashtags)
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_x_trends_type
            ON v4.x_trends (trend_type, captured_at DESC)
    `);
    logger.info({}, '✅ Created index idx_x_trends_type');

    logger.info({}, '🏁 V47 X.com Trends migration complete');
};

export const down = async (db) => {
    // ⚠️ Destructive — drops table and all data. Never run in production
    // without explicit user approval.
    await db.run(`DROP INDEX IF EXISTS v4.idx_x_trends_type`);
    await db.run(`DROP INDEX IF EXISTS v4.idx_x_trends_recent`);
    await db.run(`DROP INDEX IF EXISTS v4.uq_x_trends_label_day`);
    await db.run(`DROP TABLE IF EXISTS v4.x_trends CASCADE`);
    logger.info({}, '⏪ V47 X.com Trends migration reverted');
};
