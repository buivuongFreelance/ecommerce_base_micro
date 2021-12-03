import express from 'express';
import transactionController, {
  createTransactionPickup,
  createTransactionPurchasePickup,
  detailOrderSeller, getPaymentHistory, listTransactionsPurchaseReadyToPickup,
  listTransactionsReadyToPickup,
  orderCreation,
  orderSellings, sellerPayShipping,
  transactionBuyerReceived,
  transactionDetail, transactionSubmitPasscode,
} from './controllers/transaction';
import shippingController, { fakeStatus } from './controllers/shipping';
import billingController from './controllers/billing';
import middleware from './middleware';
import { testScanTransactionBuyerConfirm, testScanTransactionBuyerReject, testScanTransactionSellerConfirm } from './controllers/test';

const router = express.Router();
const {
  confirmOrder,
  listOrder, detailOrder, listTransactionSeller,
} = transactionController;
const {
  create, update, remove, listAll, detail, getShippingAndBillingLast,
} = shippingController;

router.post('/shipping/create', middleware.validate, create);
router.put('/shipping/update/:id', update);
router.delete('/shipping/:id', remove);
router.get('/shippings', listAll);
router.get('/shipping/:id', detail);
router.get('/shippingAndBilling', middleware.validate, getShippingAndBillingLast);

router.post('/shipping/fakeStatus', middleware.validate, fakeStatus);

router.post('/billing/create', middleware.validate, billingController.create);
router.put('/billing/update/:id', billingController.update);

router.post('/order/create', middleware.validate, orderCreation);
router.post('/order/confirm', middleware.validate, confirmOrder);
router.post('/orders', middleware.validate, listOrder);
router.get('/order/:id', middleware.validate, detailOrder);
router.post('/order/sellings', middleware.validate, orderSellings);
router.post('/order/sellerPayShipping', middleware.validate, sellerPayShipping);

router.get('/orderSeller/:id', middleware.validate, detailOrderSeller);

router.post('/transactions/seller', middleware.validate, listTransactionSeller);
router.get('/transaction/:id', middleware.validate, transactionDetail);

router.post('/passcodeSubmit', middleware.validate, transactionSubmitPasscode);
router.post('/buyerReceived', middleware.validate, transactionBuyerReceived);

router.get('/paymentHistory', middleware.validate, getPaymentHistory);

router.post('/transactions/pickup', middleware.validate, listTransactionsReadyToPickup);
router.post('/transactions/purchase/pickup', middleware.validate, listTransactionsPurchaseReadyToPickup);
router.post('/transactions/pickup/create', middleware.validate, createTransactionPickup);
router.post('/transactions/pickup/purchase/create', middleware.validate, createTransactionPurchasePickup);

router.post('/test/scanSellerConfirm', middleware.validate, testScanTransactionSellerConfirm);
router.post('/test/scanBuyerConfirm', middleware.validate, testScanTransactionBuyerConfirm);
router.post('/test/scanBuyerReject', middleware.validate, testScanTransactionBuyerReject);
export default router;
