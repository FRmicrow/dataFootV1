import db from '../../src/config/database.js';

/**
 * US_237: Tactical Data Integrity Suite
 * Scans for fixtures that are FT but missing FS or PS data.
 */
async function validateIntegrity() {
    console.log('🔍 Starting Tactical Data Integrity Scan...');

    // 1. Check Fixture Stats (FS)
    const missingFS = db.all(`
        SELECT f.fixture_id, f.api_id, l.name as league, f.season_year
        FROM V3_Fixtures f
        JOIN V3_Leagues l ON f.league_id = l.league_id
        LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Stats) fs ON f.fixture_id = fs.fixture_id
        WHERE f.status_short IN ('FT', 'AET', 'PEN')
        AND f.date < CURRENT_TIMESTAMP
        AND fs.fixture_id IS NULL
        LIMIT 100
    `);

    console.log(`\n📊 [FS] Fixture Stats Gaps: ${missingFS.length} (Sample of first 100)`);
    if (missingFS.length > 0) {
        console.table(missingFS.slice(0, 5).map(m => ({
            id: m.fixture_id,
            api: m.api_id,
            league: m.league,
            season: m.season_year
        })));
    }

    // 2. Check Player Stats (PS)
    const missingPS = db.all(`
        SELECT f.fixture_id, f.api_id, l.name as league, f.season_year
        FROM V3_Fixtures f
        JOIN V3_Leagues l ON f.league_id = l.league_id
        LEFT JOIN (SELECT DISTINCT fixture_id FROM V3_Fixture_Player_Stats) fps ON f.fixture_id = fps.fixture_id
        WHERE f.status_short IN ('FT', 'AET', 'PEN')
        AND f.date < CURRENT_TIMESTAMP
        AND fps.fixture_id IS NULL
        LIMIT 100
    `);

    console.log(`\n🏃 [PS] Player Stats Gaps: ${missingPS.length} (Sample of first 100)`);
    if (missingPS.length > 0) {
        console.table(missingPS.slice(0, 5).map(m => ({
            id: m.fixture_id,
            api: m.api_id,
            league: m.league,
            season: m.season_year
        })));
    }

    // 3. Normalization Health
    const missingNorm = db.all(`
        SELECT DISTINCT l.name as league, s.season_year
        FROM V3_League_Seasons s
        JOIN V3_Leagues l ON s.league_id = l.league_id
        WHERE s.imported_player_stats = 1
        AND NOT EXISTS (
            SELECT 1 FROM V3_Player_Season_Stats ns 
            WHERE ns.league_id = s.league_id AND ns.season_year = s.season_year
        )
    `);

    console.log(`\n🧮 [NORM] Pending Normalizations: ${missingNorm.length}`);
    if (missingNorm.length > 0) {
        console.table(missingNorm);
    }

    console.log('\n✅ Integrity Scan Complete.');
}

validateIntegrity().catch(console.error);
