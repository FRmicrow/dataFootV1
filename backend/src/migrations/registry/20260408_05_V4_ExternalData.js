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

async function v4ColumnExists(db, tableName, columnName) {
    const row = await db.get(
        `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'v4'
              AND table_name   = $1
              AND column_name  = $2
        ) AS exists`,
        [tableName, columnName]
    );
    return Boolean(row?.exists);
}

export const up = async (db) => {

    // --- 1. forecast columns on v4.matches ---
    logger.info('Adding forecast columns to v4.matches...');
    for (const col of ['forecast_win', 'forecast_draw', 'forecast_loss']) {
        if (!(await v4ColumnExists(db, 'matches', col))) {
            await db.run(`ALTER TABLE v4.matches ADD COLUMN ${col} NUMERIC(6,4)`);
            logger.info(`Added v4.matches.${col}`);
        } else {
            logger.info(`v4.matches.${col} already exists — skipping`);
        }
    }

    // --- 2. v4.external_match_mapping ---
    if (!(await v4TableExists(db, 'external_match_mapping'))) {
        logger.info('Creating v4.external_match_mapping...');
        await db.run(`
            CREATE TABLE v4.external_match_mapping (
                id            BIGSERIAL PRIMARY KEY,
                source        TEXT NOT NULL,
                external_id   TEXT NOT NULL,
                v4_match_id   BIGINT REFERENCES v4.matches(match_id) ON DELETE SET NULL,
                strategy      TEXT NOT NULL DEFAULT 'DATE_TEAMS',
                confidence    TEXT NOT NULL DEFAULT 'NONE',
                notes         TEXT,
                created_at    TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(source, external_id),
                CONSTRAINT chk_emm_confidence CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW', 'NONE')),
                CONSTRAINT chk_emm_strategy   CHECK (strategy   IN ('DATE_TEAMS', 'UNMATCHED'))
            )
        `);
        if (!(await v4IndexExists(db, 'idx_emm_source_id'))) {
            await db.run(`CREATE INDEX idx_emm_source_id ON v4.external_match_mapping(source, external_id)`);
        }
        if (!(await v4IndexExists(db, 'idx_emm_match_id'))) {
            await db.run(`CREATE INDEX idx_emm_match_id ON v4.external_match_mapping(v4_match_id) WHERE v4_match_id IS NOT NULL`);
        }
        logger.info('v4.external_match_mapping created');
    } else {
        logger.info('v4.external_match_mapping already exists — skipping');
    }

    // --- 3. v4.match_stats ---
    if (!(await v4TableExists(db, 'match_stats'))) {
        logger.info('Creating v4.match_stats...');
        await db.run(`
            CREATE TABLE v4.match_stats (
                match_stats_id   BIGSERIAL PRIMARY KEY,
                match_id         BIGINT NOT NULL UNIQUE REFERENCES v4.matches(match_id) ON DELETE CASCADE,
                -- Half-time score
                home_score_ht    SMALLINT,
                away_score_ht    SMALLINT,
                -- Possession %
                home_poss_ft     SMALLINT,
                away_poss_ft     SMALLINT,
                home_poss_1h     SMALLINT,
                away_poss_1h     SMALLINT,
                home_poss_2h     SMALLINT,
                away_poss_2h     SMALLINT,
                -- Total shots
                home_shots_ft    SMALLINT,
                away_shots_ft    SMALLINT,
                home_shots_1h    SMALLINT,
                away_shots_1h    SMALLINT,
                home_shots_2h    SMALLINT,
                away_shots_2h    SMALLINT,
                -- Shots on target
                home_shots_ot_ft SMALLINT,
                away_shots_ot_ft SMALLINT,
                home_shots_ot_1h SMALLINT,
                away_shots_ot_1h SMALLINT,
                home_shots_ot_2h SMALLINT,
                away_shots_ot_2h SMALLINT,
                -- Shots off target
                home_shots_off_ft SMALLINT,
                away_shots_off_ft SMALLINT,
                home_shots_off_1h SMALLINT,
                away_shots_off_1h SMALLINT,
                home_shots_off_2h SMALLINT,
                away_shots_off_2h SMALLINT,
                -- Corners
                home_corners_ft  SMALLINT,
                away_corners_ft  SMALLINT,
                home_corners_1h  SMALLINT,
                away_corners_1h  SMALLINT,
                home_corners_2h  SMALLINT,
                away_corners_2h  SMALLINT,
                -- Yellow cards
                home_yellows_ft  SMALLINT,
                away_yellows_ft  SMALLINT,
                home_yellows_1h  SMALLINT,
                away_yellows_1h  SMALLINT,
                home_yellows_2h  SMALLINT,
                away_yellows_2h  SMALLINT,
                created_at       TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('v4.match_stats created');
    } else {
        logger.info('v4.match_stats already exists — skipping');
    }

    // --- 4. v4.match_odds ---
    if (!(await v4TableExists(db, 'match_odds'))) {
        logger.info('Creating v4.match_odds...');
        await db.run(`
            CREATE TABLE v4.match_odds (
                match_odds_id  BIGSERIAL PRIMARY KEY,
                match_id       BIGINT NOT NULL UNIQUE REFERENCES v4.matches(match_id) ON DELETE CASCADE,
                -- 1X2
                odds_home      NUMERIC(7,3),
                odds_draw      NUMERIC(7,3),
                odds_away      NUMERIC(7,3),
                -- Over/Under
                over_05        NUMERIC(7,3),
                under_05       NUMERIC(7,3),
                over_15        NUMERIC(7,3),
                under_15       NUMERIC(7,3),
                over_25        NUMERIC(7,3),
                under_25       NUMERIC(7,3),
                over_35        NUMERIC(7,3),
                under_35       NUMERIC(7,3),
                over_45        NUMERIC(7,3),
                under_45       NUMERIC(7,3),
                -- Both Teams To Score
                btts_yes       NUMERIC(7,3),
                btts_no        NUMERIC(7,3),
                created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        logger.info('v4.match_odds created');
    } else {
        logger.info('v4.match_odds already exists — skipping');
    }

    // --- 5. v4.team_season_xg ---
    if (!(await v4TableExists(db, 'team_season_xg'))) {
        logger.info('Creating v4.team_season_xg...');
        await db.run(`
            CREATE TABLE v4.team_season_xg (
                id             BIGSERIAL PRIMARY KEY,
                competition_id BIGINT NOT NULL REFERENCES v4.competitions(competition_id) ON DELETE CASCADE,
                season_label   TEXT NOT NULL,
                club_id        BIGINT NOT NULL REFERENCES v4.clubs(club_id) ON DELETE CASCADE,
                -- League table
                position       SMALLINT,
                matches        SMALLINT,
                wins           SMALLINT,
                draws          SMALLINT,
                losses         SMALLINT,
                goals          SMALLINT,
                goals_against  SMALLINT,
                points         SMALLINT,
                -- xG metrics
                xg             NUMERIC(7,2),
                npxg           NUMERIC(7,2),
                xga            NUMERIC(7,2),
                npxga          NUMERIC(7,2),
                npxgd          NUMERIC(7,2),
                ppda           NUMERIC(7,2),
                ppda_allowed   NUMERIC(7,2),
                deep           SMALLINT,
                deep_allowed   SMALLINT,
                xpts           NUMERIC(7,2),
                created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(competition_id, season_label, club_id)
            )
        `);
        if (!(await v4IndexExists(db, 'idx_team_season_xg_comp'))) {
            await db.run(`CREATE INDEX idx_team_season_xg_comp ON v4.team_season_xg(competition_id, season_label)`);
        }
        if (!(await v4IndexExists(db, 'idx_team_season_xg_club'))) {
            await db.run(`CREATE INDEX idx_team_season_xg_club ON v4.team_season_xg(club_id)`);
        }
        logger.info('v4.team_season_xg created');
    } else {
        logger.info('v4.team_season_xg already exists — skipping');
    }

    // --- 6. v4.player_season_xg ---
    if (!(await v4TableExists(db, 'player_season_xg'))) {
        logger.info('Creating v4.player_season_xg...');
        await db.run(`
            CREATE TABLE v4.player_season_xg (
                id             BIGSERIAL PRIMARY KEY,
                competition_id BIGINT NOT NULL REFERENCES v4.competitions(competition_id) ON DELETE CASCADE,
                season_label   TEXT NOT NULL,
                club_id        BIGINT NOT NULL REFERENCES v4.clubs(club_id) ON DELETE CASCADE,
                person_id      BIGINT REFERENCES v4.people(person_id) ON DELETE SET NULL,
                player_name    TEXT NOT NULL,
                -- Volume
                apps           SMALLINT,
                minutes        INTEGER,
                goals          SMALLINT,
                npg            SMALLINT,
                assists        SMALLINT,
                -- xG totals
                xg             NUMERIC(7,3),
                npxg           NUMERIC(7,3),
                xa             NUMERIC(7,3),
                xg_chain       NUMERIC(7,3),
                xg_buildup     NUMERIC(7,3),
                -- xG per 90
                xg_90          NUMERIC(6,3),
                npxg_90        NUMERIC(6,3),
                xa_90          NUMERIC(6,3),
                xg90_xa90      NUMERIC(6,3),
                npxg90_xa90    NUMERIC(6,3),
                xg_chain_90    NUMERIC(6,3),
                xg_buildup_90  NUMERIC(6,3),
                created_at     TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(competition_id, season_label, club_id, player_name)
            )
        `);
        if (!(await v4IndexExists(db, 'idx_player_season_xg_comp'))) {
            await db.run(`CREATE INDEX idx_player_season_xg_comp ON v4.player_season_xg(competition_id, season_label)`);
        }
        if (!(await v4IndexExists(db, 'idx_player_season_xg_person'))) {
            await db.run(`CREATE INDEX idx_player_season_xg_person ON v4.player_season_xg(person_id) WHERE person_id IS NOT NULL`);
        }
        if (!(await v4IndexExists(db, 'idx_player_season_xg_club'))) {
            await db.run(`CREATE INDEX idx_player_season_xg_club ON v4.player_season_xg(club_id)`);
        }
        logger.info('v4.player_season_xg created');
    } else {
        logger.info('v4.player_season_xg already exists — skipping');
    }

    logger.info('Migration 20260408_05 complete');
};

export const down = async (db) => {
    logger.warn('down() for 20260408_05: dropping external data tables. Data will be lost.');
    for (const t of ['player_season_xg', 'team_season_xg', 'match_odds', 'match_stats', 'external_match_mapping']) {
        if (await v4TableExists(db, t)) {
            await db.run(`DROP TABLE v4.${t} CASCADE`);
            logger.info(`v4.${t} dropped`);
        }
    }
    // forecast columns: not removed (would lose data) — manual if needed
    logger.warn('forecast_win/draw/loss columns on v4.matches NOT removed — drop manually if needed');
};
