import cloudinary from 'cloudinary';

const cloudv2 = cloudinary.v2;

cloudv2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudv2;
