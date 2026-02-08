import db from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';

export const importPlayerV2 = async (req, res) => {
    const { playerId, season } = req.body;

    if (!playerId || !season) {
        return res.status(400).json({ error: 'Player ID and Season are required' });
    }

    try {
        const result = await fetchAndProcessPlayer(playerId, season);
        res.json({ message: 'Player imported successfully', result });
    } catch (error) {
        console.error('Error importing player V2:', error);
        res.status(500).json({ error: error.message });
    }
};

export const importPlayersRangeV2 = async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const sendLog = (data, type = 'info') => {
            if (typeof data === 'string') {
                res.write(`data: ${JSON.stringify({ message: data, type })}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify({ ...data, type })}\n\n`);
            }
        };

        const START_ID = parseInt(req.query.start) || 1;
        const END_ID = parseInt(req.query.end) || 100;
        const MODE = req.query.mode || 'default';

        sendLog(`🚀 Starting Throttled High-Speed V2 Import for Players ${START_ID}-${END_ID} (Mode: ${MODE})...`, 'info');

        let imported = 0;
        let errors = 0;
        let processed = 0;
        let skipped = 0;
        const total = END_ID - START_ID + 1;
        const startTime = Date.now();

        // Throttling Logic (400 calls/min => 150ms gap)
        const GAP = 150;
        let nextAvailableTime = Date.now();

        const throttle = async () => {
            const now = Date.now();
            let wait = 0;
            if (nextAvailableTime > now) {
                wait = nextAvailableTime - now;
            }
            nextAvailableTime = (nextAvailableTime > now ? nextAvailableTime : now) + GAP;
            if (wait > 0) await new Promise(r => setTimeout(r, wait));
        };

        for (let playerId = START_ID; playerId <= END_ID; playerId++) {
            processed++;

            // Early check for optimization if mode is 'missing_and_incomplete'
            if (MODE === 'missing_and_incomplete') {
                const playerRecord = db.get("SELECT player_id, fully_imported FROM V2_players WHERE api_id = ?", [playerId]);
                if (playerRecord && playerRecord.fully_imported === 1) {
                    skipped++;
                    if (processed % 100 === 0 || skipped % 100 === 0) {
                        const percent = Math.round((processed / total) * 100);
                        const elapsed = (Date.now() - startTime) / 60000;
                        const rate = elapsed > 0 ? (processed / elapsed).toFixed(1) : 0;

                        sendLog({
                            message: `⏩ Skipping [${playerId}] (Fully Imported) - ${percent}%`,
                            type: 'skip',
                            currentId: playerId,
                            rate,
                            importedStats: imported
                        });
                    }
                    continue;
                }
            }

            if (processed % 1 === 0) {
                const percent = Math.round((processed / total) * 100);
                const elapsed = (Date.now() - startTime) / 60000; // minutes
                const rate = elapsed > 0 ? (processed / elapsed).toFixed(1) : 0;

                sendLog({
                    message: `⏳ Processing Player ID: ${playerId} (${percent}%) - ${rate} players/min`,
                    type: 'progress',
                    currentId: playerId,
                    rate,
                    importedStats: imported
                });
            }

            try {
                // 1. Get Seasons
                await throttle();
                const activeSeasons = await getSeasonsForPlayer(playerId);

                if (!activeSeasons || activeSeasons.length === 0) continue;

                // FLAG CHECK
                const playerRecord = db.get("SELECT player_id, fully_imported FROM V2_players WHERE api_id = ?", [playerId]);
                let seasonsToProcess = activeSeasons;

                if (playerRecord && playerRecord.fully_imported === 1) {
                    const existingRows = db.all("SELECT DISTINCT season FROM V2_player_statistics WHERE player_id = ?", [playerRecord.player_id]);
                    const existingSeasons = existingRows.map(r => r.season.toString());
                    seasonsToProcess = activeSeasons.filter(s => !existingSeasons.includes(s.toString()));

                    if (seasonsToProcess.length === 0) {
                        sendLog(`✅ [${playerId}] Fully Imported (Skipping)`, 'success');
                        continue;
                    }
                    sendLog(`⚡ [${playerId}] Updating ${seasonsToProcess.length} missing seasons (Optimized)...`, 'info');
                } else {
                    sendLog(`🔄 [${playerId}] Full Import (${activeSeasons.length} seasons)...`, 'info');
                }

                // 2. Import Target Seasons Sequentially (Safer for SQL.js)
                let playerErrors = 0;
                for (const season of seasonsToProcess) {
                    await throttle();
                    try {
                        const result = await fetchAndProcessPlayer(playerId, season);
                        if (result.imported) {
                            imported++;
                            sendLog(`   + [${result.name}] Season ${season}: Processed (${result.statsCount} stats)`, 'success');
                        }
                    } catch (innerErr) {
                        if (innerErr.message.includes('malformed')) {
                            console.warn("⚠️ Database malformed. Reloading...");
                            try { await db.init(); } catch (e) { console.error("Failed to reload DB", e); }
                        }
                        sendLog(`   ❌ Failed Season ${season}: ${innerErr.message}`, 'error');
                        errors++;
                        playerErrors++;
                    }
                }

                // 3. Mark as Fully Imported (Only if successful)
                if (playerErrors === 0) {
                    db.run("UPDATE V2_players SET fully_imported = 1 WHERE api_id = ?", [playerId]);
                }

            } catch (err) {
                if (err.message.includes('malformed')) {
                    console.warn("⚠️ Database malformed (Outer). Reloading...");
                    try { await db.init(); } catch (e) { console.error("Failed to reload DB", e); }
                }
                console.error(`Error player ${playerId}:`, err.message);
                sendLog(`❌ Error [${playerId}]: ${err.message}`, 'error');
                errors++;
            }
        }

        sendLog('✅ Deep V2 Import Complete!', 'success');
        res.write(`data: ${JSON.stringify({ type: 'complete', imported, errors })}\n\n`);
        res.end();

    } catch (error) {
        console.error('Error in V2 range import:', error);
        res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
        res.end();
    }
};

