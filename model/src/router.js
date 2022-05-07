import express from 'express';
import controllers from './controllers';
import { listCityByStateAndCountry, getCityByName } from './controllers/cities';
import { listFaqs } from './controllers/faqs';
import { generateImei } from './controllers/imei';
import { listQuestionBuyerReject, listQuestionSellerReject } from './controllers/model';
import {
  listNotification, listNotificationAll, removeAllNotification, removeNotification,
  updateNotificationRead,
} from './controllers/notification';
import { listOrder, removeOrder } from './controllers/order';
import { listStateByCountry } from './controllers/state';
import { testBasicScanCtrl } from './controllers/test';
import middleware from './middleware';

const router = express.Router();

const { validateAdmin, validate } = middleware;

router.get('/generateImei', generateImei);

router.post('/banner', controllers.banner.create);

router.put('/banner/:id', controllers.banner.update);

router.delete('/banner/:id', controllers.banner.remove);

router.get('/banners/all', controllers.banner.listAll);

router.get('/banner/:id', controllers.banner.detail);

router.get('/banners', controllers.banner.list);

router.post('/warranty', controllers.warranties.create);

router.put('/warranty/:id', controllers.warranties.update);

router.delete('/warranty/:id', controllers.warranties.remove);

router.get('/warranties/listAll', controllers.warranties.listAll);

router.get('/warranty/:id', controllers.warranties.detail);

router.get('/warranties', controllers.warranties.list);

router.delete('/creditcard/:id', controllers.creditCard.remove);

router.get('/creditcard/listAll', controllers.creditCard.listAll);

router.get('/creditcard/:id', controllers.creditCard.detail);

router.post('/notifications', validate, listNotification);
router.get('/notifications/all', validate, listNotificationAll);
router.put('/notification/:id', validate, updateNotificationRead);
router.delete('/notification/:id', validate, removeNotification);
router.delete('/notificationAll', validate, removeAllNotification);

router.get('/settings/listAll', controllers.model.listSettings);
router.get('/questions/sellerReject', listQuestionSellerReject);
router.get('/questions/buyerReject', listQuestionBuyerReject);
router.get('/faqs', listFaqs);

router.post('/states/byCountry', listStateByCountry);
router.post('/cities/byStateAndCountry', listCityByStateAndCountry);

router.get('/city/byName/:name', getCityByName);

router.get('/countries/listAll', controllers.countries.listAll);
router.get('/country/:id', controllers.countries.detail);

router.post('/orders', listOrder);
router.post('/order/delete', removeOrder);

router.post('/settings', validateAdmin, controllers.settings.listPost);
router.post('/setting', validateAdmin, controllers.settings.create);
router.put('/setting/:id', validateAdmin, controllers.settings.update);
router.delete('/setting/:id', validateAdmin, controllers.settings.remove);
router.get('/setting/:id', validateAdmin, controllers.settings.detail);

router.post('/accessories', validateAdmin, controllers.accessonies.listPost);
router.post('/accessory', validateAdmin, controllers.accessonies.create);
router.put('/accessory/:id', validateAdmin, controllers.accessonies.update);
router.delete('/accessory/:id', validateAdmin, controllers.accessonies.remove);
router.get('/accessonies/listAll', controllers.accessonies.listAll);
router.get('/accessory/:id', validateAdmin, controllers.accessonies.detail);
router.get('/accessonies', controllers.accessonies.list);

router.post('/colors', validateAdmin, controllers.color.listPost);
router.get('/colors', controllers.color.list);
router.post('/color', validateAdmin, controllers.color.create);
router.put('/color/:id', validateAdmin, controllers.color.update);
router.delete('/color/:id', validateAdmin, controllers.color.remove);
router.get('/colors/all', controllers.color.listAll);
router.get('/color/:id', validateAdmin, controllers.color.detail);

router.post('/capacities', validateAdmin, controllers.capacity.listPost);
router.post('/capacity', validateAdmin, controllers.capacity.create);
router.put('/capacity/:id', validateAdmin, controllers.capacity.update);
router.delete('/capacity/:id', validateAdmin, controllers.capacity.remove);
router.get('/capacities/all', controllers.capacity.listAll);
router.get('/capacity/:id', validateAdmin, controllers.capacity.detail);
router.get('/capacities', controllers.capacity.list);

router.post('/rams', validateAdmin, controllers.ram.listPost);
router.post('/ram', validateAdmin, controllers.ram.create);
router.put('/ram/:id', validateAdmin, controllers.ram.update);
router.delete('/ram/:id', validateAdmin, controllers.ram.remove);
router.get('/rams/all', controllers.ram.listAll);
router.get('/ram/:id', validateAdmin, controllers.ram.detail);
router.get('/rams', controllers.ram.list);

router.post('/brands', validateAdmin, controllers.brand.listPost);
router.post('/brand', validateAdmin, controllers.brand.create);
router.put('/brand/:id', validateAdmin, controllers.brand.update);
router.delete('/brand/:id', validateAdmin, controllers.brand.remove);
router.get('/brands/all', controllers.brand.listAll);
router.get('/brand/:id', validateAdmin, controllers.brand.detail);
router.get('/brands', controllers.brand.list);

router.post('/categories', validateAdmin, controllers.category.listPost);
router.post('/category', validateAdmin, controllers.category.create);
router.put('/category/:id', validateAdmin, controllers.category.update);
router.delete('/category/:id', validateAdmin, controllers.category.remove);
router.get('/categories/all', controllers.category.listAll);
router.get('/category/:id', validateAdmin, controllers.category.detail);
router.get('/categories', controllers.category.list);

router.post('/models', validateAdmin, controllers.model.listPost);
router.post('/', validateAdmin, controllers.model.create);
router.put('/:id', validateAdmin, controllers.model.update);
router.delete('/:id', validateAdmin, controllers.model.remove);
router.get('/all', controllers.model.listAll);
router.get('/:id', validateAdmin, controllers.model.detail);
router.post('/lists', controllers.model.list);
router.post('/listsExclude', controllers.model.listExclude);

router.post('/imeis', validateAdmin, controllers.imei.listPost);
router.post('/imei', validateAdmin, controllers.imei.create);
router.delete('/imei/:id', validateAdmin, controllers.imei.remove);
router.get('/imei/:id', validateAdmin, controllers.imei.detail);
router.put('/imei/:id', validateAdmin, controllers.imei.update);

router.post('/test/basicScan', validate, testBasicScanCtrl);


export default router;
