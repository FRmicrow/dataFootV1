import axios from 'axios';
import dotenv from 'dotenv';
import apiQueue from './apiQueue.js';

dotenv.config();

const API_KEY = process.env.API_FOOTBALL_KEY;
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';

/**
 * Football API Service
 * Wrapper for API-Football endpoints with rate limiting
 */

class FootballApi {
    constructor() {
        this.client = axios.create({
            baseURL: BASE_URL,
            headers: {
                'x-apisports-key': API_KEY
            }
        });
    }

    /**
     * Make an API request through the queue
     */
    async makeRequest(endpoint, params = {}, requestId) {
        const requestFn = async () => {
            const response = await this.client.get(endpoint, { params });
            return response.data;
        };

        return apiQueue.enqueue(requestFn, requestId);
    }

    /**
     * Search players by name using profiles endpoint
     * GET /players/profiles?search={name}
     */
    async searchPlayers(name) {
        const requestId = `search-profile-${name.toLowerCase().replace(/\s+/g, '-')}`;
        return this.makeRequest('/players/profiles', {
            search: name
        }, requestId);
    }

    /**
     * Get player profile by ID
     */
    async getPlayerProfile(playerId) {
        const requestId = `profile-${playerId}`;
        return this.makeRequest('/players/profiles', {
            player: playerId
        }, requestId);
    }

    /**
     * Get available seasons for a player
     * GET /players/seasons?player={id}
     */
    async getSeasons(playerId) {
        const requestId = `seasons-player-${playerId}`;
        return this.makeRequest('/players/seasons', {
            player: playerId
        }, requestId);
    }

    /**
     * Get player statistics for a specific season
     * GET /players?id={id}&season={season}
     */
    async getPlayerStatistics(playerId, season) {
        const requestId = `stats-${playerId}-${season}`;
        return this.makeRequest('/players', {
            id: playerId,
            season: season
        }, requestId);
    }

    /**
     * Get player trophies
     * GET /trophies?player={id}
     */
    async getPlayerTrophies(playerId) {
        const requestId = `trophies-${playerId}`;
        return this.makeRequest('/trophies', {
            player: playerId
        }, requestId);
    }

    /**
     * Search teams by name
     * GET /teams?name={name}
     */
    async searchTeams(name) {
        const requestId = `search-team-${name.toLowerCase().replace(/\s+/g, '-')}`;
        return this.makeRequest('/teams', {
            name: name
        }, requestId);
    }

    /**
     * Get team standings for a specific season
     * GET /standings?team={id}&season={season}
     */
    async getTeamStandings(teamId, season) {
        const requestId = `standings-team-${teamId}-${season}`;
        return this.makeRequest('/standings', {
            team: teamId,
            season: season
        }, requestId);
    }

    /**
     * Get team trophies
     * GET /trophies?team={id}
     */
    async getTeamTrophies(teamId) {
        const requestId = `trophies-team-${teamId}`;
        return this.makeRequest('/trophies', {
            team: teamId
        }, requestId);
    }


    /**
     * Get available seasons for a team
     * GET /teams/seasons?team={id}
     */
    async getTeamSeasons(teamId) {
        const requestId = `seasons-team-${teamId}`;
        return this.makeRequest('/teams/seasons', {
            team: teamId
        }, requestId);
    }

    /**
     * Get leagues with flexible parameters
     * GET /leagues?id={id}&season={season}&country={country}...
     */
    async getLeagues(params) {
        // backward compatibility for season-only call
        if (typeof params === 'string' || typeof params === 'number') {
            params = { season: params };
        }

        // Create a deterministic requestId based on sorted keys
        const paramKeys = Object.keys(params).sort();
        const paramString = paramKeys.map(k => `${k}-${params[k]}`).join('_');
        const requestId = `leagues-${paramString}`;

        return this.makeRequest('/leagues', params, requestId);
    }

    /**
     * Get all countries
     * GET /countries
     */
    async getCountries() {
        const requestId = 'all-countries';
        return this.makeRequest('/countries', {}, requestId);
    }

    /**
     * Get teams from a specific league and season
     * GET /teams?league={id}&season={season}
     */
    async getTeamsFromLeague(leagueId, season) {
        const requestId = `teams-league-${leagueId}-${season}`;
        return this.makeRequest('/teams', {
            league: leagueId,
            season: season
        }, requestId);
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        return apiQueue.getStatus();
    }

