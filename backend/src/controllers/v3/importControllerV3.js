import dbV3 from '../../config/database_v3.js';
import footballApi from '../../services/footballApi.js';

/**
 * V3 POC - Real Data Import Logic
 * This controller handles mass data ingestion into the experimental V3 schema.
 * It uses sequential processing to respect API rate limits and provide real-time SSE feedback.
 */

// --- Data Mapping (Expert-Grade Separation) ---

// --- SQL Helper (Prevents "tried to bind a value of an unknown type (undefined)") ---
const cleanParams = (params) => params.map(p => p === undefined ? null : p);

const Mappers = {
    country: (api) => ({
        name: api.name,
        code: api.code,
        flag_url: api.flag
    }),
    league: (api) => ({
        api_id: api.league.id,
        name: api.league.name,
        type: api.league.type,
        logo_url: api.league.logo
    }),
    venue: (api) => ({
        api_id: api.id,
        name: api.name,
        address: api.address,
        city: api.city,
        capacity: api.capacity,
        surface: api.surface,
        image_url: api.image
    }),
    team: (api) => ({
        api_id: api.id,
        name: api.name,
        code: api.code,
        country: api.country,
        founded: api.founded,
        national: api.national ? 1 : 0,
        logo_url: api.logo
    }),
    player: (api) => ({
        api_id: api.id,
        name: api.name,
        firstname: api.firstname,
        lastname: api.lastname,
        age: api.age,
        birth_date: api.birth?.date,
        birth_place: api.birth?.place,
        birth_country: api.birth?.country,
        nationality: api.nationality,
        height: api.height,
        weight: api.weight,
        injured: api.injured ? 1 : 0,
        photo_url: api.photo
    }),
    stats: (stat, playerId, teamId, leagueId, season) => ({
        player_id: playerId,
        team_id: teamId,
        league_id: leagueId,
        season_year: season,
        games_appearences: stat.games.appearences || 0,
        games_lineups: stat.games.lineups || 0,
        games_minutes: stat.games.minutes || 0,
        games_number: stat.games.number,
        games_position: stat.games.position,
        games_rating: stat.games.rating,
        games_captain: stat.games.captain ? 1 : 0,
        substitutes_in: stat.substitutes.in || 0,
        substitutes_out: stat.substitutes.out || 0,
        substitutes_bench: stat.substitutes.bench || 0,
        shots_total: stat.shots.total || 0,
        shots_on: stat.shots.on || 0,
        goals_total: stat.goals.total || 0,
        goals_conceded: stat.goals.conceded || 0,
        goals_assists: stat.goals.assists || 0,
        goals_saves: stat.goals.saves || 0,
        passes_total: stat.passes.total || 0,
        passes_key: stat.passes.key || 0,
        passes_accuracy: stat.passes.accuracy || 0,
        tackles_total: stat.tackles.total || 0,
        tackles_blocks: stat.tackles.blocks || 0,
        tackles_interceptions: stat.tackles.interceptions || 0,
        duels_total: stat.duels.total || 0,
        duels_won: stat.duels.won || 0,
        dribbles_attempts: stat.dribbles.attempts || 0,
        dribbles_success: stat.dribbles.success || 0,
        dribbles_past: stat.dribbles.past || 0,
        fouls_drawn: stat.fouls.drawn || 0,
        fouls_committed: stat.fouls.committed || 0,
        cards_yellow: stat.cards.yellow || 0,
        cards_yellowred: stat.cards.yellowred || 0,
        cards_red: stat.cards.red || 0,
        penalty_won: stat.penalty.won || 0,
        penalty_commited: stat.penalty.commited || 0,
        penalty_scored: stat.penalty.scored || 0,
        penalty_missed: stat.penalty.missed || 0,
        penalty_saved: stat.penalty.saved || 0
    }),
    standings: (api, leagueId, teamId, season) => ({
        league_id: leagueId,
        season_year: season,
        team_id: teamId,
        rank: api.rank,
        points: api.points,
        goals_diff: api.goalsDiff,
        played: api.all.played,
        win: api.all.win,
        draw: api.all.draw,
        lose: api.all.lose,
        goals_for: api.all.goals.for,
        goals_against: api.all.goals.against,
        form: api.form,
        status: api.status,
        description: api.description,
        group_name: api.group
    }),
    fixture: (api, leagueId, venueId, homeTeamId, awayTeamId, season) => ({
        api_id: api.fixture.id,
        league_id: leagueId,
        season_year: season,
        round: api.league.round,
        date: api.fixture.date,
        timestamp: api.fixture.timestamp,
        timezone: api.fixture.timezone,
        venue_id: venueId,
        status_long: api.fixture.status.long,
        status_short: api.fixture.status.short,
        elapsed: api.fixture.status.elapsed,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        goals_home: api.goals.home,
        goals_away: api.goals.away,
        score_halftime_home: api.score?.halftime?.home,
        score_halftime_away: api.score?.halftime?.away,
        score_fulltime_home: api.score?.fulltime?.home,
        score_fulltime_away: api.score?.fulltime?.away,
        score_extratime_home: api.score?.extratime?.home,
        score_extratime_away: api.score?.extratime?.away,
        score_penalty_home: api.score?.penalty?.home,
        score_penalty_away: api.score?.penalty?.away
    })
};

