import dotenv from 'dotenv';
dotenv.config();
import db from '../../src/config/database.js';

async function checkData() {
    await db.init();
    
    const teams = await db.all(`
        SELECT x.league_id, l.name as league_name, t.name as team_name, t.country as team_country, c.name as league_country, t.team_id
        FROM V3_League_Season_xG x
        JOIN V3_Teams t ON x.team_id = t.team_id
        JOIN V3_Leagues l ON x.league_id = l.league_id
        JOIN V3_Countries c ON l.country_id = c.country_id
        WHERE x.season_year = 2024 AND t.country != c.name
    `);
    
    console.log('Mismatched Teams:');
    console.table(teams);

    process.exit(0);
}
checkData();
