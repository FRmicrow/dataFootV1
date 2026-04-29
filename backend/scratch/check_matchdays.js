import db from '../src/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function check() {
    await db.init();
    
    // 1. Find Ligue 1 competition ID
    const competition = await db.get(
        "SELECT competition_id, name FROM v4.competitions WHERE name ILIKE '%Ligue 1%' AND country_id = (SELECT country_id FROM v4.countries WHERE name = 'France' LIMIT 1)"
    );
    
    if (!competition) {
        console.log("Ligue 1 France not found");
        process.exit(1);
    }
    
    console.log(`Found competition: ${competition.name} (ID: ${competition.competition_id})`);
    
    // 2. Find available seasons for this competition
    const seasons = await db.all(
        "SELECT DISTINCT season_label FROM v4.matches WHERE competition_id = ? ORDER BY season_label DESC",
        [competition.competition_id]
    );
    
    console.log("Available seasons:", seasons.map(s => s.season_label));
    
    // 3. Count matchdays for 2025-2026
    const targetSeason = '2025-2026';
    const matchdays = await db.all(
        "SELECT DISTINCT matchday FROM v4.matches WHERE competition_id = ? AND season_label = ? AND matchday IS NOT NULL ORDER BY matchday",
        [competition.competition_id, targetSeason]
    );
    
    console.log(`\nMatchdays for ${targetSeason}:`);
    console.log(matchdays.map(m => m.matchday));
    console.log(`Total: ${matchdays.length} matchdays.`);
    
    // 4. Count total matches for this season
    const totalMatches = await db.get(
        "SELECT COUNT(*) as count FROM v4.matches WHERE competition_id = ? AND season_label = ?",
        [competition.competition_id, targetSeason]
    );
    console.log(`Total matches in DB for this season: ${totalMatches.count}`);

    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
