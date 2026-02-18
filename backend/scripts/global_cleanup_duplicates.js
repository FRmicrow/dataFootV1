import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(__dirname, '../database.sqlite');

async function globalCleanup() {
    console.log('--- GLOBAL DATABASE CLEANUP: DEDUPLICATION ---');
    console.log(`Target database: ${dbPath}`);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    try {
        await db.run('PRAGMA foreign_keys = OFF;'); // Speed up and avoid constraint issues during intermediate steps

        // 1. Find Duplicate Competitions (Same name and country)
        console.log('\nStep 1: Auditing duplicate competitions...');
        const duplicateGroups = await db.all(`
            SELECT LOWER(competition_name) as name, country_id, COUNT(*) as count
            FROM V2_competitions
            GROUP BY name, country_id
            HAVING count > 1
        `);

        console.log(`Found ${duplicateGroups.length} groups of duplicate competitions.`);

        for (const group of duplicateGroups) {
            const members = await db.all(`
                SELECT competition_id, competition_name, 
                       (SELECT COUNT(*) FROM V2_player_statistics WHERE competition_id = c.competition_id) as stats_count
                FROM V2_competitions c
                WHERE LOWER(competition_name) = ? AND (country_id = ? OR (country_id IS NULL AND ? IS NULL))
            `, [group.name, group.country_id, group.country_id]);

            // Pick Master: highest stats count, then lowest ID
            members.sort((a, b) => b.stats_count - a.stats_count || a.competition_id - b.competition_id);
            const master = members[0];
            const duplicates = members.slice(1);

            console.log(`Merging into Master ID ${master.competition_id} ("${master.competition_name}", ${master.stats_count} stats):`);

            for (const dup of duplicates) {
                const dupId = dup.competition_id;
                const masterId = master.competition_id;
                console.log(`  <- ID ${dupId} ("${dup.competition_name}", ${dup.stats_count} stats)`);

                // 2. Safely Update Statistics for this duplicate
                const statsToMove = await db.all('SELECT * FROM V2_player_statistics WHERE competition_id = ?', [dupId]);

                for (const stat of statsToMove) {
                    // Check if master already has this (player, club, masterId, season)
                    const existing = await db.get(`
                        SELECT stat_id, matches_played, goals, assists 
                        FROM V2_player_statistics 
                        WHERE player_id = ? AND club_id = ? AND competition_id = ? AND season = ?
                    `, [stat.player_id, stat.club_id, masterId, stat.season]);

                    if (existing) {
                        // Conflict! Deduplicate.
                        // If current stat has better data, keep it? 
                        // Actually, just keep one. If both have data, we could sum them (if they represent disjoint periods) 
                        // but usually they are clones.
                        if (stat.matches_played > existing.matches_played) {
                            await db.run('DELETE FROM V2_player_statistics WHERE stat_id = ?', [existing.stat_id]);
                            await db.run('UPDATE V2_player_statistics SET competition_id = ? WHERE stat_id = ?', [masterId, stat.stat_id]);
                        } else {
                            await db.run('DELETE FROM V2_player_statistics WHERE stat_id = ?', [stat.stat_id]);
                        }
                    } else {
                        // No conflict, just update
                        await db.run('UPDATE V2_player_statistics SET competition_id = ? WHERE stat_id = ?', [masterId, stat.stat_id]);
                    }
                }

                // 3. Update other references
                await db.run('UPDATE V2_player_trophies SET competition_id = ? WHERE competition_id = ?', [masterId, dupId]);
                await db.run('UPDATE V2_club_trophies SET competition_id = ? WHERE competition_id = ?', [masterId, dupId]);
                await db.run('UPDATE V2_unresolved_competitions SET resolved_competition_id = ? WHERE resolved_competition_id = ?', [masterId, dupId]);

                // 4. Delete the duplicate competition record
                await db.run('DELETE FROM V2_competitions WHERE competition_id = ?', [dupId]);
            }
        }

        console.log('\nStep 2: Performing global statistics check for leftovers...');
        // Final sanity check for any random duplicates not caught by competition merge logic
        const statDuplicates = await db.all(`
            SELECT player_id, club_id, competition_id, season, COUNT(*) as count
            FROM V2_player_statistics
            GROUP BY player_id, club_id, competition_id, season
            HAVING count > 1
        `);

        if (statDuplicates.length > 0) {
            console.log(`Found ${statDuplicates.length} remaining duplicate statistics sets. Fixing...`);
            for (const d of statDuplicates) {
                const records = await db.all(`
                    SELECT * FROM V2_player_statistics
                    WHERE player_id = ? AND club_id = ? AND competition_id = ? AND season = ?
                `, [d.player_id, d.club_id, d.competition_id, d.season]);

                records.sort((a, b) => b.matches_played - a.matches_played || a.stat_id - b.stat_id);
                for (const redundant of records.slice(1)) {
                    await db.run('DELETE FROM V2_player_statistics WHERE stat_id = ?', [redundant.stat_id]);
                }
            }
        } else {
            console.log('No leftover statistics duplicates found.');
        }

        console.log('\nFinalizing changes...');
        await db.run('PRAGMA foreign_keys = ON;');
        await db.run('VACUUM;');
        console.log('✅ Global Cleanup COMPLETED successfully.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
    } finally {
        await db.close();
    }
}

globalCleanup();
