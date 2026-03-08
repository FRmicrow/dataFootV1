
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

const selectBestBookmaker = (bookmakers) => {
    let selected = bookmakers.find(b => PREFERRED_BOOKMAKERS.includes(b.id));
    return selected || bookmakers[0];
};

const parseMarkets = (selectedBk) => {
    const m1n2 = selectedBk.bets.find(b => b.id === MARKET_1N2);
    const home = m1n2?.values.find(v => v.value === 'Home')?.odd;
    const draw = m1n2?.values.find(v => v.value === 'Draw')?.odd;
    const away = m1n2?.values.find(v => v.value === 'Away')?.odd;

    const mGoals = selectedBk.bets.find(b => b.id === MARKET_GOALS_OU);
    const over = mGoals?.values.find(v => v.value === 'Over 2.5')?.odd;
    const under = mGoals?.values.find(v => v.value === 'Under 2.5')?.odd;

    return { home, draw, away, over, under };
};

const saveOddsToDb = (fixtureId, bkId, data) => {
    const { home, draw, away, over, under } = data;
    if (home && away) {
        db.run(`INSERT OR REPLACE INTO V3_Odds (fixture_id, bookmaker_id, market_id, value_home_over, value_draw, value_away_under)
                VALUES (?, ?, ?, ?, ?, ?)`, [fixtureId, bkId, MARKET_1N2, home, draw, away]);
    }
    if (over && under) {
        db.run(`INSERT OR REPLACE INTO V3_Odds (fixture_id, bookmaker_id, market_id, value_home_over, value_away_under, handicap_value)
                VALUES (?, ?, ?, ?, ?, ?)`, [fixtureId, bkId, MARKET_GOALS_OU, over, under, 2.5]);
    }
};

const processFixture = async (fixture) => {
    console.log(`Processing ${fixture.fixture_id} (${fixture.date})...`);
    try {
        const res = await footballApi.getOdds({ fixture: fixture.fixture_id });
        const oddsData = res.response?.[0];
        const bookmakers = oddsData?.bookmakers;

        if (!bookmakers || bookmakers.length === 0) {
            console.log(`   ⚠️ No odds for ${fixture.fixture_id}. Marking has_odds = -1.`);
            db.run("UPDATE V3_Fixtures SET has_odds = -1 WHERE fixture_id = ?", [fixture.fixture_id]);
            return;
        }

        const selectedBk = selectBestBookmaker(bookmakers);
        console.log(`   ✅ Using Bookmaker: ${selectedBk.name}`);
        const data = parseMarkets(selectedBk);
        saveOddsToDb(fixture.fixture_id, selectedBk.id, data);
        db.run("UPDATE V3_Fixtures SET has_odds = 1 WHERE fixture_id = ?", [fixture.fixture_id]);
        console.log(`   🎉 Saved odds for Match ${fixture.fixture_id}`);
    } catch (err) {
        console.error(`   ❌ Error processing fixture ${fixture.fixture_id}:`, err.message);
    }
};

const run = async () => {
    console.log("🔌 Connecting to DB...");
    await db.init();
    try {
        const sql = `SELECT fixture_id, date, home_team_id, away_team_id FROM V3_Fixtures
                     WHERE status_short IN ('FT', 'AET', 'PEN') AND (has_odds IS NULL OR has_odds = 0)
                     ORDER BY date DESC LIMIT ?`;
        const fixtures = db.all(sql, [BATCH_SIZE]);

        if (fixtures.length === 0) {
            console.log("✅ No pending fixtures found for odds backfill.");
            return;
        }

        console.log(`🎯 Found ${fixtures.length} fixtures to process.`);
        for (const fixture of fixtures) {
            await processFixture(fixture);
            await sleep(DELAY_MS);
        }
    } catch (err) {
        console.error("Critical Script Error:", err);
    }
};

run();
