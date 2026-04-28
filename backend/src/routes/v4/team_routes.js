import express from 'express';
import * as teamControllerV4 from '../../controllers/v4/teamControllerV4.js';
import * as teamStatsControllerV4 from '../../controllers/v4/teamStatsControllerV4.js';

const router = express.Router();

/**
 * @route   GET /api/v4/team/:id
 * @desc    Get comprehensive team profile (V4 data)
 */
router.get('/team/:id', teamControllerV4.getTeamProfileV4);

/**
 * @route   GET /api/v4/team/:id/matches
 * @desc    Get team matches for a season
 */
router.get('/team/:id/matches', teamControllerV4.getTeamMatchesV4);

/**
 * @route   GET /api/v4/team/:id/squad
 * @desc    Get team squad for a season
 */
router.get('/team/:id/squad', teamControllerV4.getTeamSquadV4);

/**
 * @route   GET /api/v4/team/:id/typical-lineup
 * @desc    Get typical lineup based on most used formation
 */
router.get('/team/:id/typical-lineup', teamStatsControllerV4.getTypicalLineup);

/**
 * @route   GET /api/v4/team/:id/tactical-summary
 * @desc    Get team tactical stats for a season or structurally
 */
router.get('/team/:id/tactical-summary', teamStatsControllerV4.getTeamTacticalSummary);

export default router;
