import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import Joi from 'joi';
import db from '../adapters/db';
import { POSTED } from '../config';

const selectDeviceWaitingForScan = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const {
      deviceScanId, deviceId,
    } = req.body;
    if (!deviceId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!deviceScanId) return helper.showClientBadRequest(res, helper.ERR_COMMON);

    const availableDevice = await db('available_devices').first('id').where('device_id', deviceId);

    await db.transaction(async (trx) => {
      await trx('available_devices').update('device_scan_id', deviceScanId).where('id', availableDevice.id);
      await trx('devices').update('status', POSTED).where('id', deviceId);
    });

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const addDeviceScan = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const {
      timestamp, authUserId, mainInfo, type, mainUrl, deviceId,
    } = req.body;
    const schema = Joi.object({
      timestamp: Joi.date().required(),
      type: Joi.string().required(),
      mainUrl: Joi.string().required(),
    });
    const validation = schema.validate({
      timestamp, type, mainUrl,
    });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    if (!check.json(mainInfo)) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!deviceId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const checkIdIdDevice = await db('devices')
      .first()
      .where('id', deviceId);
    if (!checkIdIdDevice) return helper.showClientBadRequest(res, 'device not exist');
    const checkDeviceScan = await db('device_scans').first().where('device_id', deviceId);
    if (checkDeviceScan) return helper.showClientBadRequest(res, helper.ERR_EXIST);
    const id = uuidv1();
    const date = new Date();
    await db.transaction(async (trx) => {
      await trx('device_scans').insert({
        id,
        timestamp,
        auth_user_id: authUserId,
        main_info: mainInfo,
        type,
        main_url: mainUrl,
        device_id: deviceId,
        created_at: date,
        updated_at: date,
      });
      // MUST REPAIR NOW
      await trx('devices').update({ status: POSTED }).where('id', deviceId);
    });

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const historyScan = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const {
      deviceId,
    } = req.body;
    if (!deviceId) return helper.showClientBadRequest(res, helper.ERR_COMMON);

    const list = await db('device_scans').where('real_device_id', deviceId).orderBy('created_at', 'DESC');

    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export default { addDeviceScan, historyScan, selectDeviceWaitingForScan };
