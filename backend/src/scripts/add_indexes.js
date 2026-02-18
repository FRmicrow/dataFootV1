/**
 * Database Index Migration Script
 * 
 * Adds missing indexes to optimize query performance on large tables.
 * Safe to run multiple times (IF NOT EXISTS).
 * 
 * Run: node backend/src/scripts/add_indexes.js
 */
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

const INDEXES = [
    // ============================================================
    // V3_Players (325K rows) — heavily queried by api_id for upserts
    // ============================================================
    {
        name: 'idx_players_api_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_players_api_id ON V3_Players(api_id)',
        reason: 'Import upserts: SELECT player_id FROM V3_Players WHERE api_id = ?'
    },
    {
        name: 'idx_players_name',
        sql: 'CREATE INDEX IF NOT EXISTS idx_players_name ON V3_Players(name)',
        reason: 'Search: WHERE name LIKE ? (prefix search benefits from index)'
    },
    {
        name: 'idx_players_nationality',
        sql: 'CREATE INDEX IF NOT EXISTS idx_players_nationality ON V3_Players(nationality)',
        reason: 'Trophy/search filters by nationality'
    },

    // ============================================================
    // V3_Teams (16K rows) — queried by api_id on every import
    // ============================================================
    {
        name: 'idx_teams_api_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_teams_api_id ON V3_Teams(api_id)',
        reason: 'Import upserts: SELECT team_id FROM V3_Teams WHERE api_id = ?'
    },
    {
        name: 'idx_teams_name',
        sql: 'CREATE INDEX IF NOT EXISTS idx_teams_name ON V3_Teams(name)',
        reason: 'Search: WHERE name LIKE ?'
    },

    // ============================================================
    // V3_Leagues (495 rows) — small but queried by api_id constantly
    // ============================================================
    {
        name: 'idx_leagues_api_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_leagues_api_id ON V3_Leagues(api_id)',
        reason: 'Import resolution: SELECT league_id FROM V3_Leagues WHERE api_id = ?'
    },

    // ============================================================
    // V3_Venues (11K rows) — queried by api_id during import
    // ============================================================
    {
        name: 'idx_venues_api_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_venues_api_id ON V3_Venues(api_id)',
        reason: 'Import upserts: SELECT venue_id FROM V3_Venues WHERE api_id = ?'
    },

    // ============================================================
    // V3_Fixtures (503K rows) — queried by api_id for dedup
    // ============================================================
    {
        name: 'idx_fixtures_api_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_fixtures_api_id ON V3_Fixtures(api_id)',
        reason: 'Import dedup: SELECT fixture_id FROM V3_Fixtures WHERE api_id = ?'
    },
    {
        name: 'idx_fixtures_teams',
        sql: 'CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON V3_Fixtures(home_team_id, away_team_id)',
        reason: 'Club profile: fixtures for a specific team'
    },
    {
        name: 'idx_fixtures_round',
        sql: 'CREATE INDEX IF NOT EXISTS idx_fixtures_round ON V3_Fixtures(league_id, season_year, round)',
        reason: 'Season overview: fixtures by matchday/round'
    },

    // ============================================================
    // V3_Player_Stats (1.37M rows) — composite queries
    // ============================================================
    {
        name: 'idx_player_stats_player',
        sql: 'CREATE INDEX IF NOT EXISTS idx_player_stats_player ON V3_Player_Stats(player_id)',
        reason: 'Player profile: all stats for a player across seasons'
    },
    {
        name: 'idx_player_stats_league_season_goals',
        sql: 'CREATE INDEX IF NOT EXISTS idx_player_stats_league_season_goals ON V3_Player_Stats(league_id, season_year, goals_total DESC)',
        reason: 'Season overview: top scorers query (ORDER BY goals_total DESC)'
    },

    // ============================================================
    // V3_League_Seasons (3K rows) — small but frequently joined
    // ============================================================
    {
        name: 'idx_league_seasons_league',
        sql: 'CREATE INDEX IF NOT EXISTS idx_league_seasons_league ON V3_League_Seasons(league_id)',
        reason: 'Dashboard: seasons for a specific league'
    },

    // ============================================================
    // V3_Standings (31K rows) — queried with team_id
    // ============================================================
    {
        name: 'idx_standings_team',
        sql: 'CREATE INDEX IF NOT EXISTS idx_standings_team ON V3_Standings(team_id)',
        reason: 'Club profile: standings for a specific team'
    },

    // ============================================================
    // V3_Fixture_Events (1.18M rows) — only indexed by fixture_id
    // ============================================================
    {
        name: 'idx_fixture_events_player',
        sql: 'CREATE INDEX IF NOT EXISTS idx_fixture_events_player ON V3_Fixture_Events(player_id)',
        reason: 'Player profile: match events for a player'
    },

    // ============================================================
    // V3_Countries (243 rows) — tiny, but index for import lookups
    // ============================================================
    {
        name: 'idx_countries_name',
        sql: 'CREATE INDEX IF NOT EXISTS idx_countries_name ON V3_Countries(name)',
        reason: 'Import: country lookup by name'
    },

    // ============================================================
    // V3_Trophies — deduplicate the duplicate index
    // ============================================================
    // Note: idx_v3_trophies_player and idx_v3_trophies_player_id are duplicates.
    // We'll drop the redundant one.
];

const CLEANUP = [
    'DROP INDEX IF EXISTS idx_v3_trophies_player_id'  // duplicate of idx_v3_trophies_player
];

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🗂️  Database Index Migration');
    console.log('===========================\n');

    // Cleanup duplicates
    for (const sql of CLEANUP) {
        try {
            db.run(sql);
            console.log(`🧹 ${sql}`);
        } catch (e) {
            console.log(`⚠️  ${sql} — ${e.message}`);
        }
    }
    console.log('');

    // Add new indexes
    let created = 0;
    let skipped = 0;
    for (const idx of INDEXES) {
        try {
            // Check if it already exists
            const existing = db.exec(`SELECT 1 FROM sqlite_master WHERE type='index' AND name='${idx.name}'`);
            if (existing.length > 0 && existing[0].values.length > 0) {
                console.log(`⏭️  ${idx.name} — already exists`);
                skipped++;
                continue;
            }

            const start = Date.now();
            db.run(idx.sql);
            const elapsed = Date.now() - start;
            console.log(`✅ ${idx.name} (${elapsed}ms) — ${idx.reason}`);
            created++;
        } catch (e) {
            console.error(`❌ ${idx.name} — ${e.message}`);
        }
    }

    // Save
    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
    console.log('💾 Saving database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('✅ Done!');

    // Final index count
    const final = db.exec("SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND sql IS NOT NULL");
    console.log(`📈 Total indexes: ${final[0].values[0][0]}`);

    db.close();
}

run().catch(console.error);
