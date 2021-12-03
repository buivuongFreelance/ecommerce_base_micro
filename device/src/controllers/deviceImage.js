import helper from 'micro-helper';
import Joi from 'joi';
import db from '../adapters/db';

const listDeviceImage = async (req, res) => {
  const { id } = req.params;
  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  try {
    const list = await db('device_images').select('id', 'device_id', 'url', 'created_at').where('device_id', id).orderBy('main', 'desc');
    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const addDeviceImage = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const {
      deviceId, url, thumbnailUrl, thumbnailPublicId,
    } = req.body;
    const schema = Joi.object({
      url: Joi.string()
        .required()
        .pattern(new RegExp(/^[a-zA-Z0-9:/._-]+$/)),
      thumbnailUrl: Joi.string()
        .pattern(new RegExp(/^[a-zA-Z0-9:/._-]+$/))
        .allow('', null),
      thumbnailPublicId: Joi.string()
        .pattern(new RegExp(/^[a-zA-Z0-9:/._-]+$/))
        .allow('', null),
    });
    const date = new Date();
    const urlArr = url.split('/');
    const urlStr = urlArr[urlArr.length - 1];
    const validation = schema.validate({
      url,
      thumbnailPublicId,
      thumbnailUrl,
    });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    if (!deviceId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!url) return helper.showClientBadRequest(res, helper.ERR_COMMON);

    const checkIdDevice = await db('devices').first('id').where('id', deviceId);
    if (!checkIdDevice) return helper.showClientBadRequest(res, 'device not exist');
    const checkMain = await db('device_images').where({ device_id: deviceId, main: true }).first();
    await db('device_images').insert({
      device_id: deviceId,
      url,
      main: !checkMain,
      public_id: urlStr,
      thumbnail_url: thumbnailUrl || null,
      thumbnail_public_id: thumbnailPublicId || null,
      created_at: date,
      updated_at: date,
    });

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const removeDeviceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const checkDeviceImage = await db('device_images').first('id', 'main', 'device_id').where('id', id);
    if (!checkDeviceImage) return helper.showClientBadRequest(res, 'device image not exist');
    if (checkDeviceImage.main.toString() === 'true') {
      await db.transaction(async (trx) => {
        await trx('device_images').where('id', id).del();
        const nextImage = await trx('device_images').first('id', 'main').where('device_id', checkDeviceImage.device_id);
        await trx('device_images').update('main', true).where('id', nextImage.id);
      });
    } else {
      await db('device_images').where('id', id).del();
    }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showClientError(res, error);
  }
};
export default {
  addDeviceImage,
  removeDeviceImage,
  listDeviceImage,
};
