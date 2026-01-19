import db from '../src/config/database.js';

async function migrate() {
    console.log('🚀 Starting database migration...');

    try {
        await db.init();

        console.log('📊 Deduplicating existing trophies...');

        // 1. Create a temporary table for trophies with unique data
        db.run('CREATE TABLE IF NOT EXISTS player_trophies_new AS SELECT * FROM player_trophies GROUP BY player_id, trophy_id, season_id');

        // 2. Drop old table
        db.run('DROP TABLE player_trophies');

        // 3. Create new table with UNIQUE constraint
        const schema = `
        CREATE TABLE player_trophies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            team_id INTEGER,
            season_id INTEGER NOT NULL,
            trophy_id INTEGER NOT NULL,
            goals INTEGER DEFAULT 0,
            assists INTEGER DEFAULT 0,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
            FOREIGN KEY (team_id) REFERENCES teams(id),
            FOREIGN KEY (season_id) REFERENCES seasons(id),
            FOREIGN KEY (trophy_id) REFERENCES trophies(id),
            UNIQUE(player_id, trophy_id, season_id)
        );`;
        db.run(schema);

        // 4. Copy data back
        db.run('INSERT INTO player_trophies (player_id, team_id, season_id, trophy_id, goals, assists) SELECT player_id, team_id, season_id, trophy_id, goals, assists FROM player_trophies_new');

        // 5. Cleanup
        db.run('DROP TABLE player_trophies_new');

        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
    }
}

migrate();
