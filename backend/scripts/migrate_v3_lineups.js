
import db from '../src/config/database_v3.js';

const migrate = async () => {
    try {
        await db.init();
        console.log('📦 Starting V3 Lineups Migration...');

        // Create V3_Fixture_Lineups table
        // We use JSON for player lists to avoid massive join tables for every single match player (22+ per match)
        // This is efficient for retrieval and display.
        await db.run(`
            CREATE TABLE IF NOT EXISTS V3_Fixture_Lineups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fixture_id INTEGER NOT NULL,
                team_id INTEGER NOT NULL,
                coach_id INTEGER,
                coach_name TEXT,
                formation TEXT, -- e.g. "4-3-3"
                starting_xi JSON, -- Array of {player_id, name, number, pos, grid}
                substitutes JSON, -- Array of {player_id, name, number, pos, grid}
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(fixture_id, team_id)
            );
        `);

        console.log('✅ V3_Fixture_Lineups table created.');

        // Add index for fast lookup by fixture
        await db.run(`CREATE INDEX IF NOT EXISTS idx_lineups_fixture ON V3_Fixture_Lineups(fixture_id);`);
        console.log('✅ Index created.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
};

migrate();
