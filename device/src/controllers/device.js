/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable array-callback-return */
/* eslint-disable func-names */
import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import Joi from 'joi';
import axios from 'axios';
import db from '../adapters/db';
import { COMPLETED, CREATED, SYSTEM_CANCEL_ACCEPT } from '../config';
import {
  serviceListDevice,
  serviceListDeviceCount,
  queryNotTransactionExchange,
  queryNotTransactionSell,
} from '../services';

const { DOMAIN_DRIVEN_UPLOAD } = process.env;

export const lowerPrice = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { price, deviceId } = req.body;
  if (!price) {
    return helper.showServerError(res, '');
  }
  const checkDevice = await db('available_devices').first('id', 'real_sale_price').where('device_id', deviceId);
  if (!checkDevice) {
    return helper.showServerError(res, '');
  }
  await db('available_devices').update({
    sale_price: checkDevice.real_sale_price,
    real_sale_price: price,
  }).where('device_id', deviceId);

  return helper.showSuccessOk(res, helper.SUCCESS);
};

const listExclude = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const {
      offset, limit, filter, exchangeIds,
    } = req.body;
    if (!limit) return helper.showClientEmpty(res);
    if (!filter) return helper.showClientEmpty(res);
    if (!exchangeIds) return helper.showClientEmpty(res);

    const { deviceName } = filter;

    // const subProposals = db.raw(`
    //   SELECT arr.item_object->>'id' as id
    //   FROM proposals,
    //   jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
    // `);

    const listDevices = await db('devices')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .leftJoin('available_devices', 'available_devices.device_id', 'devices.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .select(
        'available_devices.proposal_id as is_proposal_accepted',
        'devices.physical_grading',
        'devices.status',
        'devices.created_at',
        'devices.id',
        'imeis.id as imei_id',
        'imeis.imei as imei',
        'imeis.other_detail',
        'imeis.original_price',
        'rams.id as ram_id',
        'rams.value as ram',
        'colors.id as color_id',
        'colors.name as color',
        'capacities.id as capacity_id',
        'capacities.value as capacity',
        'models.id as model_id',
        'models.name as model',
        'models.image_url as model_url',
        'categories.id as category_id',
        'categories.name as category_name',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'device_images.url',
      )
      .where('devices.user_id', userId)
      .where('models.name', 'ILIKE', `%${deviceName}%`)
      .where('devices.status', '<>', COMPLETED)
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .whereNotIn('devices.id', exchangeIds)
      // .whereNotIn(db.raw('devices.id::text'), subProposals)
      .whereNotIn('devices.id', queryNotTransactionSell())
      .whereNotIn('devices.id', queryNotTransactionExchange())
      .offset(offset)
      .limit(limit)
      .orderBy('created_at', 'desc');

    const countRow = await db('devices')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .count('devices.id', { as: 'count' })
      .where('models.name', 'ILIKE', `%${deviceName}%`)
      .where('devices.user_id', userId)
      .whereNotIn('devices.id', exchangeIds)
      // .whereNotIn(db.raw('devices.id::text'), subProposals)
      .whereNotIn('devices.id', queryNotTransactionSell())
      .whereNotIn('devices.id', queryNotTransactionExchange())
      .where('devices.status', '<>', COMPLETED)
      .first();

    let countNew = Number(countRow.count);
    const listNewDevices = [];
    for (let i = 0; i < listDevices.length; i++) {
      const device = listDevices[i];
      const proposalsRaw = await db.raw(`
        SELECT proposals.id
        FROM proposals
        INNER JOIN jsonb_array_elements(proposals.exchange_devices) as arr(data) on true
        INNER JOIN available_devices ON available_devices.proposal_id=proposals.id
        WHERE arr.data->>'id'='${device.id}'`);
      const proposals = proposalsRaw.rows;
      if (proposals.length === 0) {
        listNewDevices.push(device);
      } else {
        countNew--;
      }
    }

    return helper.showSuccessOk(res, {
      list: listNewDevices,
      count: countNew,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const add = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const {
      modelId, imei, physicalGrading, ramId, capacityId, colorId,
    } = req.body;
    if (!modelId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!imei) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!ramId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!physicalGrading) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!capacityId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!colorId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const checkDeviceImei = await db('devices')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .first('devices.id')
      .where('imeis.imei', imei);
    if (checkDeviceImei) return helper.showClientBadRequest(res, helper.ERR_EXIST);

    const checkImei = await db('imeis')
      .first('id')
      .where('imei', imei);
    const idImei = uuidv1();
    const idDevice = uuidv1();
    const date = new Date();

    await db.transaction(async (trx) => {
      if (!checkImei) {
        await trx('imeis').insert({
          id: idImei,
          imei,
          model_id: modelId,
          ram_id: ramId,
          capacity_id: capacityId,
          color_id: colorId,
          created_at: date,
          updated_at: date,
        });
      }
      await trx('devices').insert({
        id: idDevice,
        imei_id: checkImei ? checkImei.id : idImei,
        user_id: userId,
        physical_grading: physicalGrading,
        ram_id: ramId,
        capacity_id: capacityId,
        color_id: colorId,
        status: CREATED,
        created_at: date,
        updated_at: date,
      });
      await trx('available_devices').insert({
        id: uuidv1(),
        device_id: idDevice,
        sale_price: null,
        real_sale_price: null,
        exchange_price: null,
        real_exchange_price: null,
        exchange_model: null,
        accessories: null,
        warranty_expire_date: null,
        created_at: date,
        updated_at: date,
        device_scan_id: null,
        proposal_id: null,
        is_warranty: null,
        device_app_id: null,
      });
    });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const remove = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;

    const images = await db('device_images').select('public_id').where('device_id', id);

    const subProposalSnapshots = db.raw(`
      SELECT id
      FROM proposal_snapshots,
      jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
      WHERE arr.item_object->>'id'='${id}'`);

    const subProposals = db.raw(`
      SELECT id
      FROM proposals,
      jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
      WHERE arr.item_object->>'id'='${id}'`);

    await db.transaction(async (trx) => {
      await trx('available_devices').update('proposal_id', null).where('device_id', id);
      const availableDevices = await trx('available_devices')
        .select('available_devices.id')
        .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
        .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
        .whereIn('proposals.id', subProposals);
      const arrAvailableDevices = [];
      availableDevices.map((av) => {
        arrAvailableDevices.push(av.id);
      });
      if (arrAvailableDevices.length > 0) {
        await trx('available_devices').update('proposal_id', null).whereIn('id', [arrAvailableDevices]);
      }
      await trx.from('proposal_snapshots').whereIn('id', subProposalSnapshots).del();
      await trx.from('proposals').whereIn('id', subProposals).del();

      // eslint-disable-next-line func-names
      await trx.from('proposal_snapshots').whereIn('cart_id', function () {
        return this.from('carts').distinct('id').where('device_id', id);
      }).delete();
      // eslint-disable-next-line func-names
      await trx.from('proposals').whereIn('cart_id', function () {
        return this.from('carts').distinct('id').where('device_id', id);
      }).delete();
      await trx('tracing_wishlists').where('device_id', id).del();
      await trx('wishlists').where('device_id', id).del();
      await trx('tracing_carts').where('device_id', id).del();
      await trx('carts').where('device_id', id).del();
      await trx('device_images').where('device_id', id).del();
      await trx('available_devices').where('device_id', id).del();
      await trx('device_scans').where('real_device_id', id).del();
      await trx('devices').where('id', id).del();
    });
    if (images.length > 0) {
      let names = images[0].public_id;
      // eslint-disable-next-line no-plusplus
      for (let i = 1; i < images.length; i++) {
        names += `,${images[i].public_id}`;
      }
      try {
        await axios.post(`${DOMAIN_DRIVEN_UPLOAD}deleteMultipleImage`, {
          names,
        });
      } catch (errorImg) {
        throw new Error('image');
      }
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    if (error === 'image') return helper.showSuccessOk(res, helper.SUCCESS);
    return helper.showServerError(res, error);
  }
};

