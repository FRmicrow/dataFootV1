import db from '../../config/database.js';

/**
 * US-1917: Odds Refinery Service
 * Transforms raw API-Football odds payloads into a normalized selection-based schema.
 */
class OddsRefineryService {
    /**
     * Refines and stores raw API odds response into normalized V3_Odds_Selections
     * @param {number} fixtureId 
     * @param {object} apiData Raw fixture odds object from API-Football (the element in 'response' array)
     * @param {number} targetBookmakerId Default 8 (Bet365)
     */
    refineAndStore(fixtureId, apiData, targetBookmakerId = 8) {
        if (!apiData || !apiData.bookmakers) {
            console.warn(`[Refinery] No bookmaker data for fixture ${fixtureId}`);
            return 0;
        }

        const bookmaker = apiData.bookmakers.find(b => b.id === targetBookmakerId);
        if (!bookmaker) {
            console.warn(`[Refinery] Target bookmaker ${targetBookmakerId} not found for fixture ${fixtureId}`);
            return 0;
        }

        let totalSaved = 0;
        // We use INSERT because PRIMARY KEY includes captured_at, allowing for trend tracking.
        const sql = `
            INSERT INTO V3_Odds_Selections (
                fixture_id, bookmaker_id, market_name, label, odd_value, handicap, captured_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        const dbConn = db.instance || db; // Handle better-sqlite3 instance wrapping if applicable

        for (const bet of bookmaker.bets) {
            const marketName = bet.name;
            for (const val of bet.values) {
                // Extract possible handicap from label if present (e.g. "Over 2.5" -> 2.5)
                const handicap = this._extractHandicap(val.value);

                try {
                    dbConn.prepare(sql).run([
                        fixtureId,
                        targetBookmakerId,
                        marketName,
                        val.value,
                        parseFloat(val.odd),
                        handicap
                    ]);
                    totalSaved++;
                } catch (e) {
                    console.error(`[Refinery] Error saving odd selection for fixture ${fixtureId}: ${e.message}`);
                }
            }
        }

        return totalSaved;
    }

    /**
     * Extracts numerical handicap from labels like "Over 2.5", "Home -1.5", etc.
     * @private
     */
    _extractHandicap(label) {
        if (!label) return null;
        // Regex to find numbers including decimals and signs
        // We look for patterns like " +1.5", " -0.5", " 2.5"
        const match = label.match(/[-+]?\d*\.?\d+/);
        return match ? parseFloat(match[0]) : null;
    }
}

export default new OddsRefineryService();
