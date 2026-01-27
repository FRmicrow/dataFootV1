import db from '../config/database.js';
import footballApi from '../services/footballApi.js';

/**
 * Player Controller
 * Handles fetching player data from local database
 */

export const getAllPlayers = (req, res) => {
    try {
        const players = db.all(`
      SELECT 
        p.id,
        p.api_player_id,
        p.first_name,
        p.last_name,
        p.age,
        p.nationality,
        p.photo_url,
        p.created_at,
        GROUP_CONCAT(DISTINCT c.name) as teams
      FROM players p
      LEFT JOIN player_club_stats pcs ON p.id = pcs.player_id
      LEFT JOIN clubs c ON pcs.club_id = c.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

        res.json({ players });

    } catch (error) {
        console.error('❌ Error fetching players:', error.message);
        res.status(500).json({
            error: 'Failed to fetch players',
            details: error.message
        });
    }
};

export const getPlayerById = (req, res) => {
    const { id } = req.params;

    try {
        const player = db.get('SELECT * FROM players WHERE id = ?', [id]);

        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Get club statistics
        const clubStats = db.all(`
            SELECT pcs.*, c.name as team_name, c.logo_url as team_logo,
                   COALESCE(ch.name, nc.name, ic.name) as league_name,
                   pcs.competition_type, s.label as season_label
            FROM player_club_stats pcs
            JOIN clubs c ON pcs.club_id = c.id
            LEFT JOIN championships ch ON pcs.competition_type = 'championship' AND pcs.competition_id = ch.id
            LEFT JOIN national_cups nc ON pcs.competition_type = 'cup' AND pcs.competition_id = nc.id
            LEFT JOIN international_cups ic ON pcs.competition_type = 'international_cup' AND pcs.competition_id = ic.id
            JOIN seasons s ON pcs.season_id = s.id
            WHERE pcs.player_id = ?
            ORDER BY s.year DESC
        `, [id]);

        // Group by club
        const clubsMap = {};
        clubStats.forEach(stat => {
            if (!clubsMap[stat.club_id]) {
                clubsMap[stat.club_id] = {
                    id: stat.club_id,
                    name: stat.team_name,
                    logo: stat.team_logo,
                    seasons: []
                };
            }

            clubsMap[stat.club_id].seasons.push({
                season: stat.season_label,
                league: stat.league_name,
                competition_type: stat.competition_type,
                matches: stat.matches,
                goals: stat.goals,
                assists: stat.assists
            });
        });

        const clubs = Object.values(clubsMap);

        // Get national team statistics
        const nationalStats = db.all(`
            SELECT pns.*, nt.name as team_name, ntc.name as league_name, s.label as season_label
            FROM player_national_stats pns
            JOIN national_teams nt ON pns.national_team_id = nt.id
            JOIN national_team_cups ntc ON pns.competition_id = ntc.id
            JOIN seasons s ON pns.season_id = s.id
            WHERE pns.player_id = ?
            ORDER BY s.year DESC
        `, [id]);

        // Group by national team
        const nationalTeamsMap = {};
        nationalStats.forEach(stat => {
            if (!nationalTeamsMap[stat.national_team_id]) {
                nationalTeamsMap[stat.national_team_id] = {
                    id: stat.national_team_id,
                    name: stat.team_name,
                    seasons: []
                };
            }

            nationalTeamsMap[stat.national_team_id].seasons.push({
                season: stat.season_label,
                league: stat.league_name,
                matches: stat.matches,
                goals: stat.goals,
                assists: stat.assists
            });
        });

        const nationalTeams = Object.values(nationalTeamsMap);

        // Get trophies
        const trophies = db.all(`
            SELECT pt.*, tr.name as trophy_name, s.label as season_label
            FROM player_trophies pt
            JOIN trophies tr ON pt.trophy_id = tr.id
            JOIN seasons s ON pt.season_id = s.id
            WHERE pt.player_id = ?
            ORDER BY s.year DESC
        `, [id]);

        res.json({
            player,
            clubs,
            nationalTeams,
            trophies
        });

    } catch (error) {
        console.error('❌ Error getting player detail:', error.message);
        res.status(500).json({ error: 'Failed to get player detail' });
    }
};


export const getAllTeams = (req, res) => {
    try {
        // Get all clubs with country information
        const clubs = db.all(`
            SELECT c.id, c.api_team_id, c.name, c.logo_url, c.main_league_id, 
                   co.name as country, co.id as country_id
            FROM clubs c
            LEFT JOIN countries co ON c.country_id = co.id
            ORDER BY co.name ASC, c.name ASC
        `);

        // Transform to frontend format
        const teams = clubs.map(club => ({
            id: club.id,
            apiId: club.api_team_id,
            name: club.name,
            logo_url: club.logo_url,
            type: 'club',
            country: club.country,
            mainLeagueId: club.main_league_id,
            isMainLeague: club.main_league_id !== null
        }));

        res.json({ teams });
    } catch (error) {
        console.error('❌ Error getting teams:', error.message);
        res.status(500).json({ error: 'Failed to get teams' });
    }
};

export const getTeamData = async (req, res) => {
    const { id } = req.params;

    try {
        // Get team from database
        let team = db.get('SELECT * FROM clubs WHERE id = ?', [id]);

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        const apiTeamId = team.api_team_id;

        // Fetch live team details from API
        console.log(`🏆 Fetching team details for ${team.name} (API ID: ${apiTeamId})...`);
        const teamDetails = await footballApi.getTeamById(apiTeamId);

        // Fetch trophies from database
        const trophyRecords = db.all(`
            SELECT 
                t.name as trophy_name,
                t.type as trophy_type,
                s.label as season_year,
                tt.place
            FROM team_trophies tt
            JOIN trophies t ON tt.trophy_id = t.id
            JOIN seasons s ON tt.season_id = s.id
            WHERE tt.team_id = ?
            ORDER BY t.type, s.year DESC
        `, [id]);

        // Group trophies by type and name
        const trophiesByType = {};
        trophyRecords.forEach(record => {
            const type = record.trophy_type;
            const name = record.trophy_name;

            if (!trophiesByType[type]) {
                trophiesByType[type] = {};
            }

            if (!trophiesByType[type][name]) {
                trophiesByType[type][name] = {
                    count: 0,
                    years: []
                };
            }

            trophiesByType[type][name].count++;
            trophiesByType[type][name].years.push(record.season_year);
        });

        // Convert to array format
        const trophies = Object.entries(trophiesByType).map(([type, competitions]) => ({
            type,
            competitions: Object.entries(competitions).map(([name, data]) => ({
                name,
                count: data.count,
                years: data.years
            }))
        }));

        // Determine the main league for statistics
        const MAIN_LEAGUES = {
            'England': 39,
            'Spain': 140,
            'Germany': 78,
            'Italy': 135,
            'France': 61
        };

        // Get country to determine league
        const country = db.get('SELECT name FROM countries WHERE id = ?', [team.country_id]);
        const leagueId = country ? MAIN_LEAGUES[country.name] : 39;

        // Get season from query parameter or default to current year
        const season = req.query.season ? parseInt(req.query.season) : 2024;

        // Fetch season statistics
        let statistics = null;
        if (leagueId) {
            console.log(`📊 Fetching statistics for league ${leagueId}, season ${season}...`);
            try {
                const stats = await footballApi.getTeamStatistics(apiTeamId, leagueId, season);
                if (stats.response) {
                    statistics = stats.response;
                    console.log(`  ✓ Statistics fetched successfully`);
                }
            } catch (error) {
                console.log(`  ⚠️ No statistics found for this league/season`);
            }
        }

        res.json({
            team: {
                ...team,
                name: team.name,
                logo_url: team.logo_url,
                country: country ? country.name : null
            },
            statistics: statistics || null,
            trophies: trophies,
            teamDetails: teamDetails.response ? teamDetails.response[0] : null,
            leagueId: leagueId // Send back the league ID for frontend use
        });

    } catch (error) {
        console.error('❌ Error getting team data:', error.message);
        res.status(500).json({ error: 'Failed to get team data', details: error.message });
    }
};

export const deletePlayer = (req, res) => {
    const { id } = req.params;

    try {
        const player = db.get('SELECT id FROM players WHERE id = ?', [id]);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Transaction support missing in wrapper, running sequentially
        db.run('DELETE FROM player_club_stats WHERE player_id = ?', [id]);
        db.run('DELETE FROM player_national_stats WHERE player_id = ?', [id]);
        db.run('DELETE FROM player_trophies WHERE player_id = ?', [id]);
        db.run('DELETE FROM players WHERE id = ?', [id]);

        console.log(`🗑️ Deleted player ${id} and associated data`);
        res.json({ success: true, message: 'Player deleted successfully' });

    } catch (error) {
        console.error('❌ Error deleting player:', error.message);
        res.status(500).json({ error: 'Failed to delete player' });
    }
};

// New method to fetch specific season statistics per user request
export const getTeamStatistics = async (req, res) => {
    const { id } = req.params;
    const season = req.query.season ? parseInt(req.query.season) : 2024;

    try {
        const team = db.get('SELECT * FROM clubs WHERE id = ?', [id]);
        if (!team) return res.status(404).json({ error: 'Team not found' });

        const apiTeamId = team.api_team_id;

        // Determine league
        const MAIN_LEAGUES = {
            'England': 39, 'Spain': 140, 'Germany': 78, 'Italy': 135, 'France': 61
        };
        const country = db.get('SELECT name FROM countries WHERE id = ?', [team.country_id]);
        const leagueId = country ? MAIN_LEAGUES[country.name] : 39;

        console.log(`📊 API Request: Statistics for Team ${apiTeamId}, League ${leagueId}, Season ${season}`);

        const stats = await footballApi.getTeamStatistics(apiTeamId, leagueId, season);

        res.json({
            teamId: id,
            season: season,
            statistics: stats.response || []
        });

    } catch (error) {
        console.error('❌ Error in getTeamStatistics:', error.message);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};

// New method to fetch trophies per user request
export const getTeamTrophies = (req, res) => {
    const { id } = req.params;

    try {
        // Fetch trophies from team_trophies table
        // season_id is stored as integer year (e.g., 2024)
        const trophyRecords = db.all(`
            SELECT 
                t.name as trophy_name,
                t.type as trophy_type,
                s.label as year,
                tt.place
            FROM team_trophies tt
            JOIN trophies t ON tt.trophy_id = t.id
            JOIN seasons s ON tt.season_id = s.id
            WHERE tt.team_id = ?
            ORDER BY t.name, s.year DESC
        `, [id]);

        console.log(`📊 Found ${trophyRecords.length} trophy records for team ${id}`);

        // Group trophies by competition name and place
        const competitionMap = {};

        trophyRecords.forEach(record => {
            const { trophy_name, trophy_type, year, place } = record;

            if (!competitionMap[trophy_name]) {
                competitionMap[trophy_name] = {
                    name: trophy_name,
                    type: trophy_type,
                    wins: { count: 0, years: [] },
                    runnersUp: { count: 0, years: [] },
                    third: { count: 0, years: [] }
                };
            }

            // Categorize by place (use == to handle string/int comparison)
            if (place == 1) {
                competitionMap[trophy_name].wins.count++;
                competitionMap[trophy_name].wins.years.push(year);
            } else if (place == 2) {
                competitionMap[trophy_name].runnersUp.count++;
                competitionMap[trophy_name].runnersUp.years.push(year);
            } else if (place == 3) {
                competitionMap[trophy_name].third.count++;
                competitionMap[trophy_name].third.years.push(year);
            }
        });

        // Convert to array format for frontend
        const trophies = Object.values(competitionMap).map(comp => ({
            competition: comp.name,
            type: comp.type,
            titles: comp.wins.count,
            years: comp.wins.years,
            runnersUp: comp.runnersUp.count > 0 ? comp.runnersUp.count : undefined,
            runnersUpYears: comp.runnersUp.years.length > 0 ? comp.runnersUp.years : undefined,
            third: comp.third.count > 0 ? comp.third.count : undefined,
            thirdYears: comp.third.years.length > 0 ? comp.third.years : undefined
        }));

        res.json({
            teamId: id,
            trophies: trophies
        });

    } catch (error) {
        console.error('❌ Error in getTeamTrophies:', error.message);
        res.status(500).json({ error: 'Failed to fetch trophies' });
    }
};
