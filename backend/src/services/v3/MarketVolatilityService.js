import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import logger from '../../utils/logger.js';

/**
 * Market Volatility Service (US_142)
 * Detects "Steam" and market trends by tracking odds history.
 */
export class MarketVolatilityService {
    /**
     * Records a historical snapshot of all current odds for a fixture.
     */
    static async captureSnapshot(fixtureId) {
        logger.info(`📸 [US_142] Capturing odds snapshot for fixture ${fixtureId}...`);

        const lastSnapshot = await db.get("SELECT * FROM V3_Odds_History WHERE fixture_id = ? ORDER BY capture_timestamp DESC LIMIT 1", cleanParams([fixtureId]));

        const currentOdds = await db.all("SELECT * FROM V3_Odds WHERE fixture_id = ?", cleanParams([fixtureId]));

        if (currentOdds.length === 0) {
            logger.warn(`   ⚠️ No current odds found in V3_Odds for fixture ${fixtureId}. Skipping snapshot.`);
            return;
        }

        // Optimization: Skip if identical to last snapshot
        if (lastSnapshot) {
            const currentMain = currentOdds.find(o => o.market_id === 1); // Check Match Winner as proxy
            if (currentMain &&
                currentMain.value_home_over === lastSnapshot.value_home_over &&
                currentMain.value_draw === lastSnapshot.value_draw &&
                currentMain.value_away_under === lastSnapshot.value_away_under) {
                logger.info(`   ⏭️ Snapshot identical to last one. Skipping.`);
                return;
            }
        }

        const sql = `
            INSERT INTO V3_Odds_History (
                fixture_id, bookmaker_id, market_id, 
                value_home_over, value_draw, value_away_under, 
                handicap_value
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        for (const row of currentOdds) {
            await db.run(sql, cleanParams([
                row.fixture_id,
                row.bookmaker_id,
                row.market_id,
                row.value_home_over,
                row.value_draw,
                row.value_away_under,
                row.handicap_value
            ]));
        }

        logger.info(`   ✅ Snapshot captured for ${currentOdds.length} markets.`);
    }

    /**
     * Analyzes volatility for a specific market (e.g., Match Winner = 1)
     */
    static async getVolatilityReport(fixtureId, marketId = 1) {
        // Selection logic: Which bookmaker's history should we analyze? (US_175)
        // We look for history specifically for prioritized bookies
        const historyRows = await db.all(`
            SELECT DISTINCT bookmaker_id FROM V3_Odds_History 
            WHERE fixture_id = ? AND market_id = ?
        `, cleanParams([fixtureId, marketId]));

        if (historyRows.length === 0) return null;

        const availableIds = historyRows.map(r => r.bookmaker_id);
        const bestId = [52, 11].find(id => availableIds.includes(id)) || availableIds[0];

        const history = await db.all(`
            SELECT * FROM V3_Odds_History 
            WHERE fixture_id = ? AND market_id = ? AND bookmaker_id = ?
            ORDER BY capture_timestamp ASC
        `, cleanParams([fixtureId, marketId, bestId]));

        if (history.length < 2) return null;

        const opening = history[0];
        const current = history[history.length - 1];

        const calculateChange = (ov, cv) => {
            if (!ov || !cv) return 0;
            return Math.round(((cv - ov) / ov) * 100);
        };

        const movement = {
            home_over: calculateChange(opening.value_home_over, current.value_home_over),
            draw: calculateChange(opening.value_draw, current.value_draw),
            away_under: calculateChange(opening.value_away_under, current.value_away_under),
            is_steam: false,
            signal: 'Stable'
        };

        // If any side has dropped by > 10%, mark as "Steam"
        // Note: In betting, dropping odds means "Steam" (more money on that side)
        const THRESHOLD = -10;
        if (movement.home_over <= THRESHOLD || movement.draw <= THRESHOLD || movement.away_under <= THRESHOLD) {
            movement.is_steam = true;
            movement.signal = '🔥 SHARP STEAM DETECTED';
        } else if (movement.home_over >= 10 || movement.draw >= 10 || movement.away_under >= 10) {
            movement.signal = '❄️ MARKET DRIFTING';
        }

        return {
            opening_line: {
                home: opening.value_home_over,
                draw: opening.value_draw,
                away: opening.value_away_under,
                timestamp: opening.capture_timestamp
            },
            current_line: {
                home: current.value_home_over,
                draw: current.value_draw,
                away: current.value_away_under,
                timestamp: current.capture_timestamp
            },
            movement
        };
    }

    /**
     * Background Task: Snapshots all upcoming fixtures in tracked leagues.
     */
    static async runGlobalSnapshot() {
        logger.info("🕒 [US_142] Starting Global Odds Snapshot Task...");

        const trackedLeaguesRaw = (await db.get("SELECT tracked_leagues FROM V3_System_Preferences LIMIT 1"))?.tracked_leagues || '[]';
        const trackedLeagues = JSON.parse(trackedLeaguesRaw);

        let leagueFilter = "";
        if (trackedLeagues.length > 0) {
            const ids = trackedLeagues.join(',');
            leagueFilter = `AND league_id IN (${ids})`;
        } else {
            logger.info("   ℹ️ No tracked leagues found. Snapshotting all upcoming fixtures.");
        }

        // Get upcoming fixtures (next 48h)
        const upcoming = await db.all(`
            SELECT fixture_id 
            FROM V3_Fixtures 
            WHERE date > CURRENT_TIMESTAMP
              AND date < (CURRENT_TIMESTAMP + INTERVAL '2 days')
              ${leagueFilter}
        `);

        logger.info(`   🔎 Found ${upcoming.length} upcoming fixtures to snapshot.`);

        for (const f of upcoming) {
            await this.captureSnapshot(f.fixture_id);
        }

        logger.info("✅ [US_142] Global Snapshot Task Complete.");
    }
}

export default MarketVolatilityService;
