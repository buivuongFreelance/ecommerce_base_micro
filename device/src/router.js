import express from 'express';
import imei from './controllers/imeis';
import middleware from './middleware';
import device, { lowerPrice } from './controllers/device';
import availableDevice from './controllers/availableDevice';
import deviceImage from './controllers/deviceImage';
import deviceScan from './controllers/deviceScan';

const router = express.Router();
const { checkImei } = imei;

router.post('/check/imei', middleware.validate, checkImei);
router.post('/add', middleware.validate, device.add);
router.put('/update/:id', middleware.validate, device.modify);
router.delete('/:id', middleware.validate, device.remove);
router.get('/detail/:id', middleware.validate, device.detail);
router.get('/all', middleware.validate, device.all);
router.post('/list', middleware.validate, device.list);
router.post('/listExclude', middleware.validate, device.listExclude);
router.post('/waitingforscan', middleware.validate, availableDevice.waitingForScan);
router.put('/waitingforscan/:id', middleware.validate, availableDevice.updateWaitingForScan);
router.delete('/waitingforscan/:id', middleware.validate, availableDevice.deleteWaitingForScan);
router.post('/featuredList', middleware.validate, availableDevice.getFeaturedList);
router.post('/newList', middleware.validate, availableDevice.getNewList);
router.post('/relatedList', middleware.validate, availableDevice.getRelatedList);
router.get('/:id/images', middleware.validate, deviceImage.listDeviceImage);
router.post('/image/add', middleware.validate, deviceImage.addDeviceImage);
router.delete('/image/:id', middleware.validate, deviceImage.removeDeviceImage);
router.post('/scan/add', middleware.validate, deviceScan.addDeviceScan);
router.post('/search', middleware.validate, availableDevice.deviceListSearch);
router.post('/available/:id', middleware.validate, availableDevice.availableDeviceDetail);

router.post('/scan/history', middleware.validate, deviceScan.historyScan);
router.post('/waitingForScan/selectScan', middleware.validate, deviceScan.selectDeviceWaitingForScan);

router.post('/wishlist/create', middleware.validate, availableDevice.addWishList);
router.post('/wishlist/remove', middleware.validate, availableDevice.removeWishlist);
router.post('/wishlist/list', middleware.validate, availableDevice.listWishlist);

router.post('/tags/listDevice', middleware.validate, availableDevice.deviceListSearchByTags);

router.get('/tags', middleware.validate, availableDevice.deviceListTags);
router.post('/tags', middleware.validate, availableDevice.deviceAddTags);
router.delete('/tags/:id', middleware.validate, availableDevice.deviceRemoveTags);

router.post('/search/list', middleware.validate, availableDevice.getSearchList);
router.post('/compare', middleware.validate, availableDevice.deviceListCompare);

router.post('/lowerPrice', middleware.validate, lowerPrice);
export default router;
