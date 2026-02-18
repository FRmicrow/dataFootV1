import db from '../../config/database.js';
import { cleanParams } from '../../utils/sqlHelpers.js';

export const Mappers = {
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
    leagueSeason: (leagueId, year) => ({
        league_id: leagueId,
        season_year: year
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
        is_national_team: api.national ? 1 : 0,
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
        photo_url: api.photo,
        preferred_foot: api.foot
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

export const ImportRepository = {
    getOrInsertCountry: (data) => {
        let country = db.get("SELECT country_id FROM V3_Countries WHERE name = ?", cleanParams([data.name]));
        if (!country) {
            const info = db.run("INSERT INTO V3_Countries (name, code, flag_url) VALUES (?, ?, ?)", cleanParams([data.name, data.code, data.flag_url]));
            return info.lastInsertRowid;
        }
        return country.country_id;
    },
    getOrInsertVenue: (data) => {
        if (!data.api_id) return null;
        let venue = db.get("SELECT venue_id FROM V3_Venues WHERE api_id = ?", cleanParams([data.api_id]));
        if (!venue) {
            const info = db.run(`INSERT INTO V3_Venues (api_id, name, address, city, capacity, surface, image_url) VALUES (?,?,?,?,?,?,?)`,
                cleanParams([data.api_id, data.name, data.address, data.city, data.capacity, data.surface, data.image_url]));
            return info.lastInsertRowid;
        }
        return venue.venue_id;
    },
    upsertLeague: (data, countryId, countryName) => {
        // 1. Primary Check: API ID
        let league = db.get("SELECT league_id FROM V3_Leagues WHERE api_id = ?", cleanParams([data.api_id]));
        if (league) {
            return league.league_id;
        }

        // 2. Naming Convention: Handle Generics
        const GENERIC_NAMES = ["Cup", "Premier League", "Super Cup", "Play-offs", "Championship", "League 1", "League 2", "Super League", "Challenge League", "First Division", "Second Division", "Serie A", "Serie B"];
        let finalName = data.name;

        if (countryName && countryName !== 'World') {
            // Check exact match or if name is just "Cup"
            if (GENERIC_NAMES.includes(data.name)) {
                finalName = `${data.name} (${countryName})`;
            }
        }

        // 3. Identity Check (Prevent Duplicates if API ID is missing/changed but Name+Country matches)
        let existingIdentity = db.get("SELECT league_id FROM V3_Leagues WHERE name = ? AND country_id = ?", cleanParams([finalName, countryId]));
        if (existingIdentity) {
            // Update API ID if missing? optionally
            db.run("UPDATE V3_Leagues SET api_id = ? WHERE league_id = ?", cleanParams([data.api_id, existingIdentity.league_id]));
            return existingIdentity.league_id;
        }

        // 4. Create New Discovered League
        const info = db.run(
            "INSERT INTO V3_Leagues (api_id, name, type, logo_url, country_id, is_discovered) VALUES (?, ?, ?, ?, ?, 1)",
            cleanParams([data.api_id, finalName, data.type, data.logo_url, countryId])
        );
        return info.lastInsertRowid;
    },
    upsertLeagueSeason: (data) => {
        let season = db.get("SELECT league_season_id FROM V3_League_Seasons WHERE league_id = ? AND season_year = ?", cleanParams([data.league_id, data.season_year]));
        if (season) {
            return season.league_season_id;
        } else {
            // New Season -> PARTIAL_DISCOVERY
            const info = db.run(`INSERT INTO V3_League_Seasons (
                league_id, season_year, sync_status, is_current, 
                coverage_standings, coverage_players, coverage_top_scorers, coverage_top_assists, coverage_top_cards, coverage_injuries, coverage_predictions, coverage_odds
            ) VALUES (?, ?, 'PARTIAL_DISCOVERY', 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
                cleanParams([data.league_id, data.season_year]));
            return info.lastInsertRowid;
        }
    },
    upsertTeam: (data, venueId) => {
        let team = db.get("SELECT team_id FROM V3_Teams WHERE api_id = ?", cleanParams([data.api_id]));
        if (team) {
            db.run(`UPDATE V3_Teams SET name=?, code=?, logo_url=?, venue_id=?, is_national_team=? WHERE team_id=?`,
                cleanParams([data.name, data.code, data.logo_url, venueId, data.is_national_team, team.team_id]));
            return team.team_id;
        } else {
            const info = db.run(`INSERT INTO V3_Teams (api_id, name, code, country, founded, national, is_national_team, logo_url, venue_id) VALUES (?,?,?,?,?,?,?,?,?)`,
                cleanParams([data.api_id, data.name, data.code, data.country, data.founded, data.national, data.is_national_team, data.logo_url, venueId]));
            return info.lastInsertRowid;
        }
    },
    upsertPlayer: (data) => {
        let player = db.get("SELECT player_id FROM V3_Players WHERE api_id = ?", cleanParams([data.api_id]));
        if (player) {
            // Update critical fields if needed
            db.run(`UPDATE V3_Players SET age=?, height=?, weight=?, injured=?, photo_url=?, preferred_foot=? WHERE player_id=?`,
                cleanParams([data.age, data.height, data.weight, data.injured, data.photo_url, data.preferred_foot, player.player_id]));
            return player.player_id;
        } else {
            const info = db.run(`INSERT INTO V3_Players (api_id, name, firstname, lastname, age, birth_date, birth_place, birth_country, nationality, height, weight, injured, photo_url, preferred_foot) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                cleanParams([data.api_id, data.name, data.firstname, data.lastname, data.age, data.birth_date, data.birth_place, data.birth_country, data.nationality, data.height, data.weight, data.injured, data.photo_url, data.preferred_foot]));
            return info.lastInsertRowid;
        }
    },
    upsertPlayerStats: (s) => {
        const existing = db.get(`SELECT stat_id FROM V3_Player_Stats WHERE player_id=? AND team_id=? AND league_id=? AND season_year=?`,
            cleanParams([s.player_id, s.team_id, s.league_id, s.season_year]));
        if (existing) {
            db.run(`UPDATE V3_Player_Stats SET 
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
            db.run(`INSERT INTO V3_Player_Stats (
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
        const existing = db.get(`SELECT standings_id FROM V3_Standings WHERE league_id=? AND season_year=? AND team_id=? AND group_name=?`,
            cleanParams([s.league_id, s.season_year, s.team_id, s.group_name]));
        if (existing) {
            db.run(`UPDATE V3_Standings SET 
                rank=?, points=?, goals_diff=?, played=?, win=?, draw=?, lose=?, goals_for=?, goals_against=?, form=?, status=?, description=?, update_date=CURRENT_TIMESTAMP
                WHERE standings_id=?`,
                cleanParams([s.rank, s.points, s.goals_diff, s.played, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.form, s.status, s.description, existing.standings_id]));
        } else {
            db.run(`INSERT INTO V3_Standings (
                league_id, season_year, team_id, rank, points, goals_diff, played, win, draw, lose, goals_for, goals_against, form, status, description, group_name
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                cleanParams([s.league_id, s.season_year, s.team_id, s.rank, s.points, s.goals_diff, s.played, s.win, s.draw, s.lose, s.goals_for, s.goals_against, s.form, s.status, s.description, s.group_name]));
        }
    },
    upsertFixture: (f) => {
        const existing = db.get(`SELECT fixture_id FROM V3_Fixtures WHERE api_id=?`, cleanParams([f.api_id]));
        if (existing) {
            db.run(`UPDATE V3_Fixtures SET 
                round=?, date=?, timestamp=?, timezone=?, venue_id=?, status_long=?, status_short=?, elapsed=?, goals_home=?, goals_away=?, 
                score_halftime_home=?, score_halftime_away=?, score_fulltime_home=?, score_fulltime_away=?, score_extratime_home=?, score_extratime_away=?, 
                score_penalty_home=?, score_penalty_away=?, updated_at=CURRENT_TIMESTAMP
                WHERE fixture_id=?`,
                cleanParams([f.round, f.date, f.timestamp, f.timezone, f.venue_id, f.status_long, f.status_short, f.elapsed, f.goals_home, f.goals_away,
                f.score_halftime_home, f.score_halftime_away, f.score_fulltime_home, f.score_fulltime_away, f.score_extratime_home, f.score_extratime_away,
                f.score_penalty_home, f.score_penalty_away, existing.fixture_id]));
        } else {
            db.run(`INSERT INTO V3_Fixtures (
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
