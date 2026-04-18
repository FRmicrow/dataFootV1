import logger from '../../utils/logger.js';

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

async function v4IndexExists(db, indexName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'v4' AND indexname = $1
        ) AS exists`,
        [indexName]
    );
    return Boolean(row?.exists);
}

export const up = async (db) => {

    // --- 1. v4.match_events ---
    if (!(await v4TableExists(db, 'match_events'))) {
        logger.info('Creating v4.match_events...');
        await db.run(`
            CREATE TABLE v4.match_events (
                match_event_id    BIGINT PRIMARY KEY,
                match_id          BIGINT NOT NULL REFERENCES v4.matches(match_id) ON DELETE CASCADE,
                event_order       SMALLINT NOT NULL,
                minute_label      TEXT,
                side              TEXT CHECK (side IN ('home', 'away')),
                event_type        TEXT NOT NULL,
                player_id         BIGINT REFERENCES v4.people(person_id) ON DELETE SET NULL,
                related_player_id BIGINT REFERENCES v4.people(person_id) ON DELETE SET NULL,
                goal_type         TEXT CHECK (goal_type IN ('normal', 'own', 'penalty') OR goal_type IS NULL),
                card_type         TEXT CHECK (card_type IN ('yellow', 'red', 'yellow_red') OR card_type IS NULL),
                detail            TEXT,
                score_at_event    TEXT,
                created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('v4.match_events created');
    } else {
        logger.info('v4.match_events already exists — skipping');
    }

    // --- 2. v4.match_lineups ---
    // player_id is nullable: lineups scraped from Flashscore may not resolve
    // to a known v4.people entry. player_name stores the raw name as fallback.
    if (!(await v4TableExists(db, 'match_lineups'))) {
        logger.info('Creating v4.match_lineups...');
        await db.run(`
            CREATE TABLE v4.match_lineups (
                match_lineup_id BIGSERIAL PRIMARY KEY,
                match_id        BIGINT NOT NULL REFERENCES v4.matches(match_id) ON DELETE CASCADE,
                club_id         BIGINT NOT NULL REFERENCES v4.clubs(club_id) ON DELETE CASCADE,
                player_id       BIGINT REFERENCES v4.people(person_id) ON DELETE SET NULL,
                side            TEXT NOT NULL CHECK (side IN ('home', 'away')),
                is_starter      BOOLEAN NOT NULL DEFAULT FALSE,
                jersey_number   TEXT,
                position_code   TEXT,
                role_code       TEXT,
                player_name     TEXT,
                created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (match_id, club_id, player_name, side)
            )
        `);
        logger.info('v4.match_lineups created');
    } else {
        logger.info('v4.match_lineups already exists — skipping');
    }

    // --- 3. Indexes on v4.match_events ---
    const eventIndexes = [
        {
            name: 'idx_v4_match_events_match_id',
            ddl: `CREATE INDEX idx_v4_match_events_match_id ON v4.match_events(match_id)`,
        },
        {
            name: 'idx_v4_match_events_match_goal',
            ddl: `CREATE INDEX idx_v4_match_events_match_goal
                  ON v4.match_events(match_id, player_id, related_player_id)
                  WHERE event_type = 'goal'`,
        },
    ];

    for (const idx of eventIndexes) {
        if (!(await v4IndexExists(db, idx.name))) {
            await db.run(idx.ddl);
            logger.info(`Created index ${idx.name}`);
        } else {
            logger.info(`Index ${idx.name} already exists — skipping`);
        }
    }

    // --- 4. Indexes on v4.match_lineups ---
    const lineupIndexes = [
        {
            name: 'idx_v4_match_lineups_match_id',
            ddl: `CREATE INDEX idx_v4_match_lineups_match_id ON v4.match_lineups(match_id)`,
        },
        {
            name: 'idx_v4_match_lineups_match_player',
            ddl: `CREATE INDEX idx_v4_match_lineups_match_player ON v4.match_lineups(match_id, player_id)`,
        },
        {
            name: 'idx_v4_match_lineups_player_club',
            ddl: `CREATE INDEX idx_v4_match_lineups_player_club ON v4.match_lineups(player_id, club_id)`,
        },
    ];

    for (const idx of lineupIndexes) {
        if (!(await v4IndexExists(db, idx.name))) {
            await db.run(idx.ddl);
            logger.info(`Created index ${idx.name}`);
        } else {
            logger.info(`Index ${idx.name} already exists — skipping`);
        }
    }

    logger.info('v4.match_events + v4.match_lineups migration done');
};

export const down = async (db) => {
    await db.run('DROP TABLE IF EXISTS v4.match_events CASCADE');
    await db.run('DROP TABLE IF EXISTS v4.match_lineups CASCADE');
    logger.info('v4.match_events + v4.match_lineups dropped');
};
