/**
 * Store Cristiano Ronaldo's pre-2010 career data from Flashscore
 * Data extracted from screenshot analysis
 */

import db from '../src/config/database.js';

// Cristiano Ronaldo's pre-2010 career data (from Flashscore screenshot)
const RONALDO_LEAGUE_DATA = [
    { season: "2009/2010", team: "Real Madrid", competition: "La Liga", matches: 29, goals: 26, assists: 5 },
    { season: "2008/2009", team: "Manchester Utd", competition: "Premier League", matches: 33, goals: 18, assists: 6 },
    { season: "2007/2008", team: "Manchester Utd", competition: "Premier League", matches: 34, goals: 31, assists: 5 },
    { season: "2006/2007", team: "Manchester Utd", competition: "Premier League", matches: 34, goals: 17, assists: 2 },
    { season: "2005/2006", team: "Manchester Utd", competition: "Premier League", matches: 33, goals: 9, assists: 8 },
    { season: "2004/2005", team: "Manchester Utd", competition: "Premier League", matches: 32, goals: 5, assists: 8 },
    { season: "2003/2004", team: "Manchester Utd", competition: "Premier League", matches: 29, goals: 4, assists: 4 },
];

async function storeRonaldoData() {
    console.log('🔍 Initializing database...');
    await db.init();

    console.log('🔍 Checking for Cristiano Ronaldo in database...');

    // Find Cristiano Ronaldo
    const player = db.get(`
        SELECT id FROM players 
        WHERE LOWER(first_name || ' ' || last_name) LIKE '%cristiano%ronaldo%'
        LIMIT 1
    `);

    let playerId;

    if (!player) {
        console.log('  ⚠️ Cristiano Ronaldo not found in database');
        console.log('  💡 Creating player record...');

        const result = db.run(`
            INSERT INTO players (first_name, last_name, age, nationality, photo_url)
            VALUES (?, ?, ?, ?, ?)
        `, ["Cristiano", "Ronaldo", 39, "Portugal", null]);

        playerId = result.lastInsertRowid;
        console.log(`  ✓ Created player with ID: ${playerId}`);
    } else {
        playerId = player.id;
        console.log(`  ✓ Found player with ID: ${playerId}`);
    }

    console.log(`\n📊 Storing ${RONALDO_LEAGUE_DATA.length} season records...`);

    let storedCount = 0;
    let skippedCount = 0;

    for (const stat of RONALDO_LEAGUE_DATA) {
        try {
            // Get or create season
            let season = db.get('SELECT id FROM seasons WHERE label = ?', [stat.season]);

            if (!season) {
                const year = parseInt(stat.season.split('/')[0]);
                const result = db.run('INSERT INTO seasons (label, year) VALUES (?, ?)',
                    [stat.season, year]);
                season = { id: result.lastInsertRowid };
            }

            // Get or create club
            let club = db.get('SELECT id FROM clubs WHERE name = ?', [stat.team]);

            if (!club) {
                // Get country for club
                const countryMap = {
                    "Manchester Utd": "England",
                    "Real Madrid": "Spain"
                };
                const countryName = countryMap[stat.team] || "Unknown";

                const country = db.get('SELECT id FROM countries WHERE name = ?', [countryName]);

                if (country) {
                    // Generate synthetic API ID
                    const apiTeamId = -(Math.abs(hashString(stat.team)) % 1000000);
                    const result = db.run(`
                        INSERT INTO clubs (api_team_id, name, logo_url, country_id)
                        VALUES (?, ?, ?, ?)
                    `, [apiTeamId, stat.team, null, country.id]);
                    club = { id: result.lastInsertRowid };
                } else {
                    console.log(`    ⚠️ Country not found for ${stat.team}, skipping...`);
                    skippedCount++;
                    continue;
                }
            }

            // Get competition (championship)
            const competition = db.get(`
                SELECT id FROM championships WHERE name LIKE ?
            `, [`%${stat.competition}%`]);

            if (!competition) {
                console.log(`    ⚠️ Competition '${stat.competition}' not found, skipping...`);
                skippedCount++;
                continue;
            }

            // Check if stat already exists
            const existing = db.get(`
                SELECT id FROM player_club_stats
                WHERE player_id = ? AND club_id = ? AND season_id = ? AND competition_id = ?
            `, [playerId, club.id, season.id, competition.id]);

            if (existing) {
                // Update existing
                db.run(`
                    UPDATE player_club_stats
                    SET matches = ?, goals = ?, assists = ?
                    WHERE id = ?
                `, [stat.matches, stat.goals, stat.assists, existing.id]);
                console.log(`  ✓ Updated: ${stat.season} ${stat.team} - ${stat.matches}M ${stat.goals}G ${stat.assists}A`);
            } else {
                // Insert new
                db.run(`
                    INSERT INTO player_club_stats
                    (player_id, club_id, competition_id, competition_type, season_id, matches, goals, assists)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [playerId, club.id, competition.id, 'championship', season.id,
                    stat.matches, stat.goals, stat.assists]);
                console.log(`  ✓ Inserted: ${stat.season} ${stat.team} - ${stat.matches}M ${stat.goals}G ${stat.assists}A`);
            }

            storedCount++;

        } catch (error) {
            console.log(`  ❌ Error storing ${stat.season} ${stat.team}: ${error.message}`);
            skippedCount++;
        }
    }

    console.log(`\n✅ Complete!`);
    console.log(`  📥 Stored: ${storedCount} seasons`);
    console.log(`  ⏭️  Skipped: ${skippedCount} seasons`);

    return {
        success: true,
        playerId,
        stored: storedCount,
        skipped: skippedCount
    };
}

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

storeRonaldoData()
    .then(result => {
        console.log('\n' + JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
