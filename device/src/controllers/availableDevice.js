/* eslint-disable array-callback-return */
import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import check from 'is_js';
import axios from 'axios';
import db from '../adapters/db';
import functions from '../functions';
import {
  COMPLETED, CREATED, EXCHANGE, POSTED, SELL, WAITING_FOR_SCAN,
} from '../config';
import {
  queryNotTransactionExchange,
  queryNotTransactionSell,
  serviceListFeatured,
  serviceListFeaturedAnonymous,
  serviceListNewDevices,
  serviceListNewDevicesAnonymous,
  serviceListDeviceTags,
  serviceListSearch,
  serviceListSearchAnonymous,
  serviceListCompare,
  serviceListCompareAnonymous,
} from '../services';

const { DOMAIN_DRIVEN_UPLOAD } = process.env;

const listWishlist = async (req, res) => {
  let userId = null;
  const listUserIds = [];
  if (req.login) {
    userId = req.userId;
    listUserIds.push(req.userId);
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }
  const { limit, offset } = req.body;

  if (!limit) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  if (req.login) {
    try {
      const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);

      const list = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .innerJoin(
          db('wishlists')
            .select('id', 'device_id', 'created_at')
            .where('user_id', userId).as('wishlists'),
          'devices.id', 'wishlists.device_id',
        )
        .select(
          'available_devices.sale_price',
          'available_devices.real_sale_price',
          'available_devices.exchange_price',
          'available_devices.real_exchange_price',
          'available_devices.exchange_model',
          'devices.id as device_id',
          'devices.status',
          'devices.physical_grading',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'device_images.url',
          'devices.model as model',
          'wishlists.id as wishlist_id',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .whereNotIn('devices.user_id', listUserIds)
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .orderBy('wishlists.created_at', 'desc')
        .limit(limit)
        .offset(offset);

      const countRow = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .innerJoin(
          db('wishlists')
            .select('id', 'device_id', 'created_at')
            .where('user_id', userId).as('wishlists'),
          'devices.id', 'wishlists.device_id',
        )
        .count('devices.id', { as: 'count' })
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .whereNotIn('devices.user_id', listUserIds)
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .first();

      return helper.showSuccessOk(res, {
        list,
        count: countRow.count,
      });
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const subquery = db('tracing_carts').select('device_id').innerJoin('devices', 'tracing_carts.device_id', 'devices.id')
        .where('tracing_carts.tracing_user_id', userId);

      const list = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .innerJoin(
          db('tracing_wishlists')
            .select('id', 'device_id', 'created_at')
            .where('tracing_user_id', userId).as('tracing_wishlists'),
          'devices.id', 'tracing_wishlists.device_id',
        )
        .select(
          'available_devices.sale_price',
          'available_devices.real_sale_price',
          'available_devices.exchange_price',
          'available_devices.real_exchange_price',
          'available_devices.exchange_model',
          'devices.id as device_id',
          'devices.status',
          'devices.physical_grading',
          'imeis.id as imei_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'categories.name as category_name',
          'categories.image_url as category_image_url',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'device_images.url',
          'tracing_wishlists.id as wishlist_id',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .whereNotIn('devices.user_id', listUserIds)
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .orderBy('tracing_wishlists.created_at', 'desc')
        .limit(limit)
        .offset(offset);
      const countRow = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .innerJoin(
          db('tracing_wishlists')
            .select('id', 'device_id', 'created_at')
            .where('tracing_user_id', userId).as('tracing_wishlists'),
          'devices.id', 'tracing_wishlists.device_id',
        )
        .count('devices.id', { as: 'count' })
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .whereNotIn('devices.user_id', listUserIds)
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .first();
      return helper.showSuccessOk(res, {
        list,
        count: countRow.count,
      });
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const removeWishlist = async (req, res) => {
  const { id } = req.body;
  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  if (req.login) {
    try {
      await db('wishlists').where('id', id).del();
      return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      await db('tracing_wishlists').where('id', id).del();
      return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const addWishList = async (req, res) => {
  let userId = null;
  if (req.login) {
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }
  const { deviceId } = req.body;
  if (!deviceId) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  const id = uuidv1();
  const date = new Date();

  if (req.login) {
    try {
      const checkWishlist = await db('wishlists').first('id').where({
        device_id: deviceId,
        user_id: userId,
      });
      if (checkWishlist) {
        return helper.showServerError(res, '');
      }
      await db('wishlists').insert({
        user_id: userId,
        device_id: deviceId,
        created_at: date,
        updated_at: date,
      });

      return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const checkWishlist = await db('tracing_wishlists').first('id').where({
        device_id: deviceId,
        tracing_user_id: userId,
      });
      if (checkWishlist) {
        return helper.showServerError(res, '');
      }
      await db('tracing_wishlists').insert({
        id,
        tracing_user_id: userId,
        device_id: deviceId,
        created_at: date,
        updated_at: date,
      });
      return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const getRelatedList = async (req, res) => {
  const { id, limit, brand } = req.body;
  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (!limit) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (!brand) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  const listUserIds = [];
  let userId = null;
  if (req.login) {
    listUserIds.push(req.userId);
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }
  if (req.login) {
    try {
      const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);

      const listPosted = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftJoin(
          db('wishlists')
            .select('id', 'device_id', 'created_at')
            .where('user_id', userId).as('wishlists'),
          'devices.id', 'wishlists.device_id',
        )
        .leftJoin(
          db('device_tags')
            .select('id', 'model_id', 'created_at')
            .where('user_id', userId).as('device_tags'),
          'models.id', 'device_tags.model_id',
        )
        .select(
          'available_devices.sale_price',
          'available_devices.real_sale_price',
          'available_devices.exchange_price',
          'available_devices.real_exchange_price',
          'available_devices.exchange_model',
          'devices.id as device_id',
          'devices.status',
          'devices.physical_grading',
          'imeis.id as imei_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'categories.name as category_name',
          'categories.image_url as category_image_url',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'device_images.url',
          'wishlists.id as wishlist_id',
          'device_tags.id as device_tag',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .whereNotIn('devices.user_id', listUserIds)
        .whereNotIn('devices.id', [id])
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .orderByRaw(`case when brands.name = '${brand}' then 0 else 1 end asc`)
        .limit(limit)
        .offset(0);

      return helper.showSuccessOk(res, listPosted);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const subquery = db('tracing_carts').select('device_id').innerJoin('devices', 'tracing_carts.device_id', 'devices.id').where('tracing_carts.tracing_user_id', userId);

      const listPosted = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftOuterJoin('tracing_carts', 'devices.id', 'tracing_carts.device_id')
        .leftJoin(
          db('tracing_wishlists')
            .select('id', 'device_id', 'created_at')
            .where('tracing_user_id', userId).as('tracing_wishlists'),
          'devices.id', 'tracing_wishlists.device_id',
        )
        .select(
          'available_devices.sale_price',
          'available_devices.real_sale_price',
          'available_devices.exchange_price',
          'available_devices.real_exchange_price',
          'available_devices.exchange_model',
          'devices.id as device_id',
          'devices.status',
          'devices.physical_grading',
          'imeis.id as imei_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'categories.name as category_name',
          'categories.image_url as category_image_url',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'device_images.url',
          'tracing_wishlists.id as wishlist_id',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .whereNotIn('devices.id', [id])
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .orderByRaw(`case when brands.name = '${brand}' then 0 else 1 end asc`)
        .limit(limit)
        .offset(0);

      return helper.showSuccessOk(res, listPosted);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const availableDeviceDetail = async (req, res) => {
  const listUserIds = [];
  let userId = null;
  if (req.login) {
    listUserIds.push(req.userId);
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }
  if (req.login) {
    try {
      const { id } = req.params;
      const checkId = await db('devices').first('id').where('id', id);
      if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'device not exist');

      const detailDevice = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('rams', 'rams.id', 'devices.ram_id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftOuterJoin(
          db('carts')
            .select('id', 'device_id', 'type')
            .where('user_id', userId).as('carts'),
          'devices.id', 'carts.device_id',
        )
        .leftJoin(
          db('wishlists')
            .select('id', 'device_id')
            .where('user_id', userId).as('wishlists'),
          'devices.id', 'wishlists.device_id',
        )
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
          'available_devices.is_warranty',
          'devices.physical_grading',
          'devices.status',
          'devices.created_at',
          'devices.id',
          'devices.ram_id as ram_id',
          'rams.value as ram_value',
          'colors.id as color_id',
          'colors.name as color',
          'colors.color_code',
          'capacities.id as capacity_id',
          'capacities.value as capacity',
          'devices.model as model',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'device_scans.main_info',
          'carts.id as cart_id',
          'carts.type as cart_type',
          'wishlists.id as wishlist_id',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.id', id)
        .whereNotIn('devices.user_id', listUserIds);

      const images = await db('devices').join('device_images', 'devices.id', 'device_images.device_id').select('url').where('device_id', id)
        .orderBy('main', 'desc');
      detailDevice.images = images;
      return helper.showSuccessOk(res, detailDevice);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const { id } = req.params;
      const checkId = await db('devices').first('id').where('id', id);
      if (!check.existy(checkId)) return helper.showClientBadRequest(res, 'device not exist');

      const detailDevice = await db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('rams', 'rams.id', 'devices.ram_id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftOuterJoin(
          db('tracing_carts')
            .select('id', 'device_id', 'type')
            .where('tracing_user_id', userId).as('tracing_carts'),
          'devices.id', 'tracing_carts.device_id',
        )
        .leftJoin(
          db('tracing_wishlists')
            .select('id', 'device_id')
            .where('tracing_user_id', userId).as('tracing_wishlists'),
          'devices.id', 'tracing_wishlists.device_id',
        )
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
          'available_devices.is_warranty',
          'devices.physical_grading',
          'devices.status',
          'devices.created_at',
          'devices.id',
          'devices.ram_id as ram_id',
          'rams.value as ram_value',
          'colors.id as color_id',
          'colors.name as color',
          'colors.color_code',
          'capacities.id as capacity_id',
          'capacities.value as capacity',
          'devices.model as model',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'device_scans.main_info',
          'tracing_carts.id as cart_id',
          'tracing_carts.type as cart_type',
          'tracing_wishlists.id as wishlist_id',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.id', id);

      const images = await db('devices').join('device_images', 'devices.id', 'device_images.device_id').select('url').where('device_id', id)
        .orderBy('main', 'desc');
      detailDevice.images = images;
      return helper.showSuccessOk(res, detailDevice);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const waitingForScan = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const date = new Date();
    const {
      deviceId,
      salePrice,
      exchangePrice,
      exchangeModel,
      accessories,
      warrantyExpireDate,
      isWarranty,
      isImage,
    } = req.body;

    const checkDeviceId = await db('devices').first().where('id', deviceId);
    const checkAvailableDeviceId = await db('available_devices')
      .first('id', 'device_id')
      .where('device_id', deviceId);
    const checkImage = await db('device_images')
      .first('device_id')
      .where('device_id', deviceId);
    if (!checkImage) return helper.showClientBadRequest(res, 'no image');
    if (!checkDeviceId) return helper.showClientBadRequest(res, 'device not exist');
    if (isImage) {
      return helper.showSuccessOk(res, helper.SUCCESS);
    }
    const customSalePrice = Number(salePrice);
    const customExchangePrice = Number(exchangePrice);
    const ratioPrice = await db('settings')
      .first('value')
      .where({ key: 'ratio_price' });
    const customRatioPrice = Number(ratioPrice.value);

    // eslint-disable-next-line max-len
    const customRealSalePrice = functions.convertMoneySellForBuyer(customSalePrice, customRatioPrice);
    // eslint-disable-next-line max-len
    const customRealExchangePrice = functions.convertMoneyExchangeForBuyer(customExchangePrice, customRatioPrice);
    await db.transaction(async (trx) => {
      await trx('available_devices').update({
        device_id: deviceId,
        sale_price: customSalePrice,
        real_sale_price: customRealSalePrice,
        exchange_price: customExchangePrice,
        real_exchange_price: customRealExchangePrice,
        exchange_model: exchangeModel || null,
        accessories: accessories || null,
        warranty_expire_date: warrantyExpireDate || null,
        updated_at: date,
        is_warranty: isWarranty,
      }).where('id', checkAvailableDeviceId.id);
      // ADD REMOVE LATER
      // await trx('devices').update({ status: POSTED }).where('id', deviceId);
      // await trx('device_scans').insert({
      //   id: uuidv1(),
      //   timestamp: date,
      //   auth_user_id: req.userId,
      //   type: 'basic',
      //   main_url: 'https://res.cloudinary.com/deeucfdkq/image/upload/v1617335186/ttksx4omu3lesxviaecy.png',
      //   device_id: 'fa59bbac-1a7a-4a73-b18f-84f2a44e200c',
      //   created_at: date,
      //   updated_at: date,
      //   real_device_id: deviceId,
      //   main_info: {
      //     "wifi": "y",
      //     "brand": "Samsung",
      //     "flash": "y",
      //     "model": "Samsung Galaxy J7 Prime",
      //     "camera": "y",
      //     "faceID": "nothave",
      //     "finger": "y",
      //     "volume": "y",
      //     "storage": "32GB",
      //     "released": "8.1.0",
      //     "bluetooth": "y",
      //     "processor": "samsungexynos7870",
      //     "touch_url": "https://res.cloudinary.com/deeucfdkq/image/upload/v1617335183/zrf4ygimxfswnzfdflsw.png",
      //     "microphone": "y",
      //     "storageUsed": "19GB",
      //     "textInbound": "not_verified",
      //     "touchscreen": "n",
      //     "pointScanner": 20,
      //     "scannerPoint": 20,
      //     "textOutbound": "not_verified",
      //     "voiceInbound": "not_verified",
      //     "blacklistType": "not_verified",
      //     "diamondRating": 3,
      //     "voiceOutbound": "not_verified",
      //     "blacklistStatus": "Not Verified",
      //     "physicalGrading": 50,
      //     "url_summary_report": "https://res.cloudinary.com/deeucfdkq/image/upload/v1617335198/uh6hp6bsgk3oqnmqqfrf.png"
      //   }
      // });
      // END ADD REMOVE LATER
      if (checkDeviceId.status === CREATED) {
        await trx('devices').update({ status: WAITING_FOR_SCAN }).where('id', deviceId);
      }
    });

    return helper.showSuccessOk(res, deviceId);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const updateWaitingForScan = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const date = new Date();
    const {
      salePrice,
      exchangePrice,
      exchangeModel,
      accessories,
      warrantyExpireDate,
      isWarranty,
    } = req.body;
    const { id } = req.params;
    const checkId = await db('available_devices').first('*').where('id', id);
    if (!checkId) return helper.showClientBadRequest(res, 'available devices not exist');
    const customSalePrice = Number(salePrice);
    const customExchangePrice = Number(exchangePrice);
    const ratioPrice = await db('settings')
      .first('value')
      .where({ key: 'ratio_price' });
    const customRatioPrice = Number(ratioPrice.value);
    // eslint-disable-next-line max-len
    const customRealSalePrice = functions.convertMoneySellForBuyer(customSalePrice, customRatioPrice);
    // eslint-disable-next-line max-len
    const customRealExchangePrice = functions.convertMoneyExchangeForBuyer(customExchangePrice, customRatioPrice);

    await db('available_devices').update({
      sale_price: checkId.real_sale_price,
      real_sale_price: customRealSalePrice,
      exchange_price: checkId.real_exchange_price,
      real_exchange_price: customRealExchangePrice,
      exchange_model: exchangeModel || null,
      accessories: accessories || null,
      warranty_expire_date: warrantyExpireDate || null,
      is_warranty: isWarranty,
      updated_at: date,
    }).where('id', id);
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
const deleteWaitingForScan = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  try {
    const { id } = req.params;
    const checkId = await db('available_devices').first('device_id').where('id', id);
    if (!checkId) return helper.showClientBadRequest(res, 'available devices not exist');
    const images = await db('device_images').select('public_id').where('device_id', checkId.device_id);

    const subProposalSnapshots = db.raw(`
      SELECT id
      FROM proposal_snapshots,
      jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
      WHERE arr.item_object->>'id'='${checkId.device_id}'`);

    const subProposals = db.raw(`
      SELECT id
      FROM proposals,
      jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
      WHERE arr.item_object->>'id'='${checkId.device_id}'`);

    await db.transaction(async (trx) => {
      await trx('available_devices').update(
        {
          proposal_id: null,
          sale_price: null,
          real_sale_price: null,
          exchange_price: null,
          real_exchange_price: null,
          exchange_model: null,
          accessories: null,
          warranty_expire_date: null,
          device_scan_id: null,
          is_warranty: null,
          device_app_id: null,
        },
      ).where('id', id);
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
        return this.from('carts').distinct('id').where('device_id', checkId.device_id);
      }).delete();
      // eslint-disable-next-line func-names
      await trx.from('proposals').whereIn('cart_id', function () {
        return this.from('carts').distinct('id').where('device_id', checkId.device_id);
      }).delete();
      await trx('tracing_wishlists').where('device_id', checkId.device_id).del();
      await trx('wishlists').where('device_id', checkId.device_id).del();
      await trx('tracing_carts').where('device_id', checkId.device_id).del();
      await trx('carts').where('device_id', checkId.device_id).del();
      await trx('device_images').where('device_id', checkId.device_id).del();
      await trx('devices').update({ status: 'CREATED' }).where('id', checkId.device_id);
    });
    // if (images.length > 0) {
    //   let names = images[0].public_id;
    //   // eslint-disable-next-line no-plusplus
    //   for (let i = 1; i < images.length; i++) {
    //     names += `,${images[i].public_id}`;
    //   }
    //   try {
    //     await axios.post(`${DOMAIN_DRIVEN_UPLOAD}deleteMultipleImage`, {
    //       names,
    //     });
    //   } catch (errorImg) {
    //     throw new Error('image');
    //   }
    // }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const getSearchList = async (req, res) => {
  const listUserIds = [];
  let userId = null;
  const { name } = req.body;
  if (req.login) {
    listUserIds.push(req.userId);
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }
  if (req.login) {
    try {
      const listPosted = await serviceListSearch(userId, listUserIds, name);

      return helper.showSuccessOk(res, listPosted);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const listPosted = await serviceListSearchAnonymous(userId, name);
      return helper.showSuccessOk(res, listPosted);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const getFeaturedList = async (req, res) => {
  const listUserIds = [];
  let userId = null;
  if (req.login) {
    listUserIds.push(req.userId);
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }
  if (req.login) {
    try {
      const { limit } = req.body;
      const listPosted = await serviceListFeatured(userId, limit, listUserIds);

      return helper.showSuccessOk(res, listPosted);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const { limit } = req.body;
      const listPosted = await serviceListFeaturedAnonymous(userId, limit);

      return helper.showSuccessOk(res, listPosted);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const getNewList = async (req, res) => {
  const listUserIds = [];
  let userId = null;
  if (req.login) {
    listUserIds.push(req.userId);
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }

  const { sort, filter } = req.body;
  if (!sort) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (!filter) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (req.login) {
    try {
      const { limit, offset } = req.body;
      const {
        query,
        queryCount,
      } = serviceListNewDevices(userId, limit, offset, filter, listUserIds);

      const list = await query;
      const countRow = await queryCount;

      return helper.showSuccessOk(res, { list, count: countRow.count });
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const { limit, offset } = req.body;
      const {
        query,
        queryCount,
      } = serviceListNewDevicesAnonymous(userId, limit, offset, filter, listUserIds);

      const list = await query;
      const countRow = await queryCount;

      return helper.showSuccessOk(res, { list, count: countRow.count });
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};
const deviceListSearch = async (req, res) => {
  const listUserIds = [];
  let userId = null;
  if (req.login) {
    listUserIds.push(req.userId);
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }

  const { sort, filter, name } = req.body;
  if (!sort) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (!filter) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (req.login) {
    try {
      const { limit, offset } = req.body;
      const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);

      const query = db('devices')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftJoin(
          db('wishlists')
            .select('id', 'device_id', 'created_at')
            .where('user_id', userId).as('wishlists'),
          'devices.id', 'wishlists.device_id',
        )
        .select(
          'available_devices.sale_price',
          'available_devices.real_sale_price',
          'available_devices.exchange_price',
          'available_devices.real_exchange_price',
          'available_devices.exchange_model',
          'devices.id as device_id',
          'devices.status',
          'devices.physical_grading',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'devices.model as model',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'device_images.url',
          'wishlists.id as wishlist_id',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .where('devices.model', 'ILIKE', `%${name}%`)
        .whereNotIn('devices.user_id', listUserIds)
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange());

      const queryCount = db('devices')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .count('devices.id', { as: 'count' })
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .where('devices.model', 'ILIKE', `%${name}%`)
        .whereNotIn('devices.user_id', listUserIds)
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .first();

      if (sort) {
        if (sort.name === 'price_asc') {
          query.orderBy('available_devices.real_sale_price', 'asc');
        } else if (sort.name === 'price_desc') {
          query.orderBy('available_devices.real_sale_price', 'desc');
        } else if (sort.name === 'name_asc') {
          query.orderBy('devices.model', 'asc');
        } else if (sort.name === 'name_desc') {
          query.orderBy('devices.model', 'desc');
        } else if (sort.name === 'date_asc') {
          query.orderBy('available_devices.created_at', 'asc');
        } else if (sort.name === 'date_desc') {
          query.orderBy('available_devices.created_at', 'desc');
        }
      }

      if (filter.dingtoiRating !== null) {
        query.whereRaw('device_scans.main_info -> \'diamondRating\' >= ?', [filter.dingtoiRating]);
        queryCount.whereRaw('device_scans.main_info -> \'diamondRating\' >= ?', [filter.dingtoiRating]);
        query.orderByRaw('device_scans.main_info -> \'diamondRating\' ASC');
      }

      if (filter.brands.length > 0) {
        query.whereIn('brands.id', filter.brands);
        queryCount.whereIn('brands.id', filter.brands);
      }
      if (filter.grades.length > 0) {
        query.whereIn('devices.physical_grading', filter.grades);
        queryCount.whereIn('devices.physical_grading', filter.grades);
      }
      if (filter.colors.length > 0) {
        query.whereIn('colors.id', filter.colors);
        queryCount.whereIn('colors.id', filter.colors);
      }
      if (filter.capacities.length > 0) {
        query.whereIn('capacities.id', filter.capacities);
        queryCount.whereIn('capacities.id', filter.capacities);
      }
      if (filter.rams.length > 0) {
        query.whereIn('rams.id', filter.rams);
        queryCount.whereIn('rams.id', filter.rams);
      }

      if (filter.types.length === 1) {
        if (filter.types.includes(SELL)) {
          query.where('available_devices.real_sale_price', '>', 0);
          queryCount.where('available_devices.real_sale_price', '>', 0);
        }
        if (filter.types.includes(EXCHANGE)) {
          query.whereNotNull('available_devices.exchange_model');
          queryCount.whereNotNull('available_devices.exchange_model');
        }
      }

      query.orderBy('available_devices.created_at', 'desc');
      query.limit(limit);
      query.offset(offset);

      const list = await query;
      const countRow = await queryCount;

      return helper.showSuccessOk(res, { list, count: countRow.count });
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const { limit, offset } = req.body;
      const subquery = db('tracing_carts').select('device_id').innerJoin('devices', 'tracing_carts.device_id', 'devices.id').where('tracing_carts.tracing_user_id', userId);

      const query = db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftOuterJoin('tracing_carts', 'devices.id', 'tracing_carts.device_id')
        .leftJoin(
          db('tracing_wishlists')
            .select('id', 'device_id', 'created_at')
            .where('tracing_user_id', userId).as('tracing_wishlists'),
          'devices.id', 'tracing_wishlists.device_id',
        )
        .select(
          'available_devices.sale_price',
          'available_devices.real_sale_price',
          'available_devices.exchange_price',
          'available_devices.real_exchange_price',
          'available_devices.exchange_model',
          'devices.id as device_id',
          'devices.status',
          'devices.physical_grading',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'devices.model as model',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'device_images.url',
          'tracing_wishlists.id as wishlist_id',
          db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
          db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
        )
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .where('devices.model', 'ILIKE', `%${name}%`);

      const queryCount = db('devices')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('brands', 'devices.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftOuterJoin('tracing_carts', 'devices.id', 'tracing_carts.device_id')
        .count('devices.id', { as: 'count' })
        .where('devices.status', POSTED)
        .where('devices.status', '<>', COMPLETED)
        .where('device_images.main', 'true')
        .where('devices.model', 'ILIKE', `%${name}%`)
        .whereNotIn('devices.id', subquery)
        .whereNotIn('devices.id', queryNotTransactionSell())
        .whereNotIn('devices.id', queryNotTransactionExchange())
        .first();

      if (sort) {
        if (sort.name === 'price_asc') {
          query.orderBy('available_devices.real_sale_price', 'asc');
        } else if (sort.name === 'price_desc') {
          query.orderBy('available_devices.real_sale_price', 'desc');
        } else if (sort.name === 'name_asc') {
          query.orderBy('devices.model', 'asc');
        } else if (sort.name === 'name_desc') {
          query.orderBy('devices.model', 'desc');
        } else if (sort.name === 'date_asc') {
          query.orderBy('available_devices.created_at', 'asc');
        } else if (sort.name === 'date_desc') {
          query.orderBy('available_devices.created_at', 'desc');
        }
      }

      if (filter.dingtoiRating !== null) {
        query.whereRaw('device_scans.main_info -> \'diamondRating\' >= ?', [filter.dingtoiRating]);
        queryCount.whereRaw('device_scans.main_info -> \'diamondRating\' >= ?', [filter.dingtoiRating]);
        query.orderByRaw('device_scans.main_info -> \'diamondRating\' ASC');
      }

      if (filter.brands.length > 0) {
        query.whereIn('brands.id', filter.brands);
        queryCount.whereIn('brands.id', filter.brands);
      }
      if (filter.grades.length > 0) {
        query.whereIn('devices.physical_grading', filter.grades);
        queryCount.whereIn('devices.physical_grading', filter.grades);
      }
      if (filter.colors.length > 0) {
        query.whereIn('colors.id', filter.colors);
        queryCount.whereIn('colors.id', filter.colors);
      }
      if (filter.capacities.length > 0) {
        query.whereIn('capacities.id', filter.capacities);
        queryCount.whereIn('capacities.id', filter.capacities);
      }
      if (filter.rams.length > 0) {
        query.whereIn('rams.id', filter.rams);
        queryCount.whereIn('rams.id', filter.rams);
      }

      if (filter.types.length === 1) {
        if (filter.types.includes(SELL)) {
          query.where('available_devices.real_sale_price', '>', 0);
          queryCount.where('available_devices.real_sale_price', '>', 0);
        }
        if (filter.types.includes(EXCHANGE)) {
          query.whereNotNull('available_devices.exchange_model');
          queryCount.whereNotNull('available_devices.exchange_model');
        }
      }

      query.orderBy('available_devices.created_at', 'desc');
      query.limit(limit);
      query.offset(offset);

      const list = await query;
      const countRow = await queryCount;

      return helper.showSuccessOk(res, { list, count: countRow.count });
    } catch (error) {
      console.log(error);
      return helper.showServerError(res, error);
    }
  }
};

const deviceListTags = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const list = await db('device_tags')
      .select('device_tags.*', 'models.name')
      .innerJoin('models', 'models.id', 'device_tags.model_id')
      .where('user_id', userId);
    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const deviceAddTags = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  const { modelId } = req.body;
  if (!modelId) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  const id = uuidv1();
  const date = new Date();
  try {
    await db('device_tags').insert({
      id,
      model_id: modelId,
      user_id: userId,
      created_at: date,
      updated_at: date,
    });
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const deviceRemoveTags = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { id } = req.params;
  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  try {
    await db('device_tags').where('id', id).del();
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const deviceListSearchByTags = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  const { ids } = req.body;
  if (!ids) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  const listUserIds = [];
  if (req.login) {
    listUserIds.push(req.userId);
  }
  try {
    const list = await serviceListDeviceTags(userId, ids, listUserIds);
    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const deviceListCompare = async (req, res) => {
  let userId = null;
  const { ids, name } = req.body;
  if (!ids) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (!name) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  const listUserIds = [];

  if (req.login) {
    userId = req.userId;
    listUserIds.push(req.userId);
  } else {
    const { anonymous } = req.body;
    if (!anonymous) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    userId = anonymous;
  }
  if (req.login) {
    try {
      const list = await serviceListCompare(userId, listUserIds, ids, name);
      return helper.showSuccessOk(res, list);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const list = await serviceListCompareAnonymous(userId, ids, name);
      return helper.showSuccessOk(res, list);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

export default {
  waitingForScan,
  updateWaitingForScan,
  deleteWaitingForScan,
  getFeaturedList,
  getNewList,
  getRelatedList,
  deviceListSearch,
  availableDeviceDetail,
  addWishList,
  removeWishlist,
  listWishlist,
  deviceListTags,
  deviceAddTags,
  deviceRemoveTags,
  deviceListSearchByTags,
  getSearchList,
  deviceListCompare,
};
