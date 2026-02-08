import db from '../config/database.js';

const run = async () => {
    console.log("🚀 Creating V3 Tables (Players & Statistics)...");
    try {
        await db.init();

        // V3_players
        console.log("Creating V3_players...");
        await db.run(`DROP TABLE IF EXISTS V3_players`);
        await db.run(`
            CREATE TABLE V3_players (
                player_id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                date_of_birth DATE NOT NULL,
                nationality_id INTEGER NOT NULL,
                photo_url TEXT,
                position TEXT,
                preferred_foot TEXT,
                height_cm INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                api_id INTEGER,
                weight_kg INTEGER,
                birth_country TEXT,
                birth_place TEXT,
                fully_imported BOOLEAN NOT NULL DEFAULT 0,
                FOREIGN KEY (nationality_id) REFERENCES V2_countries(country_id)
            )
        `);
        console.log("- Table created.");

        await db.run(`CREATE INDEX IF NOT EXISTS idx_V3_player_nationality ON V3_players(nationality_id)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_V3_player_name ON V3_players(last_name, first_name)`);
        console.log("- Indexes created.");

        // V3_player_statistics
        console.log("Creating V3_player_statistics...");
        await db.run(`DROP TABLE IF EXISTS V3_player_statistics`);
        await db.run(`
            CREATE TABLE V3_player_statistics (
                stat_id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id INTEGER NOT NULL,
                club_id INTEGER NOT NULL,
                competition_id INTEGER NULL,
                season TEXT NOT NULL, -- '2023-24'
                year INTEGER NOT NULL, -- 2023
                
                matches_played INTEGER DEFAULT 0,
                matches_started INTEGER DEFAULT 0,
                minutes_played INTEGER DEFAULT 0,
                goals INTEGER DEFAULT 0,
                assists INTEGER DEFAULT 0,
                yellow_cards INTEGER DEFAULT 0,
                red_cards INTEGER DEFAULT 0,
                
                clean_sheets INTEGER DEFAULT 0,
                penalty_goals INTEGER DEFAULT 0,
                penalty_misses INTEGER DEFAULT 0,
                
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                
                FOREIGN KEY (player_id) REFERENCES V3_players(player_id) ON DELETE CASCADE,
                FOREIGN KEY (club_id) REFERENCES V2_clubs(club_id),
                FOREIGN KEY (competition_id) REFERENCES V2_competitions(competition_id),
                
                UNIQUE (player_id, club_id, competition_id, season)
            )
        `);
        console.log("- Table created.");

        await db.run(`CREATE INDEX IF NOT EXISTS idx_V3_player_stats ON V3_player_statistics(player_id, year)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_V3_club_stats ON V3_player_statistics(club_id, year)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_V3_season_stats ON V3_player_statistics(season)`);
        await db.run(`CREATE INDEX IF NOT EXISTS idx_V3_player_stats_year_club ON V3_player_statistics(year, club_id, player_id)`);
        console.log("- Indexes created.");

        console.log("✅ V3 Tables Created Successfully.");

    } catch (e) {
        console.error("❌ Error creating tables:", e);
    }
};

run();
