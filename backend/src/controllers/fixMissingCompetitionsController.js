import db from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { match } from 'assert';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

// Scan all players for missing or corrupted competition data
export const scanMissingCompetitions = async (req, res) => {
    try {
        // Set up SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        sendLog('🔍 Scanning database for missing or invalid competition data...', 'info');

        // 1. Find stats with NULL competition_id
        const nullStats = db.all(`
            SELECT 
                COUNT(*) as count,
                COUNT(DISTINCT player_id) as affected_players
            FROM V2_player_statistics 
            WHERE competition_id IS NULL
        `);

        // 2. Find stats with invalid competition_id (orphaned)
        const orphanedStats = db.all(`
            SELECT 
                COUNT(*) as count,
                COUNT(DISTINCT ps.player_id) as affected_players
            FROM V2_player_statistics ps
            LEFT JOIN V2_competitions c ON ps.competition_id = c.competition_id
            WHERE ps.competition_id IS NOT NULL AND c.competition_id IS NULL
        `);

        const nullCount = nullStats[0].count;
        const orphanedCount = orphanedStats[0].count;

        sendLog(`📊 Missing Competitions (NULL): ${nullCount}`, 'info');
        if (orphanedCount > 0) {
            sendLog(`🚫 Invalid Competitions (Orphaned): ${orphanedCount}`, 'warning');
        } else {
            sendLog(`✅ Invalid Competitions (Orphaned): ${orphanedCount}`, 'success');
        }

        // Get detailed breakdown by player (combining both issues)
        const playerBreakdown = db.all(`
            SELECT 
                p.player_id,
                p.first_name,
                p.last_name,
                p.api_id,
                SUM(CASE WHEN ps.competition_id IS NULL THEN 1 ELSE 0 END) as null_count,
                SUM(CASE WHEN ps.competition_id IS NOT NULL AND c.competition_id IS NULL THEN 1 ELSE 0 END) as orphaned_count
            FROM V2_player_statistics ps
            JOIN V2_players p ON ps.player_id = p.player_id
            LEFT JOIN V2_competitions c ON ps.competition_id = c.competition_id
            WHERE ps.competition_id IS NULL 
               OR (ps.competition_id IS NOT NULL AND c.competition_id IS NULL)
            GROUP BY p.player_id
            ORDER BY (null_count + orphaned_count) DESC
            LIMIT 50
        `);

        sendLog('📋 Top 50 players with data issues:', 'info');

        // Send final result structure
        res.write(`data: ${JSON.stringify({
            type: 'complete',
            stats: {
                nullCount,
                orphanedCount,
                totalIssues: nullCount + orphanedCount
            },
            playerBreakdown
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error('❌ Error scanning:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
        })}\n\n`);
        res.end();
    }
};

