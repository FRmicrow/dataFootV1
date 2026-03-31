import StandingsV4Service from '../../services/v4/StandingsV4Service.js';
import MatchDetailV4Service from '../../services/v4/MatchDetailV4Service.js';
import db from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * LeagueControllerV4
 * Handles V4-specific league and season requests.
 */

export const getLeaguesV4 = async (req, res) => {
    try {
        const competitions = await StandingsV4Service.listAvailableCompetitions();
        
        // Group by league for easier frontend consumption
        const grouped = {};
        competitions.forEach(c => {
            if (!grouped[c.league]) grouped[c.league] = { name: c.league, seasons: [] };
            grouped[c.league].seasons.push(c.season);
        });

        res.json({ success: true, data: Object.values(grouped) });
    } catch (error) {
        logger.error({ err: error }, 'V4 getLeagues error');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getSeasonOverviewV4 = async (req, res) => {
    try {
        const { league, season } = req.params;

        if (!league || !season) {
            return res.status(400).json({ success: false, error: 'Missing league or season' });
        }

        // 1. Calculate Standings
        const standings = await StandingsV4Service.calculateStandings(league, season);

        // 2. Get Top Scorers (V4_Fixture_Events)
        const topScorers = await db.all(`
            SELECT 
                p.player_id, 
                p.name as player_name, 
                COUNT(*) as goals_total,
                MIN(t.name) as team_name,
                MIN(p.player_id) as id,
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = MIN(t.team_id) 
                     AND CAST(SPLIT_PART($2, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                     ORDER BY start_year DESC
                     LIMIT 1), 
                    MIN(t.logo_url)
                ) as team_logo
            FROM V4_Fixture_Events e
            JOIN V4_Fixtures f ON f.fixture_id = e.fixture_id
            JOIN V4_Players p ON p.player_id = e.player_id
            LEFT JOIN V4_Fixture_Lineups l ON l.fixture_id = f.fixture_id AND l.player_id = p.player_id
            LEFT JOIN V4_Teams t ON t.team_id = l.team_id
            WHERE f.league = $1 AND f.season = $2 AND e.type = 'goal'
            GROUP BY p.player_id, p.name
            ORDER BY goals_total DESC
            LIMIT 10
        `, [league, season]);

        // 3. Get Metadata (League type, seasons list)
        const availableYears = (await db.all(`
            SELECT DISTINCT season FROM V4_Fixtures WHERE league = $1 ORDER BY season DESC
        `, [league])).map(r => r.season);

        res.json({
            success: true,
            data: {
                league: { league_name: league, type: 'League' },
                standings,
                topScorers,
                availableYears,
                topAssists: [], // To be implemented if assist data is rich enough
                topRated: []
            }
        });

    } catch (error) {
        logger.error({ err: error, league: req.params.league }, 'V4 season overview error');
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getSeasonPlayersV4 = async (req, res) => {
    try {
        const { league, season } = req.params;
        const { teamId, position, sortBy = 'goals', order = 'DESC' } = req.query;

        // Base query: Aggregate from Lineups (appearances) and Events (goals/assists)
        const players = await db.all(`
            WITH player_stats AS (
                SELECT 
                    p.player_id,
                    p.name,
                    MIN(t.name) as team_name,
                    MIN(t.team_id) as team_id,
                    MIN(t.logo_url) as team_logo,
                    MIN(l.position_code) as position,
                    COUNT(DISTINCT l.fixture_id) as appearances,
                    COUNT(CASE WHEN e.type = 'goal' THEN 1 END) as goals,
                    COUNT(CASE WHEN e.type = 'assist' THEN 1 END) as assists
                FROM V4_Players p
                JOIN V4_Fixture_Lineups l ON l.player_id = p.player_id
                JOIN V4_Fixtures f ON f.fixture_id = l.fixture_id
                JOIN V4_Teams t ON t.team_id = l.team_id
                LEFT JOIN V4_Fixture_Events e ON e.fixture_id = f.fixture_id AND e.player_id = p.player_id
                WHERE f.league = $1 AND f.season = $2
                GROUP BY p.player_id, p.name
            )
            SELECT ps.*, 
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = ps.team_id 
                     AND CAST(SPLIT_PART($2, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                     ORDER BY start_year DESC
                     LIMIT 1), 
                    ps.team_logo
                ) as contextual_logo
            FROM player_stats ps
            WHERE ( $3::text IS NULL OR team_id::text = $3::text )
            ORDER BY ${sortBy === 'goals' ? 'goals' : sortBy === 'appearances' ? 'appearances' : 'goals'} ${order === 'DESC' ? 'DESC' : 'ASC'}
            LIMIT 100
        `, [league, season, teamId || null]);

        res.json({ success: true, data: players });
    } catch (error) {
        logger.error({ err: error, league: req.params.league }, 'V4 getSeasonPlayers error');
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getFixturesV4 = async (req, res) => {
    try {
        const { league, season } = req.params;

        const fixtures = await db.all(`
            SELECT 
                f.*, 
                th.name as home_team, 
                ta.name as away_team,
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = th.team_id 
                     AND CAST(SPLIT_PART(f.season, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                     ORDER BY start_year DESC
                     LIMIT 1), 
                    th.logo_url
                ) as home_team_logo,
                COALESCE(
                    (SELECT logo_url FROM V4_Club_Logos 
                     WHERE team_id = ta.team_id 
                     AND CAST(SPLIT_PART(f.season, '-', 1) AS INTEGER) BETWEEN start_year AND COALESCE(end_year, 9999)
                     ORDER BY start_year DESC
                     LIMIT 1), 
                    ta.logo_url
                ) as away_team_logo
            FROM V4_Fixtures f
            JOIN V4_Teams th ON th.team_id = f.home_team_id
            JOIN V4_Teams ta ON ta.team_id = f.away_team_id
            WHERE f.league = $1 AND f.season = $2
            ORDER BY f.date ASC, f.fixture_id ASC
        `, [league, season]);

        // Group by rounds if available
        const rounds = [...new Set(fixtures.map(f => f.round))].filter(Boolean);

        res.json({
            success: true,
            data: {
                fixtures,
                rounds
            }
        });
    } catch (error) {
        logger.error({ err: error, league: req.params.league }, 'V4 getFixtures error');
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

export const getFixtureDetailsV4 = async (req, res) => {
    try {
        const { fixtureId } = req.params;
        const match = await MatchDetailV4Service.getFixtureDetails(fixtureId);
        if (!match) return res.status(404).json({ success: false, error: 'Match not found in V4' });
        res.json({ success: true, data: match });
    } catch (error) {
        logger.error({ err: error, fixtureId: req.params.fixtureId }, 'V4 getFixtureDetails error');
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getFixtureEventsV4 = async (req, res) => {
    try {
        const { id } = req.params;
        const events = await MatchDetailV4Service.getFixtureEvents(id);
        res.json({ success: true, data: events });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getFixtureLineupsV4 = async (req, res) => {
    try {
        const { id } = req.params;
        const lineups = await MatchDetailV4Service.getFixtureLineups(id);
        res.json({ success: true, data: lineups });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getFixtureTacticalStatsV4 = async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await MatchDetailV4Service.getFixtureTacticalStats(id);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

export const getFixturePlayerTacticalStatsV4 = async (req, res) => {
    try {
        const { id } = req.params;
        const stats = await MatchDetailV4Service.getFixturePlayerTacticalStats(id);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
