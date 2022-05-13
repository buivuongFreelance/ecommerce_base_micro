import express from 'express';
import multer from 'multer';
import cloudinaryStorage from 'multer-storage-cloudinary';
import blacklistController from './controllers/blacklist';
import userController from './controllers/user';
import deviceController, { getDeviceInfoIOS, getDeviceScan } from './controllers/device';
import middleware from './middleware';
import cloudinary from './adapters/image';
import { listQuestionBuyerReject } from './controllers/question';
import {
  checkQrCode, transactionBuyerAccept,
  transactionBuyerReject, transactionCompareDevice, transactionProcess,
} from './controllers/transaction';

const router = express.Router();

const { validate } = middleware;
const storage = cloudinaryStorage({
  cloudinary,
  folder: 'device-scan',
  allowedFormats: ['jpg', 'png'],
});
const upload = multer({ storage });

const { checkBlacklist } = blacklistController;
const {
  loginWithGoogle,
  logout,
  walletDetail,
  walletPlus,
  walletMinus,
  settings,
  rules,
  register,
  login,
  loginWithFacebook,
  loginWithApple,
  loginQrCode,
  forgotPassword,
  loginWithTransaction,
  loginWithGoogleTransaction,
  loginWithFacebookTransaction,
} = userController;
const {
  historyScans,
  historyScan,
  androidDevices,
  uploadImage,
  summaryReport,
  physicalUpdate,
  saveComment,
  confirmReport,
  scanningHistoryDetail,
  summaryRealDeviceReport,
  summaryTransactionWebReport,
  checkDevice,
  checkTransactionQrCode,
  checkTransactionQrCodeBuyer,
  ownerScanAccept,
} = deviceController;

router.get('/question/listQuestionBuyerReject', validate, listQuestionBuyerReject);

router.post('/transaction/buyerReject', validate, transactionBuyerReject);
router.post('/transaction/buyerAccept', validate, transactionBuyerAccept);
router.post('/transaction/listCompare', validate, transactionCompareDevice);

router.post('/transaction/process', validate, transactionProcess);

router.post('/device/ownerScanAccept', validate, ownerScanAccept);
router.post('/device/checkQrCode', validate, checkQrCode);

router.get('/deviceScan/:id', validate, getDeviceScan);

router.post('/blacklist/check', validate, checkBlacklist);
router.post('/user/login-with-google', loginWithGoogle);
router.post('/user/login-with-google-transaction', loginWithGoogleTransaction);
router.post('/user/login-with-facebook', loginWithFacebook);
router.post('/user/login-with-facebook-transaction', loginWithFacebookTransaction);
router.post('/user/login-with-apple', loginWithApple);
router.post('/user/logout', validate, logout);
router.get('/user/wallet', validate, walletDetail);
router.post('/user/wallet/plus', validate, walletPlus);
router.post('/user/wallet/minus', validate, walletMinus);
router.post('/user/registration', register);
router.post('/user/login', login);
router.post('/user/loginWithTransaction', loginWithTransaction);
router.get('/settings', validate, settings);
router.get('/rules', validate, rules);
router.post('/device/ownerScanAccept', validate, ownerScanAccept);
router.post('/device/summaryReport/saveComment', validate, saveComment);
router.post('/device/check', validate, checkDevice);
router.post('/device/summaryReport/physicalUpdate', validate, physicalUpdate);
router.post('/device/summaryReport', validate, summaryReport);
router.post('/device/scanningHistory', validate, historyScans);
router.get('/device/scanningHistory/:id', validate, historyScan);
router.post('/device/confirmWebReport', validate, confirmReport);
router.post('/device/checkTransactionQrCode', validate, checkTransactionQrCode);
router.post('/device/checkTransactionQrCodeBuyer', validate, checkTransactionQrCodeBuyer);
router.post('/device/summaryWebReport', validate, summaryRealDeviceReport);
router.post('/device/summaryTransactionWebReport', validate, summaryTransactionWebReport);
router.get('/device/scanningWebHistory/:id', validate, scanningHistoryDetail);
router.post('/device/android/list', validate, androidDevices);

router.post('/device/ios/check', validate, getDeviceInfoIOS);
router.post('/upload/image', upload.single('image'), uploadImage);
router.post('/user/forgotPassword', forgotPassword);
router.post('/user/loginQrCode', loginQrCode);

export default router;
