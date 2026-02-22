import db from '../../config/database.js';

/**
 * US_042: Database Integrity Audit & Discovery Scan
 * Scans V3_League_Seasons and cross-checks with data tables to backfill status flags.
 */
export const performDiscoveryScan = async () => {
    console.log('🔍 Starting Database Discovery Scan...');
    const seasons = db.all("SELECT * FROM V3_League_Seasons");
    let updatedCount = 0;

    for (const season of seasons) {
        const { league_id, season_year, league_season_id } = season;
        let updates = [];
        let params = [];

        // 1. Audit Fixtures (Core)
        const fixtureCount = db.get(
            "SELECT COUNT(*) as count FROM V3_Fixtures WHERE league_id = ? AND season_year = ?",
            [league_id, season_year]
        ).count;

        if (fixtureCount > 0 && !season.imported_fixtures) {
            updates.push("imported_fixtures = 1, last_sync_core = CURRENT_TIMESTAMP");
        }

        // 2. Audit Events
        const eventCount = db.get(`
            SELECT COUNT(*) as count 
            FROM V3_Fixture_Events e
            JOIN V3_Fixtures f ON e.fixture_id = f.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
        `, [league_id, season_year]).count;

        if (eventCount > 0 && !season.imported_events) {
            updates.push("imported_events = 1, last_sync_events = CURRENT_TIMESTAMP");
        }

        // 3. Audit Lineups
        const lineupCount = db.get(`
            SELECT COUNT(*) as count 
            FROM V3_Fixture_Lineups l
            JOIN V3_Fixtures f ON l.fixture_id = f.fixture_id
            WHERE f.league_id = ? AND f.season_year = ?
        `, [league_id, season_year]).count;

        if (lineupCount > 0 && !season.imported_lineups) {
            updates.push("imported_lineups = 1, last_sync_lineups = CURRENT_TIMESTAMP");
        }

        // 4. Audit Trophies (Simple check: do any players in this league/season have trophies synced?)
        // This is a bit complex, but for now let's just check if any player in V3_Players has is_trophy_synced = 1
        // Actually, the AC says cross-check V3_Fixtures, V3_Events, V3_Lineups. 
        // Trophies are harder to link to a season unless we look at player stats for that season.
        // Let's stick to the 3 pillars mentioned in AC first.

        if (updates.length > 0) {
            const sql = `UPDATE V3_League_Seasons SET ${updates.join(', ')} WHERE league_season_id = ?`;
            db.run(sql, [league_season_id]);
            updatedCount++;
        }
    }

    console.log(`✅ Discovery Scan Complete. Updated ${updatedCount} seasons.`);
    return {
        scanned: seasons.length,
        updated: updatedCount,
        timestamp: new Date().toISOString()
    };
};
