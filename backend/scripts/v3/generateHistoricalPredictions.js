import db from '../../src/config/database.js';
import mlService from '../../src/services/v3/mlService.js';
import probabilityService from '../../src/services/v3/probabilityService.js';
import QuantService from '../../src/services/v3/quantService.js';

const leagueId = 39; // Premier League

async function run() {
    await db.init();

    console.log(`🚀 Generating historical predictions for league ${leagueId}...`);

    // 1. Get all matches in the league that have features and odds and are settled
    const sql = `
        SELECT f.fixture_id, f.league_id, o.value_home_over, o.value_draw, o.value_away_under
        FROM V3_Fixtures f
        JOIN V3_ML_Feature_Store fs ON f.fixture_id = fs.fixture_id
        JOIN V3_Odds o ON f.fixture_id = o.fixture_id AND o.bookmaker_id = 1 AND o.market_id = 1
        WHERE f.league_id = ? AND f.status_short IN ('FT', 'AET', 'PEN')
        LIMIT 200
    `;

    const matches = db.all(sql, [leagueId]);
    console.log(`   Found ${matches.length} matches to process.`);

    for (const m of matches) {
        try {
            // Get prediction
            const prediction = await mlService.getPredictionForFixture(m.fixture_id);
            if (!prediction || !prediction.probabilities) continue;

            // Calculate edge
            const marketOdds = {
                home: m.value_home_over,
                draw: m.value_draw,
                away: m.value_away_under
            };
            const fairMarket = probabilityService.calculateFairProbabilities(marketOdds);
            if (!fairMarket) continue;

            const quant = QuantService.calculateValue(prediction.probabilities, fairMarket.probabilities, {
                leagueHistoryCount: 50 // Dummy for backtest
            });

            // Persist
            db.run(`
                INSERT INTO V3_Predictions (fixture_id, league_id, prob_home, prob_draw, prob_away, edge_value, confidence_score, risk_level)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(fixture_id) DO UPDATE SET
                    prob_home = excluded.prob_home,
                    prob_draw = excluded.prob_draw,
                    prob_away = excluded.prob_away,
                    edge_value = excluded.edge_value,
                    confidence_score = excluded.confidence_score,
                    risk_level = excluded.risk_level
            `, [
                m.fixture_id,
                m.league_id,
                prediction.probabilities.home.toString(),
                prediction.probabilities.draw.toString(),
                prediction.probabilities.away.toString(),
                quant.edge,
                quant.confidence,
                quant.risk_level
            ]);

            process.stdout.write('.');
        } catch (err) {
            console.error(`\n❌ Error on fixture ${m.fixture_id}:`, err.message);
        }
    }

    console.log(`\n✅ Finished generating predictions.`);
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
