import db from '../src/config/database_v3.js';

const createTableSql = `
CREATE TABLE IF NOT EXISTS V3_Fixture_Events (
    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL,
    time_elapsed INTEGER,
    time_extra INTEGER,
    team_id INTEGER,
    player_id INTEGER,
    player_name TEXT,
    assist_id INTEGER,
    assist_name TEXT,
    type TEXT,   -- Goal, Card, subst, Var, etc.
    detail TEXT, -- Normal Goal, Yellow Card, etc.
    comments TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fixture_id) REFERENCES V3_Fixtures(fixture_id),
    FOREIGN KEY (team_id) REFERENCES V3_Teams(team_id),
    FOREIGN KEY (player_id) REFERENCES V3_Players(player_id)
);
`;

const createIndexSql = `
CREATE INDEX IF NOT EXISTS idx_v3_fixture_events_fixture ON V3_Fixture_Events(fixture_id);
`;

const run = async () => {
    console.log('🔌 Connecting to V3 DB...');
    await db.init();

    console.log('🛠 Creating V3_Fixture_Events table...');
    try {
        db.run(createTableSql);
        db.run(createIndexSql);
        console.log('✅ V3_Fixture_Events table created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    }
};

run();
