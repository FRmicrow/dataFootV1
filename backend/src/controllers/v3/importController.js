import db from '../../config/database.js';
import footballApi from '../../services/footballApi.js';
import { cleanParams } from '../../utils/sqlHelpers.js';
import logger from '../../utils/logger.js';

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
        const countries = db.all("SELECT * FROM V3_Countries ORDER BY name ASC");
        res.json(countries);
    } catch (error) {
        logger.error({ err: error }, "Error fetching countries from DB");
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
        const params = {};
        if (country) params.country = country;
        if (season) params.season = season;

        const response = await footballApi.client.get('/leagues', { params });
        res.json(response.data.response);
    } catch (error) {
        logger.error({ err: error }, "Error fetching leagues");
        res.status(500).json({ error: "Failed to fetch leagues" });
    }
};

// ── Import Helpers ──────────────────────────────────────────────

/**
 * Upsert a country record and return its local ID.
 */
function upsertCountry(countryData) {
    if (!countryData.name || countryData.name === 'World') return null;

    const existing = db.get("SELECT country_id FROM V3_Countries WHERE name = ?", cleanParams([countryData.name]));
    if (existing) return existing.country_id;

    const result = db.run(
        `INSERT INTO V3_Countries (name, code, flag_url) VALUES (?, ?, ?)`,
        cleanParams([countryData.name, countryData.code, countryData.flag])
    );
    return result.lastInsertRowid;
}

/**
 * Upsert a league record and return its local ID.
 */
function upsertLeague(league, countryId) {
    const existing = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([league.id]));
    if (existing) return existing.league_id;

    const result = db.run(
        `INSERT INTO V3_Leagues (name, type, logo_url, country_id, api_id) VALUES (?, ?, ?, ?, ?)`,
        cleanParams([league.name, league.type, league.logo, countryId, league.id])
    );
    return result.lastInsertRowid;
}

/**
 * Ensure a league season record exists.
 */
