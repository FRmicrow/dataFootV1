import db from '../config/database.js';

const run = async () => {
    console.log("🚀 Starting Fast Merge of Duplicate Clubs...");
    try {
        await db.init();
        const start = Date.now();

        console.log("Cleaning up old merge tables...");
        await db.run("DROP TABLE IF EXISTS _Merge_DuplicateClubs");
        await db.run("DROP TABLE IF EXISTS _Merge_ClubMapping");
        await db.run("DROP TABLE IF EXISTS _Merge_StatsToMerge");

        console.log("Analyze: Identifying duplicates (Same Name + Same API ID)...");

        // 1. Identify Survivors (Min ID)
        await db.run(`CREATE TABLE _Merge_DuplicateClubs AS
            SELECT api_id, club_name, MIN(club_id) as survivor_id
            FROM V2_clubs 
            WHERE api_id IS NOT NULL 
            GROUP BY api_id, club_name 
            HAVING COUNT(*) > 1`);

        // 2. Map Victims
        await db.run(`CREATE TABLE _Merge_ClubMapping AS
            SELECT c.club_id as victim_id, d.survivor_id
            FROM V2_clubs c
            JOIN _Merge_DuplicateClubs d ON c.api_id = d.api_id AND c.club_name = d.club_name
            WHERE c.club_id != d.survivor_id`);

        // Check if any work to do
        const check = await db.get("SELECT COUNT(*) as c FROM _Merge_ClubMapping");
        const victimCount = check ? check.c : 0;

        console.log(`Found ${victimCount} duplicate clubs to merge.`);

        if (victimCount > 0) {
            console.log("Merging statistics (Upsert strategy)...");

            // 3. Stats Merge
            // Copy victim stats to table
            await db.run(`CREATE TABLE _Merge_StatsToMerge AS
                SELECT * FROM V2_player_statistics WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);

            // Point table stats to survivor
            await db.run(`UPDATE _Merge_StatsToMerge 
                SET club_id = (SELECT survivor_id FROM _Merge_ClubMapping WHERE victim_id = _Merge_StatsToMerge.club_id)`);

            // Upsert into main
            await db.run(`INSERT INTO V2_player_statistics (player_id, club_id, competition_id, season, matches_played, goals, assists, yellow_cards, red_cards, created_at, updated_at)
                SELECT player_id, club_id, competition_id, season, matches_played, goals, assists, yellow_cards, red_cards, created_at, datetime('now')
                FROM _Merge_StatsToMerge
                WHERE true
                ON CONFLICT(player_id, club_id, competition_id, season) DO UPDATE SET
                    matches_played = V2_player_statistics.matches_played + excluded.matches_played,
                    goals = V2_player_statistics.goals + excluded.goals,
                    assists = V2_player_statistics.assists + excluded.assists,
                    yellow_cards = V2_player_statistics.yellow_cards + excluded.yellow_cards,
                    red_cards = V2_player_statistics.red_cards + excluded.red_cards,
                    updated_at = datetime('now')`);

            // Delete old victim stats
            await db.run(`DELETE FROM V2_player_statistics WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);

            console.log("Merging history and trophies...");

            // 4. History
            await db.run(`UPDATE OR IGNORE V2_player_club_history 
                SET club_id = (SELECT survivor_id FROM _Merge_ClubMapping WHERE victim_id = V2_player_club_history.club_id)
                WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);
            await db.run(`DELETE FROM V2_player_club_history WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);

            // 5. Trophies
            await db.run(`UPDATE OR IGNORE V2_player_trophies
                SET club_id = (SELECT survivor_id FROM _Merge_ClubMapping WHERE victim_id = V2_player_trophies.club_id)
                WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);
            await db.run(`DELETE FROM V2_player_trophies WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);

            // 6. Club Trophies
            await db.run(`UPDATE OR IGNORE V2_club_trophies
                SET club_id = (SELECT survivor_id FROM _Merge_ClubMapping WHERE victim_id = V2_club_trophies.club_id)
                WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);
            await db.run(`DELETE FROM V2_club_trophies WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);

            // 7. Unresolved
            await db.run(`UPDATE V2_unresolved_competitions
                SET club_id = (SELECT survivor_id FROM _Merge_ClubMapping WHERE victim_id = V2_unresolved_competitions.club_id)
                WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);

            console.log("Deleting duplicate clubs...");
            // 8. Delete Clubs
            await db.run(`DELETE FROM V2_clubs WHERE club_id IN (SELECT victim_id FROM _Merge_ClubMapping)`);

            console.log("Cleaning up tables...");
            await db.run("DROP TABLE _Merge_DuplicateClubs");
            await db.run("DROP TABLE _Merge_ClubMapping");
            await db.run("DROP TABLE _Merge_StatsToMerge");
        }

        console.log(`✅ Success! Completed in ${(Date.now() - start) / 1000}s`);

    } catch (e) {
        console.error("❌ Critical Error:", e);
        try {
            await db.run("DROP TABLE IF EXISTS _Merge_DuplicateClubs");
            await db.run("DROP TABLE IF EXISTS _Merge_ClubMapping");
            await db.run("DROP TABLE IF EXISTS _Merge_StatsToMerge");
        } catch (e2) { }
    }
};

run();
