import express from 'express';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

router.get('/duplicates', adminController.getDuplicateClubs);
router.post('/merge-clubs', adminController.mergeClubs);
router.get('/countries', adminController.getCountries);

router.get('/clubs-missing-info', adminController.getClubsMissingInfo);
router.post('/update-club-data', adminController.updateClubData);
router.post('/delete-club', adminController.deleteClub);

export default router;
