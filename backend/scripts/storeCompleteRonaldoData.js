/**
 * Complete Cristiano Ronaldo's pre-2010 career data from Flashscore
 * Includes Domestic Cups, International Cups, and National Team data
 */

import db from '../src/config/database.js';

// DOMESTIC CUPS DATA (pre-2010)
const DOMESTIC_CUPS_DATA = [
    { season: "2008/2009", team: "Manchester Utd", competition: "Carling Cup", matches: 1, goals: 0, assists: 1 },
    { season: "2007", team: "Manchester Utd", competition: "FA Community Shield", matches: 1, goals: 0, assists: 0 },
];

// INTERNATIONAL CUPS DATA (pre-2010)
const INTERNATIONAL_CUPS_DATA = [
    { season: "2009/2010", team: "Real Madrid", competition: "Champions League", matches: 6, goals: 7, assists: 0 },
    { season: "2008/2009", team: "Manchester Utd", competition: "Champions League", matches: 12, goals: 4, assists: 2 },
    { season: "2008", team: "Manchester Utd", competition: "FIFA Club World Cup", matches: 2, goals: 1, assists: 0 },
    { season: "2007/2008", team: "Manchester Utd", competition: "Champions League", matches: 11, goals: 8, assists: 2 },
    { season: "2006/2007", team: "Manchester Utd", competition: "Champions League", matches: 11, goals: 3, assists: 3 },
    { season: "2005/2006", team: "Manchester Utd", competition: "Champions League", matches: 6, goals: 0, assists: 1 },
    { season: "2004/2005", team: "Manchester Utd", competition: "Champions League", matches: 7, goals: 0, assists: 0 },
    { season: "2003/2004", team: "Manchester Utd", competition: "Champions League", matches: 5, goals: 0, assists: 0 },
];

// NATIONAL TEAM DATA (pre-2010)
const NATIONAL_TEAM_DATA = [
    { season: "2010", team: "Portugal", competition: "World Cup", matches: 4, goals: 1, assists: 0 },
    { season: "2010", team: "Portugal", competition: "World Cup - Qualific.", matches: 7, goals: 0, assists: 0 },
    { season: "2008", team: "Portugal", competition: "Euro", matches: 3, goals: 1, assists: 0 },
    { season: "2008", team: "Portugal", competition: "Euro - Qualification", matches: 1, goals: 0, assists: 0 },
    { season: "2006", team: "Portugal", competition: "World Cup", matches: 6, goals: 1, assists: 0 },
    { season: "2004", team: "Portugal", competition: "Euro", matches: 6, goals: 2, assists: 1 },
];

async function storeCompleteRonaldoData() {
    console.log('🔍 Initializing database...');
    await db.init();

    console.log('🔍 Finding Cristiano Ronaldo...');
    const player = db.get(`
        SELECT id FROM players 
        WHERE LOWER(first_name || ' ' || last_name) LIKE '%cristiano%ronaldo%'
        LIMIT 1
    `);

    if (!player) {
        console.log('❌ Cristiano Ronaldo not found in database');
        return;
    }

    const playerId = player.id;
    console.log(`✓ Found player ID: ${playerId}\n`);

    let totalStored = 0;
    let totalSkipped = 0;

    // Process Domestic Cups
    console.log('📊 Processing Domestic Cups...');
    const { stored: cupStored, skipped: cupSkipped } = await processClubStats(
        playerId, DOMESTIC_CUPS_DATA, 'cup'
    );
    totalStored += cupStored;
    totalSkipped += cupSkipped;

    // Process International Cups
    console.log('\n📊 Processing International Cups...');
    const { stored: intStored, skipped: intSkipped } = await processClubStats(
        playerId, INTERNATIONAL_CUPS_DATA, 'international_cup'
    );
    totalStored += intStored;
    totalSkipped += intSkipped;

    // Process National Team
    console.log('\n📊 Processing National Team...');
    const { stored: natStored, skipped: natSkipped } = await processNationalTeamStats(
        playerId, NATIONAL_TEAM_DATA
    );
    totalStored += natStored;
    totalSkipped += natSkipped;

    console.log(`\n✅ Complete!`);
    console.log(`  📥 Total Stored: ${totalStored} records`);
    console.log(`  ⏭️  Total Skipped: ${totalSkipped} records`);

    return {
        success: true,
        playerId,
        stored: totalStored,
        skipped: totalSkipped
    };
}

