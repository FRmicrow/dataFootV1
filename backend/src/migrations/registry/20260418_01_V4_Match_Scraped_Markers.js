import logger from '../../utils/logger.js';

export const up = async (db) => {
    logger.info('Adding scraped_*_at marker columns to v4.matches...');

    await db.run(`
        ALTER TABLE v4.matches
            ADD COLUMN IF NOT EXISTS scraped_score_at   TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS scraped_stats_at   TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS scraped_events_at  TIMESTAMPTZ DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS scraped_lineups_at TIMESTAMPTZ DEFAULT NULL
    `);

    // Back-fill markers for matches that already have data so existing rows
    // are not re-scraped on the next run.
    await db.run(`
        UPDATE v4.matches m
        SET scraped_score_at = NOW()
        WHERE m.home_score IS NOT NULL
          AND m.scraped_score_at IS NULL
    `);

    await db.run(`
        UPDATE v4.matches m
        SET scraped_stats_at = NOW()
        WHERE EXISTS (
            SELECT 1 FROM v4.match_stats ms WHERE ms.match_id = m.match_id
        )
        AND m.scraped_stats_at IS NULL
    `);

    await db.run(`
        UPDATE v4.matches m
        SET scraped_events_at = NOW()
        WHERE EXISTS (
            SELECT 1 FROM v4.match_events me
            WHERE me.match_id = m.match_id
              AND me.minute_label LIKE '%'''
        )
        AND m.scraped_events_at IS NULL
    `);

    await db.run(`
        UPDATE v4.matches m
        SET scraped_lineups_at = NOW()
        WHERE EXISTS (
            SELECT 1 FROM v4.match_lineups ml WHERE ml.match_id = m.match_id
        )
        AND m.scraped_lineups_at IS NULL
    `);

    // Indexes for fast filtering in scraper queries
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v4_matches_scraped_score
            ON v4.matches(scraped_score_at) WHERE scraped_score_at IS NULL
    `);
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v4_matches_scraped_events
            ON v4.matches(scraped_events_at) WHERE scraped_events_at IS NULL
    `);
    await db.run(`
        CREATE INDEX IF NOT EXISTS idx_v4_matches_scraped_lineups
            ON v4.matches(scraped_lineups_at) WHERE scraped_lineups_at IS NULL
    `);

    logger.info('scraped_*_at markers added and back-filled');
};

export const down = async (db) => {
    await db.run(`
        ALTER TABLE v4.matches
            DROP COLUMN IF EXISTS scraped_score_at,
            DROP COLUMN IF EXISTS scraped_stats_at,
            DROP COLUMN IF EXISTS scraped_events_at,
            DROP COLUMN IF EXISTS scraped_lineups_at
    `);
    logger.info('scraped_*_at markers dropped');
};
