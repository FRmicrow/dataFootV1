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
    logger.info('[V4_ML_Tables] Starting migration...');

    // --- v4.ml_feature_store ---
    if (await v4TableExists(db, 'ml_feature_store')) {
        logger.info('[V4_ML_Tables] v4.ml_feature_store already exists — skipping');
    } else {
        await db.run(`
            CREATE TABLE v4.ml_feature_store (
                id               BIGSERIAL PRIMARY KEY,
                match_id         BIGINT NOT NULL REFERENCES v4.matches(match_id) ON DELETE CASCADE,
                feature_set_id   TEXT NOT NULL DEFAULT 'v4_1x2_v1',
                schema_version   TEXT NOT NULL DEFAULT '1.0',
                feature_vector   JSONB NOT NULL,
                computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(match_id, feature_set_id)
            )
        `);

        if (!(await v4IndexExists(db, 'idx_v4_ml_feature_store_match_id'))) {
            await db.run(`CREATE INDEX idx_v4_ml_feature_store_match_id ON v4.ml_feature_store(match_id)`);
        }
        if (!(await v4IndexExists(db, 'idx_v4_ml_feature_store_feature_set'))) {
            await db.run(`CREATE INDEX idx_v4_ml_feature_store_feature_set ON v4.ml_feature_store(feature_set_id)`);
        }
        logger.info('[V4_ML_Tables] v4.ml_feature_store created');
    }

    // --- v4.ml_model_registry ---
    if (await v4TableExists(db, 'ml_model_registry')) {
        logger.info('[V4_ML_Tables] v4.ml_model_registry already exists — skipping');
    } else {
        await db.run(`
            CREATE TABLE v4.ml_model_registry (
                id            SERIAL PRIMARY KEY,
                name          TEXT NOT NULL UNIQUE,
                version       TEXT NOT NULL,
                path          TEXT NOT NULL,
                is_active     BOOLEAN NOT NULL DEFAULT FALSE,
                metrics_json  JSONB,
                trained_at    TIMESTAMPTZ,
                training_size INTEGER
            )
        `);
        logger.info('[V4_ML_Tables] v4.ml_model_registry created');
    }

    // --- v4.ml_predictions ---
    if (await v4TableExists(db, 'ml_predictions')) {
        logger.info('[V4_ML_Tables] v4.ml_predictions already exists — skipping');
    } else {
        await db.run(`
            CREATE TABLE v4.ml_predictions (
                id               BIGSERIAL PRIMARY KEY,
                match_id         BIGINT NOT NULL REFERENCES v4.matches(match_id) ON DELETE CASCADE,
                model_name       TEXT NOT NULL,
                prediction_json  JSONB NOT NULL,
                confidence_score REAL,
                created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(match_id, model_name)
            )
        `);

        if (!(await v4IndexExists(db, 'idx_v4_ml_predictions_match_id'))) {
            await db.run(`CREATE INDEX idx_v4_ml_predictions_match_id ON v4.ml_predictions(match_id)`);
        }
        if (!(await v4IndexExists(db, 'idx_v4_ml_predictions_model'))) {
            await db.run(`CREATE INDEX idx_v4_ml_predictions_model ON v4.ml_predictions(model_name)`);
        }
        if (!(await v4IndexExists(db, 'idx_v4_ml_predictions_created_at'))) {
            await db.run(`CREATE INDEX idx_v4_ml_predictions_created_at ON v4.ml_predictions(created_at DESC)`);
        }
        logger.info('[V4_ML_Tables] v4.ml_predictions created');
    }

    logger.info('[V4_ML_Tables] Migration complete');
};

export const down = async (db) => {
    for (const table of ['ml_predictions', 'ml_feature_store', 'ml_model_registry']) {
        if (await v4TableExists(db, table)) {
            await db.run(`DROP TABLE v4.${table}`);
            logger.info(`[V4_ML_Tables] v4.${table} dropped`);
        }
    }
};
