/**
 * Centralized API Service
 * Handles all backend communication with type-safe(ish) methods.
 */
import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api', // Vite proxy handles redirection
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor
api.interceptors.response.use(
    (response) => response.data, // Return data directly for cleaner consumption
    (error) => {
        const message = error.response?.data?.error || error.message;
        console.error('API Error:', message);
        return Promise.reject(error);
    }
);

export default {
    // --- Dashboard & Misc ---
    getStats: () => api.get('/stats'),
    getHealth: () => api.get('/admin/health'),
    search: (params) => api.get(`/search?${new URLSearchParams(params)}`),
    getSearchCountries: () => api.get('/search/countries'),

    // --- Leagues ---
    getLeagues: (country) => api.get(country ? `/leagues?country=${encodeURIComponent(country)}` : '/leagues'),
    getImportedLeagues: () => api.get('/leagues/imported'),
    getLeagueSeasons: (id) => api.get(`/leagues/${id}/seasons`),
    getAvailableSeasons: (id) => api.get(`/league/${id}/available-seasons`),
    getSeasonOverview: (id, year) => api.get(`/league/${id}/season/${year}`),
    getSeasonPlayers: (id, year, params) => api.get(`/league/${id}/season/${year}/players`, { params }),
    getStandings: (id, year) => api.get(`/league/${id}/standings?year=${year}`), // Note: Verify if query param or path param
    getDynamicStandings: (params) => api.get(`/standings/dynamic?${new URLSearchParams(params)}`),

    // --- Clubs ---
    getClub: (id, year) => api.get(year ? `/club/${id}?year=${year}` : `/club/${id}`),
    getTeamSquad: (leagueId, year, teamId) => api.get(`/league/${leagueId}/season/${year}/team/${teamId}/squad`),

    // --- Players ---
    getPlayer: (id) => api.get(`/player/${id}`),
    getPlayerTrophies: (id) => api.get(`/player/${id}/trophies`),
    syncPlayerCareer: (id) => api.post(`/player/${id}/sync-career`),

    // --- Fixtures ---
    getFixture: (id) => api.get(`/fixtures/${id}`),
    getLeagueFixtures: (id, year) => api.get(`/league/${id}/fixtures?year=${year}`),
    getFixtureEvents: (id) => api.get(`/fixtures/${id}/events`),
    getFixtureLineups: (id) => api.get(`/fixtures/${id}/lineups`),

    // --- Import & Sync Operations ---
    getCountries: () => api.get('/countries'), // For import dropdown
    importLeague: (data) => api.post('/import/league', data),
    importBatch: (data) => api.post('/import/batch', data),

    // Events / Lineups Import
    getEventCandidates: () => api.get('/fixtures/events/candidates'),
    syncEvents: (data) => api.post('/fixtures/events/sync', data),
    getLineupCandidates: () => api.get('/fixtures/lineups/candidates'),
    importLineups: (data) => api.post('/fixtures/lineups/import', data),

    // Trophies Import
    getTrophyCandidates: (leagueId) => api.get(`/import/trophies/candidates?leagueId=${leagueId}`),
    getNationalities: () => api.get('/players/nationalities'),
    getPlayersByNationality: (country) => api.get(`/players/by-nationality?country=${encodeURIComponent(country)}`),
    importTrophies: (data) => api.post('/import/trophies', data),

    // Betting Labs (Predictions)
    getPredictions: (status) => api.get('/predictions', { params: { status } }),
    syncPredictions: () => api.post('/predictions/sync'),

    // --- Admin / Health ---
    getCleanupHistory: () => api.get('/admin/health/history'),
    revertCleanup: (groupId) => api.post(`/admin/health/revert/${groupId}`),
    checkDeepHealth: (data) => api.post('/admin/health/check-deep', data),
    fixHealthIssue: (data) => api.post('/admin/health/fix', data),
    fixAllHealthIssues: () => api.post('/admin/health/fix-all'),

    // --- Live Bet (US_010, US_011, US_012, US_016, US_022) ---
    getLiveFixtures: (date) => api.get(`/live-bet/fixtures${date ? `?date=${date}` : ''}`),
    getUpcomingFixtures: (leagueIds = []) => api.get(`/live-bet/upcoming${leagueIds.length ? `?leagues=${leagueIds.join(',')}` : ''}`),
    getMatchDetails: (id) => api.get(`/live-bet/match/${id}`),
    saveMatchOdds: (id) => api.post(`/live-bet/match/${id}/save-odds`),

    // --- Preferences (US_017, US_018) ---
    getPreferences: () => api.get('/preferences'),
    updatePreferences: (data) => api.put('/preferences', data),

    // --- Studio ---
    getStudioStats: () => api.get('/studio/meta/stats'),
    getStudioLeagues: () => api.get('/studio/meta/leagues'),
    queryStudio: (data) => api.post('/studio/query', data),

    // --- ML Intelligence (US_026, US_028, US_030, US_031) ---
    getMatchPrediction: (fixtureId) => api.get(`/live-bet/match/${fixtureId}/prediction`),
    getModelPerformance: (leagueId) => api.get(`/model/performance?league=${leagueId}`),
    getMlServiceHealth: () => api.get('/model/health'),
    getMLPredictions: () => api.get('/ml/predictions'),
    triggerMLScan: () => api.post('/ml/scan'),
    startTraining: (target, limit) => api.post('/ml/train', { target, limit }),
    getTrainingStatus: () => api.get('/ml/train/status'),
    getTrainingLogs: (lines) => api.get(`/ml/train/logs?lines=${lines}`),
    stopTraining: () => api.post('/ml/train/stop'),
    getMlInventory: () => api.get('/ml/inventory'),
    empowerLeague: (leagueId, forceRebuild = false) => api.post(`/ml/empower/${leagueId}`, { force_rebuild: forceRebuild }),
};
