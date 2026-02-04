import express from 'express';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

router.get('/duplicates', adminController.getDuplicateClubs);
router.post('/merge-clubs', adminController.mergeClubs);
router.get('/countries', adminController.getCountries);

router.get('/clubs-missing-info', adminController.getClubsMissingInfo);
router.post('/update-club-data', adminController.updateClubData);
router.post('/delete-club', adminController.deleteClub);


router.get('/api-leagues', adminController.getApiLeagues);
router.get('/region-leagues', adminController.getRegionLeagues);
router.get('/uncategorized-competitions', adminController.getUncategorizedCompetitions);
router.get('/trophy-types', adminController.getTrophyTypes);
router.post('/set-trophy-type', adminController.updateCompetitionTrophyType);
router.get('/import-status', adminController.getImportStatus);
router.get('/clubs-by-country', adminController.getClubsByCountry);
router.post('/import-club-players', adminController.importClubPlayers);
router.post('/import-deep-league-players', adminController.importDeepLeaguePlayers);
router.post('/import-league-players', adminController.importLeaguePlayers);
router.post('/clear-player-data', adminController.clearPlayerData);
router.get('/club-season-stats', adminController.getClubSeasonStats);
router.post('/scan-club-countries', adminController.scanClubCountries);
router.post('/fix-club-country', adminController.fixClubCountry);

// Cleanup Routes //
import * as cleanupController from '../controllers/cleanupController.js';
router.get('/cleanup-candidates', cleanupController.getCleanupCandidates);
router.post('/cleanup-merge', cleanupController.mergeStats);
router.post('/cleanup-assign', cleanupController.assignCompetition);
router.get('/cleanup-competitions', cleanupController.getCompetitionsForSelect);
router.post('/cleanup-init-regions', cleanupController.initializeRegions);
router.post('/cleanup-consolidation', cleanupController.consolidateGenericCompetitions);
router.get('/cleanup-competitions-list', cleanupController.getAllCompetitions);
router.post('/cleanup-comp-country', cleanupController.updateCompetitionCountry);
router.post('/cleanup-import-mappings', cleanupController.importMappings);
router.post('/cleanup-updates', cleanupController.runCompetitionDataUpdate);
router.get('/cleanup-verification', cleanupController.getVerificationReport);
router.post('/cleanup-bulk-update', cleanupController.bulkUpdateOrphanedCompetition);
router.get('/unresolved-competitions', cleanupController.getUnresolvedCompetitions);
router.post('/resolve-competition', cleanupController.resolveUnresolvedCompetition);

export default router;
