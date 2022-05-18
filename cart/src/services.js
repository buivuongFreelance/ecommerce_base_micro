import db from './adapters/db';
import { IN_TRANSACTION } from './config';

// eslint-disable-next-line import/prefer-default-export

export const queryNotTransactionSell = () => db('transactions')
  .select('transactions.device_id');

export const queryNotTransactionExchange = () => db('transactions_exchange')
  .select('device_id');

export const serviceListCart = (userId) => new Promise((resolve, reject) => {
  db('carts')
    .innerJoin('devices', 'carts.device_id', 'devices.id')
    .innerJoin('rams', 'rams.id', 'devices.ram_id')
    .innerJoin('colors', 'devices.color_id', 'colors.id')
    .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
    .innerJoin('brands', 'devices.brand_id', 'brands.id')
    .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
    .innerJoin('device_images', 'devices.id', 'device_images.device_id')
    .leftOuterJoin('proposals', 'proposals.cart_id', 'carts.id')
    .select(
      'carts.id',
      'carts.user_id',
      'carts.device_id',
      'carts.type as cart_type',
      'rams.value as ram_value',
      'colors.name as color',
      'capacities.value as capacity',
      'devices.model as model',
      'brands.name as brand_name',
      'device_images.url',
      'available_devices.sale_price',
      'available_devices.real_sale_price',
      'available_devices.exchange_price',
      'available_devices.real_exchange_price',
      'available_devices.exchange_model',
      'available_devices.proposal_id as is_proposal_accepted',
      'proposals.id as proposal_id',
      'proposals.questions',
      'proposals.status as proposal_status',
      'proposals.updated_at as proposal_updated_at',
    )
    .where('carts.user_id', userId)
    .where('device_images.main', 'true')
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .orderBy('carts.created_at', 'desc')
    .then(resolve)
    .catch(reject);
});

// eslint-disable-next-line import/prefer-default-export
export const serviceListCartAnonymous = (userId) => new Promise((resolve, reject) => {
  db('tracing_carts')
    .innerJoin('devices', 'tracing_carts.device_id', 'devices.id')
    .innerJoin('rams', 'rams.id', 'devices.ram_id')
    .innerJoin('colors', 'devices.color_id', 'colors.id')
    .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
    .innerJoin('brands', 'devices.brand_id', 'brands.id')
    .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
    .innerJoin('device_images', 'devices.id', 'device_images.device_id')
    .select(
      'tracing_carts.type as cart_type',
      'tracing_carts.id',
      'tracing_carts.device_id',
      'rams.value as ram_value',
      'colors.name as color',
      'capacities.value as capacity',
      'devices.model as model',
      'brands.name as brand_name',
      'device_images.url',
      'available_devices.sale_price',
      'available_devices.real_sale_price',
      'available_devices.exchange_price',
      'available_devices.real_exchange_price',
      'available_devices.exchange_model',
    )
    .where('tracing_carts.tracing_user_id', userId)
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .where('device_images.main', 'true')
    .orderBy('tracing_carts.created_at', 'desc')
    .then(resolve)
    .catch(reject);
});

export const serviceListDeviceTransaction = () => new Promise((resolve, reject) => {
  db('devices')
    .select('id')
    .where('status', IN_TRANSACTION)
    .then(resolve)
    .catch(reject);
});
