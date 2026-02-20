
import footballApi from '../services/footballApi.js';

const run = async () => {
    try {
        const fixtureId = 1379231; // Chelsea vs Burnley (Future)
        console.log(`Checking Details for Match ${fixtureId}...`);

        const [
            predictionsRes,
            lineupsRes,
            oddsRes,
            h2hRes // Check specifically if H2H works
        ] = await Promise.all([
            footballApi.getPredictions(fixtureId),
            footballApi.getFixtureLineups(fixtureId),
            footballApi.getOdds({ fixture: fixtureId }),
            footballApi.getHeadToHead(49, 44) // Chelsea (49) vs Burnley (44) - guessing IDs 
        ]);

        console.log("Predictions:", predictionsRes.results > 0 ? "✅ OK" : "❌ Empty");
        console.log("Lineups:", lineupsRes.results > 0 ? "✅ OK (Official)" : "⚠️ Empty (Expected for future)");
        console.log("Odds:", oddsRes.results > 0 ? "✅ OK" : "❌ Empty");

    } catch (err) {
        console.error("Test Error:", err);
    }
};

run();
