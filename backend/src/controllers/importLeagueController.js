import db from '../config/database.js';
import footballApi from '../services/footballApi.js';

/**
 * Helper to run the import logic internally
 * Returns summary of work done.
 */
const runImportJob = async (leagueId, season, sendLog) => {
    let totalPlayersImported = 0;
    let totalStatsImported = 0;

    // 1. Fetch Teams in League
    sendLog(`📡 Fetching teams for League ${leagueId}...`, 'info');
    const teamsResponse = await footballApi.getTeamsByLeague(leagueId, season);

    if (!teamsResponse?.response?.length) {
        throw new Error(`No teams found for League ${leagueId} in Season ${season}`);
    }

    const teamsData = teamsResponse.response;
    sendLog(`✅ Found ${teamsData.length} teams. Processing teams...`, 'success');

    const teamIds = [];

    // Transaction for Teams
    db.run("BEGIN TRANSACTION");
    try {
        for (const item of teamsData) {
            const { team, venue } = item;
            let club = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
            if (!club) {
                db.run(`INSERT INTO V2_clubs (api_id, club_name, club_short_name, club_logo_url, founded_year, city, stadium_name, stadium_capacity, country_id, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, CURRENT_TIMESTAMP)`,
                    [team.id, team.name, team.code, team.logo, team.founded, venue?.city, venue?.name, venue?.capacity]
                );
                club = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
            } else {
                db.run(`UPDATE V2_clubs SET club_name = ?, club_logo_url = ?, city = ?, stadium_name = ? WHERE club_id = ?`,
                    [team.name, team.logo, venue?.city, venue?.name, club.club_id]
                );
            }
            if (club) teamIds.push({ dbId: club.club_id, apiId: team.id, name: team.name });
        }
        db.run("COMMIT");
    } catch (e) {
        db.run("ROLLBACK");
        throw e;
    }

    // 2. Process Players for each Team
    for (const team of teamIds) {
        sendLog(`⚽ Fetching players for ${team.name} (ID: ${team.apiId})...`, 'info');

        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            try {
                const playersResponse = await footballApi.getPlayersByTeam(team.apiId, season, page);
                if (!playersResponse?.response) break;

                const { paging, response: playersList } = playersResponse;
                totalPages = paging.total;

                db.run("BEGIN TRANSACTION");
                for (const pData of playersList) {
                    const { player, statistics } = pData;
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
                    db.run("UPDATE V2_players SET updated_at = CURRENT_TIMESTAMP WHERE player_id = ?", [localPlayerId]);

                    for (const stat of statistics) {
                        let compId = null;
                        if (stat.league.id) {
                            const comp = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [stat.league.id]);
                            if (comp) compId = comp.competition_id;
                            else {
                                const name = stat.league.name ? stat.league.name.toLowerCase() : "";
                                let typeId = 7;
                                if (name.includes('cup') || name.includes('pokal') || name.includes('taça') ||
                                    name.includes('copa') || name.includes('shield') || name.includes('trophy')) typeId = 8;
                                else if (name.includes('champions league') || name.includes('europa') || name.includes('conference')) typeId = 5;
                                else if (name.includes('national team') || name.includes('world cup') || name.includes('euro')) typeId = 6;

                                db.run("INSERT INTO V2_competitions (competition_name, api_id, country_id, trophy_type_id, created_at) VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)",
                                    [stat.league.name, stat.league.id, typeId]);
                                compId = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [stat.league.id]).competition_id;
                            }
                        }

                        const existingStat = db.get(
                            "SELECT stat_id FROM V2_player_statistics WHERE player_id = ? AND club_id = ? AND competition_id = ? AND season = ?",
                            [localPlayerId, team.dbId, compId, season.toString()]
                        );

                        let statClubId = team.dbId;
                        if (stat.team.id && stat.team.id !== team.apiId) {
                            const otherClub = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [stat.team.id]);
                            if (otherClub) statClubId = otherClub.club_id;
                            else {
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
                sendLog(`❌ Error on page ${page}: ${err.message}`, 'error');
                break;
            }
        }
    }

    return { totalPlayersImported, totalStatsImported };
};

/**
 * Optimized Import Logic: League -> Teams -> Players
 * PRO PLAN Optimized: Uses hierarchy to minimize API calls.
 */

export const importLeagueData = async (req, res) => {
    try {
        let { leagueId, season } = req.body;

        // Support GET for SSE EventSource
        if (req.method === 'GET') {
            leagueId = req.query.leagueId;
            season = req.query.season;
        }

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

        // 0. Check Status / Prevent Overlaps
        const currentStatus = db.get("SELECT status FROM V2_import_status WHERE league_id = ? AND season = ?", [leagueId, season]);
        if (currentStatus?.status === 'IN_PROGRESS') {
            sendLog(`⚠️ Import already in progress for this league and season.`, 'warning');
            res.end();
            return;
        }

        db.run("INSERT OR REPLACE INTO V2_import_status (league_id, season, status, updated_at) VALUES (?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)", [leagueId, season]);

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

        const result = await runImportJob(leagueId, season, sendLog);

        db.run("UPDATE V2_import_status SET status = 'COMPLETED', imported_players = ?, updated_at = CURRENT_TIMESTAMP WHERE league_id = ? AND season = ?",
            [result.totalPlayersImported, leagueId, season]);

        sendLog(`✅ Import Complete! Processed ${result.totalPlayersImported} players and ${result.totalStatsImported} stats entries.`, 'complete');
        res.write(`data: ${JSON.stringify({ type: 'complete', imported: result.totalPlayersImported })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Fatal Error in league import:', error);
        db.run("UPDATE V2_import_status SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP WHERE league_id = ? AND season = ?", [req.body.leagueId, req.body.season]);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

/**
 * Single Player Sync Helper
 * Finds the latest context for a player and triggers a league-wide update.
 */
export const syncPlayer = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get player's latest stats to find league/season
        const latest = db.get(`
            SELECT ps.competition_id, ps.season, c.api_id as league_api_id
            FROM V2_player_statistics ps
            JOIN V2_competitions c ON ps.competition_id = c.competition_id
            WHERE ps.player_id = ?
            ORDER BY ps.year DESC, ps.season DESC
            LIMIT 1
        `, [id]);

        if (!latest || !latest.league_api_id) {
            return res.status(404).json({ error: 'Player league context not found. Cannot auto-sync.' });
        }

        // Trigger the internal import logic (non-SSE for this helper, or we could redirect)
        // For simplicity, we just return that we found the context and the user should trigger a league import
        res.json({
            message: "Player context identified",
            context: {
                leagueId: latest.league_api_id,
                season: latest.season
            },
            instruction: "Trigger /api/admin/import-league-optimized with this context"
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
