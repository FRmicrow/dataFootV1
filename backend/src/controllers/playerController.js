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
        GROUP_CONCAT(DISTINCT t.name) as teams
      FROM players p
      LEFT JOIN player_club_stats pcs ON p.id = pcs.player_id
      LEFT JOIN teams t ON pcs.team_id = t.id
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
            SELECT pcs.*, t.name as team_name, t.logo_url as team_logo, 
                   l.name as league_name, lc.competition_type, s.label as season_label
            FROM player_club_stats pcs
            JOIN teams t ON pcs.team_id = t.id
            JOIN leagues l ON pcs.league_id = l.id
            LEFT JOIN league_classifications lc ON l.id = lc.league_id
            JOIN seasons s ON pcs.season_id = s.id
            WHERE pcs.player_id = ?
            ORDER BY s.year DESC
        `, [id]);

        // Group by club
        const clubsMap = {};
        clubStats.forEach(stat => {
            if (!clubsMap[stat.team_id]) {
                clubsMap[stat.team_id] = {
                    id: stat.team_id,
                    name: stat.team_name,
                    logo: stat.team_logo,
                    seasons: []
                };
            }

            clubsMap[stat.team_id].seasons.push({
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
            SELECT pns.*, nt.name as team_name, l.name as league_name, s.label as season_label
            FROM player_national_stats pns
            JOIN teams nt ON pns.team_id = nt.id
            JOIN leagues l ON pns.league_id = l.id
            JOIN seasons s ON pns.season_id = s.id
            WHERE pns.player_id = ?
            ORDER BY s.year DESC
        `, [id]);

        // Group by national team
        const nationalTeamsMap = {};
        nationalStats.forEach(stat => {
            if (!nationalTeamsMap[stat.team_id]) {
                nationalTeamsMap[stat.team_id] = {
                    id: stat.team_id,
                    name: stat.team_name,
                    seasons: []
                };
            }

            nationalTeamsMap[stat.team_id].seasons.push({
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
            SELECT pt.*, tr.name as trophy_name, s.label as season_label, t.name as team_name
            FROM player_trophies pt
            JOIN trophies tr ON pt.trophy_id = tr.id
            JOIN seasons s ON pt.season_id = s.id
            LEFT JOIN teams t ON pt.team_id = t.id
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
        const teams = db.all('SELECT * FROM teams ORDER BY name ASC');
        res.json({ teams });
    } catch (error) {
        console.error('❌ Error getting teams:', error.message);
        res.status(500).json({ error: 'Failed to get teams' });
    }
};

export const getTeamData = (req, res) => {
    const { id } = req.params;

    try {
        const team = db.get('SELECT * FROM teams WHERE id = ?', [id]);

        if (!team) {
            return res.status(404).json({ error: 'Team not found' });
        }

        // Get standings
        const standings = db.all(`
            SELECT std.*, l.name as league_name, s.label as season_label
            FROM standings std
            JOIN leagues l ON std.league_id = l.id
            JOIN seasons s ON std.season_id = s.id
            WHERE std.team_id = ?
            ORDER BY s.year DESC
        `, [id]);

        // Get trophies
        const trophies = db.all(`
            SELECT tt.*, tr.name as trophy_name, s.label as season_label
            FROM team_trophies tt
            JOIN trophies tr ON tt.trophy_id = tr.id
            JOIN seasons s ON tt.season_id = s.id
            WHERE tt.team_id = ?
            ORDER BY s.year DESC
        `, [id]);

        // Get statistics
        const statistics = db.all(`
            SELECT ts.team_id, ts.league_id, ts.season_id, ts.played, ts.wins, ts.draws, ts.losses, ts.goals_for, ts.goals_against, 
                   l.name as league_name, s.label as season_label
            FROM team_statistics ts
            JOIN leagues l ON ts.league_id = l.id
            JOIN seasons s ON ts.season_id = s.id
            WHERE ts.team_id = ?
            ORDER BY s.year DESC
        `, [id]);

        res.json({
            team,
            standings,
            trophies,
            statistics
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

        db.transaction(() => {
            db.run('DELETE FROM player_club_stats WHERE player_id = ?', [id]);
            db.run('DELETE FROM player_national_stats WHERE player_id = ?', [id]);
            db.run('DELETE FROM player_trophies WHERE player_id = ?', [id]);
            db.run('DELETE FROM players WHERE id = ?', [id]);
        })();

        console.log(`🗑️ Deleted player ${id} and associated data`);
        res.json({ success: true, message: 'Player deleted successfully' });

    } catch (error) {
        console.error('❌ Error deleting player:', error.message);
        res.status(500).json({ error: 'Failed to delete player' });
    }
};
