import helper from 'micro-helper';
import cloudinary from '../adapters/image';
import db from '../adapters/db';

const uploadImage = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    await db('auth_users').update({ image_url: req.file.path }).where({ id: userId });
    return res.json({ done: true, url: req.file.path });
  } catch (error) {
    return res.status(500).json({ done: error });
  }
};
const removeImage = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const linkImage = await db('auth_users').where({ id: userId }).first('image_url');
    const urlArr = linkImage.image_url.split('/');
    const urlStr = urlArr[urlArr.length - 1];
    const nameArr = urlStr.split('.');
    const nameStr = nameArr[0];
    await cloudinary.uploader.destroy(`avatar/${nameStr}`);
    await db('auth_users').update({ image_url: null }).where({ id: userId });

    return helper.showSuccessOk(res, 'true');
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export default { uploadImage, removeImage };
