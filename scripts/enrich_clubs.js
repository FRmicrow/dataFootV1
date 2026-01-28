import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env explicitly from backend/.env
dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

// Initial basic configuration
const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const DB_PATH = path.join(__dirname, '..', 'backend', 'database.sqlite');
const REQUEST_DELAY_MS = 1500;

const CLUB_NAME_MAPPINGS = {
    "Lille": "Lille OSC",
    "Sporting CP": "Sporting CP",
    "Marseille": "Olympique de Marseille",
    "Lyon": "Olympique Lyonnais",
    "PSG": "Paris Saint Germain",
    "Rennes": "Stade Rennais",
    "AC Ajaccio": "Ajaccio"
};

const CLUB_COUNTRY_CORRECTIONS = {
    "ST Etienne": "France"
};

const IGNORE_FUZZY_MATCH = ["Gazelec FC Ajaccio"];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTeamById(id) {
    try {
        const response = await axios.get(`${BASE_URL}/teams`, {
            params: { id },
            headers: { 'x-apisports-key': API_KEY || '' }
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.error("⚠️  Rate limit reached. Waiting 60s...");
            await sleep(61000);
            return fetchTeamById(id);
        }
        console.error(`❌ Failed to fetch ID ${id}: ${console.log(error.response ? error.response.status : error.message)}`);
        return null;
    }
}

async function main() {
    if (!API_KEY) {
        console.error("❌ API_FOOTBALL_KEY is not defined.");
        process.exit(1);
    }

    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    console.log("📊 Database connected.");

    // Load countries map
    const countries = await db.all("SELECT country_id, country_name FROM V2_countries");
    const countryMap = {};
    countries.forEach(c => {
        countryMap[c.country_name.toLowerCase()] = c.country_id;
    });

    const BATCH_START = 86; // Resume from St Etienne to ensure full coverage
    const BATCH_END = 100;

    console.log(`Starting enrichment loop from ID ${BATCH_START} to ${BATCH_END}...`);

    for (let id = BATCH_START; id <= BATCH_END; id++) {
        const data = await fetchTeamById(id);
        await sleep(REQUEST_DELAY_MS);

        if (!data || !data.response || data.response.length === 0) {
            // console.log(`[ID ${id}] No data.`);
            continue;
        }

        const teamData = data.response[0];
        const t = teamData.team;
        const v = teamData.venue;

        const apiName = t.name;
        const apiShortCode = t.code || t.name;
        const apiCountry = t.country;
        const isNational = t.national;

        const founded = t.founded;
        const logo = t.logo;
        const city = v.city;
        const stadium = v.name;
        const capacity = v.capacity;

        // Resolve country ID
        let cid = apiCountry ? countryMap[apiCountry.toLowerCase()] : null;

        if (!cid && CLUB_COUNTRY_CORRECTIONS[apiName]) {
            cid = countryMap[CLUB_COUNTRY_CORRECTIONS[apiName].toLowerCase()];
            console.log(`      ✨ Manually resolved country for '${apiName}' to '${CLUB_COUNTRY_CORRECTIONS[apiName]}' (ID ${cid})`);
        }

        console.log(`      DEBUG: apiCountry='${apiCountry}', cid=${cid}`);

        if (isNational) {
            console.log(`[ID ${id}] 🌍 [National] ${apiName}`);

            if (!cid) {
                console.log(`      ⚠️ Country '${apiCountry}' not in DB.`);
                continue;
            }

            let natTeam = await db.get("SELECT * FROM V2_national_teams WHERE country_id = ?", [cid]);

            if (!natTeam) {
                console.log(`      ⚠️ National team not found in V2 for country ID ${cid}.`);
            } else {
                console.log(`      ✅ Found (ID ${natTeam.national_team_id}). updating...`);

                const nUpdates = [];
                const nParams = [];

                if (!natTeam.national_logo && logo) { nUpdates.push("national_logo = ?"); nParams.push(logo); }
                if (!natTeam.founded_year && founded) { nUpdates.push("founded_year = ?"); nParams.push(founded); }

                if (nUpdates.length > 0) {
                    nParams.push(natTeam.national_team_id);
                    await db.run(`UPDATE V2_national_teams SET ${nUpdates.join(", ")} WHERE national_team_id = ?`, nParams);
                }
            }

        } else {
            // CLUB LOGIC
            console.log(`[ID ${id}] ⚽ [Club] ${apiName}`);

            // 1. Search for existing club logic

            // A. Exact match
            let matches = await db.all("SELECT * FROM V2_clubs WHERE LOWER(club_name) = LOWER(?)", [apiName]);

            if (matches.length === 0) {
                // B. Substring match (Bidirectional)
                // Filter out if ignored
                if (!IGNORE_FUZZY_MATCH.includes(apiName) && apiName.length >= 4) {
                    matches = await db.all(`
                        SELECT * FROM V2_clubs 
                        WHERE LOWER(club_name) LIKE LOWER(?) 
                        OR LOWER(?) LIKE ('%' || LOWER(club_name) || '%')
                     `, [`%${apiName}%`, apiName]);
                }
            }

            // C. Manual known short mappings if still 0
            if (matches.length === 0) {
                const mapped = CLUB_NAME_MAPPINGS[apiName];
                if (mapped) {
                    matches = await db.all("SELECT * FROM V2_clubs WHERE club_name = ?", [mapped]);
                }
            }

            let club = null;
            let createNew = false;
            let reason = "";

            if (matches.length === 1) {
                club = matches[0];
                console.log(`      ✅ Mapped to existing: ${club.club_name} (ID ${club.club_id}) <= '${apiName}'`);
            } else if (matches.length > 1) {
                // Let's look for exact containment
                const exactContain = matches.filter(m =>
                    m.club_name.toLowerCase().includes(apiName.toLowerCase()) ||
                    apiName.toLowerCase().includes(m.club_name.toLowerCase())
                );

                if (exactContain.length === 1) {
                    club = exactContain[0];
                    console.log(`      ✅ Refined mapping to: ${club.club_name} (ID ${club.club_id})`);
                } else {
                    console.log(`      ⚠️ Ambiguous mapping. Found ${matches.length} matches for '${apiName}': ${matches.map(m => m.club_name).join(", ")}`);
                    createNew = true;
                    reason = "Ambiguous";
                }
            } else {
                console.log(`      ❌ No mapping found for '${apiName}'.`);
                createNew = true;
                reason = "New";
            }

            try {
                const updates = [];
                const params = [];

                if (club) {
                    // Update
                    if (!club.city && city) { updates.push("city = ?"); params.push(city); }
                    if (!club.stadium_name && stadium) { updates.push("stadium_name = ?"); params.push(stadium); }
                    if (!club.stadium_capacity && capacity) { updates.push("stadium_capacity = ?"); params.push(capacity); }
                    if (!club.founded_year && founded) { updates.push("founded_year = ?"); params.push(founded); }
                    if (!club.club_logo_url && logo) { updates.push("club_logo_url = ?"); params.push(logo); }
                    if (!club.club_short_name && apiShortCode) { updates.push("club_short_name = ?"); params.push(apiShortCode); }
                    if (!club.country_id && cid) { updates.push("country_id = ?"); params.push(cid); }

                    if (updates.length > 0) {
                        params.push(club.club_id);
                        await db.run(`UPDATE V2_clubs SET ${updates.join(", ")} WHERE club_id = ?`, params);
                        console.log(`      -> Updated ${updates.length} fields.`);
                    }
                } else if (createNew) {
                    if (!cid) {
                        console.error(`      ❌ Cannot create club '${apiName}' because country could not be resolved.`);
                    } else {
                        console.log(`      🆕 Creating new club entry (${reason}). is_active = 0`);

                        await db.run(`
                            INSERT INTO V2_clubs 
                            (club_name, club_short_name, country_id, city, stadium_name, stadium_capacity, founded_year, club_logo_url, is_active)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                        `, [
                            apiName,
                            apiShortCode || apiName,
                            cid,
                            city || null,
                            stadium || null,
                            capacity || null,
                            founded || null,
                            logo || null
                        ]);
                    }
                }
            } catch (err) {
                console.error(`      ❌ DB Error processing '${apiName}': ${err.message}`);
            }
        }
    }
    console.log("Done.");
}

main().catch(console.error);
