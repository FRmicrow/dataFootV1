import db from '../../config/database.js';
import bulkOddsService from './bulkOddsService.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

/**
 * Odds Sync Service (US-1915)
 * Specialized service to sync upcoming odds and reconcile with ML Risk Analysis.
 */

export const syncUpcomingOdds = async () => {
    console.log("🔄 [US-1915] Starting Upcoming Odds Synchronization...");

    try {
        // 1. Fetch upcoming fixtures (next 7 days) that are Not Started
        const fixtures = db.all(`
            SELECT fixture_id 
            FROM V3_Fixtures 
            WHERE status_short = 'NS' 
              AND date >= date('now') 
              AND date <= date('now', '+7 days')
            LIMIT 50
        `);

        if (fixtures.length === 0) {
            console.log("ℹ️ [US-1915] No upcoming matches to sync odds for.");
            return { success: true, count: 0, message: "No upcoming matches found in window." };
        }

        console.log(`🔍 Found ${fixtures.length} upcoming fixtures to sync.`);

        let syncedCount = 0;
        for (const f of fixtures) {
            try {
                // Reuse bulkOddsService to fetch and persist into V3_Odds & V3_Odds_History
                const res = await bulkOddsService.ingestMultiMarketOdds(f.fixture_id);
                if (res.success) syncedCount++;
            } catch (e) {
                console.warn(`⚠️ Failed to sync odds for fixture ${f.fixture_id}: ${e.message}`);
            }
        }

        // 2. Reconcile with V3_Risk_Analysis
        console.log("⚖️ [US-1915] Reconciling V3_Risk_Analysis with new odds...");
        const reconciled = await reconcileRiskWithOdds();

        console.log(`✅ [US-1915] Synchronization completed. ${syncedCount} fixtures updated. ${reconciled} risk rows reconciled.`);
        return { success: true, count: syncedCount, reconciled_rows: reconciled };

    } catch (err) {
        console.error("❌ [US-1915] Odds Synchronization Critical Error:", err);
        throw err;
    }
};

/**
 * Maps the persisted V3_Odds markets back to V3_Risk_Analysis selections
 */
export const reconcileRiskWithOdds = async () => {
    // We map only supported ML markets for now: 1N2_FT, 1N2_HT

    // 1. 1N2_FT (Market ID 1)
    const ftOdds = db.all(`
        SELECT fixture_id, value_home_over, value_draw, value_away_under 
        FROM V3_Odds 
        WHERE market_id = 1
    `);

    // 2. 1N2_HT (Market ID 10)
    const htOdds = db.all(`
        SELECT fixture_id, value_home_over, value_draw, value_away_under 
        FROM V3_Odds 
        WHERE market_id = 10
    `);

    let count = 0;
    for (const o of ftOdds) {
        updateSelectionOdd(o.fixture_id, '1N2_FT', '1', o.value_home_over);
        updateSelectionOdd(o.fixture_id, '1N2_FT', 'N', o.value_draw);
        updateSelectionOdd(o.fixture_id, '1N2_FT', '2', o.value_away_under);
        count++;
    }

    for (const o of htOdds) {
        updateSelectionOdd(o.fixture_id, '1N2_HT', '1', o.value_home_over);
        updateSelectionOdd(o.fixture_id, '1N2_HT', 'N', o.value_draw);
        updateSelectionOdd(o.fixture_id, '1N2_HT', '2', o.value_away_under);
        count++;
    }

    return count;
};

const updateSelectionOdd = (fixtureId, marketType, selection, odd) => {
    if (!odd) return;

    db.run(`
        UPDATE V3_Risk_Analysis 
        SET bookmaker_odd = ?,
            edge = CASE 
                WHEN fair_odd > 0 THEN ((1.0 / fair_odd) - (1.0 / ?)) * 100 
                ELSE 0 
            END
        WHERE fixture_id = ? AND market_type = ? AND selection = ?
    `, [odd, odd, fixtureId, marketType, selection]);
};

export default {
    syncUpcomingOdds,
    reconcileRiskWithOdds
};
