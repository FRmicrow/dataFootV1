import 'dotenv/config';
import db from '../../src/config/database.js';
import logger from '../../src/utils/logger.js';

const MONTH_MAP = {
    'janv.': '01', 'févr.': '02', 'mars': '03', 'avr.': '04', 'mai': '05', 'juin': '06',
    'juil.': '07', 'août': '08', 'sept.': '09', 'oct.': '10', 'nov.': '11', 'déc.': '12'
};

async function parseFrenchDate(dateStr) {
    if (!dateStr) return null;
    // Format: "sam., 24 août 1963"
    const match = dateStr.match(/(\d+)\s+([^\s,]+)\s+(\d{4})/);
    if (!match) return null;
    const [, day, monthName, year] = match;
    const month = MONTH_MAP[monthName.toLowerCase()] || '01';
    return `${year}-${month}-${day.padStart(2, '0')}T12:00:00Z`;
}

async function runTransformation() {
    try {
        await db.init();
        logger.info('🚀 Starting V4 Data Transformation...');

        // 1. Teams (SQL is faster for this part)
        logger.info('  1/5 Mapping Teams...');
        await db.run(`INSERT INTO V4_Teams (name, logo_url) 
                      SELECT DISTINCT home_team, home_logo_url FROM tm_matches WHERE home_team IS NOT NULL
                      ON CONFLICT (name) DO NOTHING`);
        await db.run(`INSERT INTO V4_Teams (name, logo_url) 
                      SELECT DISTINCT away_team, away_logo_url FROM tm_matches WHERE away_team IS NOT NULL
                      ON CONFLICT (name) DO NOTHING`);

        // 2. Players
        logger.info('  2/5 Mapping Players (Long process)...');
        await db.run(`INSERT INTO V4_Players (name) 
                      SELECT DISTINCT player_name FROM tm_match_lineups
                      ON CONFLICT (name) DO NOTHING`);

        // 3. Fixtures (Batching)
        logger.info('  3/5 Loading Fixtures...');
        const matches = await db.all(`SELECT * FROM tm_matches`);
        const teamMap = {};
        (await db.all(`SELECT team_id, name FROM V4_Teams`)).forEach(t => teamMap[t.name] = t.team_id);

        for (let i = 0; i < matches.length; i += 1000) {
            const batch = matches.slice(i, i + 1000);
            const values = [];
            for (const m of batch) {
                const date = await parseFrenchDate(m.date_raw);
                values.push([
                    m.match_id, m.season, m.league, date, 
                    teamMap[m.home_team], teamMap[m.away_team],
                    m.home_goals, m.away_goals, m.round_label, m.venue, m.attendance, m.referee
                ]);
            }
            
            // Fast insert for FIXTURES
            for (const v of values) {
                await db.run(`INSERT INTO V4_Fixtures 
                    (tm_match_id, season, league, date, home_team_id, away_team_id, goals_home, goals_away, round, venue, attendance, referee)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (tm_match_id) DO NOTHING`, v);
            }
            if (i % 5000 === 0) logger.info(`    Processed ${i} matches...`);
        }

        // 4. Events
        logger.info('  4/5 Loading Events (Massive)...');
        // We use a SQL join for speed, then manually fix types
        await db.run(`INSERT INTO V4_Fixture_Events (fixture_id, time_elapsed, type, player_id, assist_id, detail, score_at_event)
            SELECT 
                f.fixture_id, 
                CAST(regexp_replace(e.minute, '[^0-9]', '', 'g') AS INTEGER),
                e.type, 
                ph.player_id, 
                pa.player_id, 
                COALESCE(e.goal_type, e.card_type, e.sub_detail, ''),
                e.score_at_event
            FROM tm_match_events e
            JOIN V4_Fixtures f ON f.tm_match_id = e.match_id
            LEFT JOIN V4_Players ph ON ph.name = COALESCE(e.scorer, e.player_in, e.carded_player)
            LEFT JOIN V4_Players pa ON pa.name = COALESCE(e.assist_player, e.player_out)
            ON CONFLICT DO NOTHING`);

        // 5. Lineups
        logger.info('  5/5 Loading Lineups (Very Massive)...');
        await db.run(`INSERT INTO V4_Fixture_Lineups (fixture_id, player_id, team_id, side, is_starter, position_code, numero)
            SELECT 
                f.fixture_id, 
                p.player_id, 
                CASE WHEN l.side = 'home' THEN f.home_team_id ELSE f.away_team_id END,
                l.side, 
                l.is_starter, 
                l.position_code, 
                l.numero
            FROM tm_match_lineups l
            JOIN V4_Fixtures f ON f.tm_match_id = l.match_id
            JOIN V4_Players p ON p.name = l.player_name
            ON CONFLICT DO NOTHING`);

        logger.info('🎉 V4 Transformation Complete.');
        process.exit(0);
    } catch (error) {
        logger.error({ err: error }, '❌ Transformation failed');
        process.exit(1);
    }
}

runTransformation();
