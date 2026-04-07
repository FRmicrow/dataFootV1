import express from 'express';
import { 
    getLeaguesV4, getSeasonOverviewV4, getFixturesV4, getSeasonPlayersV4, getTeamSquadV4,
    getFixtureDetailsV4, getFixtureEventsV4, getFixtureLineupsV4, getFixtureTacticalStatsV4,
    getFixturePlayerTacticalStatsV4 
} from '../../controllers/v4/leagueControllerV4.js';

const router = express.Router();

// Base leagues list
router.get('/leagues', getLeaguesV4);

// Season overview (Standings + Top stats)
router.get('/league/:league/season/:season', getSeasonOverviewV4);

// Player stats (Squad Explorer)
router.get('/league/:league/season/:season/players', getSeasonPlayersV4);
router.get('/league/:league/season/:season/team/:teamId/squad', getTeamSquadV4);

// Fixtures
router.get('/league/:league/season/:season/fixtures', getFixturesV4);

// Match Detail
router.get('/match/:fixtureId', getFixtureDetailsV4);
router.get('/fixtures/:id/events', getFixtureEventsV4);
router.get('/fixtures/:id/lineups', getFixtureLineupsV4);
router.get('/fixtures/:id/tactical-stats', getFixtureTacticalStatsV4);
router.get('/fixtures/:id/player-tactical-stats', getFixturePlayerTacticalStatsV4);

export default router;
