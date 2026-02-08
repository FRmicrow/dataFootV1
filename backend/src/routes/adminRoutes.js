import express from 'express';
import * as adminController from '../controllers/adminController.js';
import * as fixMissingCompetitionsController from '../controllers/fixMissingCompetitionsController.js';

const router = express.Router();

router.get('/duplicates', adminController.getDuplicateClubs);
router.post('/merge-clubs', adminController.mergeClubs);
router.post('/mass-merge-exact', adminController.massMergeExactMatches);
router.get('/duplicate-competitions', adminController.getDuplicateCompetitions);
router.post('/merge-competitions', adminController.mergeCompetitions);
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
router.post('/import-player/:playerId', adminController.importSinglePlayerDeep);
router.post('/clear-player-data', adminController.clearPlayerData);
router.get('/club-season-stats', adminController.getClubSeasonStats);
router.post('/scan-club-countries', adminController.scanClubCountries);
router.post('/fix-club-country', adminController.fixClubCountry);
router.post('/cleanup-duplicate-player-stats', adminController.cleanupDuplicatePlayerStats);
router.get('/scan-missing-competitions', fixMissingCompetitionsController.scanMissingCompetitions);
router.get('/fix-all-missing-competitions', fixMissingCompetitionsController.fixAllMissingCompetitions);
router.get('/fix-competition-ids', fixMissingCompetitionsController.fixCompetitionApiIds);

// Cleanup Routes //
import * as cleanupController from '../controllers/cleanupController.js';
import * as importCompetitionsController from '../controllers/importCompetitionsController.js';
import * as importClubsController from '../controllers/importClubsController.js';
import * as importPlayersV2Controller from '../controllers/importPlayersV2Controller.js';

router.get('/cleanup-candidates', cleanupController.getCleanupCandidates);
router.get('/debug-player/:id', cleanupController.debugPlayerStats);
router.post('/cleanup-merge', cleanupController.mergeStats);

router.get('/import-competitions-range', importCompetitionsController.importCompetitionsRange);
router.get('/import-clubs-range', importClubsController.importClubsRange);
router.post('/import-player-v2', importPlayersV2Controller.importPlayerV2);
router.get('/import-players-range-v2', importPlayersV2Controller.importPlayersRangeV2);
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

router.post('/cleanup-merge-duplicates', cleanupController.mergeDuplicateClubs);

export default router;
