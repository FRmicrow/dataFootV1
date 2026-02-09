import dbV3 from '../../config/database_v3.js';
import footballApi from '../../services/footballApi.js';

/**
 * Import Controller for V3 POC
 */

// Helper to delay execution (rate limiting safety)
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get all countries from API-Football
 * GET /api/v3/countries
 */
export const getCountries = async (req, res) => {
    try {
        const countries = dbV3.all("SELECT * FROM V3_Countries ORDER BY name ASC");
        res.json(countries);
    } catch (error) {
        console.error("Error fetching countries from DB:", error);
        res.status(500).json({ error: "Failed to fetch countries" });
    }
};

/**
 * Get leagues filtered by country/season if needed
 * GET /api/v3/leagues
 */
export const getLeagues = async (req, res) => {
    try {
        const { country, season } = req.query;
        // In API-Football, you can filter by country or season
        // If we want both, we might need to filter manually or API supports it?
        // API params: id, name, country, code, season, team, type, current...

        // We will just fetch leagues by country first, usually easier for UI
        const params = {};
        if (country) params.country = country;
        if (season) params.season = season;

        // Use makeRequest implementation detail or add getLeagues method with params
        // Assuming footballApi.client.get('/leagues', { params }) works
        const response = await footballApi.client.get('/leagues', { params });
        res.json(response.data.response);
    } catch (error) {
        console.error("Error fetching leagues:", error);
        res.status(500).json({ error: "Failed to fetch leagues" });
    }
};

/**
 * Import League Data (Teams + Players + Stats)
 * POST /api/v3/import/league
 * Body: { leagueId, season }
 */
