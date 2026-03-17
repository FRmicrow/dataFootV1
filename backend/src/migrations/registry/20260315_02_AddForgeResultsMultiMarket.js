export const up = async (db) => {
    const alterations = [
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS market_type TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS market_label TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS model_version TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS predicted_outcome TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS alternate_outcome TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS actual_result TEXT",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS primary_probability DOUBLE PRECISION",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS alternate_probability DOUBLE PRECISION",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS actual_numeric_value DOUBLE PRECISION",
        "ALTER TABLE V3_Forge_Results ADD COLUMN IF NOT EXISTS expected_total DOUBLE PRECISION",
    ];

    for (const sql of alterations) {
        await db.run(sql);
    }

    await db.run("CREATE INDEX IF NOT EXISTS idx_forge_results_sim_market ON V3_Forge_Results(simulation_id, market_type)");
};

