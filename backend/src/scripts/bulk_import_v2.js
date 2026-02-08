import db from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY || process.env.API_INITIAL_KEY;
const API_BASE_URL = 'https://v3.football.api-sports.io';
const START_ID = 5001;
const END_ID = 20000; // Safe upper limit, can be increased
const GAP = 150; // Throttling: 150ms

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

async function runImport() {
    console.log("🚀 Starting Bulk Import V2 Script (Headless mode)");
    console.log(`🎯 Range: ${START_ID} -> ${END_ID}`);

    // Initialize Database
    await db.init();

    let imported = 0;
    let errors = 0;
    let skipped = 0;
    const startTime = Date.now();

    for (let playerId = START_ID; playerId <= END_ID; playerId++) {
        // Progress Logging
        if ((playerId - START_ID) % 10 === 0) {
            const elapsed = (Date.now() - startTime) / 60000;
            const processed = playerId - START_ID;
            const rate = elapsed > 0 ? (processed / elapsed).toFixed(1) : 0;
            process.stdout.write(`\r⏳ Processing ${playerId} | Rate: ${rate}/min | Imported: ${imported} | Skipped: ${skipped} | Errors: ${errors}`);
        }

        // 1. Check if fully imported (Optimization)
        try {
            const playerRecord = db.get("SELECT player_id, fully_imported FROM V2_players WHERE api_id = ?", [playerId]);
            if (playerRecord && playerRecord.fully_imported === 1) {
                skipped++;
                continue;
            }
        } catch (e) {
            console.error(`\n❌ DB Error checking ${playerId}:`, e.message);
        }

        try {
            // 2. Get Seasons
            await throttle();
            const activeSeasons = await getSeasonsForPlayer(playerId);

            if (!activeSeasons || activeSeasons.length === 0) {
                // console.log(`\n[${playerId}] No active seasons.`);
                continue;
            }

            let seasonsToProcess = activeSeasons;
            const playerRecord = db.get("SELECT player_id, fully_imported FROM V2_players WHERE api_id = ?", [playerId]);

            if (playerRecord && playerRecord.fully_imported === 1) {
                const existingRows = db.all("SELECT DISTINCT season FROM V2_player_statistics WHERE player_id = ?", [playerRecord.player_id]);
                const existingSeasons = existingRows.map(r => r.season.toString());
                seasonsToProcess = activeSeasons.filter(s => !existingSeasons.includes(s.toString()));
            }

            if (seasonsToProcess.length === 0) {
                if (playerRecord) {
                    db.run("UPDATE V2_players SET fully_imported = 1 WHERE api_id = ?", [playerId]);
                }
                skipped++;
                continue;
            }

            // 3. Process Seasons Sequentially
            let playerErrors = 0;
            for (const season of seasonsToProcess) {
                await throttle();
                try {
                    const result = await fetchAndProcessPlayer(playerId, season);
                    if (result.imported) {
                        imported++;
                        // console.log(`\n   + [${result.name}] Season ${season} OK`);
                    }
                } catch (innerErr) {
                    if (innerErr.response && innerErr.response.status === 429) {
                        console.error("\n🛑 API Rate Limit Reached (429). Stopping script.");
                        process.exit(1);
                    }
                    if (innerErr.message.includes('malformed')) {
                        console.warn("\n⚠️ Database malformed. Reloading...");
                        try { await db.init(); } catch (e) { console.error("Failed to reload DB", e); }
                    } else {
                        // console.error(`\n   ❌ Failed Season ${season}: ${innerErr.message}`);
                    }
                    errors++;
                    playerErrors++;
                }
            }

            if (playerErrors === 0) {
                db.run("UPDATE V2_players SET fully_imported = 1 WHERE api_id = ?", [playerId]);
            }

        } catch (err) {
            if (err.response && err.response.status === 429) {
                console.error("\n🛑 API Rate Limit Reached (429). Stopping script.");
                process.exit(1);
            }
            console.error(`\n❌ Error [${playerId}]: ${err.message}`);
            errors++;
        }
    }

    console.log("\n✅ Import Complete!");
    console.log(`Stats: Imported ${imported}, Skipped ${skipped}, Errors ${errors}`);
}


// --- Helper Functions (Copied from Controller) ---

async function getSeasonsForPlayer(apiId) {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/players/seasons`, { player: apiId });
        return response.data.response || [];
    } catch (e) {
        if (e.response && e.response.status === 404) return [];
        if (e.response && e.response.status === 429) throw e; // Pass up rate limits
        // console.warn(`Error fetching seasons for ${apiId}: ${e.message}`);
        return [];
    }
}

async function fetchAndProcessPlayer(apiPlayerId, season) {
    const response = await fetchWithRetry(`${API_BASE_URL}/players`, { id: apiPlayerId, season: season });

    const data = response.data?.response?.[0];
    if (!data) return { imported: false, reason: 'No data' };

    const { player, statistics } = data;

    let playerRecord = db.get("SELECT player_id FROM V2_players WHERE api_id = ?", [player.id]);

    let nationalityId = 1;
    if (player.nationality) {
        let country = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [player.nationality]);
        if (country) {
            nationalityId = country.country_id;
        } else {
            try {
                db.run("INSERT INTO V2_countries (country_name, created_at) VALUES (?, CURRENT_TIMESTAMP)", [player.nationality]);
                country = db.get("SELECT country_id FROM V2_countries WHERE country_name = ?", [player.nationality]);
                if (country) nationalityId = country.country_id;
            } catch (e) {
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
        if (!competitionId) continue;

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
                if (status === 429) console.warn(`\n⚠️ Rate Limit (429) - Waiting ${waitTime}ms...`);
                await new Promise(r => setTimeout(r, waitTime));
            } else {
                throw error;
            }
        }
    }
}

// Execute
runImport().catch(console.error);
