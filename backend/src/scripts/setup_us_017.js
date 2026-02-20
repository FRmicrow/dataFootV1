import db from '../config/database.js';

async function setup() {
    await db.init();

    console.log("Creating V3_System_Preferences...");
    db.run(`
        CREATE TABLE IF NOT EXISTS V3_System_Preferences (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            favorite_leagues JSON DEFAULT '[]',
            favorite_teams JSON DEFAULT '[]'
        );
    `);

    // Insert singleton record if it doesn't exist
    const pref = db.get(`SELECT id FROM V3_System_Preferences WHERE id = 1`);
    if (!pref) {
        db.run(`INSERT INTO V3_System_Preferences (id, favorite_leagues, favorite_teams) VALUES (1, '[]', '[]')`);
        console.log("Inserted singleton V3_System_Preferences record.");
    }

    console.log("Creating V3_Feature_Snapshots...");
    db.run(`
        CREATE TABLE IF NOT EXISTS V3_Feature_Snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fixture_id INTEGER NOT NULL REFERENCES V3_Fixtures(fixture_id),
            team_id INTEGER NOT NULL REFERENCES V3_Teams(team_id),
            feature_type TEXT NOT NULL CHECK(feature_type IN ('SQUAD', 'FORM', 'INJURIES', 'STANDINGS_POINTS')),
            feature_data JSON NOT NULL,
            snapshot_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(fixture_id, team_id, feature_type)
        );
    `);

    // Explicitly call save to persist
    db.save(true);
    console.log("Database schema updated for US_017 successfully.");
}

setup().catch(err => {
    console.error("Migration Error:", err);
    process.exit(1);
});