export const importLeagueData = async (req, res) => {
    const { leagueId, season } = req.body;

    if (!leagueId || !season) {
        return res.status(400).json({ error: "Missing leagueId or season" });
    }

    // This will be a long running process, we should probably return 202 Accepted 
    // and process in background, or use SSE.
    // For POC, we might just await it if the user waits, OR start it and return status.
    // The requirement says "Display a log or success message".
    // I will use a simple approach: Execute and stream logs or return final result if not too long.
    // A full league import takes time. I'll implement a simple customized SSE or just simple polling?
    // Let's try synchronous for small leagues, but typically this times out.
    // Better: Start process, return "Import Started", update DB status.

    // HOWEVER, for this POC step, I will try to do it "step by step" or just one batch.
    // Let's implement the logic first.

    try {
        console.log(`🚀 Starting V3 Import for League ${leagueId}, Season ${season}`);

        // 1. Fetch League Info
        // We fetch from API to get details
        const leagueResponse = await footballApi.client.get('/leagues', {
            params: { id: leagueId, season: season }
        });

        const leagueData = leagueResponse.data.response[0];
        if (!leagueData) {
            return res.status(404).json({ error: "League not found in API" });
        }

        const { league, country, seasons } = leagueData;
        const seasonData = seasons[0]; // The one we requested

        // 2. Insert/Update Country (if linked)
        // We assume country info is in leagueData.country
        let countryId = null;
        if (country.name && country.name !== 'World') {
            const existingCountry = dbV3.get("SELECT country_id FROM V3_Countries WHERE name = ?", [country.name]);
            if (existingCountry) {
                countryId = existingCountry.country_id;
            } else {
                const result = dbV3.run(`
                    INSERT INTO V3_Countries (name, code, flag_url) VALUES (?, ?, ?)
                `, [country.name, country.code, country.flag]);
                countryId = result.lastInsertRowid;
            }
        }

        // 3. Insert/Update V3_Leagues
        let v3LeagueId = null;
        const existingLeague = dbV3.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", [league.id]);

        if (existingLeague) {
            v3LeagueId = existingLeague.league_id;
        } else {
            const result = dbV3.run(`
                INSERT INTO V3_Leagues (name, type, logo_url, country_id, api_id) 
                VALUES (?, ?, ?, ?, ?)
            `, [league.name, league.type, league.logo, countryId, league.id]);
            v3LeagueId = result.lastInsertRowid;
        }

        // 4. Insert/Update V3_League_Seasons
        // Check if exists
        const existingSeason = dbV3.get(
            "SELECT ls_id FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?",
            [v3LeagueId, season]
        );

        if (!existingSeason) {
            dbV3.run(`
                INSERT INTO V3_League_Seasons (
                    league_id, season_year, start_date, end_date, 
                    coverage_events, coverage_lineups, coverage_players, coverage_top_scorers
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                v3LeagueId, season, seasonData.start, seasonData.end,
                seasonData.coverage.fixtures.events_statistics ? 1 : 0,
                seasonData.coverage.fixtures.lineups ? 1 : 0,
                seasonData.coverage.players ? 1 : 0,
                seasonData.coverage.top_scorers ? 1 : 0
            ]);
        }

        // 5. Fetch Teams
        console.log(`📥 Fetching teams for League ${leagueId}`);
        const teamsResponse = await footballApi.getTeamsFromLeague(leagueId, season);
        const teamsList = teamsResponse.response; // Array of { team, venue }

        let totalTeams = 0;
        let totalPlayers = 0;

        for (const item of teamsList) {
            const { team, venue } = item;

            // Insert Venue
            let venueId = null;
            if (venue.id) {
                const existingVenue = dbV3.get("SELECT venue_id FROM V3_Venues WHERE api_id = ?", [venue.id]);
                if (existingVenue) {
                    venueId = existingVenue.venue_id;
                } else {
                    const vRes = dbV3.run(`
                        INSERT INTO V3_Venues (name, address, city, capacity, surface, image_url, api_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `, [venue.name, venue.address, venue.city, venue.capacity, venue.surface, venue.image, venue.id]);
                    venueId = vRes.lastInsertRowid;
                }
            }

            // Insert Team
            let teamId = null;
            const existingTeam = dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", [team.id]);
            if (existingTeam) {
                teamId = existingTeam.team_id;
                // Optional: Update details
            } else {
                const tRes = dbV3.run(`
                    INSERT INTO V3_Teams (name, code, country_id, founded, national, logo_url, venue_id, api_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [team.name, team.code, countryId, team.founded, team.national ? 1 : 0, team.logo, venueId, team.id]);
                teamId = tRes.lastInsertRowid;
            }
            totalTeams++;

            // 6. Fetch Players for Value Team
            // Only if coverage supports it
            if (seasonData.coverage.players) {
                console.log(`   👤 Fetching players for ${team.name}...`);
                let page = 1;
                let totalPages = 1;

                while (page <= totalPages) {
                    const playersResponse = await footballApi.getPlayersByTeam(team.id, season, page);
                    const playersData = playersResponse.response;
                    totalPages = playersResponse.paging.total;

                    dbV3.run('BEGIN TRANSACTION'); // Batch insert per page
                    try {
                        for (const pData of playersData) {
                            const { player, statistics } = pData;

                            // Insert V3_Player
                            let v3PlayerId = null;
                            const existingPlayer = dbV3.get("SELECT player_id FROM V3_Players WHERE api_id = ?", [player.id]);

                            if (existingPlayer) {
                                v3PlayerId = existingPlayer.player_id;
                            } else {
                                const pRes = dbV3.run(`
                                    INSERT INTO V3_Players (
                                        firstname, lastname, name, age, birth_date, birth_place, 
                                        birth_country, nationality, height, weight, injured, photo_url, api_id
                                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                `, [
                                    player.firstname, player.lastname, player.name, player.age,
                                    player.birth.date, player.birth.place, player.birth.country,
                                    player.nationality, player.height, player.weight,
                                    player.injured ? 1 : 0, player.photo, player.id
                                ]);
                                v3PlayerId = pRes.lastInsertRowid;
                            }

                            // Insert V3_Player_Stats (for this league/season/team)
                            // Filter stats for the specific league we are importing (api returns all for that season sometimes?)
                            // API usually filters by params ?team=X&season=Y, but statistics array might contain multiple if player moved?
                            // Usually with /players endpoint filtered by team, 'statistics' array has the stats relative to that team.

                            const stats = statistics[0]; // Usually only one when filtered by team & season

                            if (stats) {
                                // Check duplicate
                                const existingStat = dbV3.get(`
                                    SELECT stat_id FROM V3_Player_Stats 
                                    WHERE player_id = ? AND team_id = ? AND league_id = ? AND season_year = ?
                                `, [v3PlayerId, teamId, v3LeagueId, season]);

                                if (!existingStat) {
                                    dbV3.run(`
                                        INSERT INTO V3_Player_Stats (
                                            player_id, team_id, league_id, season_year, position, captain,
                                            appearances, lineups, minutes, rating,
                                            goals_total, goals_assists, goals_conceded, goals_saves,
                                            passes_total, passes_key, passes_accuracy,
                                            tackles_total, tackles_blocks, tackles_interceptions,
                                            duels_total, duels_won,
                                            dribbles_attempts, dribbles_success,
                                            fouls_drawn, fouls_committed,
                                            cards_yellow, cards_yellowred, cards_red,
                                            penalty_won, penalty_commited, penalty_scored, penalty_missed, penalty_saved
                                        ) VALUES (
                                            ?, ?, ?, ?, ?, ?,
                                            ?, ?, ?, ?,
                                            ?, ?, ?, ?,
                                            ?, ?, ?,
                                            ?, ?, ?,
                                            ?, ?,
                                            ?, ?,
                                            ?, ?,
                                            ?, ?, ?,
                                            ?, ?, ?, ?, ?
                                        )
                                    `, [
                                        v3PlayerId, teamId, v3LeagueId, season, stats.games.position, stats.games.captain ? 1 : 0,
                                        stats.games.appearences || 0, stats.games.lineups || 0, stats.games.minutes || 0, stats.games.rating,
                                        stats.goals.total || 0, stats.goals.assists || 0, stats.goals.conceded || 0, stats.goals.saves || 0,
                                        stats.passes.total || 0, stats.passes.key || 0, stats.passes.accuracy || 0,
                                        stats.tackles.total || 0, stats.tackles.blocks || 0, stats.tackles.interceptions || 0,
                                        stats.duels.total || 0, stats.duels.won || 0,
                                        stats.dribbles.attempts || 0, stats.dribbles.success || 0,
                                        stats.fouls.drawn || 0, stats.fouls.committed || 0,
                                        stats.cards.yellow || 0, stats.cards.yellowred || 0, stats.cards.red || 0,
                                        stats.penalty.won || 0, stats.penalty.commited || 0, stats.penalty.scored || 0, stats.penalty.missed || 0, stats.penalty.saved || 0
                                    ]);
                                    totalPlayers++;
                                }
                            }
                        }
                        dbV3.run('COMMIT');
                    } catch (err) {
                        dbV3.run('ROLLBACK');
                        console.error(`Error processing page ${page} for team ${team.name}:`, err);
                        // Continue to next page?
                    }

                    page++;
                    // Rate limiting is handled by apiQueue, but let's be safe
                    await sleep(100);
                }
            }
        }

        // 7. Update Completion Flags
        dbV3.run(`
            UPDATE V3_League_Seasons 
            Set imported_players = 1, last_imported_at = CURRENT_TIMESTAMP
            WHERE league_id = ? AND season_year = ?
        `, [v3LeagueId, season]);

        res.json({
            success: true,
            message: `Successfully imported ${totalTeams} teams and ${totalPlayers} players into V3 schema.`,
            stats: {
                teams: totalTeams,
                players: totalPlayers
            }
        });

    } catch (error) {
        console.error("V3 Import Error:", error);
        res.status(500).json({ error: "Import failed: " + error.message });
    }
};