function ensureLeagueSeason(v3LeagueId, season, seasonData) {
    const existing = db.get(
        "SELECT ls_id FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?",
        cleanParams([v3LeagueId, season])
    );

    if (!existing) {
        db.run(`
            INSERT INTO V3_League_Seasons (
                league_id, season_year, start_date, end_date,
                coverage_events, coverage_lineups, coverage_players, coverage_top_scorers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, cleanParams([
            v3LeagueId, season, seasonData.start, seasonData.end,
            seasonData.coverage.fixtures.events_statistics ? 1 : 0,
            seasonData.coverage.fixtures.lineups ? 1 : 0,
            seasonData.coverage.players ? 1 : 0,
            seasonData.coverage.top_scorers ? 1 : 0
        ]));
    }
}

/**
 * Upsert a venue and return its local ID.
 */
function upsertVenue(venue) {
    if (!venue.id) return null;

    const existing = db.get("SELECT venue_id FROM V3_Venues WHERE api_id = ?", cleanParams([venue.id]));
    if (existing) return existing.venue_id;

    const result = db.run(
        `INSERT INTO V3_Venues (name, address, city, capacity, surface, image_url, api_id) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        cleanParams([venue.name, venue.address, venue.city, venue.capacity, venue.surface, venue.image, venue.id])
    );
    return result.lastInsertRowid;
}

/**
 * Upsert a team and return its local ID.
 */
function upsertTeam(team, countryId, venueId) {
    const existing = db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", cleanParams([team.id]));
    if (existing) return existing.team_id;

    const result = db.run(
        `INSERT INTO V3_Teams (name, code, country_id, founded, national, logo_url, venue_id, api_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        cleanParams([team.name, team.code, countryId, team.founded, team.national ? 1 : 0, team.logo, venueId, team.id])
    );
    return result.lastInsertRowid;
}

/**
 * Upsert a player and return its local ID.
 */
function upsertPlayer(player) {
    const existing = db.get("SELECT player_id FROM V3_Players WHERE api_id = ?", cleanParams([player.id]));
    if (existing) return existing.player_id;

    const result = db.run(`
        INSERT INTO V3_Players (
            firstname, lastname, name, age, birth_date, birth_place,
            birth_country, nationality, height, weight, injured, photo_url, api_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, cleanParams([
        player.firstname, player.lastname, player.name, player.age,
        player.birth.date, player.birth.place, player.birth.country,
        player.nationality, player.height, player.weight,
        player.injured ? 1 : 0, player.photo, player.id
    ]));
    return result.lastInsertRowid;
}

/**
 * Insert player stats if not already present. Returns true if inserted.
 */
function insertPlayerStatsIfNew(v3PlayerId, teamId, v3LeagueId, season, stats) {
    const existing = db.get(
        `SELECT stat_id FROM V3_Player_Stats WHERE player_id = ? AND team_id = ? AND league_id = ? AND season_year = ?`,
        cleanParams([v3PlayerId, teamId, v3LeagueId, season])
    );
    if (existing) return false;

    db.run(`
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
    `, cleanParams([
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
    ]));
    return true;
}

/**
 * Import players for a single team, page by page.
 * Returns the number of players inserted.
 */
async function importTeamPlayers(teamApiId, teamName, teamId, v3LeagueId, season) {
    let page = 1;
    let totalPages = 1;
    let count = 0;

    while (page <= totalPages) {
        const playersResponse = await footballApi.getPlayersByTeam(teamApiId, season, page);
        const playersData = playersResponse.response;
        totalPages = playersResponse.paging.total;

        db.run('BEGIN TRANSACTION');
        try {
            for (const pData of playersData) {
                const { player, statistics } = pData;
                const v3PlayerId = upsertPlayer(player);
                const stats = statistics[0];

                if (stats && insertPlayerStatsIfNew(v3PlayerId, teamId, v3LeagueId, season, stats)) {
                    count++;
                }
            }
            db.run('COMMIT');
        } catch (err) {
            db.run('ROLLBACK');
            logger.error({ err }, `Error processing page ${page} for team ${teamName}`);
        }

        page++;
        await sleep(100);
    }

    return count;
}

// ── Main Import Endpoint ────────────────────────────────────────

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

    try {
        logger.info(`🚀 Starting V3 Import for League ${leagueId}, Season ${season}`);

        // 1. Fetch League Info from API
        const leagueResponse = await footballApi.client.get('/leagues', {
            params: { id: leagueId, season: season }
        });

        const leagueData = leagueResponse.data.response[0];
        if (!leagueData) {
            return res.status(404).json({ error: "League not found in API" });
        }

        const { league, country, seasons } = leagueData;
        const seasonData = seasons[0];

        // 2. Upsert Country, League, Season
        const countryId = upsertCountry(country);
        const v3LeagueId = upsertLeague(league, countryId);
        ensureLeagueSeason(v3LeagueId, season, seasonData);

        // 3. Fetch and Import Teams + Players
        logger.info(`📥 Fetching teams for League ${leagueId}`);
        const teamsResponse = await footballApi.getTeamsFromLeague(leagueId, season);
        const teamsList = teamsResponse.response;

        let totalTeams = 0;
        let totalPlayers = 0;

        for (const item of teamsList) {
            const { team, venue } = item;
            const venueId = upsertVenue(venue);
            const teamId = upsertTeam(team, countryId, venueId);
            totalTeams++;

            if (seasonData.coverage.players) {
                logger.info(`   👤 Fetching players for ${team.name}...`);
                const playerCount = await importTeamPlayers(team.id, team.name, teamId, v3LeagueId, season);
                totalPlayers += playerCount;
            }
        }

        // 4. Update Completion Flags
        db.run(`
            UPDATE V3_League_Seasons
            Set imported_players = 1, last_imported_at = CURRENT_TIMESTAMP
            WHERE league_id = ? AND season_year = ?
        `, cleanParams([v3LeagueId, season]));

        res.json({
            success: true,
            message: `Successfully imported ${totalTeams} teams and ${totalPlayers} players into V3 schema.`,
            stats: { teams: totalTeams, players: totalPlayers }
        });

    } catch (error) {
        logger.error({ err: error }, "V3 Import Error");
        res.status(500).json({ error: "Import failed: " + error.message });
    }
};
