import db from '../config/database.js';

const run = async () => {
    console.log("🚀 Starting Club Country Inference...");

    try {
        await db.init();

        // Strategy 0: Name Match (Fix National Teams GLOBALLY)
        console.log("Fixing National Teams based on name...");
        await db.run(`
            UPDATE V2_clubs 
            SET country_id = (SELECT country_id FROM V2_countries WHERE country_name = V2_clubs.club_name)
            WHERE EXISTS (SELECT 1 FROM V2_countries WHERE country_name = V2_clubs.club_name)
        `);
        console.log("✅ National Teams fixed.");

        // Find clubs with generic country ID (1=World through 6=Oceania)
        const clubs = await db.all("SELECT club_id, club_name, country_id FROM V2_clubs WHERE country_id <= 6");
        console.log(`Found ${clubs.length} clubs with generic country ID (Word/Continent). Attempting to infer specific country...`);

        let updated = 0;
        let skipped = 0;

        for (const club of clubs) {
            let inferSource = "";
            let bestCountryId = null;

            // Strategy 1: Competition Country (Best indicator)
            // Find most frequent country_id of competitions this club played in
            const competitions = await db.all(`
                SELECT c.country_id, COUNT(*) as count 
                FROM V2_player_statistics ps
                JOIN V2_competitions c ON ps.competition_id = c.competition_id
                WHERE ps.club_id = ? AND c.country_id > 6
                GROUP BY c.country_id
                ORDER BY count DESC
                LIMIT 1`, [club.club_id]);

            if (competitions.length > 0) {
                bestCountryId = competitions[0].country_id;
                inferSource = `Competition (ID ${bestCountryId})`;
            }

            // Strategy 2: Player Nationality (via Statistics)
            // If no competition data, check majority nationality of players who have stats for this club
            if (!bestCountryId) {
                const players = await db.all(`
                    SELECT p.nationality_id, COUNT(DISTINCT p.player_id) as count
                    FROM V2_player_statistics ps
                    JOIN V2_players p ON ps.player_id = p.player_id
                    WHERE ps.club_id = ? AND p.nationality_id > 6
                    GROUP BY p.nationality_id
                    ORDER BY count DESC
                    LIMIT 1`, [club.club_id]);

                if (players.length > 0 && players[0].count >= 2) {
                    bestCountryId = players[0].nationality_id;
                    inferSource = `Player Stats Majority (${players[0].count} players from ID ${bestCountryId})`;
                }
            }

            // Strategy 3: Historical Player Nationality
            // Check history if stats empty
            if (!bestCountryId) {
                const historyPlayers = await db.all(`
                     SELECT p.nationality_id, COUNT(DISTINCT p.player_id) as count
                     FROM V2_player_club_history h
                     JOIN V2_players p ON h.player_id = p.player_id
                     WHERE h.club_id = ? AND p.nationality_id > 6
                     GROUP BY p.nationality_id
                     ORDER BY count DESC
                     LIMIT 1`, [club.club_id]);

                if (historyPlayers.length > 0 && historyPlayers[0].count >= 2) {
                    bestCountryId = historyPlayers[0].nationality_id;
                    inferSource = `History Majority (${historyPlayers[0].count} players from ID ${bestCountryId})`;
                }
            }

            // Apply Update
            if (bestCountryId) {
                const countryExists = await db.get("SELECT country_name FROM V2_countries WHERE country_id = ?", [bestCountryId]);
                if (countryExists) {
                    await db.run("UPDATE V2_clubs SET country_id = ? WHERE club_id = ?", [bestCountryId, club.club_id]);
                    console.log(`✅ [${inferSource}] Updated '${club.club_name}' (ID ${club.club_id}) -> ${countryExists.country_name}`);
                    updated++;
                } else {
                    console.log(`⚠️ Inferred ID ${bestCountryId} for '${club.club_name}' but country doesn't exist.`);
                    skipped++;
                }
            } else {
                skipped++;
            }

            if (updated % 100 === 0 && updated > 0) process.stdout.write(".");
        }

        console.log(`\n🎉 Completed! Updated: ${updated}, Skipped: ${skipped}`);

    } catch (error) {
        console.error("❌ Error:", error);
    }
};

run();
