import 'dotenv/config';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', 'backend', '.env') });

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';
const DB_PATH = path.join(__dirname, '..', 'backend', 'database.sqlite');
const REQUEST_DELAY_MS = 1000; // Slightly faster as we have many calls

// Range of seasons to process
const START_SEASON = 2000;
const END_SEASON = 2025;

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

// Combined list of countries and their Division 1 & 2 leagues
const TARGET_LEAGUES = [
    // Major (Div 1 & 2)
    { country: "England", leagues: ["Premier League", "Championship"] },
    { country: "Spain", leagues: ["La Liga", "Segunda División"] },
    { country: "Germany", leagues: ["Bundesliga", "2. Bundesliga"] },
    { country: "Italy", leagues: ["Serie A", "Serie B"] },
    { country: "France", leagues: ["Ligue 1", "Ligue 2"] },
    { country: "Brazil", leagues: ["Serie A", "Serie B"] },
    { country: "Argentina", leagues: ["Liga Profesional Argentina", "Primera Nacional"] }, // Updated
    { country: "Portugal", leagues: ["Primeira Liga", "Liga Portugal 2"] },
    { country: "Netherlands", leagues: ["Eredivisie", "Eerste Divisie"] },
    { country: "Belgium", leagues: ["Jupiler Pro League", "Challenger Pro League"] },

    // Secondary (Mostly Div 1, some Div 2 implies)
    { country: "Norway", leagues: ["Eliteserien"] },
    { country: "Greece", leagues: ["Super League 1"] },
    { country: "Austria", leagues: ["Bundesliga"] },
    { country: "Scotland", leagues: ["Premiership", "Championship"] },
    { country: "Poland", leagues: ["Ekstraklasa"] },
    { country: "Denmark", leagues: ["Superliga"] },
    { country: "Switzerland", leagues: ["Super League"] },
    { country: "Israel", leagues: ["Ligat HaAl"] },
    { country: "Cyprus", leagues: ["1. Division"] },
    { country: "Sweden", leagues: ["Allsvenskan"] },
    { country: "Croatia", leagues: ["HNL"] },
    { country: "Serbia", leagues: ["SuperLiga"] },
    { country: "Ukraine", leagues: ["Premier League"] },
    { country: "Hungary", leagues: ["NB I"] },
    { country: "Romania", leagues: ["Liga I"] },
    { country: "Slovakia", leagues: ["Super Liga"] },
    { country: "Bulgaria", leagues: ["First League"] },
    { country: "Belarus", leagues: ["Vysshaya Liga"] },
    { country: "Finland", leagues: ["Veikkausliiga"] },
    { country: "Slovenia", leagues: ["PrvaLiga"] },
    { country: "Lithuania", leagues: ["A Lyga"] },
    { country: "Georgia", leagues: ["Erovnuli Liga"] },
    { country: "Latvia", leagues: ["Virsliga"] },
    { country: "Bosnia", leagues: ["Premier League"] },
    { country: "Albania", leagues: ["Superliga"] },
    { country: "Macedonia", leagues: ["First League"] }
];

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// In-memory cache for processed clubs this run to avoid DB spam
const PROCESSED_CLUBS = new Set();
// Cache league IDs: { "England-Premier League": 39 }
const LEAGUE_ID_CACHE = {};

async function fetchLeagueId(name, country) {
    const key = `${country}-${name}`;
    if (LEAGUE_ID_CACHE[key]) return LEAGUE_ID_CACHE[key];

    try {
        console.log(`   🔎 Looking up league: '${name}' in '${country}'...`);
        const response = await axios.get(`${BASE_URL}/leagues`, {
            params: { name, country },
            headers: { 'x-apisports-key': API_KEY || '' }
        });

        if (response.data.response && response.data.response.length > 0) {
            const league = response.data.response[0].league;
            console.log(`      ✅ Found: ${league.name} (ID: ${league.id})`);
            LEAGUE_ID_CACHE[key] = league.id;
            return league.id;
        } else {
            console.log(`      ❌ Not found (API returned 0 results).`);
            return null;
        }
    } catch (error) {
        console.error(`      ❌ Error fetching league '${name}': ${error.message}`);
        return null;
    }
}

async function fetchTeamsByLeague(leagueId, season) {
    try {
        const response = await axios.get(`${BASE_URL}/teams`, {
            params: { league: leagueId, season },
            headers: { 'x-apisports-key': API_KEY || '' }
        });
        return response.data.response;
    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.error("⚠️ Rate limit caught in fetchTeams. Sleeping 60s...");
            await sleep(60000);
            return fetchTeamsByLeague(leagueId, season);
        }
        console.error(`❌ Failed to fetch teams for league ${leagueId} season ${season}: ${error.message}`);
        return [];
    }
}

