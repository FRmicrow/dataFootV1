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
    getStructuredLeagues: () => api.get('/leagues/structured'),
    getSeasonOverview: (id, year) => api.get(`/league/${id}/season/${year}`),
    getSeasonPlayers: (id, year, params) => api.get(`/league/${id}/season/${year}/players`, { params }),
    getStandings: (id, year) => api.get(`/league/${id}/standings?year=${year}`), // Note: Verify if query param or path param
    getDynamicStandings: (params) => api.get(`/standings/dynamic?${new URLSearchParams(params)}`),

    // --- Clubs ---
    getClub: (id, year, competition) => {
        let url = `/club/${id}`;
        const params = new URLSearchParams();
        if (year) params.append('year', year);
        if (competition) params.append('competition', competition);
        const query = params.toString();
        return api.get(query ? `${url}?${query}` : url);
    },
    getClubTacticalSummary: (id, params) => api.get(`/club/${id}/tactical-summary`, { params }),
    getClubMatches: (id, params) => api.get(`/club/${id}/matches`, { params }),
    getTypicalLineup: (id, params) => api.get(`/club/${id}/typical-lineup`, { params }),
    getTeamSquad: (leagueId, year, teamId) => api.get(`/league/${leagueId}/season/${year}/club/${teamId}/squad`),

    // --- Players ---
    getPlayer: (id) => api.get(`/player/${id}`),
    getPlayerTrophies: (id) => api.get(`/player/${id}/trophies`),
    syncPlayerCareer: (id) => api.post(`/player/${id}/sync-career`),

    // --- Fixtures ---
    getFixture: (id) => api.get(`/fixtures/${id}`),
    getLeagueFixtures: (id, year) => api.get(`/league/${id}/fixtures?year=${year}`),
    getFixtureEvents: (id) => api.get(`/fixtures/${id}/events`),
    getFixtureLineups: (id) => api.get(`/fixtures/${id}/lineups`),
    getFixtureTacticalStats: (id) => api.get(`/fixtures/${id}/tactical-stats`),
    getFixturePlayerStats: (id) => api.get(`/fixtures/${id}/player-stats`),

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
    ingestDepthOdds: (id) => api.post(`/live-bet/odds/fixture/${id}`),
    bulkIngestOdds: (date) => api.post('/live-bet/odds/ingest-date', { date }),

    // --- Preferences (US_017, US_018) ---
    getPreferences: () => api.get('/preferences'),
    updatePreferences: (data) => api.put('/preferences', data),

    // --- Studio ---
    getStudioStats: () => api.get('/studio/meta/stats'),
    getStudioLeagues: () => api.get('/studio/meta/leagues'),
    queryStudio: (data) => api.post('/studio/query', data),
    // --- Import Matrix (US_040, US_042, US_270) ---
    getImportMatrixStatus: () => api.get('/import/matrix-status'),
    triggerAuditScan: () => api.post('/import/audit-scan'),
    resetImportStatus: (data) => api.post('/import/status/reset', data),
    stopImport: () => api.post('/import/stop'),
    pauseImport: () => api.post('/import/pause'),
    resumeImport: () => api.post('/import/resume'),
    getImportState: () => api.get('/import/state'),

    // --- Health Prescriptions (US_062, US_063) ---
    getHealthPrescriptions: (status) => api.get(`/health/prescriptions${status ? `?status=${status}` : ''}`),
    triggerHealthPrescribe: () => api.post('/health/prescribe'),
    executePrescription: (id) => api.post('/health/execute', { id }),

    // --- Forge Simulation Engine (V8) ---
    startSimulation: (data) => api.post('/simulation/start', data),
    getSimulationStatus: (leagueId, seasonYear, horizon) => api.get(`/simulation/status?leagueId=${leagueId}&seasonYear=${seasonYear}${horizon ? `&horizon=${horizon}` : ''}`),
    getSimulationReadiness: (leagueId, seasonYear) => api.get(`/simulation/readiness?leagueId=${leagueId}&seasonYear=${seasonYear}`),
    getSimulationResults: (simId) => api.get(`/simulation/results/${simId}`),
    getLeagueSimulations: (leagueId) => api.get(`/simulation/league/${leagueId}`),

    // --- ML Management (V8) ---
    getMLStatus: () => api.get('/ml/status'),
    triggerMLRetrain: () => api.post('/ml/train'),

    // --- Forge Model Building (V8) ---
    buildForgeModels: (data) => api.post('/forge/build-models', data),
    getForgeBuildStatus: () => api.get('/forge/build-status'),
    cancelForgeBuild: () => api.post('/forge/cancel-build'),
    getForgeModels: () => api.get('/forge/models'),

    // --- Forge Model Refinement (V8 Adaptive) ---
    retrainModel: (data) => api.post('/forge/retrain', data),
    getRetrainStatus: () => api.get('/forge/retrain-status'),
    getEligibleHorizons: (leagueId, seasonYear) => api.get(`/forge/eligible-horizons?leagueId=${leagueId}&seasonYear=${seasonYear}`),
    getLeagueModels: (leagueId) => api.get(`/forge/league-models/${leagueId}`),

    // --- Deep Sync (League Activation) ---
    triggerDeepSync: (leagueId) => api.post(`/import/league/${leagueId}/deep-sync`),
    getSyncStatus: (leagueId) => api.get(`/league/${leagueId}/sync-status`),

    // --- Tactical Stats & Normalization (US_F11) ---
    normalizeSeason: (data) => api.post('/import/normalize', data),

    // --- Machine Learning V19 ---
    getMLOrchestratorStatus: () => api.get('/ml-platform/orchestrator/status'),
    getMLRecentAnalyses: () => api.get('/ml-platform/risk/recent'),
    getMLSimulationFilters: () => api.get('/ml-platform/simulations/filters'),
    getMLSimulationOverview: () => api.get('/ml-platform/simulations/overview'),

    getMLRecommendations: () => api.get('/ml-platform/recommendations'),

    syncMLUpcomingOdds: () => api.post('/ml-platform/odds/sync'),
    syncMLAdvancedOdds: () => api.post('/ml-platform/odds/advanced-sync'),
    runMLOddsCatchup: () => api.post('/ml-platform/odds/catchup'),
    getMLModelEvaluation: (leagueId, seasonYear) => {
        const params = new URLSearchParams();
        if (leagueId) params.append('leagueId', leagueId);
        if (seasonYear) params.append('seasonYear', seasonYear);
        return api.get(`/ml-platform/simulations/evaluation?${params.toString()}`);
    },

    // --- Discovery ---
    getDiscoveryCountries: () => api.get('/import/discovery/countries'),
    getDiscoveryLeagues: (country) => api.get(`/import/discovery/leagues?country=${country}`),
    triggerDiscoveryImport: (data) => api.post('/import/discovery/import', data),
};
