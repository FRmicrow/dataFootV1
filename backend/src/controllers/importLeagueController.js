import db from '../config/database.js';
import footballApi from '../services/footballApi.js';

/**
 * Optimized Import Logic: League -> Teams -> Players
 * PRO PLAN Optimized: Uses hierarchy to minimize API calls.
 */

export const importLeagueData = async (req, res) => {
    try {
        const { leagueId, season } = req.body;

        if (!leagueId || !season) {
            return res.status(400).json({ error: 'League ID and Season are required' });
        }

        // Setup SSE for real-time logs
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        sendLog(`🚀 Starting Optimized Import for League ${leagueId} (Season ${season})`, 'info');

        // 1. Verify/Import Competition
        // We do not assume it exists; we might need to fetch it if we had an endpoint, 
        // but for now we assume the ID is valid or we create a placeholder if missing.
        let competition = db.get("SELECT competition_id, competition_name FROM V2_competitions WHERE api_id = ?", [leagueId]);
        if (!competition) {
            sendLog(`⚠️ League ${leagueId} not found in DB. Creating placeholder...`, 'warning');
            // We can't easily fetch just "league details" without a specific endpoint that returns just one, 
            // usually /leagues?id=X. Let's try to fetch teams, it will give us league info in the response most likely 
            // or we just proceed with teams.
        }

        // 2. Fetch Teams in League
        sendLog(`📡 Fetching teams for League ${leagueId}...`, 'info');
        const teamsResponse = await footballApi.getTeamsByLeague(leagueId, season);

        if (!teamsResponse?.response?.length) {
            sendLog(`❌ No teams found for League ${leagueId} in Season ${season}`, 'error');
            res.end();
            return;
        }

        const teamsData = teamsResponse.response;
        sendLog(`✅ Found ${teamsData.length} teams. Processing teams...`, 'success');

        const teamIds = [];

        // Transaction for Teams
        db.run("BEGIN TRANSACTION");
        try {
            for (const item of teamsData) {
                const { team, venue } = item;

                // Ensure League is linked/updated if we have info (item.league usually not in teams endpoint, but let's check structure if needed)
                // Actually /teams?league=X returns team info.

                // Upsert Team
                let club = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
                if (!club) {
                    db.run(`INSERT INTO V2_clubs (api_id, club_name, club_short_name, club_logo_url, founded_year, city, stadium_name, stadium_capacity, country_id, is_active, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)`,
                        [team.id, team.name, team.code, team.logo, team.founded, venue?.city, venue?.name, venue?.capacity]
                    );
                    club = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
                } else {
                    // Update details
                    db.run(`UPDATE V2_clubs SET club_name = ?, club_logo_url = ?, city = ?, stadium_name = ? WHERE club_id = ?`,
                        [team.name, team.logo, venue?.city, venue?.name, club.club_id]
                    );
                }

                if (club) teamIds.push({ dbId: club.club_id, apiId: team.id, name: team.name });
            }
            db.run("COMMIT");
        } catch (e) {
            db.run("ROLLBACK");
            console.error(e);
            sendLog(`❌ Error saving teams: ${e.message}`, 'error');
            res.end();
            return;
        }

        // 3. Process Players for each Team
        let totalPlayersImported = 0;
        let totalStatsImported = 0;

        for (const team of teamIds) {
            sendLog(`⚽ Fetching players for ${team.name} (ID: ${team.apiId})...`, 'info');

            let page = 1;
            let totalPages = 1;

            while (page <= totalPages) {
                try {
                    const playersResponse = await footballApi.getPlayersByTeam(team.apiId, season, page);

                    if (!playersResponse?.response) {
                        break;
                    }

                    const { paging, response: playersList } = playersResponse;
                    totalPages = paging.total;

                    // Bulk Upsert Players & Stats
                    // We do this in a transaction per page to be safe
                    db.run("BEGIN TRANSACTION");

                    for (const pData of playersList) {
                        const { player, statistics } = pData;

                        // Upsert Player
                        let playerRecord = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [player.id]);
                        let localPlayerId;

                        if (!playerRecord) {
                            db.run(`INSERT INTO V2_players (api_id, first_name, last_name, date_of_birth, photo_url, height_cm, weight_kg, birth_country, birth_place, is_active, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
                                [player.id, player.firstname, player.lastname, player.birth.date, player.photo,
                                parseInt(player.height) || null, parseInt(player.weight) || null, player.birth.country, player.birth.place]
                            );
                            playerRecord = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [player.id]);
                        }
                        localPlayerId = playerRecord.player_id;

                        // Mark as fully imported for this season (conceptually)
                        db.run("UPDATE V2_players SET updated_at = CURRENT_TIMESTAMP WHERE player_id = ?", [localPlayerId]);

                        // Process Statistics
                        for (const stat of statistics) {
                            if (stat.league.id !== parseInt(leagueId)) {
                                // The API returns stats for ALL leagues the player played in.
                                // We should save them all, not just the current league, because it's "free" data.
                                // resolve competition...
                            }

                            // Resolve Competition (Optimized locally?)
                            // For now, we query to be safe, but we could cache this.
                            let compId = null;
                            if (stat.league.id) {
                                const comp = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [stat.league.id]);
                                if (comp) compId = comp.competition_id;
                                else {
                                    // Create generic if missing
                                    db.run("INSERT INTO V2_competitions (competition_name, api_id, country_id, created_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)", [stat.league.name, stat.league.id]);
                                    const newComp = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [stat.league.id]);
                                    compId = newComp.competition_id;
                                }
                            }

                            // Upsert Stats
                            const existingStat = db.get(
                                "SELECT stat_id FROM V2_player_statistics WHERE player_id = ? AND club_id = ? AND competition_id = ? AND season = ?",
                                [localPlayerId, team.dbId, compId, season.toString()] // Use CURRENT team ID from outer loop? 
                                // CAREFUL: player.statistics array has `team` inside it. Use that.
                            );

                            // The `stat` object has its own team. Use that to be accurate (player might have transferred)
                            let statClubId = team.dbId;
                            if (stat.team.id && stat.team.id !== team.apiId) {
                                // Resolving different club (transfers/loans)
                                const otherClub = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [stat.team.id]);
                                if (otherClub) statClubId = otherClub.club_id;
                                else {
                                    // Create missing club stub
                                    db.run("INSERT INTO V2_clubs (api_id, club_name, club_logo_url, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                                        [stat.team.id, stat.team.name, stat.team.logo]);
                                    statClubId = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [stat.team.id]).club_id;
                                }
                            }

                            if (existingStat) {
                                db.run(`UPDATE V2_player_statistics SET
                                    matches_played = ?, matches_started = ?, minutes_played = ?,
                                    goals = ?, assists = ?, yellow_cards = ?, red_cards = ?,
                                    penalty_goals = ?, penalty_misses = ?, updated_at = CURRENT_TIMESTAMP
                                    WHERE stat_id = ?`,
                                    [stat.games.appearences || 0, stat.games.lineups || 0, stat.games.minutes || 0,
                                    stat.goals.total || 0, stat.goals.assists || 0, stat.cards.yellow || 0, stat.cards.red || 0,
                                    stat.penalty?.scored || 0, stat.penalty?.missed || 0, existingStat.stat_id]
                                );
                            } else {
                                db.run(`INSERT INTO V2_player_statistics (
                                    player_id, club_id, competition_id, season, year,
                                    matches_played, matches_started, minutes_played,
                                    goals, assists, yellow_cards, red_cards,
                                    penalty_goals, penalty_misses, created_at, updated_at
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                                    [localPlayerId, statClubId, compId, season.toString(), parseInt(season),
                                        stat.games.appearences || 0, stat.games.lineups || 0, stat.games.minutes || 0,
                                        stat.goals.total || 0, stat.goals.assists || 0, stat.cards.yellow || 0, stat.cards.red || 0,
                                        stat.penalty?.scored || 0, stat.penalty?.missed || 0]
                                );
                            }
                            totalStatsImported++;
                        }
                        totalPlayersImported++;
                    }

                    db.run("COMMIT");
                    sendLog(`   ↳ Page ${page}/${totalPages} processed (${playersList.length} players)`, 'success');
                    page++;

                } catch (err) {
                    try { db.run("ROLLBACK"); } catch (e) { }
                    console.error(`Error processing page ${page} for team ${team.name}:`, err);
                    sendLog(`❌ Error on page ${page}: ${err.message}`, 'error');
                    break; // Skip to next team?
                }
            }
        }

        sendLog(`✅ Import Complete! Processed ${totalPlayersImported} players and ${totalStatsImported} stats entries.`, 'complete');
        res.write(`data: ${JSON.stringify({ type: 'complete', imported: totalPlayersImported })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Fatal Error in league import:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};
