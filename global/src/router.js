import express from 'express';
import { getAccessories } from './controllers/getAccessories';
import { getCapacities } from './controllers/getCapacities';
import { getColors } from './controllers/getColors';
import { getLang } from './controllers/getLang';
import { getRams } from './controllers/getRams';
import { getTestAutoAddresses } from './controllers/getTestAutocompleteAddresses';

const router = express.Router();

router.get('/lang', getLang);
router.get('/colors', getColors);
router.get('/rams', getRams);
router.get('/capacities', getCapacities);
router.get('/accessories', getAccessories);
router.get('/testAddresses', getTestAutoAddresses);

export default router;
