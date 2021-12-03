import cloudinary from '../adapters/image';

const uploadImage = async (req, res) => {
  try {
    return res.json({ done: true, url: req.file.path });
  } catch (error) {
    return res.status(500).json({ done: error });
  }
};
const removeImage = async (req, res) => {
  try {
    const { name } = req.body;
    const nameArr = name.split('.');
    const nameStr = nameArr[0];

    await cloudinary.uploader.destroy(`devices/${nameStr}`);
    return res.status(200).json({ done: true });
  } catch (error) {
    return res.status(500).json({ done: error });
  }
};
const removeMultiple = async (req, res) => {
  try {
    const { names } = req.body;
    const arrNames = names.split(',');
    if (arrNames.length > 0) {
      const list = arrNames.map((x) => `devices/${x.split('.')[0]}`);
      await cloudinary.api.delete_resources(list);
    }
    return res.status(200).json({ done: true });
  } catch (error) {
    return res.status(500).json(error);
  }
};
export default {
  uploadImage, removeImage, removeMultiple,
};
