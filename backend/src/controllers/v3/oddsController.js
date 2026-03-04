import db from '../../config/database.js';
import OddsService from '../../services/odds/OddsService.js';

/**
 * Controller for pre-match odds (V3)
 */
export const getFixtureOdds = async (req, res) => {
    try {
        const { fixtureId } = req.params;

        const odds = db.all(`
            SELECT 
                odd_id, 
                bookmaker_id, 
                bookmaker_name, 
                bet_id, 
                bet_name, 
                value_label, 
                value_odd, 
                updated_at
            FROM V3_Odds 
            WHERE fixture_id = ?
            ORDER BY bookmaker_id, bet_id
        `, [fixtureId]);

        res.json({
            success: true,
            fixtureId: parseInt(fixtureId),
            count: odds.length,
            data: odds
        });
    } catch (error) {
        console.error('Error in getFixtureOdds:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getUpcomingOdds = async (req, res) => {
    try {
        // Returns the list of fixtures that have odds, limited to upcoming week
        const fixturesWithOdds = db.all(`
            SELECT DISTINCT 
                o.fixture_id,
                f.date as event_date,
                f.home_team_id,
                f.away_team_id,
                t1.name as home_name,
                t2.name as away_name,
                l.name as league_name
            FROM V3_Odds o
            JOIN V3_Fixtures f ON o.fixture_id = f.fixture_id
            JOIN V3_Teams t1 ON f.home_team_id = t1.team_id
            JOIN V3_Teams t2 ON f.away_team_id = t2.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            WHERE f.timestamp >= strftime('%s', 'now')
            ORDER BY f.timestamp ASC
            LIMIT 100
        `);

        res.json({
            success: true,
            count: fixturesWithOdds.length,
            data: fixturesWithOdds
        });
    } catch (error) {
        console.error('Error in getUpcomingOdds:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const manualImportOdds = async (req, res) => {
    try {
        const { leagueId, seasonYear } = req.body;

        if (!leagueId || !seasonYear) {
            return res.status(400).json({
                success: false,
                message: "leagueId and seasonYear are required."
            });
        }

        console.log(`🚀 Manual import requested for L${leagueId}/S${seasonYear}`);
        const stats = await OddsService.importOddsByLeagueSeason(leagueId, seasonYear);

        res.json({
            success: true,
            message: `Import finished for League ${leagueId}`,
            data: stats
        });
    } catch (error) {
        console.error('Error in manualImportOdds:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
