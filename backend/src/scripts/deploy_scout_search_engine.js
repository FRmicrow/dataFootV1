import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting US_100 (Ultra-Fast): Deployment of Scout Ranking Engine...');

    // 1. Ensure Schema
    try { db.run(`ALTER TABLE V3_Players ADD COLUMN scout_rank REAL DEFAULT 0;`); } catch (e) { }
    try { db.run(`ALTER TABLE V3_Teams ADD COLUMN scout_rank REAL DEFAULT 0;`); } catch (e) { }
    db.run(`CREATE INDEX IF NOT EXISTS idx_v3_players_scout_rank ON V3_Players(scout_rank DESC);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_v3_teams_scout_rank ON V3_Teams(scout_rank DESC);`);

    // Reset ranks
    db.run(`UPDATE V3_Players SET scout_rank = 0`);
    db.run(`UPDATE V3_Teams SET scout_rank = 0`);

    // 2. Selective Ranking Calculation
    console.log('--- Calculating Player Rankings ---');

    // Trophies (20 pts each)
    db.run(`CREATE TEMP TABLE ts AS SELECT player_id, COUNT(*) * 20 as score FROM V3_Trophies GROUP BY player_id`);
    db.run(`UPDATE V3_Players SET scout_rank = scout_rank + (SELECT score FROM ts WHERE ts.player_id = V3_Players.player_id) WHERE player_id IN (SELECT player_id FROM ts)`);

    // Stats (Longevity: 5 pts/season, Active: 2 pts/appearance 2024+)
    db.run(`CREATE TEMP TABLE as_stats AS 
            SELECT player_id, 
                   COUNT(DISTINCT season_year) * 5 + SUM(CASE WHEN season_year >= 2024 THEN 1 ELSE 0 END) * 2 as score 
            FROM V3_Player_Stats GROUP BY player_id`);
    db.run(`UPDATE V3_Players SET scout_rank = scout_rank + (SELECT score FROM as_stats WHERE as_stats.player_id = V3_Players.player_id) WHERE player_id IN (SELECT player_id FROM as_stats)`);

    console.log('--- Calculating Team Rankings ---');
    db.run(`CREATE TEMP TABLE ta AS 
            SELECT team_id, COUNT(*) as score 
            FROM (
                SELECT home_team_id as team_id FROM V3_Fixtures WHERE season_year >= 2024
                UNION ALL
                SELECT away_team_id as team_id FROM V3_Fixtures WHERE season_year >= 2024
            ) GROUP BY team_id`);
    db.run(`UPDATE V3_Teams SET scout_rank = (SELECT score FROM ta WHERE ta.team_id = V3_Teams.team_id) WHERE team_id IN (SELECT team_id FROM ta)`);

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Scout Ranking Engine Fully Deployed and Optimized!');
    db.close();
}

run().catch(console.error);
