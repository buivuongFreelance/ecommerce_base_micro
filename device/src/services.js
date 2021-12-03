import db from './adapters/db';
import {
  COMPLETED,
  EXCHANGE, POSTED, SELL, SYSTEM_CANCEL_ACCEPT,
} from './config';

// eslint-disable-next-line import/prefer-default-export

export const queryNotTransactionSell = () => db('transactions')
  .select('transactions.device_id');

export const queryNotTransactionExchange = () => db('transactions_exchange')
  .select('device_id');

export const serviceListCompare = (userId,
  listUserIds, excludeIds, name) => new Promise((resolve, reject) => {
    const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);
    db('devices')
      .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
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
        db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
        db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
      )
      .where('devices.status', POSTED)
      .where('devices.status', '<>', COMPLETED)
      .where('device_images.main', 'true')
      .whereNotIn('devices.user_id', listUserIds)
      .whereNotIn('devices.id', subquery)
      .whereNotIn('devices.id', excludeIds)
      .where('models.name', 'ILIKE', `%${name}%`)
      .whereNotIn('devices.id', queryNotTransactionSell())
      .whereNotIn('devices.id', queryNotTransactionExchange())
      .orderBy('dingtoi_rating', 'desc')
      .orderBy('available_devices.created_at', 'desc')
      .limit(20)
      .offset(0)
      .then(resolve)
      .catch(reject);
  });

export const serviceListCompareAnonymous = (userId,
  excludeIds, name) => new Promise((resolve, reject) => {
    const subquery = db('tracing_carts').select('device_id').innerJoin('devices', 'tracing_carts.device_id', 'devices.id').where('tracing_carts.tracing_user_id', userId);

    db('devices')
      .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
      .leftOuterJoin('tracing_carts', 'devices.id', 'tracing_carts.device_id')
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
        db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
        db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
      )
      .where('devices.status', POSTED)
      .where('devices.status', '<>', COMPLETED)
      .where('device_images.main', 'true')
      .whereNotIn('devices.id', subquery)
      .whereNotIn('devices.id', queryNotTransactionSell())
      .whereNotIn('devices.id', queryNotTransactionExchange())
      .whereNotIn('devices.id', excludeIds)
      .where('models.name', 'ILIKE', `%${name}%`)
      .limit(20)
      .offset(0)
      .orderBy('dingtoi_rating', 'desc')
      .orderBy('available_devices.created_at', 'desc')
      .then(resolve)
      .catch(reject);
  });

export const serviceListSearch = (userId,
  listUserIds, name) => new Promise((resolve, reject) => {
    const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);
    db('devices')
      .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
      .distinct(
        'models.id as model_id',
        'models.name as model',
      )
      .where('devices.status', POSTED)
      .where('devices.status', '<>', COMPLETED)
      .where('device_images.main', 'true')
      .whereNotIn('devices.user_id', listUserIds)
      .whereNotIn('devices.id', subquery)
      .whereNotIn('devices.id', queryNotTransactionSell())
      .whereNotIn('devices.id', queryNotTransactionExchange())
      .where('models.name', 'ILIKE', `%${name}%`)
      .orderBy('model_id', 'model')
      .then(resolve)
      .catch(reject);
  });

export const serviceListSearchAnonymous = (userId, name) => new Promise((resolve, reject) => {
  const subquery = db('tracing_carts').select('device_id').innerJoin('devices', 'tracing_carts.device_id', 'devices.id').where('tracing_carts.tracing_user_id', userId);

  db('devices')
    .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
    .join('imeis', 'devices.imei_id', 'imeis.id')
    .leftJoin('device_images', 'devices.id', 'device_images.device_id')
    .innerJoin('rams', 'devices.ram_id', 'rams.id')
    .innerJoin('colors', 'devices.color_id', 'colors.id')
    .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
    .innerJoin('models', 'imeis.model_id', 'models.id')
    .innerJoin('categories', 'models.category_id', 'categories.id')
    .innerJoin('brands', 'models.brand_id', 'brands.id')
    .innerJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
    .leftOuterJoin('tracing_carts', 'devices.id', 'tracing_carts.device_id')
    .distinct(
      'models.id as model_id',
      'models.name as model',
    )
    .where('devices.status', POSTED)
    .where('devices.status', '<>', COMPLETED)
    .where('device_images.main', 'true')
    .whereNotIn('devices.id', subquery)
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .where('models.name', 'ILIKE', `%${name}%`)
    .orderBy('model_id', 'model')
    .then(resolve)
    .catch(reject);
});

export const serviceListDeviceTags = (userId, ids,
  listUserIds) => new Promise((resolve, reject) => {
    const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);
    db('devices')
      .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
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
      .whereNotIn('devices.id', subquery)
      .whereNotIn('devices.id', queryNotTransactionSell())
      .whereNotIn('devices.id', queryNotTransactionExchange())
      .whereIn('models.id', ids)
      .orderBy('dingtoi_rating', 'desc')
      .orderBy('available_devices.created_at', 'desc')
      .then(resolve)
      .catch(reject);
  });

