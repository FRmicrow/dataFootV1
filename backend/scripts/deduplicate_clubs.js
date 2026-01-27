
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'database.sqlite');

const CLUB_MAPPINGS = {
    // 🇫🇷 French clubs
    'PSG': 'Paris Saint Germain',
    'Paris Saint-Germain': 'Paris Saint Germain',
    'Paris Saint-GermainT': 'Paris Saint Germain',
    'Paris SG': 'Paris Saint Germain',
    'Paris FC': 'Paris FC',
    'AS Saint-Étienne': 'Saint-Etienne',
    'Saint-Étienne': 'Saint-Etienne',
    'ASSE': 'Saint-Etienne',
    'Olympique de Marseille': 'Marseille',
    'OM': 'Marseille',
    'Olympique Lyonnais': 'Lyon',
    'Lyon': 'Lyon',
    'OL': 'Lyon',
    'AS Monaco': 'Monaco',
    'FC Nantes': 'Nantes',
    'Girondins de Bordeaux': 'Bordeaux',
    'OGC Nice': 'Nice',
    'Montpellier HSC': 'Montpellier',
    'RC Strasbourg': 'Strasbourg',
    'FC Sochaux-Montbéliard': 'Sochaux',
    'Stade Rennais FC': 'Rennes',

    // 🇪🇸 Spanish clubs
    'Real Madrid': 'Real Madrid',
    'Real Madrid CF': 'Real Madrid',
    'FC Barcelone': 'Barcelona',
    'FC Barcelona': 'Barcelona',
    'Barcelona': 'Barcelona',
    'Barça': 'Barcelona',
    'Atlético de Madrid': 'Atletico Madrid',
    'Atlético Madrid': 'Atletico Madrid',
    'Atletico': 'Atletico Madrid',
    'Athletic Bilbao': 'Athletic Club',
    'Athletic Club': 'Athletic Club',
    'Valence': 'Valencia',
    'Valencia CF': 'Valencia',
    'Real Sociedad': 'Real Sociedad',
    'Séville': 'Sevilla',
    'Sevilla FC': 'Sevilla',
    'Betis Séville': 'Real Betis',
    'Real Betis': 'Real Betis',
    'Villarreal CF': 'Villarreal',
    'Villarreal': 'Villarreal',

    // 🇩🇪 German clubs
    'FC Bayern Munich': 'Bayern Munich',
    'Bayern Munich': 'Bayern Munich',
    'Bayern München': 'Bayern Munich',
    'Borussia Dortmund': 'Borussia Dortmund',
    'BVB': 'Borussia Dortmund',
    'RB Leipzig': 'RB Leipzig',
    'Bayer Leverkusen': 'Bayer Leverkusen',
    'Bayer 04 Leverkusen': 'Bayer Leverkusen',
    'Borussia Mönchengladbach': 'Borussia Monchengladbach',
    'Borussia M\'gladbach': 'Borussia Monchengladbach',
    'VfB Stuttgart': 'VfB Stuttgart',
    'Werder Bremen': 'Werder Bremen',
    'Werder Brême': 'Werder Bremen',
    'Hamburger SV': 'Hamburg',
    'Hambourg': 'Hamburg',
    'FC Koln': 'FC Koln',
    '1. FC Cologne': 'FC Koln',
    '1. FC Köln': 'FC Koln',
    'Eintracht Frankfurt': 'Eintracht Frankfurt',
    'VfL Wolfsburg': 'Wolfsburg',
    'FC Schalke 04': 'Schalke 04',
    'Schalke 04': 'Schalke 04',
    'MSV Duisburg': 'MSV Duisburg',
    'Kaiserslautern': '1. FC Kaiserslautern',
    '1. FC Kaiserslautern': '1. FC Kaiserslautern',
    '1. FC Nürnberg': '1. FC Nurnberg',
    'FC Nuremberg': '1. FC Nurnberg',

    // 🏴 English clubs
    'Manchester United': 'Manchester United',
    'Man United': 'Manchester United',
    'Manchester City': 'Manchester City',
    'Man City': 'Manchester City',
    'Liverpool': 'Liverpool',
    'Liverpool FC': 'Liverpool',
    'Arsenal': 'Arsenal',
    'Arsenal FC': 'Arsenal',
    'Chelsea': 'Chelsea',
    'Chelsea FC': 'Chelsea',
    'Tottenham Hotspur': 'Tottenham',
    'Tottenham': 'Tottenham',
    'Spurs': 'Tottenham',
    'Newcastle United': 'Newcastle',
    'Newcastle': 'Newcastle',
    'Aston Villa': 'Aston Villa',
    'Everton': 'Everton',
    'Leeds United': 'Leeds',
    'Leeds': 'Leeds',
    'Nottingham Forest': 'Nottingham Forest',
    'West Ham United': 'West Ham',
    'West Ham': 'West Ham',
    'Leicester City': 'Leicester',
    'Leicester': 'Leicester',
    'Blackburn Rovers': 'Blackburn',
    'Blackburn': 'Blackburn',
    'Wolverhampton Wanderers': 'Wolverhampton Wanderers',
    'Wolves': 'Wolverhampton Wanderers',
    'Sunderland': 'Sunderland',
    'Sheffield United': 'Sheffield United',
    'Huddersfield Town': 'Huddersfield',
    'Preston North End': 'Preston',
    'Derby County': 'Derby',
    'Ipswich Town': 'Ipswich',

    // 🇮🇹 Italian clubs
    'Juventus FC': 'Juventus',
    'Juventus': 'Juventus',
    'FC Internazionale Milano': 'Inter',
    'Internazionale': 'Inter',
    'Inter Milan': 'Inter',
    'Inter': 'Inter',
    'AC Milan': 'AC Milan',
    'Milan': 'AC Milan',
    'SSC Napoli': 'Napoli',
    'Napoli': 'Napoli',
    'AS Roma': 'Roma',
    'Roma': 'Roma',
    'Lazio': 'Lazio',
    'SS Lazio': 'Lazio',
    'Atalanta BC': 'Atalanta',
    'Fiorentina': 'Fiorentina',
    'ACF Fiorentina': 'Fiorentina',
    'Torino FC': 'Torino',
    'Torino': 'Torino',
    'Genoa CFC': 'Genoa',
    'Genoa': 'Genoa',
    'Bologna FC': 'Bologna',
    'Bologna': 'Bologna',
    'UC Sampdoria': 'Sampdoria',
    'Sampdoria': 'Sampdoria',
    'Cagliari Calcio': 'Cagliari',
    'Cagliari': 'Cagliari',
    'Hellas Verona FC': 'Verona',
    'Hellas Vérone': 'Verona',
    'Parma Calcio 1913': 'Parma',
    'Parma': 'Parma',

    // 🟠 Other notable European clubs
    'FC Porto': 'Porto',
    'FC Basel': 'Basel',
    'SL Benfica': 'Benfica',
    'Benfica': 'Benfica',
    'Ajax Amsterdam': 'Ajax',
    'Ajax': 'Ajax',
    'Celtic FC': 'Celtic',
    'Celtic': 'Celtic',
    'Rangers FC': 'Rangers',
    'Rangers': 'Rangers',
};