async function processClubStats(playerId, data, competitionType) {
    let stored = 0;
    let skipped = 0;

    for (const stat of data) {
        try {
            // Get or create season
            let season = db.get('SELECT id FROM seasons WHERE label = ?', [stat.season]);
            if (!season) {
                const year = parseInt(stat.season.split('/')[0] || stat.season);
                const result = db.run('INSERT INTO seasons (label, year) VALUES (?, ?)',
                    [stat.season, year]);
                season = { id: result.lastInsertRowid };
            }

            // Get or create club
            let club = db.get('SELECT id FROM clubs WHERE name = ?', [stat.team]);
            if (!club) {
                const countryMap = {
                    "Manchester Utd": "England",
                    "Real Madrid": "Spain"
                };
                const countryName = countryMap[stat.team] || "Unknown";
                const country = db.get('SELECT id FROM countries WHERE name = ?', [countryName]);

                if (country) {
                    const apiTeamId = -(Math.abs(hashString(stat.team)) % 1000000);
                    const result = db.run(`
                        INSERT INTO clubs (api_team_id, name, logo_url, country_id)
                        VALUES (?, ?, ?, ?)
                    `, [apiTeamId, stat.team, null, country.id]);
                    club = { id: result.lastInsertRowid };
                } else {
                    console.log(`  ⚠️ Country not found for ${stat.team}`);
                    skipped++;
                    continue;
                }
            }

            // Get competition with better fuzzy matching
            const compTable = competitionType === 'cup' ? 'national_cups' : 'international_cups';

            // Try exact match first
            let competition = db.get(`SELECT id FROM ${compTable} WHERE name LIKE ?`, [`%${stat.competition}%`]);

            // Try fuzzy matches for common variations
            if (!competition) {
                const fuzzyNames = {
                    'Carling Cup': ['League Cup', 'EFL Cup', 'Carling'],
                    'FA Community Shield': ['Community Shield', 'Charity Shield'],
                    'FIFA Club World Cup': ['Club World Cup', 'FIFA Club World'],
                };

                const alternatives = fuzzyNames[stat.competition] || [];
                for (const alt of alternatives) {
                    competition = db.get(`SELECT id FROM ${compTable} WHERE name LIKE ?`, [`%${alt}%`]);
                    if (competition) break;
                }

                // Special case: FIFA Club World Cup might be in national_team_cups by mistake
                if (!competition && stat.competition === 'FIFA Club World Cup') {
                    competition = db.get(`SELECT id FROM national_team_cups WHERE name LIKE ?`, ['%FIFA Club World%']);
                }
            }

            if (!competition) {
                console.log(`  ⚠️ Competition '${stat.competition}' not found in ${compTable}`);
                skipped++;
                continue;
            }

            // Check if exists
            const existing = db.get(`
                SELECT id FROM player_club_stats
                WHERE player_id = ? AND club_id = ? AND season_id = ? AND competition_id = ?
            `, [playerId, club.id, season.id, competition.id]);

            if (existing) {
                db.run(`
                    UPDATE player_club_stats
                    SET matches = ?, goals = ?, assists = ?
                    WHERE id = ?
                `, [stat.matches, stat.goals, stat.assists, existing.id]);
                console.log(`  ✓ Updated: ${stat.season} ${stat.team} ${stat.competition} - ${stat.matches}M ${stat.goals}G ${stat.assists}A`);
            } else {
                db.run(`
                    INSERT INTO player_club_stats
                    (player_id, club_id, competition_id, competition_type, season_id, matches, goals, assists)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [playerId, club.id, competition.id, competitionType, season.id,
                    stat.matches, stat.goals, stat.assists]);
                console.log(`  ✓ Inserted: ${stat.season} ${stat.team} ${stat.competition} - ${stat.matches}M ${stat.goals}G ${stat.assists}A`);
            }

            stored++;
        } catch (error) {
            console.log(`  ❌ Error: ${stat.season} ${stat.team} - ${error.message}`);
            skipped++;
        }
    }

    return { stored, skipped };
}

async function processNationalTeamStats(playerId, data) {
    let stored = 0;
    let skipped = 0;

    // Get or create Portugal national team
    let nationalTeam = db.get('SELECT id FROM national_teams WHERE name = ?', ['Portugal']);
    if (!nationalTeam) {
        const result = db.run('INSERT INTO national_teams (name, flag_url) VALUES (?, ?)',
            ['Portugal', null]);
        nationalTeam = { id: result.lastInsertRowid };
    }

    for (const stat of data) {
        try {
            // Get or create season
            let season = db.get('SELECT id FROM seasons WHERE label = ?', [stat.season]);
            if (!season) {
                const year = parseInt(stat.season);
                const result = db.run('INSERT INTO seasons (label, year) VALUES (?, ?)',
                    [stat.season, year]);
                season = { id: result.lastInsertRowid };
            }

            // Get competition from national_team_cups with fuzzy matching
            let competition = db.get(`
                SELECT id FROM national_team_cups WHERE name LIKE ?
            `, [`%${stat.competition}%`]);

            // Try fuzzy matches for common variations
            if (!competition) {
                const fuzzyNames = {
                    'World Cup - Qualific.': ['World Cup - Qualification', 'World Cup Qualif', 'WC Qualification'],
                    'Euro - Qualification': ['Euro Qualification', 'Euro Championship - Qualification', 'European Championship - Qualification'],
                };

                const alternatives = fuzzyNames[stat.competition] || [];
                for (const alt of alternatives) {
                    competition = db.get(`SELECT id FROM national_team_cups WHERE name LIKE ?`, [`%${alt}%`]);
                    if (competition) break;
                }
            }

            if (!competition) {
                console.log(`  ⚠️ Competition '${stat.competition}' not found in national_team_cups`);
                skipped++;
                continue;
            }

            // Check if exists
            const existing = db.get(`
                SELECT id FROM player_national_stats
                WHERE player_id = ? AND national_team_id = ? AND season_id = ? AND competition_id = ?
            `, [playerId, nationalTeam.id, season.id, competition.id]);

            if (existing) {
                db.run(`
                    UPDATE player_national_stats
                    SET matches = ?, goals = ?, assists = ?
                    WHERE id = ?
                `, [stat.matches, stat.goals, stat.assists, existing.id]);
                console.log(`  ✓ Updated: ${stat.season} ${stat.competition} - ${stat.matches}M ${stat.goals}G ${stat.assists}A`);
            } else {
                db.run(`
                    INSERT INTO player_national_stats
                    (player_id, national_team_id, competition_id, season_id, matches, goals, assists)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [playerId, nationalTeam.id, competition.id, season.id,
                    stat.matches, stat.goals, stat.assists]);
                console.log(`  ✓ Inserted: ${stat.season} ${stat.competition} - ${stat.matches}M ${stat.goals}G ${stat.assists}A`);
            }

            stored++;
        } catch (error) {
            console.log(`  ❌ Error: ${stat.season} ${stat.competition} - ${error.message}`);
            skipped++;
        }
    }

    return { stored, skipped };
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

storeCompleteRonaldoData()
    .then(result => {
        console.log('\n' + JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
