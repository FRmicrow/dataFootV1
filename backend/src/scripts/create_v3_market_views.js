import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', '..', 'database.sqlite');

async function run() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    console.log('🏁 Starting V3 Market Settlements View Creation...');

    // Drop view if exists to allow updates
    db.run("DROP VIEW IF EXISTS v_market_settlements");

    // Create View
    // Note: We use COALESCE(score_fulltime_home, goals_home) to ensure we get the 90-minute result,
    // which is the standard for 1N2 and O/U betting settlement.
    // We filter for finished matches only.
    // We LEFT JOIN V3_Odds for Bookmaker ID 1 (Bet365) and Market ID 1 (1N2) to provide context.

    const sql = `
    CREATE VIEW v_market_settlements AS
    SELECT 
        f.fixture_id,
        f.league_id,
        f.season_year,
        f.date,
        f.home_team_id,
        f.away_team_id,
        COALESCE(f.score_fulltime_home, f.goals_home) AS goals_home_90,
        COALESCE(f.score_fulltime_away, f.goals_away) AS goals_away_90,
        
        -- 1N2 Outcome (Home, Draw, Away)
        CASE 
            WHEN COALESCE(f.score_fulltime_home, f.goals_home) > COALESCE(f.score_fulltime_away, f.goals_away) THEN '1'
            WHEN COALESCE(f.score_fulltime_away, f.goals_away) > COALESCE(f.score_fulltime_home, f.goals_home) THEN '2'
            ELSE 'X'
        END AS res_1n2,
        
        -- ML Class 1N2 (1=Home, 0=Draw, 2=Away)
        CASE 
            WHEN COALESCE(f.score_fulltime_home, f.goals_home) > COALESCE(f.score_fulltime_away, f.goals_away) THEN 1
            WHEN COALESCE(f.score_fulltime_away, f.goals_away) > COALESCE(f.score_fulltime_home, f.goals_home) THEN 2
            ELSE 0
        END AS outcome_1n2_class,

        -- Over/Under 2.5 Outcome
        CASE 
            WHEN (COALESCE(f.score_fulltime_home, f.goals_home) + COALESCE(f.score_fulltime_away, f.goals_away)) > 2.5 THEN 'O'
            ELSE 'U'
        END AS res_ou25,
        
        -- ML Class O/U (1=Over, 0=Under)
        CASE 
            WHEN (COALESCE(f.score_fulltime_home, f.goals_home) + COALESCE(f.score_fulltime_away, f.goals_away)) > 2.5 THEN 1
            ELSE 0
        END AS outcome_ou25_class,

        -- BTTS Outcome
        CASE 
            WHEN COALESCE(f.score_fulltime_home, f.goals_home) > 0 AND COALESCE(f.score_fulltime_away, f.goals_away) > 0 THEN 'Yes'
            ELSE 'No'
        END AS res_btts,
        
        -- ML Class BTTS (1=Yes, 0=No)
        CASE 
            WHEN COALESCE(f.score_fulltime_home, f.goals_home) > 0 AND COALESCE(f.score_fulltime_away, f.goals_away) > 0 THEN 1
            ELSE 0
        END AS outcome_btts_class,

        -- Contextual Odds (Bet365 / 1N2)
        -- Note: If multiple 1N2 odds exist (unlikely with unique constraint), this picks one arbitrarily implicitly, 
        -- but UNIQUE index ensures 1 row per fixture/bookmaker/market.
        o.value_home_over AS odds_home,
        o.value_draw AS odds_draw,
        o.value_away_under AS odds_away

    FROM V3_Fixtures f
    -- Join with Odds for Bookmaker 1 (Bet365) and Market 1 (Match Winner)
    LEFT JOIN V3_Odds o ON f.fixture_id = o.fixture_id AND o.bookmaker_id = 1 AND o.market_id = 1
    
    -- Only finished matches
    WHERE f.status_short IN ('FT', 'AET', 'PEN')
      AND f.goals_home IS NOT NULL 
      AND f.goals_away IS NOT NULL;
    `;

    db.run(sql);
    console.log('✅ Created view v_market_settlements');

    // Test the view
    try {
        const count = db.exec("SELECT count(*) FROM v_market_settlements")[0].values[0][0];
        console.log(`📊 View validation: Found ${count} settled matches.`);

        if (count > 0) {
            const sample = db.exec("SELECT * FROM v_market_settlements LIMIT 1")[0];
            console.log('🔎 Sample Row:', sample.columns.join(' | '));
            console.log('  ', sample.values[0].join(' | '));
        }
    } catch (e) {
        console.warn('⚠️ View Created but validation query returned no rows (DB might be empty of results).');
    }

    // Save
    console.log('\n💾 Saving Database...');
    const data = db.export();
    writeFileSync(dbPath, Buffer.from(data));
    console.log('🎉 Done!');
    db.close();
}

run().catch(console.error);
