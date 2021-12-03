/* eslint-disable no-empty */
import {
  DEVICE_STATUS,
  NOTIFY,
  ORDER_STATUS,
  QUEUE,
  SOCKET_NOTIFICATION_MESSAGE,
  TRANSACTION_STATUS,
  TYPE,
  UNREAD,
} from '../config';
import db from './db';
import socket from './socket';
import { checkDeviceScanOrNotScan } from '../functions';

const Queue = require('bull');

const queue = new Queue(QUEUE.SELLER_MUST_SCAN, {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});

queue.process(async (job) => {
  try {
    // eslint-disable-next-line no-empty
    const { transactionId } = job.data;
    if (transactionId) {
      console.log('vo');
      // const transaction = await db('transactions')
      //   .innerJoin('orders', 'orders.id', 'transactions.order_id')
      //   .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      //   .innerJoin('devices', 'devices.id', 'transactions.device_id')
      //   .innerJoin('rams', 'devices.ram_id', 'rams.id')
      //   .innerJoin('colors', 'devices.color_id', 'colors.id')
      //   .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      //   .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      //   .innerJoin('models', 'imeis.model_id', 'models.id')
      //   .innerJoin('brands', 'models.brand_id', 'brands.id')
      //   .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      //   .first(
      //     'transactions.id',
      //     'transactions.questions',
      //     'transactions.transaction_code',
      //     'transactions.updated_at',
      //     'transactions.created_at',
      //     'transactions.status',
      //     'transactions.shipping_rate_buyer',
      //     'transactions.shipping_rate_seller',
      //     'transactions.password_machine as passcode',
      //     'orders.user_id',
      //     'orders.id as order_id',
      //     'orders.order_number',
      //     'orders_seller.code as order_seller_number',
      //     'orders_seller.id as order_seller_id',
      //     'orders.shipping_info',
      //     'orders.billing_info',
      //     'rams.value as ram',
      //     'colors.name as color',
      //     'capacities.value as capacity',
      //     'devices.id as device_id',
      //     'models.name as model',
      //     'brands.name as brand_name',
      //     'auth_users.email as buyer_email',
      //     'transactions.type',
      //     'imeis.id as imei_id',
      //   )
      //   .where('transactions.id', transactionId);

      // const date = new Date();

      // const orderSeller = await db('orders_seller')
      //   .innerJoin('auth_users', 'auth_users.id', 'orders_seller.user_id')
      //   .first('auth_users.email')
      //   .where('orders_seller.id', transaction.order_seller_id);

      // const transactionsExchange = await db('transactions_exchange')
      //   .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      //   .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      //   .innerJoin('orders', 'orders.id', 'transactions.order_id')
      //   .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
      //   .where('orders.id', transaction.order_id)
      //   .select('transactions_exchange.device_id', 'available_devices.device_scan_id', 'transactions_exchange.status',
      //     'available_devices.id as available_id', 'available_devices.sale_price');

      // const transactions = await db('transactions')
      //   .innerJoin('orders', 'orders.id', 'transactions.order_id')
      //   .innerJoin('devices', 'devices.id', 'transactions.device_id')
      //   .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
      //   .where('orders.id', transaction.order_id)
      //   .select('transactions.device_id', 'available_devices.device_scan_id', 'transactions.status',
      //     'available_devices.id as available_id', 'available_devices.sale_price');

      // const {
      //   arrScan,
      //   arrNotScan,
      //   arrAdded,
      // } = checkDeviceScanOrNotScan(transactionsExchange.concat(transactions));

      // await db.transaction(async (trx) => {
      //   // eslint-disable-next-line func-names
      //   await trx.from('transactions_exchange').whereIn('transaction_id', function () {
      //     return this.from('transactions').distinct('id').where('order_id', transaction.order_id);
      //   }).update('status', TRANSACTION_STATUS.SYSTEM_CANCELLED);
      //   await trx('transactions').where('order_id', transaction.order_id).update('status', TRANSACTION_STATUS.SYSTEM_CANCELLED);
      //   await trx('orders_seller').where('order_id', transaction.order_id).update('status', ORDER_STATUS.SYSTEM_CANCELLED);
      //   await trx('orders').where('id', transaction.order_id).update('status', ORDER_STATUS.SYSTEM_CANCELLED);
      //   await trx('devices').update('status', DEVICE_STATUS.POSTED).whereIn('id', arrScan);
      //   await trx('devices').update('status', DEVICE_STATUS.WAITING_FOR_SCAN).whereIn('id', arrNotScan);
      //   await trx('devices').update('status', DEVICE_STATUS.CREATED).whereIn('id', arrAdded);
      //   await trx('available_devices').update(
      //     {
      //       device_app_id: null,
      //     },
      //   ).whereIn('device_id', arrScan);
      //   await trx('available_devices').update(
      //     {
      //       device_app_id: null,
      //     },
      //   ).whereIn('device_id', arrNotScan);
      //   await trx('available_devices').update(
      //     {
      //       sale_price: null,
      //       real_sale_price: null,
      //       exchange_price: null,
      //       real_exchange_price: null,
      //       exchange_model: null,
      //       accessories: null,
      //       warranty_expire_date: null,
      //       device_scan_id: null,
      //       proposal_id: null,
      //       is_warranty: null,
      //       device_app_id: null,
      //     },
      //   ).whereIn('device_id', arrAdded);
      // });

      // const notificationBuyer = {
      //   name: `${NOTIFY.ORDER_CANCELLED}&${transaction.order_number}&${transaction.order_id}`,
      //   type: TYPE.PURCHASE,
      //   links: null,
      //   email: transaction.buyer_email,
      //   status: UNREAD,
      //   created_at: date,
      //   updated_at: date,
      // };

      // const notificationSeller = {
      //   name: `${NOTIFY.ORDER_CANCELLED}&${transaction.order_number}&${transaction.order_id}`,
      //   type: TYPE.SALE,
      //   links: null,
      //   email: orderSeller.email,
      //   status: UNREAD,
      //   created_at: date,
      //   updated_at: date,
      // };

      // if (socket.connected) {
      //   socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationBuyer);
      //   socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
      // }
      await job.moveToCompleted();
      await job.remove();
    }
  } catch (error) {
  }
});

export default queue;