// Fix all missing competitions globally
export const fixAllMissingCompetitions = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        sendLog('🔧 Starting global repair...', 'info');

        // Get all problematic stats (NULL or Orphaned)
        const problematicStats = db.all(`
            SELECT 
                ps.stat_id,
                ps.player_id,
                p.api_id as player_api_id,
                p.first_name,
                p.last_name,
                ps.club_id,
                c.club_name,
                c.api_id as club_api_id,
                ps.year,
                ps.matches_played,
                ps.goals,
                ps.assists,
                ps.competition_id
            FROM V2_player_statistics ps
            JOIN V2_players p ON ps.player_id = p.player_id
            JOIN V2_clubs c ON ps.club_id = c.club_id
            LEFT JOIN V2_competitions comp ON ps.competition_id = comp.competition_id
            WHERE ps.competition_id IS NULL 
               OR (ps.competition_id IS NOT NULL AND comp.competition_id IS NULL)
            ORDER BY ps.year DESC
        `);

        // Group by API call (Player + Season + Team) to minimize API usage
        const groupedTasks = {};
        problematicStats.forEach(stat => {
            if (!stat.player_api_id || !stat.club_api_id) return;

            const key = `${stat.player_api_id}-${stat.year}-${stat.club_api_id}`;
            if (!groupedTasks[key]) {
                groupedTasks[key] = {
                    player_api_id: stat.player_api_id,
                    year: stat.year,
                    club_api_id: stat.club_api_id,
                    player_name: `${stat.first_name} ${stat.last_name}`,
                    club_name: stat.club_name,
                    items: []
                };
            }
            groupedTasks[key].items.push(stat);
        });

        const tasks = Object.values(groupedTasks);
        sendLog(`📊 Found ${problematicStats.length} issues across ${tasks.length} API calls`, 'info');

        let totalFixed = 0;
        let totalErrors = 0;
        let apiCalls = 0;

        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];

            // Progress
            if (i % 5 === 0) {
                const progress = Math.round((i / tasks.length) * 100);
                sendLog(`⏳ Progress: ${i}/${tasks.length} (${progress}%)`, 'progress');
            }

            try {
                // Call API
                const response = await axios.get(`${API_BASE_URL}/players`, {
                    headers: { 'x-apisports-key': API_KEY },
                    params: {
                        id: task.player_api_id,
                        season: task.year,
                        team: task.club_api_id
                    }
                });
                apiCalls++;
                await new Promise(resolve => setTimeout(resolve, 350)); // Rate limit

                const apiData = response.data?.response?.[0];
                if (!apiData || !apiData.statistics) {
                    sendLog(`⚠️ No API data for: ${task.player_name} (${task.year})`, 'warning');
                    continue;
                }

                // For each problematic stat in this group, try to find a match
                for (const stat of task.items) {
                    const match = apiData.statistics.find(s => {
                        const m = s.games?.appearences || 0;
                        const g = s.goals?.total || 0;
                        const a = s.goals?.assists || 0;
                        return m === stat.matches_played && g === stat.goals && a === stat.assists;
                    });

                    if (match && match.league && match.league.id) {
                        const league = match.league;

                        // 1. Ensure Competition Exists
                        let comp = db.get('SELECT competition_id FROM V2_competitions WHERE api_id = ?', [league.id]);

                        if (!comp) {
                            // Fetch country for the league
                            let countryId = 1; // Default World
                            if (league.country) {
                                const country = db.get('SELECT country_id FROM V2_countries WHERE country_name = ?', [league.country]);
                                if (country) countryId = country.country_id;
                            }

                            try {
                                db.run(`INSERT INTO V2_competitions (api_id, competition_name, country_id) VALUES (?, ?, ?)`,
                                    [league.id, league.name, countryId]);
                                comp = db.get('SELECT competition_id FROM V2_competitions WHERE api_id = ?', [league.id]);
                                sendLog(`➕ Created Competition: ${league.name}`, 'info');
                            } catch (e) {
                                // Race condition handling
                                comp = db.get('SELECT competition_id FROM V2_competitions WHERE api_id = ?', [league.id]);
                            }
                        }

                        if (comp) {
                            db.run('UPDATE V2_player_statistics SET competition_id = ? WHERE stat_id = ?',
                                [comp.competition_id, stat.stat_id]);
                            totalFixed++;
                            sendLog(`✅ Fixed: ${task.player_name} -> ${league.name}`, 'success');
                        }
                    } else {
                        // sendLog(`❌ No statistic match for ${task.player_name} (M:${stat.matches_played} G:${stat.goals})`, 'warning');
                        totalErrors++;
                    }
                }

            } catch (err) {
                console.error(err);
                sendLog(`❌ API Error: ${err.message}`, 'error');
                totalErrors++;
            }
        }

        sendLog('✅ Repair process complete!', 'success');

        res.write(`data: ${JSON.stringify({
            type: 'complete',
            totalFixed,
            totalErrors,
            apiCalls
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error('❌ Error fixing:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
        })}\n\n`);
        res.end();
    }
};

