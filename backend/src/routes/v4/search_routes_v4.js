import express from 'express';
import { searchV4, getSearchCountriesV4 } from '../../controllers/v4/searchControllerV4.js';

const router = express.Router();

/**
 * US-441: Search Endpoints
 */
router.get('/search', searchV4);
router.get('/search/countries', getSearchCountriesV4);

export default router;
