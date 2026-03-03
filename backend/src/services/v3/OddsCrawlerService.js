import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import OddsRefineryService from './OddsRefineryService.js';

/**
 * US-1917: Odds Crawler Service
 * Orchestrates historical catch-up and upcoming snapshots of market odds.
 */
class OddsCrawlerService {
    /**
     * Catch-up: Syncs closing odds for recently finished fixtures (last 7 days window).
     * Helps build the initial training history.
     */
    async runHistoricalCatchup() {
        console.log('🚀 [Crawler] Starting Historical Odds Catch-up...');

        // 1. Find fixtures finished in the last 7 days that don't have normalized odds yet
        // and have not been synced in the last 30 days (idempotence)
        const fixtures = db.all(`
            SELECT fixture_id, api_id, date
            FROM V3_Fixtures
            WHERE status_short IN ('FT', 'AET', 'PEN')
              AND date > datetime('now', '-7 days')
              AND odds_last_sync IS NULL
            ORDER BY date DESC
        `);

        if (fixtures.length === 0) {
            console.log('✨ [Crawler] No finished fixtures pending historical catch-up.');
            return { total: 0, processed: 0 };
        }

        console.log(`🔍 [Crawler] Found ${fixtures.length} finished fixtures for catch-up.`);

        let processedCount = 0;
        let skipCount = 0;

        for (const f of fixtures) {
            const success = await this._syncFixtureOdds(f.fixture_id, f.api_id);
            if (success) processedCount++;
            else skipCount++;

            // Respect API-football rate limits (standard is 10/min or more, but we stay safe)
            await new Promise(r => setTimeout(r, 150));
        }

        console.log(`✅ [Crawler] Catch-up finished. Processed: ${processedCount}, Skipped/Failed: ${skipCount}`);
        return { total: fixtures.length, processed: processedCount, skipped: skipCount };
    }

    /**
     * Upcoming: Syncs odds for matches in the next 14 days.
     * Builds the trend/line-movement data.
     */
    async runUpcomingSync() {
        console.log('🚀 [Crawler] Starting Upcoming Odds Sync (Market Trend)...');

        // Find upcoming matches in the next 14 days
        // We allow multiple syncs for trend tracking, but we limit to once every 6h per fixture
        const fixtures = db.all(`
            SELECT fixture_id, api_id, date
            FROM V3_Fixtures
            WHERE status_short = 'NS'
              AND date BETWEEN datetime('now') AND datetime('now', '+14 days')
              AND (odds_last_sync IS NULL OR odds_last_sync < datetime('now', '-6 hours'))
            ORDER BY date ASC
        `);

        if (fixtures.length === 0) {
            console.log('✨ [Crawler] No upcoming fixtures need snapshotting right now.');
            return { total: 0, processed: 0 };
        }

        console.log(`🔍 [Crawler] Found ${fixtures.length} upcoming fixtures for trend update.`);

        let processedCount = 0;
        for (const f of fixtures) {
            const success = await this._syncFixtureOdds(f.fixture_id, f.api_id);
            if (success) processedCount++;
            await new Promise(r => setTimeout(r, 150));
        }

        console.log(`✅ [Crawler] Upcoming sync finished. Snapshots taken: ${processedCount}`);
        return { total: fixtures.length, processed: processedCount };
    }

    /**
     * Performs actual API call and refinery storage
     * @private
     */
    async _syncFixtureOdds(fixtureId, apiId) {
        try {
            // US-1917: We call the specific fixture odds endpoint
            const response = await footballApi.getOdds({ fixture: apiId });
            const records = response.response?.[0]; // API-football returns an array with one element for fixture query

            if (records) {
                const count = OddsRefineryService.refineAndStore(fixtureId, records);
                // Mark as synced with timestamp to respect idempotence/frequency
                db.run("UPDATE V3_Fixtures SET odds_last_sync = CURRENT_TIMESTAMP WHERE fixture_id = ?", [fixtureId]);
                return count > 0;
            } else {
                // If API returns no odds (common for very minor leagues or far in future)
                // We still mark it as "attempted" to avoid hammering the API
                db.run("UPDATE V3_Fixtures SET odds_last_sync = CURRENT_TIMESTAMP WHERE fixture_id = ?", [fixtureId]);
                return false;
            }
        } catch (err) {
            console.error(`❌ [Crawler] Failed to sync fixture ${fixtureId} (API ID ${apiId}): ${err.message}`);
            return false;
        }
    }
}

export default new OddsCrawlerService();