async function main() {
    if (!API_KEY) {
        console.error("❌ API_FOOTBALL_KEY is not defined.");
        process.exit(1);
    }

    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    console.log("📊 Database connected.");

    const countries = await db.all("SELECT country_id, country_name FROM V2_countries");
    const countryMap = {};
    countries.forEach(c => { countryMap[c.country_name.toLowerCase()] = c.country_id; });

    console.log(`Starting historical enrichment from ${END_SEASON} down to ${START_SEASON}...`);

    for (const target of TARGET_LEAGUES) {
        console.log(`\n==================================================`);
        console.log(`🌍 Country: ${target.country}`);

        for (const leagueName of target.leagues) {
            const leagueId = await fetchLeagueId(leagueName, target.country);
            if (!leagueId) continue;

            // Iterate Seasons Descending
            for (let season = END_SEASON; season >= START_SEASON; season--) {
                console.log(`   🗓️ Season ${season} - League ${leagueName} (${leagueId})`);

                const teamsResponse = await fetchTeamsByLeague(leagueId, season);
                // Determine if we should wait
                await sleep(REQUEST_DELAY_MS);

                if (!teamsResponse || teamsResponse.length === 0) {
                    // console.log(`      No data for ${season}.`);
                    continue;
                }

                let newCount = 0;

                for (const teamData of teamsResponse) {
                    const t = teamData.team;
                    const v = teamData.venue;
                    const apiName = t.name;

                    // Optimization: Skip if already processed this run
                    if (PROCESSED_CLUBS.has(apiName)) continue;

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
                    }

                    if (isNational) {
                        // Skip nationals or update if needed (omitted for speed in this big loop, focus on clubs)
                    } else {
                        // CLUB LOGIC
                        let matches = await db.all("SELECT * FROM V2_clubs WHERE LOWER(club_name) = LOWER(?)", [apiName]);

                        // Fuzzy fallback
                        if (matches.length === 0 && !IGNORE_FUZZY_MATCH.includes(apiName) && apiName.length >= 4) {
                            matches = await db.all(`
                                SELECT * FROM V2_clubs 
                                WHERE LOWER(club_name) LIKE LOWER(?) 
                                OR LOWER(?) LIKE ('%' || LOWER(club_name) || '%')
                             `, [`%${apiName}%`, apiName]);
                        }

                        // Manual fallback
                        if (matches.length === 0 && CLUB_NAME_MAPPINGS[apiName]) {
                            matches = await db.all("SELECT * FROM V2_clubs WHERE club_name = ?", [CLUB_NAME_MAPPINGS[apiName]]);
                        }

                        let club = null;
                        let createNew = false;

                        if (matches.length === 1) {
                            club = matches[0];
                        } else if (matches.length > 1) {
                            const exact = matches.filter(m => m.club_name.toLowerCase() === apiName.toLowerCase());
                            if (exact.length === 1) club = exact[0];
                            else {
                                // Ambiguous - usually implies we should be careful. 
                                // For now, if ambiguous, we might skip or create new if very different.
                                // Let's try to match strict containment
                                const exactContain = matches.filter(m =>
                                    m.club_name.toLowerCase().includes(apiName.toLowerCase()) ||
                                    apiName.toLowerCase().includes(m.club_name.toLowerCase())
                                );
                                if (exactContain.length === 1) club = exactContain[0];
                                else createNew = true; // defaulting to new if unsure
                            }
                        } else {
                            createNew = true;
                        }

                        if (club) {
                            // Update
                            const updates = [];
                            const params = [];
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
                            }
                            PROCESSED_CLUBS.add(apiName);
                        } else if (createNew) {
                            if (cid) {
                                await db.run(`
                                    INSERT INTO V2_clubs (club_name, club_short_name, country_id, city, stadium_name, stadium_capacity, founded_year, club_logo_url, is_active)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
                                `, [apiName, apiShortCode || apiName, cid, city || null, stadium || null, capacity || null, founded || null, logo || null]);
                                console.log(`      ✨ [${season}] New Club: ${apiName}`);
                                PROCESSED_CLUBS.add(apiName);
                                newCount++;
                            } else {
                                // console.log(`      Skipping ${apiName} (No Country ID)`);
                            }
                        }
                    } // end isNational check
                } // end team loop

                if (newCount > 0) console.log(`      -> Added ${newCount} new clubs.`);
            } // end season loop
        } // end league loop
    }
    console.log("Done.");
}

main().catch(console.error);