async function getSeasonsForPlayer(apiId) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/players/seasons`, { player: apiId });
        return response.data.response || [];
    } catch (e) {
        if (e.response && e.response.status === 404) return [];
        console.warn(`Error fetching seasons for ${apiId}: ${e.message}`);
        return [];
    }
}

async function fetchAndProcessPlayer(apiPlayerId, season) {
    const response = await fetchWithRetry(`${API_BASE_URL}/players`, { id: apiPlayerId, season: season });

    const data = response.data?.response?.[0];
    if (!data) return { imported: false, reason: 'No data' };

    const { player, statistics } = data;

    let playerRecord = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [player.id]);

    let nationalityId = 1; // Default to World (ID 1)
    if (player.nationality) {
        let country = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [player.nationality]);
        if (country) {
            nationalityId = country.country_id;
        } else {
            // New Country? Create it.
            try {
                db.run("INSERT INTO V2_countries (country_name, created_at) VALUES (?, CURRENT_TIMESTAMP)", [player.nationality]);
                country = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [player.nationality]);
                if (country) nationalityId = country.country_id;
            } catch (e) {
                // likely unique constraint or other error, fallback to 1
                console.warn(`Could not create country ${player.nationality}: ${e.message}`);
                nationalityId = 1;
            }
        }
    }

    if (playerRecord) {
        db.run(`UPDATE V2_players SET 
            first_name = ?, last_name = ?, date_of_birth = ?, nationality_id = ?, 
            photo_url = ?, height_cm = ?, weight_kg = ?, birth_country = ?, birth_place = ?, updated_at = CURRENT_TIMESTAMP
            WHERE player_id = ?`,
            [player.firstname || '', player.lastname || '', player.birth.date || '1900-01-01', nationalityId,
            player.photo, parseInt(player.height) || null, parseInt(player.weight) || null,
            player.birth.country, player.birth.place, playerRecord.player_id]
        );
    } else {
        db.run(`INSERT INTO V2_players (
            api_id, first_name, last_name, date_of_birth, nationality_id, 
            photo_url, height_cm, weight_kg, birth_country, birth_place, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [player.id, player.firstname || '', player.lastname || '', player.birth.date || '1900-01-01', nationalityId,
            player.photo, parseInt(player.height) || null, parseInt(player.weight) || null,
            player.birth.country, player.birth.place, 1]
        );
        playerRecord = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [player.id]);
    }

    const localPlayerId = playerRecord.player_id;

    let statsCount = 0;
    for (const stat of statistics) {
        const teamObj = stat.team;
        const leagueObj = stat.league;

        if (!teamObj || !teamObj.id || !leagueObj || !leagueObj.name) continue;

        const clubId = resolveClub(teamObj);
        if (!clubId) continue;

        const competitionId = resolveCompetition(leagueObj);
        if (!competitionId) {
            console.error("Failed to resolve competition", leagueObj.name);
            continue;
        }

        const brokenStat = db.get(
            "SELECT stat_id FROM V2_player_statistics WHERE player_id = ? AND club_id = ? AND season = ? AND competition_id IS NULL",
            [localPlayerId, clubId, leagueObj.season.toString()]
        );

        if (brokenStat) {
            const conflictStat = db.get(
                "SELECT stat_id FROM V2_player_statistics WHERE player_id = ? AND club_id = ? AND competition_id = ? AND season = ?",
                [localPlayerId, clubId, competitionId, leagueObj.season.toString()]
            );
            if (conflictStat) {
                db.run("DELETE FROM V2_player_statistics WHERE stat_id = ?", [brokenStat.stat_id]);
            } else {
                db.run("UPDATE V2_player_statistics SET competition_id = ? WHERE stat_id = ?", [competitionId, brokenStat.stat_id]);
            }
        }

        const existingStat = db.get(
            "SELECT stat_id FROM V2_player_statistics WHERE player_id = ? AND club_id = ? AND competition_id = ? AND season = ?",
            [localPlayerId, clubId, competitionId, leagueObj.season.toString()]
        );

        const games = stat.games || {};
        const goals = stat.goals || {};
        const cards = stat.cards || {};

        if (existingStat) {
            db.run(`UPDATE V2_player_statistics SET
                matches_played = ?, matches_started = ?, minutes_played = ?,
                goals = ?, assists = ?, yellow_cards = ?, red_cards = ?,
                penalty_goals = ?, penalty_misses = ?, updated_at = CURRENT_TIMESTAMP
                WHERE stat_id = ?`,
                [games.appearences || 0, games.lineups || 0, games.minutes || 0,
                goals.total || 0, goals.assists || 0, cards.yellow || 0, cards.red || 0,
                stat.penalty?.scored || 0, stat.penalty?.missed || 0, existingStat.stat_id]
            );
        } else {
            db.run(`INSERT INTO V2_player_statistics (
                player_id, club_id, competition_id, season, year,
                matches_played, matches_started, minutes_played,
                goals, assists, yellow_cards, red_cards,
                penalty_goals, penalty_misses, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [localPlayerId, clubId, competitionId, leagueObj.season.toString(), leagueObj.season,
                    games.appearences || 0, games.lineups || 0, games.minutes || 0,
                    goals.total || 0, goals.assists || 0, cards.yellow || 0, cards.red || 0,
                    stat.penalty?.scored || 0, stat.penalty?.missed || 0]
            );
        }
        statsCount++;
    }

    return { imported: true, name: player.name, statsCount };
}

function resolveClub(team) {
    let club = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
    if (club) return club.club_id;
    club = db.get("SELECT club_id FROM V2_clubs WHERE club_name = ?", [team.name]);
    if (club) {
        db.run("UPDATE V2_clubs SET api_id = ?, club_logo_url = ? WHERE club_id = ?", [team.id, team.logo, club.club_id]);
        return club.club_id;
    }
    try {
        db.run("INSERT INTO V2_clubs (api_id, club_name, club_logo_url, country_id, is_active, created_at) VALUES (?, ?, ?, 1, 1, CURRENT_TIMESTAMP)",
            [team.id, team.name, team.logo]
        );
        club = db.get("SELECT club_id FROM V2_clubs WHERE api_id = ?", [team.id]);
        return club ? club.club_id : null;
    } catch (e) {
        console.error("Error creating club", team.name, e.message);
        return null;
    }
}

function resolveCompetition(league) {
    let comp = null;
    if (league.id) {
        comp = db.get("SELECT competition_id FROM V2_competitions WHERE api_id = ?", [league.id]);
    }
    if (comp) return comp.competition_id;
    comp = db.get("SELECT competition_id, country_id FROM V2_competitions WHERE competition_name = ?", [league.name]);
    if (comp) {
        if (league.id) db.run("UPDATE V2_competitions SET api_id = ? WHERE competition_id = ?", [league.id, comp.competition_id]);
        return comp.competition_id;
    }
    let countryId = null;
    if (league.country && league.country !== "World") {
        const c = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [league.country]);
        countryId = c ? c.country_id : null;
    }
    try {
        db.run("INSERT INTO V2_competitions (competition_name, api_id, country_id, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
            [league.name, league.id, countryId]
        );
        comp = db.get("SELECT competition_id FROM V2_competitions WHERE competition_name = ?", [league.name]);
        return comp ? comp.competition_id : null;
    } catch (e) {
        console.error("Error creating comp", league.name, e.message);
        return null;
    }
}

async function fetchWithRetry(url, params, retries = 5, backoff = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await axios.get(url, { headers: { 'x-apisports-key': API_KEY }, params });
        } catch (error) {
            const status = error.response?.status;
            if (i < retries - 1 && (status === 429 || status >= 500)) {
                const waitTime = backoff * Math.pow(2, i);
                console.warn(`Retry ${i + 1}/${retries} for ${url} (Status: ${status}) in ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
            } else {
                throw error;
            }
        }
    }
}
