import db from '../../config/database.js';
import OddsService from '../../services/odds/OddsService.js';
import logger from '../../utils/logger.js';

/**
 * Controller for pre-match odds (V3)
 */
export const getFixtureOdds = async (req, res) => {
    try {
        const { fixtureId } = req.params;

        const odds = await db.all(`
            SELECT 
                fixture_id,
                bookmaker_id,
                market_id, 
                value_home_over, 
                value_draw, 
                value_away_under,
                handicap_value,
                updated_at
            FROM V3_Odds 
            WHERE fixture_id = $1
            ORDER BY bookmaker_id, market_id
        `, [fixtureId]);

        res.json({
            success: true,
            data: {
                fixtureId: Number.parseInt(fixtureId),
                count: odds.length,
                items: odds
            }
        });
    } catch (error) {
        logger.error({ err: error, fixtureId: req.params.fixtureId }, 'Error in getFixtureOdds');
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getUpcomingOdds = async (req, res) => {
    try {
        const upcomingFixtures = await db.all(`
            SELECT DISTINCT 
                f.fixture_id,
                f.date as event_date,
                f.home_team_id,
                f.away_team_id,
                t1.name as home_name,
                t2.name as away_name,
                l.name as league_name,
                c.importance_rank as country_importance,
                l.importance_rank as league_importance,
                f.timestamp
            FROM V3_Fixtures f
            JOIN V3_Teams t1 ON f.home_team_id = t1.team_id
            JOIN V3_Teams t2 ON f.away_team_id = t2.team_id
            JOIN V3_Leagues l ON f.league_id = l.league_id
            JOIN V3_Countries c ON l.country_id = c.country_id
            WHERE f.timestamp >= EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)
            ORDER BY c.importance_rank ASC, l.importance_rank ASC, f.timestamp ASC
            LIMIT 200
        `);

        res.json({
            success: true,
            data: {
                count: upcomingFixtures.length,
                items: upcomingFixtures
            }
        });
    } catch (error) {
        logger.error({ err: error }, 'Error in getUpcomingOdds');
        res.status(500).json({ success: false, error: error.message });
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

        logger.info({ leagueId, seasonYear }, 'Manual odds import requested');
        const stats = await OddsService.importOddsByLeagueSeason(leagueId, seasonYear);

        res.json({
            success: true,
            data: {
                message: `Import finished for League ${leagueId}`,
                stats
            }
        });
    } catch (error) {
        logger.error({ err: error, leagueId: req.body?.leagueId, seasonYear: req.body?.seasonYear }, 'Error in manualImportOdds');
        res.status(500).json({ success: false, error: error.message });
    }
};