// Fix missing API IDs for competitions
export const fixCompetitionApiIds = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        sendLog('🔧 Scanning for competitions with missing API IDs...', 'info');

        const missingApiIds = db.all('SELECT * FROM V2_competitions WHERE api_id IS NULL');

        if (missingApiIds.length === 0) {
            sendLog('✅ No competitions found with missing API IDs.', 'success');
            res.write(`data: ${JSON.stringify({ type: 'complete', fixed: 0, total: 0 })}\n\n`);
            res.end();
            return;
        }

        sendLog(`📊 Found ${missingApiIds.length} competitions to fix`, 'info');

        let fixed = 0;
        let errors = 0;

        for (let i = 0; i < missingApiIds.length; i++) {
            const comp = missingApiIds[i];

            // Progress
            if (i % 5 === 0) {
                const progress = Math.round((i / missingApiIds.length) * 100);
                sendLog(`⏳ Progress: ${i}/${missingApiIds.length} (${progress}%)`, 'progress');
            }

            try {
                // Determine search parameter
                // Remove special characters or keep strictly the name?
                // Using "name" parameter with exact match preferred

                sendLog(`🔎 Searching for: ${comp.competition_name}`, 'info');

                const response = await axios.get(`${API_BASE_URL}/leagues`, {
                    headers: { 'x-apisports-key': API_KEY },
                    params: {
                        name: comp.competition_name
                    }
                });

                await new Promise(resolve => setTimeout(resolve, 350)); // Rate limit

                const leagues = response.data?.response;

                if (leagues && leagues.length > 0) {
                    let bestMatch = null;

                    // If we have a country_id, try to match by country
                    if (comp.country_id && comp.country_id !== 1) { // 1 is usually World
                        const countryName = db.get('SELECT country_name FROM V2_countries WHERE country_id = ?', [comp.country_id])?.country_name;

                        if (countryName) {
                            bestMatch = leagues.find(l => l.country?.name === countryName);
                        }
                    }

                    // Fallback to first result if no country specific match or World
                    if (!bestMatch) {
                        bestMatch = leagues[0];
                    }

                    if (bestMatch) {
                        db.run('UPDATE V2_competitions SET api_id = ? WHERE competition_id = ?',
                            [bestMatch.league.id, comp.competition_id]);

                        fixed++;
                        sendLog(`✅ Matched: ${comp.competition_name} -> ID: ${bestMatch.league.id} (${bestMatch.country.name})`, 'success');
                    } else {
                        sendLog(`⚠️ No close match found for: ${comp.competition_name}. Deleting...`, 'warning');

                        db.run('DELETE FROM V2_player_statistics WHERE competition_id = ?', [comp.competition_id]);
                        db.run('DELETE FROM V2_competitions WHERE competition_id = ?', [comp.competition_id]);

                        sendLog(`🗑️ Deleted competition and linked stats`, 'info');
                        errors++;
                    }

                } else {
                    sendLog(`❌ No results found on API for: ${comp.competition_name}. Deleting...`, 'error');

                    db.run('DELETE FROM V2_player_statistics WHERE competition_id = ?', [comp.competition_id]);
                    db.run('DELETE FROM V2_competitions WHERE competition_id = ?', [comp.competition_id]);

                    sendLog(`🗑️ Deleted competition and linked stats`, 'info');
                    errors++;
                }

            } catch (err) {
                console.error(err);
                sendLog(`❌ Error processing ${comp.competition_name}: ${err.message}`, 'error');
                errors++;
            }
        }

        sendLog('✅ Competition ID Fix complete!', 'success');

        res.write(`data: ${JSON.stringify({
            type: 'complete',
            fixed,
            errors,
            total: missingApiIds.length
        })}\n\n`);

        res.end();

    } catch (error) {
        console.error('❌ Error fixing comp IDs:', error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            message: error.message
        })}\n\n`);
        res.end();
    }
};

// Fix single player missing competitions
export const fixPlayerMissingCompetitions = async (req, res) => {
    // Reuse logic if needed, or implement simplified version
    res.json({ message: "Use global repair" });
};
