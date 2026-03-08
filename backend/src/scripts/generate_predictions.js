import sqlite3 from 'sqlite3';
import path from 'node:path';

const dbPath = path.resolve('backend/database.sqlite');
const db = new sqlite3.Database(dbPath);

const run = async () => {
    console.log("Generating mock odds and predictions...");
    try {
        const fixtures = await new Promise((resolve, reject) => {
            db.all(`
               SELECT fixture_id, league_id, date, res_1n2
               FROM v_market_settlements
               WHERE res_1n2 IS NOT NULL
               ORDER BY date DESC
               LIMIT 500
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        let insertedOdds = 0;
        let insertedPreds = 0;

        await new Promise((resolve) => db.run('BEGIN TRANSACTION', resolve));

        for (const f of fixtures) {
            // -- Mock Odds --
            const oddsHome = (1.5 + Math.random() * 2).toFixed(2);
            const oddsDraw = (2.5 + Math.random() * 1.5).toFixed(2);
            const oddsAway = (3.0 + Math.random() * 2).toFixed(2);

            try {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT OR IGNORE INTO V3_Odds 
                        (fixture_id, bookmaker_id, market_id, value_home_over, value_draw, value_away_under, updated_at)
                        VALUES (?, 1, 1, ?, ?, ?, CURRENT_TIMESTAMP)
                    `, [f.fixture_id, oddsHome, oddsDraw, oddsAway], (err) => {
                        if (err) console.error("Odds Insert Error:", err);
                        else insertedOdds++;
                        resolve();
                    });
                });
            } catch (e) { }
        }

        await new Promise((resolve) => db.run('COMMIT', resolve));

        console.log(`Successfully generated ${insertedOdds} mock odds.`);
    } catch (e) {
        console.error("Error generating data:", e);
    }
}

run();
