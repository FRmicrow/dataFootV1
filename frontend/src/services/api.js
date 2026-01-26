import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = {
    // Search players
    searchPlayers: async (name, nationality) => {
        const response = await axios.get(`${API_BASE_URL}/search`, {
            params: { name, nationality }
        });
        return response.data;
    },

    // Get metadata for import preview
    getImportMetadata: async (playerId) => {
        const response = await axios.get(`${API_BASE_URL}/import-metadata/${playerId}`);
        return response.data;
    },

    // Sync player data (Refresh)
    syncPlayer: async (dbId) => {
        const response = await axios.post(`${API_BASE_URL}/player/${dbId}/sync`);
        return response.data;
    },

    // Import player
    importPlayer: async (playerId) => {
        const response = await axios.post(`${API_BASE_URL}/import/${playerId}`);
        return response.data;
    },

    // Retry failed import
    retryImport: async (playerId) => {
        const response = await axios.post(`${API_BASE_URL}/retry-import/${playerId}`);
        return response.data;
    },

    // Get all players from database
    getAllPlayers: async () => {
        const response = await axios.get(`${API_BASE_URL}/players`);
        return response.data;
    },

    // Get single player with full stats
    getPlayer: async (id) => {
        const response = await axios.get(`${API_BASE_URL}/player/${id}`);
        return response.data;
    },

    // Get queue status
    getQueueStatus: async () => {
        const response = await axios.get(`${API_BASE_URL}/queue-status`);
        return response.data;
    },

    // Search teams
    searchTeams: async (name) => {
        const response = await axios.get(`${API_BASE_URL}/search/teams`, {
            params: { name }
        });
        return response.data;
    },

    // Import team
    importTeam: async (teamId) => {
        const response = await axios.post(`${API_BASE_URL}/import/team/${teamId}`);
        return response.data;
    },

    // Get all teams from database
    getAllTeams: async () => {
        const response = await axios.get(`${API_BASE_URL}/teams`);
        return response.data;
    },

    // Get single team with data
    getTeam: async (id, season = null) => {
        const params = season ? { season } : {};
        const response = await axios.get(`${API_BASE_URL}/team/${id}`, { params });
        return response.data;
    },

    getTeamStatistics: async (id, season) => {
        const params = season ? { season } : {};
        const response = await axios.get(`${API_BASE_URL}/team/${id}/statistics`, { params });
        return response.data;
    },

    getTeamTrophies: async (id) => {
        const response = await axios.get(`${API_BASE_URL}/team/${id}/trophies`);
        return response.data;
    },

    // Delete player
    deletePlayer: async (id) => {
        const response = await axios.delete(`${API_BASE_URL}/player/${id}`);
        return response.data;
    },

    // Search players by team and season range
    searchPlayersByTeam: async (teamName, startSeason, endSeason) => {
        const response = await axios.get(`${API_BASE_URL}/search/players-by-team`, {
            params: { teamName, startSeason, endSeason }
        });
        return response.data;
    },

    // FBref Import
    importFromFbref: async (league, season) => {
        const response = await axios.post(`${API_BASE_URL}/import/fbref`, { league, season });
        return response.data;
    },

    // Batch Import
    importBatch: async (playerIds, batchSize = 5) => {
        const response = await axios.post(`${API_BASE_URL}/import/batch`, {
            playerIds,
            batchSize
        });
        return response.data;
    },

    getBatchProgress: async (batchId) => {
        const response = await axios.get(`${API_BASE_URL}/import/batch/${batchId}`);
        return response.data;
    },

    // Mass Verify
    massVerify: async () => {
        const response = await axios.post(`${API_BASE_URL}/verify-database`);
        return response.data;
    },

    getVerifyStatus: async () => {
        const response = await axios.get(`${API_BASE_URL}/verify-status`);
        return response.data;
    }
};

export default api;