async function runDeduplication() {
    const SQL = await initSqlJs();
    const buffer = readFileSync(dbPath);
    const db = new SQL.Database(buffer);

    try {
        db.exec("BEGIN TRANSACTION");
        console.log("🚀 Starting Deduplication Process...");

        // === PART 1: DEDUP CLUBS TABLE ===
        console.log("\n--- Processing CLUBS table ---");
        // Get all clubs
        const clubsRes = db.exec("SELECT id, name FROM clubs");
        if (clubsRes.length > 0) {
            const allClubs = clubsRes[0].values.map(r => ({ id: r[0], name: r[1] }));
            const canonicalToId = {};

            // 1. Identify Existing Canonical IDs
            allClubs.forEach(c => {
                // If this name is a VALUE in Mappings (Target), it's a candidate for canonical
                if (Object.values(CLUB_MAPPINGS).includes(c.name)) {
                    if (!canonicalToId[c.name]) canonicalToId[c.name] = c.id;
                    // Note: If multiple rows have canonical name, we just pick first? Ideally we merge duplicates of canonical too.
                }
            });

            // 2. Process Mappings
            for (const [variant, target] of Object.entries(CLUB_MAPPINGS)) {
                if (variant === target) continue; // Skip self-mappings if handled implicitly

                // Find clubs named 'variant'
                const variants = allClubs.filter(c => c.name === variant);
                if (variants.length === 0) continue;

                // Ensure target exists
                let targetId = canonicalToId[target];
                if (!targetId) {
                    // Check if we have a club named target we missed? (Should happen in step 1)
                    // If not, we can RENAME the first variant to target
                    const survivor = variants.shift();
                    console.log(`✨ Renaming '${variant}' (ID ${survivor.id}) -> '${target}'`);
                    db.run("UPDATE clubs SET name = ? WHERE id = ?", [target, survivor.id]);
                    targetId = survivor.id;
                    canonicalToId[target] = targetId;
                }

                // Merge remaining variants into target
                for (const v of variants) {
                    console.log(`   Merging '${v.name}' (ID ${v.id}) -> '${target}' (ID ${targetId})`);

                    // Update child tables
                    // player_club_stats
                    db.run(`UPDATE OR IGNORE player_club_stats SET club_id = ? WHERE club_id = ?`, [targetId, v.id]);
                    db.run(`DELETE FROM player_club_stats WHERE club_id = ?`, [v.id]); // Cleanup ignored conflicts

                    // Delete the variant club
                    db.run("DELETE FROM clubs WHERE id = ?", [v.id]);
                }
            }
        }

        // === PART 2: DEDUP TEAMS TABLE ===
        console.log("\n--- Processing TEAMS table ---");
        // Similar logic for TEAMS table
        const teamsRes = db.exec("SELECT id, name FROM teams");
        if (teamsRes.length > 0) {
            const allTeams = teamsRes[0].values.map(r => ({ id: r[0], name: r[1] }));
            const canonicalToId = {};

            allTeams.forEach(t => {
                if (Object.values(CLUB_MAPPINGS).includes(t.name)) {
                    if (!canonicalToId[t.name]) canonicalToId[t.name] = t.id;
                }
            });

            for (const [variant, target] of Object.entries(CLUB_MAPPINGS)) {
                if (variant === target) continue;

                const variants = allTeams.filter(t => t.name === variant);
                if (variants.length === 0) continue;

                let targetId = canonicalToId[target];
                if (!targetId) {
                    const survivor = variants.shift();
                    console.log(`✨ Renaming '${variant}' (ID ${survivor.id}) -> '${target}'`);
                    db.run("UPDATE teams SET name = ? WHERE id = ?", [target, survivor.id]);
                    targetId = survivor.id;
                    canonicalToId[target] = targetId;
                }

                for (const v of variants) {
                    console.log(`   Merging '${v.name}' (ID ${v.id}) -> '${target}' (ID ${targetId})`);

                    // team_trophies
                    db.run(`UPDATE OR IGNORE team_trophies SET team_id = ? WHERE team_id = ?`, [targetId, v.id]);
                    db.run(`DELETE FROM team_trophies WHERE team_id = ?`, [v.id]);

                    // team_statistics
                    db.run(`UPDATE OR IGNORE team_statistics SET team_id = ? WHERE team_id = ?`, [targetId, v.id]);
                    db.run(`DELETE FROM team_statistics WHERE team_id = ?`, [v.id]);

                    // standings
                    db.run(`UPDATE OR IGNORE standings SET team_id = ? WHERE team_id = ?`, [targetId, v.id]);
                    db.run(`DELETE FROM standings WHERE team_id = ?`, [v.id]);

                    // Delete variant team
                    db.run("DELETE FROM teams WHERE id = ?", [v.id]);
                }
            }
        }

        // === PART 3: RELINK TROPHIES TO CLUBS ID ===
        // To solve the mismatch where Frontend sends Club ID but Backend queries Trophies with it
        console.log("\n--- Aligning Trophies to Clubs IDs ---");

        // Strategy: 
        // 1. We assume 'clubs' table is the source of truth for the frontend ID.
        // 2. We assume 'team_trophies' currently points to 'teams' table IDs.
        // 3. We want 'team_trophies' to point to 'clubs' IDs (so SELECT * FROM trophies WHERE team_id = clubs.id works).

        // Get Mapping of api_team_id -> clubs.id
        const clubMapRes = db.exec("SELECT api_team_id, id FROM clubs WHERE api_team_id IS NOT NULL");
        const apiToClubId = {};
        if (clubMapRes.length > 0) {
            clubMapRes[0].values.forEach(row => apiToClubId[row[0]] = row[1]);
        }

        // Get all trophies
        const trophiesRes = db.exec("SELECT id, team_id FROM team_trophies");
        let movedCount = 0;

        if (trophiesRes.length > 0) {
            const trophies = trophiesRes[0].values;

            // For each trophy, find the API ID of its current team
            // (Optimize: Get 'teams' API map)
            const teamMapRes = db.exec("SELECT id, api_team_id FROM teams");
            const teamIdToApi = {};
            if (teamMapRes.length > 0) {
                teamMapRes[0].values.forEach(row => teamIdToApi[row[0]] = row[1]);
            }

            for (const [tId, currentTeamId] of trophies) {
                const apiId = teamIdToApi[currentTeamId];
                if (apiId && apiToClubId[apiId]) {
                    const newTeamId = apiToClubId[apiId];
                    if (newTeamId !== currentTeamId) {
                        try {
                            db.run("UPDATE OR IGNORE team_trophies SET team_id = ? WHERE id = ?", [newTeamId, tId]);
                            // If update ignored (constraint), we should delete the conflict? 
                            // Or leave it? If we leave it, the old link remains.
                            // If the constraint is (team_id, trophy_id, season_id), and we move to newTeamId...
                            // If newTeamId already has that trophy, we can delete the old record.
                            if (db.getRowsModified() === 0) {
                                db.run("DELETE FROM team_trophies WHERE id = ?", [tId]);
                            }
                            movedCount++;
                        } catch (e) {/* ignore */ }
                    }
                }
            }
        }
        console.log(`   Aligned ${movedCount} trophy records to Club IDs.`);


        db.exec("COMMIT");
        const data = db.export();
        writeFileSync(dbPath, data);
        console.log("\n🎉 Deduplication & Fixes Completed Successfully!");

    } catch (err) {
        console.error("❌ Fatal Error:", err);
        db.exec("ROLLBACK");
    } finally {
        db.close();
    }
}

runDeduplication();