export const serviceListNewDevices = (userId, limit, offset, filter,
  listUserIds) => {
  const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);

  const query = db('devices')
    .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
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
      'device_tags.id as device_tag',
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
    .orderBy('available_devices.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const queryCount = db('devices')
    .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
    .join('imeis', 'devices.imei_id', 'imeis.id')
    .leftJoin('device_images', 'devices.id', 'device_images.device_id')
    .innerJoin('rams', 'devices.ram_id', 'rams.id')
    .innerJoin('colors', 'devices.color_id', 'colors.id')
    .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
    .innerJoin('models', 'imeis.model_id', 'models.id')
    .innerJoin('categories', 'models.category_id', 'categories.id')
    .innerJoin('brands', 'models.brand_id', 'brands.id')
    .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
    .count('devices.id', { as: 'count' })
    .where('devices.status', POSTED)
    .where('devices.status', '<>', COMPLETED)
    .where('device_images.main', 'true')
    .whereNotIn('devices.user_id', listUserIds)
    .whereNotIn('devices.id', subquery)
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .first();

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
  return { query, queryCount };
};

export const serviceListNewDevicesAnonymous = (userId, limit, offset, filter) => {
  const subquery = db('tracing_carts').select('device_id').innerJoin('devices', 'tracing_carts.device_id', 'devices.id').where('tracing_carts.tracing_user_id', userId);

  const query = db('devices')
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
    .whereNotIn('devices.id', subquery)
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .orderBy('available_devices.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  const queryCount = db('devices')
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
    .count('devices.id', { as: 'count' })
    .where('devices.status', POSTED)
    .where('devices.status', '<>', COMPLETED)
    .where('device_images.main', 'true')
    .whereNotIn('devices.id', subquery)
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .first();

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
  return { query, queryCount };
};

export const serviceListFeatured = (userId, limit,
  listUserIds) => new Promise((resolve, reject) => {
    const subquery = db('carts').select('device_id').innerJoin('devices', 'carts.device_id', 'devices.id').where('carts.user_id', userId);
    db('devices')
      .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
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
      .orderBy('dingtoi_rating', 'desc')
      .orderBy('available_devices.created_at', 'desc')
      .limit(limit)
      .offset(0)
      .then(resolve)
      .catch(reject);
  });

export const serviceListFeaturedAnonymous = (userId,
  limit) => new Promise((resolve, reject) => {
    const subquery = db('tracing_carts').select('device_id').innerJoin('devices', 'tracing_carts.device_id', 'devices.id').where('tracing_carts.tracing_user_id', userId);

    db('devices')
      .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
      .leftOuterJoin('tracing_carts', 'devices.id', 'tracing_carts.device_id')
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
        db.raw('device_scans.main_info -> \'diamondRating\' AS dingtoi_rating'),
        db.raw('device_scans.main_info -> \'url_summary_report\' AS dingtoi_scan_image'),
      )
      .where('devices.status', POSTED)
      .where('devices.status', '<>', COMPLETED)
      .where('device_images.main', 'true')
      .whereNotIn('devices.id', subquery)
      .whereNotIn('devices.id', queryNotTransactionSell())
      .whereNotIn('devices.id', queryNotTransactionExchange())
      .orderBy('dingtoi_rating', 'desc')
      .orderBy('available_devices.created_at', 'desc')
      .limit(limit)
      .offset(0)
      .then(resolve)
      .catch(reject);
  });

export const serviceListDevice = (deviceName, status, grade,
  userId, limit, offset, sort) => new Promise((resolve, reject) => {
    const query = db('devices')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .leftJoin('transactions', 'transactions.device_id', 'devices.id')
      .leftJoin('transactions_exchange', 'transactions_exchange.device_id', 'devices.id')
      .leftJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
      .leftJoin('orders', 'orders.id', 'orders_seller.order_id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .leftJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .leftJoin(
        db('carts').select(db.raw('count(proposals.id) as count'), 'carts.device_id')
          .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
          .groupBy('proposals.id', 'carts.device_id')
          .where('proposals.status', '<>', SYSTEM_CANCEL_ACCEPT)
          .as('carts'),
        // eslint-disable-next-line func-names
        function () {
          this.on('devices.id', '=', 'carts.device_id');
        },
      )
      .distinctOn('models.name', 'devices.physical_grading', 'devices.status', 'devices.created_at')
      .select(
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
        'categories.id as category_id',
        'categories.name as category_name',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'carts.count as proposals',
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
      .where('models.name', 'ILIKE', `%${deviceName}%`)
      .where('devices.status', 'like', `%${status}%`)
      .where('devices.physical_grading', 'like', `%${grade}%`)
      .where('devices.user_id', userId)
      .offset(offset)
      .limit(limit);
    if (sort.deviceName) {
      query.orderBy('models.name', sort.deviceName);
    } else if (sort.physicalGrading) {
      query.orderBy('devices.physical_grading', sort.physicalGrading);
    } else if (sort.status) {
      query.orderBy('devices.status', sort.status);
    } else {
      query.orderBy('devices.created_at', 'desc');
    }

    query
      .then(resolve)
      .catch(reject);
  });

export const serviceListDeviceCount = (userId, deviceName,
  status, grade) => new Promise((resolve, reject) => {
    db('devices')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .count('devices.id', { as: 'count' })
      .where('devices.user_id', userId)
      .where('models.name', 'ILIKE', `%${deviceName}%`)
      .where('devices.status', 'like', `%${status}%`)
      .where('devices.physical_grading', 'like', `%${grade}%`)
      .first()
      .then(resolve)
      .catch(reject);
  });
