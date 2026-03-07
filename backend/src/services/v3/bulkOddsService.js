import db from '../../config/database.js';
import footballApi from '../footballApi.js';
import { BOOKMAKER_PRIORITY } from '../../config/betting.js';
import MarketVolatilityService from './MarketVolatilityService.js';

/**
 * Bulk Odds Service (US_140)
 * Handles depth ingestion of multiple betting markets.
 */

const TARGET_BET_IDS = [1, 3, 5, 8, 10, 12, 4];

/**
 * Maps API odd values to V3_Odds database columns
 */
const mapToOddsRow = (fixtureId, bookmakerId, marketId, marketValues) => {
    let homeOver = null;
    let draw = null;
    let awayUnder = null;
    let handicap = null;

    // Helper to find odd by value label
    const findOdd = (label) => marketValues.find(v => v.value === label)?.odd;

    switch (marketId) {
        case 1: // Match Winner
        case 10: // First Half Winner
        case 3: // Second Half Winner
            homeOver = findOdd('Home');
            draw = findOdd('Draw');
            awayUnder = findOdd('Away');
            break;

        case 5: // Goals Over/Under
            // We specifically look for the standard 2.5 line for depth ingestion
            const over25 = marketValues.find(v => v.value === 'Over 2.5');
            const under25 = marketValues.find(v => v.value === 'Under 2.5');
            if (over25 && under25) {
                homeOver = over25.odd;
                awayUnder = under25.odd;
                handicap = 2.5;
            }
            break;

        case 8: // Both Teams to Score
            homeOver = findOdd('Yes');
            awayUnder = findOdd('No');
            break;

        case 12: // Double Chance
            homeOver = findOdd('Home/Draw');
            draw = findOdd('Home/Away');
            awayUnder = findOdd('Draw/Away');
            break;

        case 4: // Asian Handicap
            // Take the first line as a representative "Depth" value if present
            // e.g., Value: "Home -0.5", Value: "Away +0.5"
            const homeAH = marketValues.find(v => v.value.startsWith('Home'));
            const awayAH = marketValues.find(v => v.value.startsWith('Away'));
            if (homeAH && awayAH) {
                homeOver = homeAH.odd;
                awayUnder = awayAH.odd;
                // Extract handicap from "Home -0.5" -> -0.5
                const hVal = homeAH.value.split(' ')[1];
                handicap = parseFloat(hVal);
            }
            break;

        default:
            return null;
    }

    if (homeOver || draw || awayUnder) {
        return {
            fixture_id: fixtureId,
            bookmaker_id: bookmakerId,
            market_id: marketId,
            value_home_over: homeOver,
            value_draw: draw,
            value_away_under: awayUnder,
            handicap_value: handicap
        };
    }
    return null;
};

/**
 * Ingests odds for a specific fixture and multiple markets
 */
export const ingestMultiMarketOdds = async (fixtureId) => {
    console.log(`📡 [US_140] Depth fetching odds for fixture ${fixtureId}...`);

    try {
        // Fetch the external api_id from DB if not already provided
        const fixture = await db.get("SELECT api_id FROM V3_Fixtures WHERE fixture_id = ?", [fixtureId]);
        if (!fixture || !fixture.api_id) {
            console.error(`❌ [US_140] Fixture ${fixtureId} not found or missing api_id`);
            return { success: false, reason: 'fixture_not_found' };
        }

        const response = await footballApi.getOdds({ fixture: fixture.api_id });
        const data = response.response?.[0];
        if (!data || !data.bookmakers?.length) {
            return { success: false, reason: 'no_odds_available' };
        }

        // Selection logic: Strict Hierarchy based on Config (US_175)
        let bookmaker = data.bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[0].id) ||
            data.bookmakers.find(b => b.id === BOOKMAKER_PRIORITY[1].id) ||
            data.bookmakers[0];

        console.log(`   🎯 Selected Bookmaker: ${bookmaker.name} (ID: ${bookmaker.id})`);

        let savedCount = 0;
        const sql = `
            INSERT INTO V3_Odds (
                fixture_id, bookmaker_id, market_id, 
                value_home_over, value_draw, value_away_under, 
                handicap_value, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
            ON CONFLICT (fixture_id, bookmaker_id, market_id, handicap_value)
            DO UPDATE SET 
                value_home_over = EXCLUDED.value_home_over,
                value_draw = EXCLUDED.value_draw,
                value_away_under = EXCLUDED.value_away_under,
                updated_at = CURRENT_TIMESTAMP
        `;

        for (const bet of bookmaker.bets) {
            if (TARGET_BET_IDS.includes(bet.id)) {
                const row = mapToOddsRow(fixtureId, bookmaker.id, bet.id, bet.values);
                if (row) {
                    await db.run(sql, [
                        row.fixture_id,
                        row.bookmaker_id,
                        row.market_id,
                        row.value_home_over,
                        row.value_draw,
                        row.value_away_under,
                        row.handicap_value
                    ]);
                    savedCount++;
                }
            }
        }

        // Mark fixture as having odds
        await db.run("UPDATE V3_Fixtures SET has_odds = 1 WHERE fixture_id = ?", [fixtureId]);

        // US_142: Odds Volatility Tracking - Capture history snapshot
        await MarketVolatilityService.captureSnapshot(fixtureId);

        console.log(`✅ [US_140] Saved ${savedCount} markets for fixture ${fixtureId} (${bookmaker.name})`);
        return { success: true, count: savedCount, bookmaker: bookmaker.name };

    } catch (err) {
        console.error(`❌ [US_140] Error ingesting multi-market odds for ${fixtureId}:`, err.message);
        throw err;
    }
};

/**
 * Bulk ingestion for all upcoming matches on a specific date
 */
export const bulkIngestOddsByDate = async (date) => {
    console.log(`🚀 [US_140] Bulk Ingestion started for date: ${date}`);

    // 1. Find fixtures for this date in local DB that are NOT finished
    const fixtures = await db.all(`
        SELECT fixture_id 
        FROM V3_Fixtures 
        WHERE date LIKE ? 
          AND status_short NOT IN ('FT', 'AET', 'PEN')
    `, [`${date}%`]);

    console.log(`🔍 Found ${fixtures.length} fixtures to process depth ingestion.`);

    const results = [];
    for (const f of fixtures) {
        try {
            const res = await ingestMultiMarketOdds(f.fixture_id);
            results.push({ id: f.fixture_id, ...res });
        } catch (e) {
            results.push({ id: f.fixture_id, success: false, error: e.message });
        }
    }

    return {
        total: fixtures.length,
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
    };
};

export default {
    ingestMultiMarketOdds,
    bulkIngestOddsByDate
};
