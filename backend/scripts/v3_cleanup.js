
const runCleanup = async () => {
    const dbV3 = (await import('../src/config/database_v3.js')).default;

    console.log('🚀 Starting V3 Database Cleanup & Consolidator...');
    await dbV3.init();

    // ==========================================
    // 1. DEDUPLICATE LEAGUES (Safe Merge)
    // ==========================================
    console.log('\n🧹 [1/3] Deduplicating Leagues...');
    const duplicateLeagues = dbV3.all(`
        SELECT name, COUNT(*) as count 
        FROM V3_Leagues 
        GROUP BY name 
        HAVING count > 1
    `);

    if (duplicateLeagues.length === 0) {
        console.log('   ✅ No duplicate leagues found.');
    } else {
        console.log(`   ⚠️ Found ${duplicateLeagues.length} league names with duplicates.`);

        for (const d of duplicateLeagues) {
            const leagues = dbV3.all("SELECT league_id, api_id, name FROM V3_Leagues WHERE name = ? ORDER BY api_id DESC, league_id ASC", [d.name]);
            if (leagues.length < 2) continue;

            const winner = leagues[0];
            const losers = leagues.slice(1);

            console.log(`      Merging '${d.name}': Keeping ID ${winner.league_id}, processing ${losers.length} others.`);

            for (const loser of losers) {
                // A. Safe Merge Player Stats
                const stats = dbV3.all("SELECT stat_id, player_id, team_id, season_year FROM V3_Player_Stats WHERE league_id = ?", [loser.league_id]);
                for (const stat of stats) {
                    const exists = dbV3.get(
                        "SELECT stat_id FROM V3_Player_Stats WHERE league_id = ? AND player_id = ? AND team_id = ? AND season_year = ?",
                        [winner.league_id, stat.player_id, stat.team_id, stat.season_year]
                    );

                    if (exists) {
                        // Collision: Winner has it, so delete loser's duplicate
                        dbV3.run("DELETE FROM V3_Player_Stats WHERE stat_id = ?", [stat.stat_id]);
                    } else {
                        // Safe to move
                        dbV3.run("UPDATE V3_Player_Stats SET league_id = ? WHERE stat_id = ?", [winner.league_id, stat.stat_id]);
                    }
                }

                // B. Safe Merge Other Tables (Simple approach: Update OR Ignore, then Delete Loser)
                dbV3.run("UPDATE OR IGNORE V3_League_Seasons SET league_id = ? WHERE league_id = ?", [winner.league_id, loser.league_id]);
                dbV3.run("DELETE FROM V3_League_Seasons WHERE league_id = ?", [loser.league_id]); // Cleanup leftovers

                dbV3.run("UPDATE V3_Fixtures SET league_id = ? WHERE league_id = ?", [winner.league_id, loser.league_id]);
                dbV3.run("UPDATE V3_Standings SET league_id = ? WHERE league_id = ?", [winner.league_id, loser.league_id]); // Might fail unique, but less critical

                // C. Delete Loser League
                dbV3.run("DELETE FROM V3_Leagues WHERE league_id = ?", [loser.league_id]);
            }
        }
    }

    // ==========================================
    // 2. DEDUPLICATE TEAMS (Safe Merge)
    // ==========================================
    console.log('\n🧹 [2/3] Deduplicating Teams...');
    const duplicateTeams = dbV3.all(`
        SELECT name, COUNT(*) as count 
        FROM V3_Teams 
        GROUP BY name 
        HAVING count > 1
    `);

    if (duplicateTeams.length === 0) {
        console.log('   ✅ No duplicate teams found.');
    } else {
        console.log(`   ⚠️ Found ${duplicateTeams.length} team names with duplicates.`);

        for (const d of duplicateTeams) {
            const teams = dbV3.all("SELECT team_id, api_id, name FROM V3_Teams WHERE name = ? ORDER BY api_id DESC, team_id ASC", [d.name]);
            if (teams.length < 2) continue;

            const winner = teams[0];
            const losers = teams.slice(1);

            console.log(`      Merging '${d.name}': Keeping ID ${winner.team_id}, processing ${losers.length} others.`);

            for (const loser of losers) {
                // Safe Merge Player Stats
                const stats = dbV3.all("SELECT stat_id, player_id, league_id, season_year FROM V3_Player_Stats WHERE team_id = ?", [loser.team_id]);
                for (const stat of stats) {
                    const exists = dbV3.get(
                        "SELECT stat_id FROM V3_Player_Stats WHERE team_id = ? AND player_id = ? AND league_id = ? AND season_year = ?",
                        [winner.team_id, stat.player_id, stat.league_id, stat.season_year]
                    );

                    if (exists) {
                        dbV3.run("DELETE FROM V3_Player_Stats WHERE stat_id = ?", [stat.stat_id]);
                    } else {
                        dbV3.run("UPDATE V3_Player_Stats SET team_id = ? WHERE stat_id = ?", [winner.team_id, stat.stat_id]);
                    }
                }

                // Others
                dbV3.run("UPDATE V3_Standings SET team_id = ? WHERE team_id = ?", [winner.team_id, loser.team_id]);
                dbV3.run("UPDATE V3_Fixtures SET home_team_id = ? WHERE home_team_id = ?", [winner.team_id, loser.team_id]);
                dbV3.run("UPDATE V3_Fixtures SET away_team_id = ? WHERE away_team_id = ?", [winner.team_id, loser.team_id]);

                dbV3.run("DELETE FROM V3_Teams WHERE team_id = ?", [loser.team_id]);
            }
        }
    }

    // ==========================================
    // 3. FINAL STATS CLEANUP (Just in case)
    // ==========================================
    console.log('\n🧹 [3/3] Final Stats Sanity Check...');
    const duplicateStats = dbV3.all(`
        SELECT player_id, team_id, league_id, season_year, COUNT(*) as count 
        FROM V3_Player_Stats 
        GROUP BY player_id, team_id, league_id, season_year 
        HAVING count > 1
    `);

    if (duplicateStats.length > 0) {
        console.log(`   ⚠️ Found ${duplicateStats.length} remaining duplicate stat groups. Fixing...`);
        for (const d of duplicateStats) {
            const rows = dbV3.all(`
                SELECT stat_id 
                FROM V3_Player_Stats 
                WHERE player_id = ? AND team_id = ? AND league_id = ? AND season_year = ?
                ORDER BY games_minutes DESC
            `, [d.player_id, d.team_id, d.league_id, d.season_year]);

            // Keep first, delete rest
            for (let i = 1; i < rows.length; i++) {
                dbV3.run('DELETE FROM V3_Player_Stats WHERE stat_id = ?', [rows[i].stat_id]);
            }
        }
        console.log(`   ✅ Removed remaining duplicates.`);
    } else {
        console.log('   ✅ No stats duplicates found.');
    }

    console.log('\n🎉 VALIDATION COMPLETE.');
    const messiStats = dbV3.all("SELECT count(*) as count FROM V3_Player_Stats WHERE player_id = 2982");
    console.log(`   Messi (ID 2982) now has ${messiStats[0].count} stat rows.`);

    // Explicit Unique Index (if not already existing by internal constraint)
    // Since table has UNIQUE constraint, we don't strictly *need* to add another index, but it's good practice for speed.
    try {
        dbV3.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_v3_player_stats_unique ON V3_Player_Stats(player_id, team_id, league_id, season_year)`);
    } catch (e) { }
};

runCleanup().catch(console.error);
