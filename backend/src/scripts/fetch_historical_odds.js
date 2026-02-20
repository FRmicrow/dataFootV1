
import db from '../config/database.js';
import footballApi from '../services/footballApi.js';

// Configuration
const BATCH_SIZE = 20;
const DELAY_MS = 1000; // 1 second between calls to be safe

// Market IDs
const MARKET_1N2 = 1;
const MARKET_GOALS_OU = 5;

// Bookmaker IDs
const BK_WINAMAX = 52;
const BK_UNIBET = 11;
const PREFERRED_BOOKMAKERS = [BK_WINAMAX, BK_UNIBET];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const run = async () => {
    console.log("🔌 Connecting to DB...");
    await db.init();

    try {
        // 1. Find Fixtures needing odds
        // We prioritize recent matches (DESC date) to fill the dashboard history first.
        const sql = `
            SELECT fixture_id, date, home_team_id, away_team_id
            FROM V3_Fixtures
            WHERE status_short IN ('FT', 'AET', 'PEN') 
            AND (has_odds IS NULL OR has_odds = 0)
            ORDER BY date DESC
            LIMIT ?
        `;
        const fixtures = db.all(sql, [BATCH_SIZE]);

        if (fixtures.length === 0) {
            console.log("✅ No pending fixtures found for odds backfill.");
            return;
        }

        console.log(`🎯 Found ${fixtures.length} fixtures to process.`);

        for (const fixture of fixtures) {
            console.log(`Processing ${fixture.fixture_id} (${fixture.date})...`);

            try {
                // 2. Fetch API
                const res = await footballApi.getOdds({ fixture: fixture.fixture_id });

                if (!res.response || res.response.length === 0) {
                    console.log(`   ⚠️ No odds available for ${fixture.fixture_id}. Marking has_odds = -1.`);
                    db.run("UPDATE V3_Fixtures SET has_odds = -1 WHERE fixture_id = ?", [fixture.fixture_id]);
                    await sleep(DELAY_MS);
                    continue;
                }

                const oddsData = res.response[0];
                const bookmakers = oddsData.bookmakers;

                if (!bookmakers || bookmakers.length === 0) {
                    console.log(`   ⚠️ No bookmakers for ${fixture.fixture_id}. Marking has_odds = -1.`);
                    db.run("UPDATE V3_Fixtures SET has_odds = -1 WHERE fixture_id = ?", [fixture.fixture_id]);
                    await sleep(DELAY_MS);
                    continue;
                }

                // 3. Select Best Bookmaker
                let selectedBk = bookmakers.find(b => PREFERRED_BOOKMAKERS.includes(b.id));
                if (!selectedBk) selectedBk = bookmakers[0]; // Fallback to first

                console.log(`   ✅ Using Bookmaker: ${selectedBk.name} (ID: ${selectedBk.id})`);

                // 4. Parse Markets
                // 1N2
                const m1n2 = selectedBk.bets.find(b => b.id === MARKET_1N2);
                let home = null, draw = null, away = null;
                if (m1n2) {
                    home = m1n2.values.find(v => v.value === 'Home')?.odd;
                    draw = m1n2.values.find(v => v.value === 'Draw')?.odd;
                    away = m1n2.values.find(v => v.value === 'Away')?.odd;
                }

                // Over/Under 2.5
                const mGoals = selectedBk.bets.find(b => b.id === MARKET_GOALS_OU);
                let over = null, under = null;
                if (mGoals) {
                    over = mGoals.values.find(v => v.value === 'Over 2.5')?.odd;
                    under = mGoals.values.find(v => v.value === 'Under 2.5')?.odd;
                }

                // 5. Insert to DB
                /* 
                   Schema: fixture_id, bookmaker_id, market_id, value_home_over, value_draw, value_away_under
                   We insert TWO rows: one for 1N2, one for O/U 2.5
                */

                // 1N2 Insert
                if (home && away) {
                    db.run(`
                        INSERT OR REPLACE INTO V3_Odds (fixture_id, bookmaker_id, market_id, value_home_over, value_draw, value_away_under)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [fixture.fixture_id, selectedBk.id, MARKET_1N2, home, draw, away]);
                }

                // O/U Insert
                if (over && under) {
                    db.run(`
                        INSERT OR REPLACE INTO V3_Odds (fixture_id, bookmaker_id, market_id, value_home_over, value_away_under, handicap_value)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [fixture.fixture_id, selectedBk.id, MARKET_GOALS_OU, over, under, 2.5]);
                }

                // 6. Update Flag
                db.run("UPDATE V3_Fixtures SET has_odds = 1 WHERE fixture_id = ?", [fixture.fixture_id]);
                console.log(`   🎉 Saved odds for Match ${fixture.fixture_id}`);


            } catch (err) {
                console.error(`   ❌ Error processing fixture ${fixture.fixture_id}:`, err.message);
                // Don't mark as processed, retry later
            }

            await sleep(DELAY_MS);
        }

    } catch (err) {
        console.error("Critical Script Error:", err);
    }
};

run();
