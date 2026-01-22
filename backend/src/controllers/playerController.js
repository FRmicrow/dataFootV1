import db from '../config/database.js';

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
        const clubs = db.all('SELECT id, name, logo_url, "club" as type FROM clubs ORDER BY name ASC');
        const nationalTeams = db.all('SELECT id, name, "national" as type FROM national_teams ORDER BY name ASC');
        res.json({ teams: [...clubs, ...nationalTeams] });
    } catch (error) {
        console.error('❌ Error getting teams:', error.message);
        res.status(500).json({ error: 'Failed to get teams' });
    }
};

export const getTeamData = (req, res) => {
    const { id } = req.params;

    try {
        // Try club first
        let team = db.get('SELECT *, "club" as type FROM clubs WHERE id = ?', [id]);

        if (!team) {
            // Try national team
            team = db.get('SELECT *, "national" as type FROM national_teams WHERE id = ?', [id]);
        }

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // TODO: Update Standings and Team Statistics to work with new schema
        // For now returning empty stats to prevent crash
        res.json({
            team,
            standings: [],
            trophies: [],
            statistics: []
        });

    } catch (error) {
        console.error('❌ Error getting team data:', error.message);
        res.status(500).json({ error: 'Failed to get team data' });
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
