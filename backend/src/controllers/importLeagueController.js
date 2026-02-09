import db from '../config/database.js';
import footballApi from '../services/footballApi.js';

/**
 * Helper to upsert player statistics with "Smart Check" logic.
 * Updates record if incomplete or different.
 */
const upsertPlayerStat = (localPlayerId, clubId, compId, season, stat) => {
    const existingStat = db.get(
        "SELECT stat_id, matches_played, goals, assists FROM V2_player_statistics WHERE player_id = ? AND club_id = ? AND competition_id = ? AND season = ?",
        [localPlayerId, clubId, compId, season.toString()]
    );

    const matches = stat.games?.appearences || 0;
    const lineups = stat.games?.lineups || 0;
    const minutes = stat.games?.minutes || 0;
    const goals = stat.goals?.total || 0;
    const assists = stat.goals?.assists || 0;
    const yellow = stat.cards?.yellow || 0;
    const red = stat.cards?.red || 0;
    const penaltyScored = stat.penalty?.scored || 0;
    const penaltyMissed = stat.penalty?.missed || 0;

    if (existingStat) {
        // Only update if stats are meaningful or previously incomplete (e.g. 0 matches but now has data)
        const shouldUpdate =
            existingStat.matches_played === 0 && matches > 0 ||
            existingStat.goals !== goals ||
            existingStat.assists !== assists;

        if (shouldUpdate) {
            db.run(`UPDATE V2_player_statistics SET
                matches_played = ?, matches_started = ?, minutes_played = ?,
                goals = ?, assists = ?, yellow_cards = ?, red_cards = ?,
                penalty_goals = ?, penalty_misses = ?, updated_at = CURRENT_TIMESTAMP
                WHERE stat_id = ?`,
                [matches, lineups, minutes, goals, assists, yellow, red, penaltyScored, penaltyMissed, existingStat.stat_id]
            );
            return 'UPDATED';
        }
        return 'SKIPPED';
    } else {
        db.run(`INSERT INTO V2_player_statistics (
            player_id, club_id, competition_id, season, year,
            matches_played, matches_started, minutes_played,
            goals, assists, yellow_cards, red_cards,
            penalty_goals, penalty_misses, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [localPlayerId, clubId, compId, season.toString(), parseInt(season),
                matches, lineups, minutes, goals, assists, yellow, red, penaltyScored, penaltyMissed]
        );
        return 'INSERTED';
    }
};

/**
 * Deep Scan Worker: Career Discovery Logic
 * Fetches all seasons for a player and fills missing ones.
 */
const syncPlayerCareer = async (playerApiId, localPlayerId, sendLog) => {
    try {
        // 1. Get all seasons available for this player from API
        const seasonsResponse = await footballApi.getSeasons(playerApiId);
        if (!seasonsResponse?.response?.length) return;

        const apiSeasons = seasonsResponse.response;

        // 2. Identify missing seasons in local DB
        const existingSeasons = db.all("SELECT DISTINCT season FROM V2_player_statistics WHERE player_id = ?", [localPlayerId])
            .map(s => s.season);

        const missingSeasons = apiSeasons.filter(s => !existingSeasons.includes(s.toString()));

        if (missingSeasons.length === 0) return;

        sendLog(`   🔍 Deep Scan: Found ${missingSeasons.length} missing seasons for player ${playerApiId}`, 'info');

        for (const season of missingSeasons) {
            const statsResponse = await footballApi.getPlayerStatistics(playerApiId, season);
            if (!statsResponse?.response?.length) continue;

            db.run("BEGIN TRANSACTION");
            try {
                for (const stat of statsResponse.response) {
                    // Resolve Competition
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

                    // Resolve Club
                    let statClubId = null;
                    if (stat.team.id) {
                        const club = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [stat.team.id]);
                        if (club) statClubId = club.club_id;
                        else {
                            db.run("INSERT INTO V2_clubs (api_id, club_name, club_logo_url, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                                [stat.team.id, stat.team.name, stat.team.logo]);
                            statClubId = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [stat.team.id]).club_id;
                        }
                    }

                    if (compId && statClubId) {
                        upsertPlayerStat(localPlayerId, statClubId, compId, season, stat);
                    }
                }
                db.run("COMMIT");
            } catch (err) {
                db.run("ROLLBACK");
                sendLog(`      ❌ Failed to sync season ${season} for player ${playerApiId}`, 'error');
            }
        }
    } catch (err) {
        console.error(`Deep scan failed for player ${playerApiId}:`, err);
    }
};

/**
 * Helper to run the import logic internally
 * Returns summary of work done.
 */
const runImportJob = async (leagueId, season, sendLog, deepSync = false) => {
    let totalPlayersImported = 0;
    let totalStatsImported = 0;

    // 1. Fetch Teams in League
    sendLog(`📡 API Context: Fetching teams for League ${leagueId} (Season ${season})...`, 'info');
    const teamsResponse = await footballApi.getTeamsByLeague(leagueId, season);

    if (!teamsResponse?.response?.length) {
        sendLog(`⚠️ No teams returned for League ${leagueId}. Skipping.`, 'warning');
        return { totalPlayersImported: 0, totalStatsImported: 0 };
    }

    const teamsData = teamsResponse.response;
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
        sendLog(`⚽ [Team: ${team.name}] ID: ${team.apiId}`, 'info');

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
                    try {
                        const { player, statistics } = pData;
                        let playerRecord = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [player.id]);
                        let localPlayerId;

                        if (!playerRecord) {
                            // Resolve Nationality
                            let nationalityId = 1; // Default to 1 (Unknown/World)
                            if (player.nationality) {
                                let countryRow = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [player.nationality]);
                                if (!countryRow) {
                                    db.run("INSERT OR IGNORE INTO V2_countries (country_name) VALUES (?)", [player.nationality]);
                                    countryRow = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [player.nationality]);
                                }
                                if (countryRow) nationalityId = countryRow.country_id;
                            }

                            // Handle name parts
                            const firstName = player.firstname || player.name?.split(' ')[0] || "Unknown";
                            const lastName = player.lastname || player.name?.split(' ').slice(1).join(' ') || player.name || "Unknown";
                            const dob = player.birth?.date || "1900-01-01";

                            db.run(`INSERT INTO V2_players (api_id, first_name, last_name, date_of_birth, nationality_id, photo_url, height_cm, weight_kg, birth_country, birth_place, is_active, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)`,
                                [player.id, firstName, lastName, dob, nationalityId, player.photo,
                                parseInt(player.height) || null, parseInt(player.weight) || null, player.birth?.country, player.birth?.place]
                            );
                            playerRecord = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [player.id]);
                        }
                        localPlayerId = playerRecord?.player_id;
                        if (localPlayerId) {
                            db.run("UPDATE V2_players SET updated_at = CURRENT_TIMESTAMP WHERE player_id = ?", [localPlayerId]);
                        } else {
                            throw new Error(`Failed to create/find player record for API ID ${player.id}`);
                        }

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

                            if (compId && statClubId) {
                                upsertPlayerStat(localPlayerId, statClubId, compId, season, stat);
                                totalStatsImported++;
                            }
                        }

                        // Optional Deep Scan
                        if (deepSync) {
                            await syncPlayerCareer(player.id, localPlayerId, sendLog);
                        }

                        totalPlayersImported++;
                    } catch (playerErr) {
                        sendLog(`      ⚠️ Error processing player ${pData.player?.name}: ${playerErr.message}`, 'warning');
                        // Continue to next player
                    }
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

export const importLeagueData = async (req, res) => {
    try {
        let { leagueId, season, leagueIds, seasons, deepSync = false } = req.body;

        // Support GET for SSE EventSource (backward compatibility)
        if (req.method === 'GET') {
            leagueId = req.query.leagueId;
            season = req.query.season;
            deepSync = req.query.deepSync === 'true';
        }

        // Normalize to arrays
        const targetLeagues = leagueIds || (leagueId ? [leagueId] : []);
        const targetSeasons = seasons || (season ? [season] : []);

        if (targetLeagues.length === 0 || targetSeasons.length === 0) {
            return res.status(400).json({ error: 'League ID(s) and Season(s) are required' });
        }

        // Setup SSE for real-time logs
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        sendLog(`🚀 Multi-Import Engine Initialized`, 'info');
        sendLog(`📋 Targets: ${targetLeagues.length} Leagues, ${targetSeasons.length} Seasons. DeepSync: ${deepSync}`, 'info');

        let grandTotalPlayers = 0;
        let grandTotalStats = 0;

        for (const lId of targetLeagues) {
            for (const s of targetSeasons) {
                // Check Status / Prevent Overlaps
                const currentStatus = db.get("SELECT status FROM V2_import_status WHERE league_id = ? AND season = ?", [lId, s]);
                if (currentStatus?.status === 'IN_PROGRESS') {
                    sendLog(`⚠️ Import already in progress for League ${lId} (Season ${s}). Skipping.`, 'warning');
                    continue;
                }

                db.run("INSERT OR REPLACE INTO V2_import_status (league_id, season, status, updated_at) VALUES (?, ?, 'IN_PROGRESS', CURRENT_TIMESTAMP)", [lId, s]);

                try {
                    const result = await runImportJob(lId, s, sendLog, deepSync);

                    db.run("UPDATE V2_import_status SET status = 'COMPLETED', imported_players = ?, updated_at = CURRENT_TIMESTAMP WHERE league_id = ? AND season = ?",
                        [result.totalPlayersImported, lId, s]);

                    grandTotalPlayers += result.totalPlayersImported;
                    grandTotalStats += result.totalStatsImported;

                    sendLog(`✅ Batch Finished: League ${lId} (Season ${s})`, 'success');
                } catch (batchErr) {
                    db.run("UPDATE V2_import_status SET status = 'FAILED', updated_at = CURRENT_TIMESTAMP WHERE league_id = ? AND season = ?", [lId, s]);
                    sendLog(`❌ Batch Failed: League ${lId} (Season ${s}) - ${batchErr.message}`, 'error');
                }
            }
        }

        sendLog(`🏁 Multi-Import Complete!`, 'complete');
        sendLog(`📊 Totals: ${grandTotalPlayers} players, ${grandTotalStats} stats entries.`, 'complete');
        res.write(`data: ${JSON.stringify({ type: 'complete', imported: grandTotalPlayers })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Fatal Error in multi-import:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

/**
 * Single Player Sync Helper
 */
export const syncPlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const { deepSync = true } = req.body;

        const player = db.get("SELECT api_id, player_id FROM V2_players WHERE player_id = ?", [id]);
        if (!player || !player.api_id) {
            return res.status(404).json({ error: 'Player or API ID not found' });
        }

        // Setup SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (message, type = 'info') => {
            res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
        };

        sendLog(`🔄 Starting Career Sync for Player ${player.api_id}`, 'info');

        await syncPlayerCareer(player.api_id, player.player_id, sendLog);

        sendLog(`✅ Career Sync Finished`, 'complete');
        res.end();

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
