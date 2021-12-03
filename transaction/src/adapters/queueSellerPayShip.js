/* eslint-disable no-empty */
import {
  DEVICE_STATUS,
  NOTIFY,
  ORDER_STATUS,
  QUEUE,
  SELLER,
  SOCKET_NOTIFICATION_MESSAGE,
  TRANSACTION_STATUS,
  TYPE,
  UNREAD,
} from '../config';
import db from './db';
import socket from './socket';
import { checkDeviceScanOrNotScan } from '../functions';

const Queue = require('bull');

const queue = new Queue(QUEUE.SELLER_PAY_SHIP, {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});

queue.process(async (job) => {
  try {
    // eslint-disable-next-line no-empty
    const { orderSellerId } = job.data;
    if (orderSellerId) {
      const date = new Date();

      const orderSeller = await db('orders_seller')
        .innerJoin('auth_users', 'auth_users.id', 'orders_seller.user_id')
        .first('orders_seller.*', 'auth_users.email as email')
        .where('orders_seller.id', orderSellerId);
      const orderSellers = await db('orders_seller').select('*')
        .where('order_id', orderSeller.order_id)
        .whereNotIn('id', [orderSellerId]);

      const buyer = await db('auth_users')
        .innerJoin('orders', 'orders.user_id', 'auth_users.id')
        .first('auth_users.email', 'orders.order_number')
        .where('orders.id', orderSeller.order_id);

      const transactionsExchange = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .where('transactions_exchange.order_seller_id', orderSellerId)
        .where('transactions_exchange.type', SELLER)
        .select('transactions_exchange.device_id', 'available_devices.device_scan_id',
          'available_devices.id as available_id', 'available_devices.sale_price');

      const transactions = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .where('transactions.order_seller_id', orderSellerId)
        .select('transactions.device_id', 'available_devices.device_scan_id',
          'available_devices.id as available_id', 'available_devices.sale_price');

      const {
        arrScan,
        arrNotScan,
        arrAdded,
      } = checkDeviceScanOrNotScan(transactionsExchange.concat(transactions));

      await db.transaction(async (trx) => {
        // eslint-disable-next-line func-names
        await trx.from('transactions_exchange').whereIn('transaction_id', function () {
          return this.from('transactions').distinct('id').where('order_seller_id', orderSellerId);
        }).update('status', TRANSACTION_STATUS.SYSTEM_CANCELLED);
        await trx('transactions').where('order_seller_id', orderSellerId).update('status', TRANSACTION_STATUS.SYSTEM_CANCELLED);
        await trx('orders_seller').where('id', orderSellerId).update('status', ORDER_STATUS.SYSTEM_CANCELLED_NOT_PAY_SHIP);
        if (orderSellers.length === 0) {
          await trx('orders').where('id', orderSeller.order_id).update('status', ORDER_STATUS.SYSTEM_CANCELLED);
        }
        await trx('devices').update('status', DEVICE_STATUS.POSTED).whereIn('id', arrScan);
        await trx('devices').update('status', DEVICE_STATUS.WAITING_FOR_SCAN).whereIn('id', arrNotScan);
        await trx('devices').update('status', DEVICE_STATUS.CREATED).whereIn('id', arrAdded);
        await trx('available_devices').update(
          {
            device_app_id: null,
          },
        ).whereIn('device_id', arrScan);
        await trx('available_devices').update(
          {
            device_app_id: null,
          },
        ).whereIn('device_id', arrNotScan);
        await trx('available_devices').update(
          {
            sale_price: null,
            real_sale_price: null,
            exchange_price: null,
            real_exchange_price: null,
            exchange_model: null,
            accessories: null,
            warranty_expire_date: null,
            device_scan_id: null,
            proposal_id: null,
            is_warranty: null,
            device_app_id: null,
          },
        ).whereIn('device_id', arrAdded);
      });

      const notificationSeller = {
        name: `${NOTIFY.ORDER_SALE_CANCELLED}&${orderSeller.code}&${orderSeller.id}`,
        type: TYPE.SALE,
        links: null,
        email: orderSeller.email,
        status: UNREAD,
        created_at: date,
        updated_at: date,
      };
      const notificationBuyer = {
        name: `${NOTIFY.ORDER_CANCELLED}&${buyer.order_number}&${orderSeller.order_id}`,
        type: TYPE.PURCHASE,
        links: null,
        email: buyer.email,
        status: UNREAD,
        created_at: date,
        updated_at: date,
      };

      if (socket.connected) {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationBuyer);
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
      }
      await job.moveToCompleted();
      await job.remove();
    }
  } catch (error) {
    console.log('error', error);
  }
});

export default queue;
