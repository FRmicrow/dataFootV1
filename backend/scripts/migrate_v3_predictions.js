import db from '../src/config/database_v3.js';

const migrate = async () => {
    console.log('Running Migration: V3_Predictions Table');

    try {
        await db.init();
        await db.run(`
            CREATE TABLE IF NOT EXISTS V3_Predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fixture_id INTEGER NOT NULL,
                league_id INTEGER,
                season INTEGER,
                winner_id INTEGER,
                winner_name TEXT,
                winner_comment TEXT,
                prob_home TEXT,
                prob_draw TEXT,
                prob_away TEXT,
                goals_home TEXT,
                goals_away TEXT,
                advice TEXT,
                prediction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                outcome_result TEXT DEFAULT 'PENDING', -- 'HIT', 'MISS', 'PENDING'
                UNIQUE(fixture_id)
            );
        `);

        await db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_fixture ON V3_Predictions(fixture_id);`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_predictions_outcome ON V3_Predictions(outcome_result);`);

        console.log('✅ V3_Predictions table created successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};

migrate();