// --- Database Operations (Idempotent Upserts) ---

const DB = {
    getOrInsertCountry: (data) => {
        let country = dbV3.get("SELECT country_id FROM V3_Countries WHERE name = ?", cleanParams([data.name]));
        if (!country) {
            const info = dbV3.run("INSERT INTO V3_Countries (name, code, flag_url) VALUES (?, ?, ?)", cleanParams([data.name, data.code, data.flag_url]));
            return info.lastInsertRowid;
        }
        return country.country_id;
    },
    getOrInsertVenue: (data) => {
        if (!data.api_id) return null;
        let venue = dbV3.get("SELECT venue_id FROM V3_Venues WHERE api_id = ?", cleanParams([data.api_id]));
        if (!venue) {
            const info = dbV3.run(`INSERT INTO V3_Venues (api_id, name, address, city, capacity, surface, image_url) VALUES (?,?,?,?,?,?,?)`,
                cleanParams([data.api_id, data.name, data.address, data.city, data.capacity, data.surface, data.image_url]));
            return info.lastInsertRowid;
        }
        return venue.venue_id;
    },
    upsertTeam: (data, venueId) => {
        let team = dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", cleanParams([data.api_id]));
        if (team) {
            dbV3.run(`UPDATE V3_Teams SET name=?, code=?, logo_url=?, venue_id=? WHERE team_id=?`,
                cleanParams([data.name, data.code, data.logo_url, venueId, team.team_id]));
            return team.team_id;
        } else {
            const info = dbV3.run(`INSERT INTO V3_Teams (api_id, name, code, country, founded, national, logo_url, venue_id) VALUES (?,?,?,?,?,?,?,?)`,
                cleanParams([data.api_id, data.name, data.code, data.country, data.founded, data.national, data.logo_url, venueId]));
            return info.lastInsertRowid;
        }
    },
    upsertPlayer: (data) => {
        let player = dbV3.get("SELECT player_id FROM V3_Players WHERE api_id = ?", cleanParams([data.api_id]));
        if (player) {
            // Update critical fields if needed
            return player.player_id;
        } else {
            const info = dbV3.run(`INSERT INTO V3_Players (api_id, name, firstname, lastname, age, birth_date, birth_place, birth_country, nationality, height, weight, injured, photo_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                cleanParams([data.api_id, data.name, data.firstname, data.lastname, data.age, data.birth_date, data.birth_place, data.birth_country, data.nationality, data.height, data.weight, data.injured, data.photo_url]));
            return info.lastInsertRowid;
        }
    },
    upsertPlayerStats: (s) => {
        const existing = dbV3.get(`SELECT stat_id FROM V3_Player_Stats WHERE player_id=? AND team_id=? AND league_id=? AND season_year=?`,
            cleanParams([s.player_id, s.team_id, s.league_id, s.season_year]));
        if (existing) {
            dbV3.run(`UPDATE V3_Player_Stats SET 
                games_appearences=?, games_lineups=?, games_minutes=?, games_number=?, games_position=?, games_rating=?, games_captain=?,
                substitutes_in=?, substitutes_out=?, substitutes_bench=?, shots_total=?, shots_on=?, goals_total=?, goals_conceded=?, goals_assists=?, goals_saves=?,
                passes_total=?, passes_key=?, passes_accuracy=?, tackles_total=?, tackles_blocks=?, tackles_interceptions=?, duels_total=?, duels_won=?,
                dribbles_attempts=?, dribbles_success=?, dribbles_past=?, fouls_drawn=?, fouls_committed=?, cards_yellow=?, cards_yellowred=?, cards_red=?,
                penalty_won=?, penalty_commited=?, penalty_scored=?, penalty_missed=?, penalty_saved=?, updated_at=CURRENT_TIMESTAMP
                WHERE stat_id=?`,
                cleanParams([s.games_appearences, s.games_lineups, s.games_minutes, s.games_number, s.games_position, s.games_rating, s.games_captain,
                s.substitutes_in, s.substitutes_out, s.substitutes_bench, s.shots_total, s.shots_on, s.goals_total, s.goals_conceded, s.goals_assists, s.goals_saves,
                s.passes_total, s.passes_key, s.passes_accuracy, s.tackles_total, s.tackles_blocks, s.tackles_interceptions, s.duels_total, s.duels_won,
                s.dribbles_attempts, s.dribbles_success, s.dribbles_past, s.fouls_drawn, s.fouls_committed, s.cards_yellow, s.cards_yellowred, s.cards_red,
                s.penalty_won, s.penalty_commited, s.penalty_scored, s.penalty_missed, s.penalty_saved, existing.stat_id]));
        } else {
            dbV3.run(`INSERT INTO V3_Player_Stats (
                player_id, team_id, league_id, season_year, games_appearences, games_lineups, games_minutes, games_number, games_position, games_rating, games_captain,
                substitutes_in, substitutes_out, substitutes_bench, shots_total, shots_on, goals_total, goals_conceded, goals_assists, goals_saves,
                passes_total, passes_key, passes_accuracy, tackles_total, tackles_blocks, tackles_interceptions, duels_total, duels_won,
                dribbles_attempts, dribbles_success, dribbles_past, fouls_drawn, fouls_committed, cards_yellow, cards_yellowred, cards_red,
                penalty_won, penalty_commited, penalty_scored, penalty_missed, penalty_saved) VALUES (?,?,?,?, ?,?,?,?,?,?,?, ?,?,?, ?,?, ?,?,?,?, ?,?,?, ?,?,?, ?,?, ?,?,?, ?,?, ?,?,?, ?,?,?,?,?)`,
                cleanParams([s.player_id, s.team_id, s.league_id, s.season_year, s.games_appearences, s.games_lineups, s.games_minutes, s.games_number, s.games_position, s.games_rating, s.games_captain,
                s.substitutes_in, s.substitutes_out, s.substitutes_bench, s.shots_total, s.shots_on, s.goals_total, s.goals_conceded, s.goals_assists, s.goals_saves,
                s.passes_total, s.passes_key, s.passes_accuracy, s.tackles_total, s.tackles_blocks, s.tackles_interceptions, s.duels_total, s.duels_won,
                s.dribbles_attempts, s.dribbles_success, s.dribbles_past, s.fouls_drawn, s.fouls_committed, s.cards_yellow, s.cards_yellowred, s.cards_red,
                s.penalty_won, s.penalty_commited, s.penalty_scored, s.penalty_missed, s.penalty_saved]));
        }
    },
    upsertStanding: (s) => {
        const existing = dbV3.get(`SELECT standings_id FROM V3_Standings WHERE league_id=? AND season_year=? AND team_id=? AND group_name=?`,
            cleanParams([s.league_id, s.season_year, s.team_id, s.group_name]));
        if (existing) {
            dbV3.run(`UPDATE V3_Standings SET 
                rank=?, points=?, goals_diff=?, played=?, win=?, draw=?, lose=?, goals_for=?, goals_against=?, form=?, status=?, description=?, update_date=CURRENT_TIMESTAMP
                WHERE standings_id=?`,
                cleanParams([s.rank, s.points, s.goals_diff, s.played, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.form, s.status, s.description, existing.standings_id]));
        } else {
            dbV3.run(`INSERT INTO V3_Standings (
                league_id, season_year, team_id, rank, points, goals_diff, played, win, draw, lose, goals_for, goals_against, form, status, description, group_name
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                cleanParams([s.league_id, s.season_year, s.team_id, s.rank, s.points, s.goals_diff, s.played, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.form, s.status, s.description, s.group_name]));
        }
    },
    upsertFixture: (f) => {
        const existing = dbV3.get(`SELECT fixture_id FROM V3_Fixtures WHERE api_id=?`, cleanParams([f.api_id]));
        if (existing) {
            dbV3.run(`UPDATE V3_Fixtures SET 
                round=?, date=?, timestamp=?, timezone=?, venue_id=?, status_long=?, status_short=?, elapsed=?, goals_home=?, goals_away=?, 
                score_halftime_home=?, score_halftime_away=?, score_fulltime_home=?, score_fulltime_away=?, score_extratime_home=?, score_extratime_away=?, 
                score_penalty_home=?, score_penalty_away=?, updated_at=CURRENT_TIMESTAMP
                WHERE fixture_id=?`,
                cleanParams([f.round, f.date, f.timestamp, f.timezone, f.venue_id, f.status_long, f.status_short, f.elapsed, f.goals_home, f.goals_away,
                f.score_halftime_home, f.score_halftime_away, f.score_fulltime_home, f.score_fulltime_away, f.score_extratime_home, f.score_extratime_away,
                f.score_penalty_home, f.score_penalty_away, existing.fixture_id]));
        } else {
            dbV3.run(`INSERT INTO V3_Fixtures (
                api_id, league_id, season_year, round, date, timestamp, timezone, venue_id, status_long, status_short, elapsed, home_team_id, away_team_id, 
                goals_home, goals_away, score_halftime_home, score_halftime_away, score_fulltime_home, score_fulltime_away, score_extratime_home, score_extratime_away, 
                score_penalty_home, score_penalty_away
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                cleanParams([f.api_id, f.league_id, f.season_year, f.round, f.date, f.timestamp, f.timezone, f.venue_id, f.status_long, f.status_short, f.elapsed,
                f.home_team_id, f.away_team_id, f.goals_home, f.goals_away, f.score_halftime_home, f.score_halftime_away, f.score_fulltime_home, f.score_fulltime_away,
                f.score_extratime_home, f.score_extratime_away, f.score_penalty_home, f.score_penalty_away]));
        }
    }
};

// --- Core Import Function ---

export const runImportJob = async (leagueId, seasonYear, sendLog) => {
    sendLog(`🚀 V3 Import Started for League ID ${leagueId}, Season ${seasonYear}`, 'info');

    // 1. Fetch League & Season Info
    const leagueResponse = await footballApi.getLeagues({ id: leagueId, season: seasonYear });
    if (!leagueResponse.response?.length) throw new Error("League data not found.");
    const apiData = leagueResponse.response[0];

    // Country & League Resolution
    const countryId = DB.getOrInsertCountry(apiData.country);
    let localLeague = dbV3.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([leagueId]));
    let localLeagueId;

    if (!localLeague) {
        const info = dbV3.run("INSERT INTO V3_Leagues (api_id, name, type, logo_url, country_id) VALUES (?,?,?,?,?)",
            cleanParams([apiData.league.id, apiData.league.name, apiData.league.type, apiData.league.logo, countryId]));
        localLeagueId = info.lastInsertRowid;
        sendLog(`✅ Created League: ${apiData.league.name}`, 'success');
    } else {
        localLeagueId = localLeague.league_id;
    }

    // Season Tracker
    const apiSeason = apiData.seasons[0];
    let leagueSeason = dbV3.get("SELECT * FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));

    if (!leagueSeason) {
        dbV3.run(`INSERT INTO V3_League_Seasons (
                league_id, season_year, start_date, end_date, is_current, 
                coverage_standings, coverage_players, coverage_top_scorers, coverage_top_assists, coverage_top_cards, coverage_injuries, coverage_predictions, coverage_odds
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            cleanParams([localLeagueId, seasonYear, apiSeason.start, apiSeason.end, apiSeason.current ? 1 : 0,
                apiSeason.coverage.standings ? 1 : 0, apiSeason.coverage.players ? 1 : 0, apiSeason.coverage.top_scorers ? 1 : 0, apiSeason.coverage.top_assists ? 1 : 0,
                apiSeason.coverage.top_cards ? 1 : 0, apiSeason.coverage.injuries ? 1 : 0, apiSeason.coverage.predictions ? 1 : 0, apiSeason.coverage.odds ? 1 : 0]));
        sendLog(`📅 Created Season Tracker for ${seasonYear}`, 'success');
    }

    // 2. Fetch Teams
    const teamsResponse = await footballApi.getTeamsByLeague(leagueId, seasonYear);
    const teams = teamsResponse.response;
    sendLog(`ℹ️ Found ${teams.length} teams. Importing...`, 'info');

    const localTeamMap = {};
    dbV3.run('BEGIN TRANSACTION');
    try {
        for (const t of teams) {
            let venueId = t.venue?.id ? DB.getOrInsertVenue(Mappers.venue(t.venue)) : null;
            localTeamMap[t.team.id] = DB.upsertTeam(Mappers.team(t.team), venueId);
        }
        dbV3.run('COMMIT');
        sendLog(`✅ Imported ${teams.length} Teams and Venues.`, 'success');
    } catch (err) {
        dbV3.run('ROLLBACK');
        throw err;
    }

    // 3. Fetch Players & Stats
    sendLog('📡 Fetching Players & Stats (Team by Team)...', 'info');
    let totalPlayers = 0;

    for (const t of teams) {
        const teamName = t.team.name;
        const teamApiId = t.team.id;
        const localTeamId = localTeamMap[teamApiId];
        sendLog(`   Processing ${teamName}...`, 'info');

        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            const playersRes = await footballApi.getPlayersByTeam(teamApiId, seasonYear, page);
            if (!playersRes.response?.length) break;
            totalPages = playersRes.paging.total;

            dbV3.run('BEGIN TRANSACTION');
            try {
                for (const p of playersRes.response) {
                    const localPlayerId = DB.upsertPlayer(Mappers.player(p.player));
                    const leagueStats = p.statistics.filter(s => s.league.id === leagueId);
                    for (const s of leagueStats) {
                        let statTeamId = localTeamMap[s.team.id] || dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([s.team.id]))?.team_id;
                        if (localPlayerId && statTeamId) {
                            DB.upsertPlayerStats(Mappers.stats(s, localPlayerId, statTeamId, localLeagueId, seasonYear));
                        }
                    }
                    totalPlayers++;
                }
                dbV3.run('COMMIT');
            } catch (err) {
                dbV3.run('ROLLBACK');
                sendLog(`      ⚠️ Error on page ${page} for ${teamName}: ${err.message}`, 'error');
            }
            page++;
        }
    }

    dbV3.run("UPDATE V3_League_Seasons SET imported_players = 1, last_imported_at = CURRENT_TIMESTAMP WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
    sendLog(`🎉 League ${leagueId} (${seasonYear}) Complete! Processed ${totalPlayers} players.`, 'success');

    // 4. Ingest Standings
    sendLog('📊 Fetching Standings...', 'info');
    try {
        const standingsRes = await footballApi.getStandings(leagueId, seasonYear);
        if (standingsRes.response && standingsRes.response.length > 0) {
            const leagueData = standingsRes.response[0].league;
            dbV3.run('BEGIN TRANSACTION');
            for (const group of leagueData.standings) {
                for (const row of group) {
                    const teamApiId = row.team.id;
                    const teamId = localTeamMap[teamApiId] || dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([teamApiId]))?.team_id;
                    if (teamId) {
                        DB.upsertStanding(Mappers.standings(row, localLeagueId, teamId, seasonYear));
                    }
                }
            }
            dbV3.run('COMMIT');
            dbV3.run("UPDATE V3_League_Seasons SET imported_standings = 1 WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
            sendLog(`✅ Standings imported.`, 'success');
        } else {
            sendLog(`ℹ️ No standings found for this league.`, 'info');
        }
    } catch (err) {
        sendLog(`⚠️ Standings import failed: ${err.message}`, 'error');
    }

    // 5. Ingest Fixtures
    sendLog('🏟️ Fetching Fixtures...', 'info');
    try {
        const fixturesRes = await footballApi.getFixtures(leagueId, seasonYear);
        if (fixturesRes.response && fixturesRes.response.length > 0) {
            dbV3.run('BEGIN TRANSACTION');
            for (const f of fixturesRes.response) {
                const homeTeamId = localTeamMap[f.teams.home.id] || dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([f.teams.home.id]))?.team_id;
                const awayTeamId = localTeamMap[f.teams.away.id] || dbV3.get("SELECT team_id FROM V3_Teams WHERE api_id=?", cleanParams([f.teams.away.id]))?.team_id;
                const venueId = f.fixture.venue.id ? DB.getOrInsertVenue(Mappers.venue(f.fixture.venue)) : null;

                if (homeTeamId && awayTeamId) {
                    DB.upsertFixture(Mappers.fixture(f, localLeagueId, venueId, homeTeamId, awayTeamId, seasonYear));
                }
            }
            dbV3.run('COMMIT');
            dbV3.run("UPDATE V3_League_Seasons SET imported_fixtures = 1 WHERE league_id = ? AND season_year = ?", cleanParams([localLeagueId, seasonYear]));
            sendLog(`✅ Fixtures imported.`, 'success');
        } else {
            sendLog(`ℹ️ No fixtures found for this league.`, 'info');
        }
    } catch (err) {
        sendLog(`⚠️ Fixtures import failed: ${err.message}`, 'error');
    }

    // Return metadata for frontend dashboard links
    return { leagueId, season: seasonYear };
};

/**
 * GET /api/v3/league/:id/standings?year=2023
 */
export const getStandingsV3 = async (req, res) => {
    try {
        const { id: leagueId } = req.params;
        const { year: seasonYear } = req.query;

        if (!leagueId || !seasonYear) {
            return res.status(400).json({ error: "Missing leagueId or year" });
        }

        const standings = dbV3.all(`
            SELECT 
                s.*, t.name as team_name, t.logo_url as team_logo
            FROM V3_Standings s
            JOIN V3_Teams t ON s.team_id = t.team_id
            WHERE s.league_id = ? AND s.season_year = ?
            ORDER BY s.group_name ASC, s.rank ASC
        `, cleanParams([leagueId, seasonYear]));

        res.json(standings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/league/:id/fixtures?year=2023
 */
export const getFixturesV3 = async (req, res) => {
    try {
        const { id: leagueId } = req.params;
        const { year: seasonYear } = req.query;

        if (!leagueId || !seasonYear) {
            return res.status(400).json({ error: "Missing leagueId or year" });
        }

        const fixtures = dbV3.all(`
            SELECT 
                f.*, 
                ht.name as home_team_name, ht.logo_url as home_team_logo,
                at.name as away_team_name, at.logo_url as away_team_logo,
                v.name as venue_name, v.city as venue_city
            FROM V3_Fixtures f
            JOIN V3_Teams ht ON f.home_team_id = ht.team_id
            JOIN V3_Teams at ON f.away_team_id = at.team_id
            LEFT JOIN V3_Venues v ON f.venue_id = v.venue_id
            WHERE f.league_id = ? AND f.season_year = ?
            ORDER BY f.date ASC
        `, cleanParams([leagueId, seasonYear]));

        // Get unique rounds
        const rounds = Array.from(new Set(fixtures.map(f => f.round)));

        res.json({
            fixtures,
            rounds
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Controllers ---

/**
 * GET /api/v3/countries
 */
export const getCountriesV3 = async (req, res) => {
    try {
        // Primary source: footballApi
        const response = await footballApi.getCountries();

        if (response.response && response.response.length > 0) {
            // Map to unified format if needed, though API already has { name, code, flag }
            return res.json(response.response);
        }

        // Fallback: If API fails, try V3_Countries (already imported ones)
        const countries = dbV3.all(`
            SELECT name, code, flag_url as flag
            FROM V3_Countries
            ORDER BY name ASC
        `);

        res.json(countries);
    } catch (error) {
        console.error("Error in getCountriesV3:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * GET /api/v3/leagues
 */
export const getLeaguesV3 = async (req, res) => {
    try {
        const { country } = req.query;
        const params = country ? { country } : {};
        const response = await footballApi.getLeagues(params);
        res.json(response.response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * POST /api/v3/import/league
 */
export const importLeagueV3 = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };

    const { leagueId, season } = req.body;
    try {
        const meta = await runImportJob(leagueId, parseInt(season), sendLog);
        res.write(`data: ${JSON.stringify({ type: 'complete', ...meta })}\n\n`);
        res.end();
    } catch (error) {
        console.error("V3 Import Job Failed:", error);
        const msg = error.message || String(error) || "Unknown Error";
        sendLog(`❌ Critical Error: ${msg}`, 'error');
        res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
        res.end();
    }
};

/**
 * POST /api/v3/import/batch
 */
export const importBatchV3 = async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const sendLog = (message, type = 'info') => {
        res.write(`data: ${JSON.stringify({ message, type })}\n\n`);
    };

    const { selection } = req.body;
    if (!selection || !Array.isArray(selection)) {
        sendLog('❌ Invalid selection format.', 'error');
        res.end();
        return;
    }

    try {
        sendLog(`📦 Batch Import Started: ${selection.length} Leagues queued.`, 'info');
        let lastMeta = null;

        for (const item of selection) {
            const { leagueId, seasons } = item;
            for (const season of seasons) {
                try {
                    lastMeta = await runImportJob(leagueId, parseInt(season), sendLog);
                } catch (err) {
                    console.error(`Error in batch for League ${leagueId} Season ${season}:`, err);
                    sendLog(`❌ Error importing League ${leagueId} Season ${season}: ${err.message || String(err)}`, 'error');
                }
            }
        }

        sendLog('🎉 Batch Import Sequence Completed.', 'complete');
        res.write(`data: ${JSON.stringify({ type: 'complete', ...lastMeta })}\n\n`);
        res.end();
    } catch (error) {
        console.error("V3 Batch Import Fatal Error:", error);
        sendLog(`❌ Critical Batch Error: ${error.message || String(error)}`, 'error');
        res.end();
    }
};
