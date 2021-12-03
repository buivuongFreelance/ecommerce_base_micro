import express from 'express';
import multer from 'multer';
import cloudinaryStorage from 'multer-storage-cloudinary';
import deviceController from './controllers/upload';
import cloudinary from './adapters/image';

const router = express.Router();
const storage = cloudinaryStorage({
  cloudinary,
  params: {
    folder: 'devices',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage });

const { uploadImage, removeImage, removeMultiple } = deviceController;
router.post('/upload', upload.single('image'), uploadImage);

router.post('/delete', removeImage);
router.post('/deleteMultipleImage', removeMultiple);
export default router;
