/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
import db from './adapters/db';

export const queryTransactionExchangeAvailable = (
  user,
  transactionCode,
) => new Promise((resolve, reject) => {
  db('transactions_exchange')
    .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
    .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
    .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
    .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
    .innerJoin('orders', 'orders.id', 'transactions.order_id')
    .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
    .first('transactions_exchange.status', 'transactions_exchange.transaction_code', 'imeis.imei', 'devices.physical_grading')
    .where('orders_seller.user_id', user.id)
    .where('available_devices.device_app_id', transactionCode)
    .then(resolve)
    .catch(reject);
});

export const queryTransactionAvailable = (
  user,
  transactionCode,
) => new Promise((resolve, reject) => {
  db('transactions')
    .innerJoin('orders', 'orders.id', 'transactions.order_id')
    .innerJoin('devices', 'devices.id', 'transactions.device_id')
    .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
    .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
    .first('transactions.status', 'transactions.transaction_code', 'imeis.imei', 'devices.physical_grading')
    .where('orders.user_id', user.id)
    .where('available_devices.device_app_id', transactionCode)
    .then(resolve)
    .catch(reject);
});
