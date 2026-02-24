import db from '../config/database.js';

const run = async () => {
    console.log("Generating mock predictions for backtest testing...");
    try {
        // Find some recently settled fixtures
        const fixtures = db.all(`
            SELECT fixture_id, league_id, home_team, away_team, date
            FROM v_market_settlements
            WHERE res_1n2 IS NOT NULL
            ORDER BY date DESC
            LIMIT 500
        `);
        
        console.log(`Found ${fixtures.length} settled fixtures. Generating predictions...`);
        
        let inserted = 0;
        fixtures.forEach(f => {
            // Generate some random but plausible mock predictions
            // 60% chance the model predicts the home team
            let probHome, probDraw, probAway;
            let advice, underOver;
            
            const rand = Math.random();
            if (rand < 0.6) {
                probHome = 0.55 + (Math.random() * 0.2);
                probDraw = 0.15 + (Math.random() * 0.1);
                probAway = 1.0 - probHome - probDraw;
                advice = `Back ${f.home_team} to Win`;
                underOver = "Over 1.5 Goals";
            } else if (rand < 0.8) {
                probAway = 0.55 + (Math.random() * 0.2);
                probDraw = 0.15 + (Math.random() * 0.1);
                probHome = 1.0 - probAway - probDraw;
                advice = `Back ${f.away_team} to Win`;
                underOver = "Under 3.5 Goals";
            } else {
                probDraw = 0.35 + (Math.random() * 0.15);
                probHome = (1.0 - probDraw) / 2;
                probAway = probHome;
                advice = "Value on the Draw";
                underOver = "Under 2.5 Goals";
            }
            
            // Generate some edges and confidences
            const edgeValue = 1.5 + (Math.random() * 10); // 1.5% to 11.5% edge
            const confidence = 50 + (Math.random() * 40); // 50% to 90% confidence
            
            // Format for DB
            const homeStr = (probHome * 100).toFixed(1) + "%";
            const drawStr = (probDraw * 100).toFixed(1) + "%";
            const awayStr = (probAway * 100).toFixed(1) + "%";
            
            try {
                db.run(`
                    INSERT OR REPLACE INTO V3_Predictions 
                    (fixture_id, league_id, prob_home, prob_draw, prob_away, advice, under_over, created_at, edge_value, confidence_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
                `, [f.fixture_id, f.league_id, homeStr, drawStr, awayStr, advice, underOver, edgeValue, confidence]);
                inserted++;
            } catch(e) {}
        });
        
        console.log(`Successfully generated ${inserted} mock predictions.`);
    } catch (e) {
        console.error("Error generating data:", e);
    }
}

run();
