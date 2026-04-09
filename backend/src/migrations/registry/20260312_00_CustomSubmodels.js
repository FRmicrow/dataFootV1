export const up = async (db) => {
    // V3_Custom_Submodels
    // Stores user-defined specialized ML sub-models with custom scoping
    await db.run(`CREATE TABLE IF NOT EXISTS V3_Custom_Submodels (
        id SERIAL PRIMARY KEY,
        display_name TEXT NOT NULL,
        description TEXT,
        base_model_type TEXT NOT NULL,  -- 'FT_RESULT' | 'HT_RESULT' | 'CORNERS_TOTAL' | 'CARDS_TOTAL'
        league_id INTEGER,              -- NULL = global scope (future)
        season_year INTEGER,            -- NULL = all seasons
        horizon_type TEXT DEFAULT 'FULL_HISTORICAL',  -- 'FULL_HISTORICAL' | '5Y_ROLLING' | '3Y_ROLLING'
        status TEXT DEFAULT 'draft',    -- 'draft' | 'training' | 'trained' | 'failed'
        forge_job_id TEXT,
        metrics_json JSONB,             -- { accuracy, brier_score, hit_rate, samples }
        created_at TIMESTAMPTZ DEFAULT NOW(),
        last_trained_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT false
    )`);

    await db.run('CREATE INDEX IF NOT EXISTS idx_custom_submodels_status ON V3_Custom_Submodels(status)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_custom_submodels_league ON V3_Custom_Submodels(league_id)');
};
