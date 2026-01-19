import db from '../config/database.js';
import soccerDataService from '../services/soccerDataService.js';

/**
 * FBref Controller
 * Handles data import from FBref via soccerdata
 */
export const importFromFbref = async (req, res) => {
    const { league, season } = req.body;

    if (!league || !season) {
        return res.status(400).json({ error: 'League and season are required' });
    }

    try {
        console.log(`\n📥 Starting FBref import for ${league} ${season}...`);

        // 1. Fetch player stats
        const playersData = await soccerDataService.fetchData(league, season, 'players');
        console.log(`✅ Fetched ${playersData.length} player records from FBref`);

        let importedCount = 0;
        let skippedCount = 0;

        // Start transaction
        db.transaction(() => {
            // Get or create Season
            let seasonRecord = db.get('SELECT id FROM seasons WHERE label = ?', [season]);
            if (!seasonRecord) {
                const year = parseInt(season.split('/')[0]) || parseInt(season);
                const result = db.run('INSERT INTO seasons (label, year) VALUES (?, ?)', [season, year]);
                seasonRecord = { id: result.lastInsertRowid };
            }

            for (const record of playersData) {
                try {
                    const playerName = record.player_;
                    if (!playerName) continue;

                    // Split name into first and last
                    const nameParts = playerName.split(' ');
                    const firstName = nameParts[0];
                    const lastName = nameParts.slice(1).join(' ') || '';

                    // Get or create Player (Match by name)
                    let player = db.get('SELECT id FROM players WHERE first_name = ? AND last_name = ?', [firstName, lastName]);
                    if (!player) {
                        // Generate a dummy API ID for players imported solely from FBref
                        // We'll use a negative hash to distinguish them from standard API-Football IDs
                        const dummyApiId = -(Math.abs(hashString(playerName)));
                        const result = db.run(
                            'INSERT INTO players (api_player_id, first_name, last_name, age, nationality) VALUES (?, ?, ?, ?, ?)',
                            [dummyApiId, firstName, lastName, record.age_, record.nation_]
                        );
                        player = { id: result.lastInsertRowid };
                    }

                    // Get or create Team
                    const teamName = record.team_;
                    let team = db.get('SELECT id FROM teams WHERE name = ?', [teamName]);
                    if (!team) {
                        const dummyApiTeamId = -(Math.abs(hashString(teamName)));
                        const result = db.run('INSERT INTO teams (api_team_id, name) VALUES (?, ?)', [dummyApiTeamId, teamName]);
                        team = { id: result.lastInsertRowid };
                    }

                    // Get or create League
                    const leagueName = record.league_ || league;
                    let leagueRecord = db.get('SELECT id FROM leagues WHERE name = ?', [leagueName]);
                    if (!leagueRecord) {
                        const dummyApiLeagueId = -(Math.abs(hashString(leagueName)));
                        const result = db.run('INSERT INTO leagues (api_league_id, name) VALUES (?, ?)', [dummyApiLeagueId, leagueName, '']);
                        leagueRecord = { id: result.lastInsertRowid };
                    }

                    // Insert or refresh Statistics
                    db.run(
                        `INSERT OR REPLACE INTO player_club_stats 
                        (player_id, team_id, league_id, season_id, matches, goals, assists, minutes_played, yellow_cards, red_cards, lineups)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            player.id,
                            team.id,
                            leagueRecord.id,
                            seasonRecord.id,
                            record.Playing_Time_MP || 0,
                            record.Performance_Gls || 0,
                            record.Performance_Ast || 0,
                            record.Playing_Time_Min || 0,
                            record.Performance_CrdY || 0,
                            record.Performance_CrdR || 0,
                            record.Playing_Time_Starts || 0
                        ]
                    );

                    importedCount++;
                } catch (recordError) {
                    console.error(`  ⚠️ Failed to process record for ${record.player_}:`, recordError.message);
                    skippedCount++;
                }
            }
        })();

        console.log(`🏁 FBref Import completed: ${importedCount} records saved, ${skippedCount} skipped.`);
        res.json({
            success: true,
            message: `Imported ${importedCount} records from FBref for ${league} ${season}`,
            stats: { imported: importedCount, skipped: skippedCount }
        });

    } catch (error) {
        console.error('❌ FBref Import failed:', error.message);
        res.status(500).json({ error: 'FBref import failed', details: error.message });
    }
};

/**
 * Helper to generate deterministic IDs
 */
function hashString(str) {
    let hash = 0;
    if (!str) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash | 0;
    }
    return hash;
}
