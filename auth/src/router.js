import express from 'express';
import multer from 'multer';
import cloudinaryStorage from 'multer-storage-cloudinary';
import middleware from './middleware';
import cloudinary from './adapters/image';

import {
  loginFunc,
  logoutFunc,
  registrationFunc,
  verifyFunc,
  forgotPasswordFunc,
  changeTempPassword,
  checkEmail,
  loginGmail,
  loginFacebook,
  userinfo,
  uploadAvatar,
  loginAdminFunc,
  logoutAdminFunc,
  resetPassword,
} from './functions';

import tracing from './functions/tracing';
import { getWallet } from './functions/userInfo';

const { validate, validateAdmin } = middleware;

const router = express.Router();
const storage = cloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatar',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });
router.post('/login', loginFunc);
router.post('/loginAdmin', loginAdminFunc);
router.post('/logout', validate, logoutFunc);
router.post('/logoutAdmin', validateAdmin, logoutAdminFunc);
router.post('/registration', registrationFunc);
router.get('/verify/:activeCode', verifyFunc);
router.post('/forgotPassword', forgotPasswordFunc);
router.post('/resetPassword', resetPassword);
router.get('/changePassword/:email', changeTempPassword);
router.post('/emailChecking', checkEmail);
router.post('/loginGmail', loginGmail);
router.post('/loginFacebook', loginFacebook);
router.post('/loginTracing', tracing.registerTracingUser);
router.get('/info/detail', validate, userinfo.detail);
router.post('/info/createAndUpdate', validate, userinfo.createAndUpdate);
router.post('/info/delete', validate, userinfo.remove);
router.post('/changePassword', validate, userinfo.changePassword);
router.post('/avatar/upload', validate, upload.single('image'), uploadAvatar.uploadImage);
router.post('/avatar/delete', validate, uploadAvatar.removeImage);
router.get('/wallet', validate, getWallet);
export default router;
