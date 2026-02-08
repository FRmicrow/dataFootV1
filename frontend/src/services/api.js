import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = {
    // Search players (Database only)
    searchPlayers: async (name, nationality) => {
        const response = await axios.get(`${API_BASE_URL}/search`, {
            params: { name, nationality }
        });
        return response.data;
    },

    // Get all players from database
    getAllPlayers: async () => {
        // Ensure this endpoint exists or is removed if unused
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

    // Search teams (Database only)
    searchTeams: async (name) => {
        const response = await axios.get(`${API_BASE_URL}/search/teams`, {
            params: { name }
        });
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

    // Mass Verify
    massVerify: async () => {
        const response = await axios.post(`${API_BASE_URL}/verify-database`);
        return response.data;
    },

    getVerifyStatus: async () => {
        const response = await axios.get(`${API_BASE_URL}/verify-status`);
        return response.data;
    },

    // Palmares
    getPalmaresHierarchy: async () => {
        const response = await axios.get(`${API_BASE_URL}/palmares/hierarchy`);
        return response.data;
    },

    getTrophyHistory: async (trophyId, filters = {}) => {
        const response = await axios.get(`${API_BASE_URL}/palmares/history/${trophyId}`, { params: filters });
        return response.data;
    },

    updateTrophyWinner: async (trophyId, seasonId, data) => {
        const response = await axios.post(`${API_BASE_URL}/palmares/winner/${trophyId}/${seasonId}`, data);
        return response.data;
    },

    // Admin Sync
    syncPlayer: async (id) => {
        const response = await axios.post(`${API_BASE_URL}/admin/sync-player/${id}`);
        return response.data;
    }
};

export default api;