    /**
     * Get players by team and season
     * GET /players?team={teamId}&season={season}&page={page}
     */
    async getPlayersByTeam(teamId, season, page = 1) {
        const requestId = `players-team-${teamId}-${season}-page-${page}`;
        return this.makeRequest('/players', {
            team: teamId,
            season: season,
            page: page
        }, requestId);
    }

    /**
     * Get trophies for a specific player
     * GET /trophies?player={playerId}
     */
    async getTrophies(playerId) {
        const requestId = `trophies-player-${playerId}`;
        return this.makeRequest('/trophies', {
            player: playerId
        }, requestId);
    }

    /**
     * Get team information by name
     * GET /teams?name={name}
     */
    async getTeamByName(teamName) {
        const requestId = `team-name-${teamName.toLowerCase().replace(/\s+/g, '-')}`;
        return this.makeRequest('/teams', {
            name: teamName
        }, requestId);
    }

    /**
     * Get all countries available for teams
     * GET /teams/countries
     */
    async getTeamCountries() {
        const requestId = 'team-countries';
        return this.makeRequest('/teams/countries', {}, requestId);
    }

    /**
     * Get all teams from a specific country
     * GET /teams?country={country}
     */
    async getTeamsByCountry(country) {
        const requestId = `teams-country-${country.toLowerCase().replace(/\s+/g, '-')}`;
        return this.makeRequest('/teams', {
            country: country
        }, requestId);
    }

    /**
     * Get team statistics for a specific league and season
     * GET /teams/statistics?league={leagueId}&team={teamId}&season={season}
     */
    async getTeamStatistics(teamId, leagueId, season, date = null) {
        const requestId = `team-stats-${teamId}-${leagueId}-${season}`;
        const params = {
            team: teamId,
            league: leagueId,
            season: season
        };
        if (date) {
            params.date = date;
        }
        return this.makeRequest('/teams/statistics', params, requestId);
    }


    /**
     * Get complete team information by ID (includes trophies)
     * GET /teams?id={id}
     */
    async getTeamById(teamId) {
        const requestId = `team-id-${teamId}`;
        return this.makeRequest('/teams', {
            id: teamId
        }, requestId);
    }

    /**
     * Get all teams in a specific league and season
     * GET /teams?league={leagueId}&season={season}
     */
    async getTeamsByLeague(leagueId, season) {
        const requestId = `teams-league-${leagueId}-${season}`;
        return this.makeRequest('/teams', {
            league: leagueId,
            season: season
        }, requestId);
    }

    /**
     * Get standings for a specific league and season
     * GET /standings?league={id}&season={season}
     */
    async getStandings(leagueId, season) {
        const requestId = `standings-league-${leagueId}-${season}`;
        return this.makeRequest('/standings', {
            league: leagueId,
            season: season
        }, requestId);
    }

    /**
     * Get fixtures for a specific league and season
     * GET /fixtures?league={id}&season={season}
     */
    async getFixtures(leagueId, season) {
        const requestId = `fixtures-league-${leagueId}-${season}`;
        return this.makeRequest('/fixtures', {
            league: leagueId,
            season: season
        }, requestId);
    }
    /**
     * Get lineups for a specific fixture
     * GET /fixtures/lineups?fixture={id}
     */
    async getFixtureLineups(fixtureId) {
        const requestId = `lineups-fixture-${fixtureId}`;
        return this.makeRequest('/fixtures/lineups', {
            fixture: fixtureId
        }, requestId);
    }

    /**
     * Get events for a specific fixture
     * GET /fixtures/events?fixture={id}
     */
    async getFixtureEvents(fixtureId) {
        const requestId = `events-fixture-${fixtureId}`;
        return this.makeRequest('/fixtures/events', {
            fixture: fixtureId
        }, requestId);
    }

    /**
     * Get player statistics for a specific fixture
     * GET /fixtures/players?fixture={id}
     */
    async getFixturePlayerStatistics(fixtureId) {
        const requestId = `stats-fixture-${fixtureId}`;
        return this.makeRequest('/fixtures/players', {
            fixture: fixtureId
        }, requestId);
    }
}

const footballApi = new FootballApi();

export default footballApi;
