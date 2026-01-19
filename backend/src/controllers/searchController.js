import footballApi from '../services/footballApi.js';
import db from '../config/database.js';

/**
 * Search Controller
 * Handles player search requests and persists profiles immediately
 */

export const searchPlayers = async (req, res) => {
    try {
        const { name, nationality } = req.query;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                error: 'Player name must be at least 2 characters'
            });
        }

        console.log(`🔍 Searching for player: ${name} ${nationality ? `(Nationality: ${nationality})` : ''} via profiles`);

        const data = await footballApi.searchPlayers(name);

        if (!data.response || data.response.length === 0) {
            return res.json({
                players: [],
                message: 'No players found'
            });
        }

        // Map and optionally filter results by nationality
        let players = data.response.map(item => ({
            id: item.player.id,
            firstName: item.player.firstname,
            lastName: item.player.lastname,
            age: item.player.age,
            nationality: item.player.nationality,
            photo: item.player.photo
        }));

        if (nationality && nationality.trim() !== '') {
            const filterNationalty = nationality.trim().toLowerCase();
            players = players.filter(p =>
                p.nationality && p.nationality.toLowerCase().includes(filterNationalty)
            );
        }

        res.json({ players });

    } catch (error) {
        console.error('❌ Error searching players:', error.message);
        res.status(500).json({
            error: 'Failed to search players',
            details: error.message
        });
    }
};

export const searchTeams = async (req, res) => {
    try {
        const { name } = req.query;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                error: 'Team name must be at least 2 characters'
            });
        }

        console.log(`🔍 Searching for team: ${name}`);

        const data = await footballApi.searchTeams(name);

        if (!data.response || data.response.length === 0) {
            return res.json({
                teams: [],
                message: 'No teams found'
            });
        }

        const teams = data.response.map(item => ({
            id: item.team.id,
            name: item.team.name,
            logo: item.team.logo,
            country: item.team.country
        }));

        res.json({ teams });

    } catch (error) {
        console.error('❌ Error searching teams:', error.message);
        res.status(500).json({
            error: 'Failed to search teams',
            details: error.message
        });
    }
};

export const getQueueStatus = (req, res) => {
    const status = footballApi.getQueueStatus();
    res.json(status);
};

export const getPlayersByTeam = async (req, res) => {
    try {
        const { teamName, startSeason, endSeason } = req.query;

        if (!teamName || teamName.trim().length < 2) {
            return res.status(400).json({ error: 'Team name is required (min 2 characters)' });
        }
        if (!startSeason) {
            return res.status(400).json({ error: 'Start season is required' });
        }

        console.log(`🔍 Resolving team name: "${teamName}"...`);
        const teamSearchResponse = await footballApi.searchTeams(teamName);

        if (!teamSearchResponse.response || teamSearchResponse.response.length === 0) {
            return res.status(404).json({ error: `Team "${teamName}" not found` });
        }

        // Use the first result
        const teamId = teamSearchResponse.response[0].team.id;
        const actualTeamName = teamSearchResponse.response[0].team.name;
        console.log(`✅ Resolved "${teamName}" to ${actualTeamName} (ID: ${teamId})`);

        const start = parseInt(startSeason);
        const end = endSeason ? parseInt(endSeason) : start;
        const seasons = [];
        for (let y = start; y <= end; y++) {
            seasons.push(y);
        }

        console.log(`🔍 Researching players for ${actualTeamName} (ID: ${teamId}), seasons: ${seasons.join(', ')}`);

        let allPlayers = new Map(); // Use Map to deduplicate by ID

        for (const season of seasons) {
            console.log(`  > Fetching season ${season}...`);
            let currentPage = 1;
            let totalPages = 1;

            do {
                const data = await footballApi.getPlayersByTeam(teamId, season, currentPage);

                if (data.response) {
                    data.response.forEach(item => {
                        const p = item.player;
                        if (!allPlayers.has(p.id)) {
                            allPlayers.set(p.id, {
                                id: p.id,
                                firstName: p.firstname,
                                lastName: p.lastname,
                                age: p.age,
                                nationality: p.nationality,
                                photo: p.photo
                            });
                        }
                    });
                }

                if (data.paging && data.paging.total) {
                    totalPages = data.paging.total;
                }

                currentPage++;
            } while (currentPage <= totalPages);
        }

        res.json({ players: Array.from(allPlayers.values()) });

    } catch (error) {
        console.error('❌ Error researching players by team:', error.message);
        res.status(500).json({
            error: 'Failed to research players',
            details: error.message
        });
    }
};
