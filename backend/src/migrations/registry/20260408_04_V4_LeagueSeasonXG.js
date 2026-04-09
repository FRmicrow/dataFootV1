import logger from '../../utils/logger.js';

async function v4TableExists(db, tableName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'v4' AND table_name = ?
        ) AS exists`,
        [tableName]
    );
    return Boolean(row?.exists);
}

async function v4IndexExists(db, indexName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'v4' AND indexname = ?
        ) AS exists`,
        [indexName]
    );
    return Boolean(row?.exists);
}

export const up = async (db) => {
    logger.info('Creating v4.league_season_xg table...');

    if (await v4TableExists(db, 'league_season_xg')) {
        logger.info('v4.league_season_xg already exists — skipping');
        return;
    }

    await db.run(`
        CREATE TABLE v4.league_season_xg (
            id             BIGSERIAL PRIMARY KEY,
            competition_id BIGINT NOT NULL REFERENCES v4.competitions(competition_id) ON DELETE CASCADE,
            season_label   TEXT NOT NULL,
            club_id        BIGINT NOT NULL REFERENCES v4.clubs(club_id) ON DELETE CASCADE,
            xg_for         NUMERIC(6,2),
            xg_against     NUMERIC(6,2),
            xg_points      NUMERIC(6,2),
            np_xg          NUMERIC(6,2),
            ppda           NUMERIC(6,2),
            raw_json       JSONB,
            created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(competition_id, season_label, club_id)
        )
    `);

    if (!(await v4IndexExists(db, 'idx_v4_league_season_xg_comp'))) {
        await db.run(`CREATE INDEX idx_v4_league_season_xg_comp ON v4.league_season_xg(competition_id, season_label)`);
    }
    if (!(await v4IndexExists(db, 'idx_v4_league_season_xg_club'))) {
        await db.run(`CREATE INDEX idx_v4_league_season_xg_club ON v4.league_season_xg(club_id)`);
    }

    logger.info('v4.league_season_xg created successfully');
};

export const down = async (db) => {
    if (await v4TableExists(db, 'league_season_xg')) {
        await db.run(`DROP TABLE v4.league_season_xg`);
        logger.info('v4.league_season_xg dropped');
    }
};
