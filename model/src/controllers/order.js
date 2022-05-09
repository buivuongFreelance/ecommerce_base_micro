/* eslint-disable import/prefer-default-export */
import helper from 'micro-helper';
import db from '../adapters/db';
import { POSTED, WAITING_FOR_SCAN, CREATED } from '../config';
import { checkDeviceScanOrNotScan } from '../functions';

export const removeOrder = async (req, res) => {
  const { id } = req.body;
  console.log(id);
  if (!id) return helper.showClientEmpty(res);

  try {
    const transactionsExchange = await db('transactions_exchange')
      .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .where('orders.id', id)
      .select('transactions_exchange.device_id', 'available_devices.device_scan_id',
        'available_devices.id as available_id', 'available_devices.sale_price');

    const transactions = await db('transactions')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
      .where('orders.id', id)
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
        return this.from('transactions').distinct('id').where('order_id', id);
      }).delete();
      await trx('transactions').where('order_id', id).del();
      await trx('orders_seller').where('order_id', id).del();
      await trx('orders').where('id', id).del();
      await trx('devices').update('status', POSTED).whereIn('id', arrScan);
      await trx('devices').update('status', WAITING_FOR_SCAN).whereIn('id', arrNotScan);
      await trx('devices').update('status', CREATED).whereIn('id', arrAdded);
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

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const listOrder = async (req, res) => {
  const { offset, limit } = req.body;
  if (!limit) return helper.showClientEmpty(res);
  // if (!filter) return helper.showClientEmpty(res);

  // const { deviceName, status, grade } = filter;
  try {
    const listOrders = await db('orders')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .select(
        'orders.id',
        'orders.order_number',
        'orders.total_money',
        'orders.status',
        'orders.created_at',
        'orders.shipping_info',
        'orders.billing_info',
        'auth_users.email',
      )
      .offset(offset)
      .limit(limit)
      .orderBy('created_at', 'desc');

    const countRow = await db('orders')
      .count('orders.id', { as: 'count' })
      .first();

    return helper.showSuccessOk(res, {
      list: listOrders,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