const modify = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('devices').first('id', 'status').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'device not exist');
    const {
      physicalGrading, ramId, capacityId, colorId,
    } = req.body;
    const schema = Joi.object({
      physicalGrading: Joi.string().pattern(new RegExp(/^[ABCDabcd]+$/)),
    });
    const validation = schema.validate({
      physicalGrading,
    });
    if (validation.error || validation.errors) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    if (!ramId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!physicalGrading) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!capacityId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    if (!colorId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const date = new Date();
    if (checkId.status !== CREATED) {
      const images = await db('device_images').select('public_id').where('device_id', id);
      await db.transaction(async (trx) => {
        await trx('devices')
          .update({
            physical_grading: physicalGrading,
            ram_id: ramId,
            capacity_id: capacityId,
            color_id: colorId,
            updated_at: date,
            status: CREATED,
          })
          .where({ id });
        // eslint-disable-next-line func-names
        await trx.from('proposal_snapshots').whereIn('cart_id', function () {
          return this.from('carts').distinct('id').where('device_id', id);
        }).delete();
        // eslint-disable-next-line func-names
        await trx.from('proposals').whereIn('cart_id', function () {
          return this.from('carts').distinct('id').where('device_id', id);
        }).delete();
        await trx('tracing_wishlists').where('device_id', id).del();
        await trx('wishlists').where('device_id', id).del();
        await trx('tracing_carts').where('device_id', id).del();
        await trx('carts').where('device_id', id).del();
        await trx('device_images').where('device_id', id).del();
        await trx('available_devices').where('device_id', id).del();
        await trx('device_scans').where('real_device_id', id).del();
      });
      if (images.length > 0) {
        let names = images[0].public_id;
        // eslint-disable-next-line no-plusplus
        for (let i = 1; i < images.length; i++) {
          names += `,${images[i].public_id}`;
        }
        try {
          await axios.post(`${DOMAIN_DRIVEN_UPLOAD}deleteMultipleImage`, {
            names,
          });
        } catch (errorImg) {
          throw new Error('image');
        }
      }
    } else if (checkId.status === CREATED) {
      await db('devices')
        .update({
          physical_grading: physicalGrading,
          ram_id: ramId,
          capacity_id: capacityId,
          color_id: colorId,
          updated_at: date,
        })
        .where({ id });
    }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const detail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('devices').first('id').where('id', id);
    if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'device not exist');
    const detailDevice = await db('devices')
      .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .join('imeis', 'imeis.id', 'devices.imei_id')
      .join('rams', 'rams.id', 'devices.ram_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
      .leftJoin('transactions', 'transactions.device_id', 'devices.id')
      .leftJoin('transactions_exchange', 'transactions_exchange.device_id', 'devices.id')
      .leftJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
      .leftJoin('orders', 'orders.id', 'orders_seller.order_id')
      .leftJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .first(
        'available_devices.id as available_id',
        'available_devices.is_warranty',
        'available_devices.sale_price',
        'available_devices.real_sale_price',
        'available_devices.exchange_price',
        'available_devices.real_exchange_price',
        'available_devices.exchange_model',
        'available_devices.accessories',
        'available_devices.warranty_expire_date',
        'devices.physical_grading',
        'devices.status',
        'devices.created_at',
        'devices.id',
        'imeis.id as imei_id',
        'imeis.imei as imei',
        'imeis.other_detail',
        'imeis.original_price',
        'devices.ram_id as ram_id',
        'rams.value as ram_value',
        'colors.id as color_id',
        'colors.name as color',
        'capacities.id as capacity_id',
        'capacities.value as capacity',
        'models.id as model_id',
        'models.name as model',
        'categories.id as category_id',
        'categories.name as category_name',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'device_scans.main_info',
        db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
        db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        'transactions.id as transaction_id',
        'transactions.status as transaction_status',
        'transactions.type as transaction_type',
        'transactions_exchange.id as transaction_exchange_id',
        'orders_seller.charge_stripe as charge_stripe',
        'transactions_exchange.status as transaction_exchange_status',
        'orders_seller.id as order_seller_id',
        'orders.id as order_id',
        'auth_users.email as transaction_email_buyer',
      )
      .where('devices.id', id);

    const images = await db('devices').join('device_images', 'devices.id', 'device_images.device_id').select('url').where('device_id', id)
      .orderBy('main', 'desc');

    const proposals = await db('proposals')
      .innerJoin('carts', 'carts.id', 'proposals.cart_id')
      .where('proposals.status', '<>', SYSTEM_CANCEL_ACCEPT)
      .where('carts.device_id', checkId.id);
    detailDevice.images = images;
    detailDevice.proposals = proposals;
    return helper.showSuccessOk(res, detailDevice);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const all = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const listallDevices = await db('devices')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .select(
        'devices.physical_grading as device_physical_grading',
        'devices.status as device_status',
        'devices.created_at as device_created_at',
        'devices.id as device_id',
        'imeis.id as imei_id',
        'imeis.imei as imei',
        'imeis.other_detail as imeis_other_detail',
        'imeis.original_price as imeis_original_price',
        'rams.id as ram_id',
        'rams.value as ram',
        'colors.id as color_id',
        'colors.name as color',
        'capacities.id as capacity_id',
        'capacities.value as capacity',
        'capacities.value as capacity',
        'models.id as model_id',
        'models.name as model',
        'models.image_url as model_image_url',
        'categories.id as category_id',
        'categories.name as category_name',
        'categories.image_url as category_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'brands.image_url as brand_image_url',
      );
    return helper.showSuccessOk(res, listallDevices);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const list = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const {
      offset, limit, filter, sort,
    } = req.body;
    if (!limit) return helper.showClientEmpty(res);
    if (!filter) return helper.showClientEmpty(res);

    const { deviceName, status, grade } = filter;
    const listDevices = await serviceListDevice(deviceName, status, grade, userId,
      limit, offset, sort);

    const countRow = await serviceListDeviceCount(userId, deviceName, status, grade);

    return helper.showSuccessOk(res, {
      list: listDevices,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
export default {
  add,
  modify,
  detail,
  list,
  all,
  remove,
  listExclude,
};
