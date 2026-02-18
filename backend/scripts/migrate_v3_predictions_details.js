
import db from '../src/config/database_v3.js';

const migrate = async () => {
    console.log('Running Migration: V3_Predictions Details Update');

    try {
        await db.init();

        // Check if columns exist, if not add them
        // SQLite doesn't support IF NOT EXISTS in ADD COLUMN directly in one statement usually, 
        // but we can just try/catch or select pragma.
        // For simplicity in this environment, I'll use try/catch block for each column add.

        const columns = ['comparison_data', 'h2h_data', 'teams_data'];
        const existingInfo = await db.all("PRAGMA table_info(V3_Predictions);");
        const existingCols = existingInfo.map(c => c.name);

        for (const col of columns) {
            if (!existingCols.includes(col)) {
                await db.run(`ALTER TABLE V3_Predictions ADD COLUMN ${col} JSON;`);
                console.log(`✅ Added column: ${col}`);
            } else {
                console.log(`ℹ️ Column ${col} already exists.`);
            }
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};

migrate();
