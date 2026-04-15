import express from 'express';
import * as clubControllerV4 from '../../controllers/v4/clubControllerV4.js';
import * as clubStatsControllerV4 from '../../controllers/v4/clubStatsControllerV4.js';

const router = express.Router();

/**
 * @route   GET /api/v4/club/:id
 * @desc    Get comprehensive club profile (V4 data)
 */
router.get('/club/:id', clubControllerV4.getClubProfileV4);

/**
 * @route   GET /api/v4/club/:id/matches
 * @desc    Get club matches for a season
 */
router.get('/club/:id/matches', clubControllerV4.getClubMatchesV4);

/**
 * @route   GET /api/v4/club/:id/squad
 * @desc    Get club squad for a season
 */
router.get('/club/:id/squad', clubControllerV4.getClubSquadV4);

/**
 * @route   GET /api/v4/club/:id/typical-lineup
 * @desc    Get typical lineup based on most used formation
 */
router.get('/club/:id/typical-lineup', clubStatsControllerV4.getTypicalLineup);

/**
 * @route   GET /api/v4/club/:id/tactical-summary
 * @desc    Get club tactical stats for a season or structurally
 */
router.get('/club/:id/tactical-summary', clubStatsControllerV4.getClubTacticalSummary);

export default router;
