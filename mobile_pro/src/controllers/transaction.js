/* eslint-disable array-callback-return */
/* eslint-disable import/prefer-default-export */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
import helper from 'micro-helper';
import db from '../adapters/db';
import config from '../config';
import { calculatePhysicalGrading } from '../functions';

import socket from '../adapters/socket';

export const checkQrCode = async (req, res) => {
  // if (!req.login) {
  //   return res.status(400).json(ERR_BAD_REQUEST);
  // }

  const {
    deviceId, email,
  } = req.body;

  console.log(deviceId, email);

  try {
    let transaction = await db('transactions')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .first('transactions.id')
      .where('transactions.id', deviceId)
      .where('transactions.status', config.BUYER_RECEIVED);

    if (!transaction) {
      transaction = await db('transactions_exchange')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .first('transactions_exchange.id')
        .where('transactions_exchange.id', deviceId)
        .where('transactions_exchange.status', config.BUYER_RECEIVED);
    }

    let flag = false;
    if (transaction) {
      flag = true;
    }

    return helper.showSuccessOk(res, flag);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const transactionCompareDevice = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const { transactionCode } = req.body;

  try {
    let myScan = await db('transactions')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('device_scans', 'device_scans.real_device_id', 'devices.id')
      .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .first('device_scans.timestamp', 'device_scans.main_info', 'device_scans.main_url', 'device_scans.type', 'device_scans.created_at', 'imeis.imei')
      .where('available_devices.device_app_id', transactionCode)
      .where('device_scans.type', 'transaction-summary')
      .orderBy('device_scans.created_at', 'desc');

    let ownerScan = await db('transactions')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
      .innerJoin('device_scans', 'device_scans.real_device_id', 'devices.id')
      .first('device_scans.timestamp', 'device_scans.main_info', 'device_scans.main_url', 'device_scans.type', 'device_scans.created_at')
      .where('available_devices.device_app_id', transactionCode)
      .where('device_scans.type', 'basic-summary')
      .orderBy('device_scans.created_at', 'desc');

    if (!myScan) {
      myScan = await db('transactions_exchange')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('device_scans', 'device_scans.real_device_id', 'devices.id')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .first('device_scans.timestamp', 'device_scans.main_info', 'device_scans.main_url', 'device_scans.type', 'device_scans.created_at', 'imeis.imei')
        .where('available_devices.device_app_id', transactionCode)
        .where('device_scans.type', 'transactionCodeLockScan-summary')
        .orderBy('device_scans.created_at', 'desc');
      ownerScan = await db('transactions_exchange')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('device_scans', 'device_scans.real_device_id', 'devices.id')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .first('device_scans.timestamp', 'device_scans.main_info', 'device_scans.main_url', 'device_scans.type', 'device_scans.created_at')
        .where('available_devices.device_app_id', transactionCode)
        .where('device_scans.type', 'transaction-summary')
        .orderBy('device_scans.created_at', 'desc');
    }

    if (!myScan) {
      myScan = await db('transactions')
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .innerJoin('device_scans', 'device_scans.real_device_id', 'devices.id')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .first('device_scans.timestamp', 'device_scans.main_info', 'device_scans.main_url', 'device_scans.type', 'device_scans.created_at', 'imeis.imei')
        .where('available_devices.device_app_id', transactionCode)
        .where('device_scans.type', 'transactionCodeLockScan-summary')
        .orderBy('device_scans.created_at', 'desc');
      if (!myScan) {
        myScan = await db('transactions_exchange')
          .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
          .innerJoin('device_scans', 'device_scans.real_device_id', 'devices.id')
          .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
          .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
          .first('device_scans.timestamp', 'device_scans.main_info', 'device_scans.main_url', 'device_scans.type', 'device_scans.created_at', 'imeis.imei')
          .where('available_devices.device_app_id', transactionCode)
          .orderBy('device_scans.created_at', 'desc');
      }
    }

    if (myScan && ownerScan) {
      myScan.physical_grading = calculatePhysicalGrading(myScan.main_info.physicalGrading);
      ownerScan.physical_grading = calculatePhysicalGrading(ownerScan.main_info.physicalGrading);
    }

    return helper.showSuccessOk(res, { myScan, ownerScan });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const transactionBuyerAccept = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const { transactionCode } = req.body;

  const date = new Date();

  try {
    const { userId } = req;

    const buyer = await db('auth_users').first('email').where('id', userId);

    let order = await db('transactions')
      .first(
        'orders.id',
        'transactions.order_seller_id',
        'transactions.id as transaction_id',
        'auth_users.email as seller_email',
        'models.name as device_name',
        'capacities.value as capacity_name',
        'colors.name as color_name',
        'devices.id as device_id',
      )
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
      .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('available_devices.device_app_id', transactionCode)
      .orderBy('transactions.created_at', 'desc');

    if (!order) {
      order = await db('transactions_exchange')
        .first(
          'orders.id',
          'transactions_exchange.order_seller_id',
          'transactions_exchange.id as transaction_id',
          'auth_users.email as seller_email',
          'models.name as device_name',
          'capacities.value as capacity_name',
          'colors.name as color_name',
          'devices.id as device_id',
        )
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .where('available_devices.device_app_id', transactionCode)
        .orderBy('transactions_exchange.created_at', 'desc');
    }

    const notificationBuyer = {
      name: `${config.SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
      type: config.TRANSACTION,
      links: order.transaction_id,
      email: buyer.email,
      status: config.UNREAD,
      created_at: date,
      updated_at: date,
    };

    const notificationSeller = {
      name: `${config.SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
      type: config.TRANSACTION,
      links: order.transaction_id,
      email: order.seller_email,
      status: config.UNREAD,
      created_at: date,
      updated_at: date,
    };

    const transactionsSellNotAcceptRelated = await db('orders')
      .innerJoin('transactions', 'transactions.order_id', 'orders.id')
      .count('transactions.id', { as: 'count' })
      .where('transactions.status', '<>', config.BUYER_ACCEPT)
      .whereNotIn('transactions.id', [transactionCode])
      .where('orders.id', order.id)
      .first();

    const transactionsExchangeNotAcceptRelated = await db('orders_seller')
      .innerJoin('transactions_exchange', 'transactions_exchange.order_seller_id', 'orders_seller.id')
      .count('transactions_exchange.id', { as: 'count' })
      .where('transactions_exchange.type', config.SELLER)
      .where('transactions_exchange.status', '<>', config.BUYER_ACCEPT)
      .whereNotIn('transactions_exchange.id', [transactionCode])
      .where('orders_seller.order_id', order.id)
      .first();

    const countTransactionsNotAcceptRelated = Number(transactionsSellNotAcceptRelated.count)
      + Number(transactionsExchangeNotAcceptRelated.count);

    const transactionsSellNotAcceptRelatedSellers = await db('orders_seller')
      .innerJoin('transactions', 'transactions.order_seller_id', 'orders_seller.id')
      .count('transactions.id', { as: 'count' })
      .where('transactions.status', '<>', config.BUYER_ACCEPT)
      .whereNotIn('transactions.id', [transactionCode])
      .where('orders_seller.id', order.order_seller_id)
      .first();

    const transactionsExchangelNotAcceptRelatedSellers = await db('orders_seller')
      .innerJoin('transactions_exchange', 'transactions_exchange.order_seller_id', 'orders_seller.id')
      .count('transactions_exchange.id', { as: 'count' })
      .where('transactions_exchange.status', '<>', config.BUYER_ACCEPT)
      .whereNotIn('transactions_exchange.id', [transactionCode])
      .where('transactions_exchange.type', config.SELLER)
      .where('orders_seller.id', order.order_seller_id)
      .first();

    // eslint-disable-next-line max-len
    const countTransactionsNotAcceptRelatedSellers = Number(transactionsSellNotAcceptRelatedSellers.count)
      + Number(transactionsExchangelNotAcceptRelatedSellers.count);

    const listDeviceIds = [];
    if (countTransactionsNotAcceptRelated === 0) {
      const listDeviceIdsTransaction = await db('transactions')
        .select('device_id')
        .where('transactions.order_id', order.id)
        .orWhere('transactions.order_seller_id', order.id);

      const listDeviceIdsTransactionExchange = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .select('transactions_exchange.device_id')
        .where('transactions.order_id', order.id)
        .orWhere('transactions_exchange.order_seller_id', order.id);

      listDeviceIdsTransaction.map((device) => {
        if (!listDeviceIds.includes(device.device_id)) {
          listDeviceIds.push(device.device_id);
        }
      });
      listDeviceIdsTransactionExchange.map((device) => {
        if (!listDeviceIds.includes(device.device_id)) {
          listDeviceIds.push(device.device_id);
        }
      });
    }

    let totalGlobal = 0;
    let totalDingtoi = 0;
    let totalSeller = 0;
    let totalSellerReveice = 0;

    const orderSeller = await db('orders_seller').first().where('id', order.order_seller_id);

    if (countTransactionsNotAcceptRelated === 0) {
      const walletsGlobal = await db('auth_users').first('email', 'wallet').where('email', config.GLOBAL_USER);
      const walletGlobal = Number(walletsGlobal.wallet);
      const walletsDingtoi = await db('auth_users').first('email', 'wallet').where('email', config.DINGTOI_USER);
      const walletDingtoi = Number(walletsDingtoi.wallet);
      const walletsSeller = await db('auth_users').first('email', 'wallet').where('id', orderSeller.user_id);
      const walletSeller = Number(walletsSeller.wallet);

      totalGlobal = Number(walletGlobal) - Number(orderSeller.money);
      totalDingtoi = Number(walletDingtoi) + Number(orderSeller.money);
      totalSeller = Number(walletSeller) + Number(orderSeller.money);

      totalSellerReveice = Number(orderSeller.money);
    }

    await db.transaction(async (trx) => {
      await trx('transactions').update({
        status: config.BUYER_ACCEPT,
        questions: null,
        updated_at: date,
      }).where('id', order.transaction_id);
      await trx('transactions_exchange').update({
        status: config.BUYER_ACCEPT,
        questions: null,
        updated_at: date,
      }).where('id', order.transaction_id);
      if (countTransactionsNotAcceptRelated === 0) {
        await trx('orders').update({ status: config.COMPLETED }).where('orders.id', order.id);
      }
      if (countTransactionsNotAcceptRelatedSellers === 0) {
        await trx('orders_seller').update({ status: config.COMPLETED }).where('orders_seller.id', order.order_seller_id);
        await trx('available_devices').update({ device_app_id: null }).whereIn('device_id', listDeviceIds);
        await trx('auth_users').update({ wallet: totalGlobal }).where('email', config.GLOBAL_USER);
        await trx('auth_users').update({ wallet: totalDingtoi }).where('email', config.DINGTOI_USER);
        await trx('auth_users').update({ wallet: totalSeller }).where('id', orderSeller.user_id);
        await trx('payment_histories').insert({
          money: totalSellerReveice,
          type: config.RECEIVE,
          user_id: orderSeller.user_id,
          created_at: date,
          updated_at: date,
        });
      }

      const notBuyer = await trx('notifications').returning('id').insert(notificationBuyer);
      // eslint-disable-next-line prefer-destructuring
      notificationBuyer.id = notBuyer[0];
      const notSeller = await trx('notifications').returning('id').insert(notificationSeller);
      // eslint-disable-next-line prefer-destructuring
      notificationSeller.id = notSeller[0];
    });

    if (socket.connected) {
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notificationBuyer);
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const transactionBuyerReject = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const { transactionCode, questions } = req.body;

  const { userId } = req;

  const date = new Date();

  try {
    const buyer = await db('auth_users').first('email').where('id', userId);

    let order = await db('transactions')
      .first(
        'orders.id',
        'transactions.money',
        'transactions.type as transaction_type',
        'transactions.order_seller_id',
        'transactions.id as transaction_id',
        'auth_users.email as seller_email',
        'auth_users.id as seller_id',
        'models.name as device_name',
        'capacities.value as capacity_name',
        'colors.name as color_name',
        'devices.id as device_id',
      )
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
      .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('available_devices.device_app_id', transactionCode)
      .orderBy('transactions.created_at', 'desc');

    if (!order) {
      order = await db('transactions_exchange')
        .first(
          'orders.id',
          'transactions_exchange.order_seller_id',
          'transactions_exchange.id as transaction_id',
          'transactions_exchange.type as transaction_type',
          'auth_users.email as seller_email',
          'auth_users.id as seller_id',
          'models.name as device_name',
          'capacities.value as capacity_name',
          'colors.name as color_name',
          'devices.id as device_id',
        )
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .where('available_devices.device_app_id', transactionCode)
        .orderBy('transactions_exchange.created_at', 'desc');
    }

    const notificationBuyer = {
      name: `${config.SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
      type: config.TRANSACTION,
      links: order.transaction_id,
      email: buyer.email,
      status: config.UNREAD,
      created_at: date,
      updated_at: date,
    };

    const notificationSeller = {
      name: `${config.SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
      type: config.TRANSACTION,
      links: order.transaction_id,
      email: order.seller_email,
      status: config.UNREAD,
      created_at: date,
      updated_at: date,
    };

    const transactionsSellNotAcceptRelated = await db('orders')
      .innerJoin('transactions', 'transactions.order_id', 'orders.id')
      .count('transactions.id', { as: 'count' })
      .where('transactions.status', '<>', config.BUYER_ACCEPT)
      .whereNotIn('transactions.id', [transactionCode])
      .where('orders.id', order.id)
      .first();

    const transactionsExchangeNotAcceptRelated = await db('orders_seller')
      .innerJoin('transactions_exchange', 'transactions_exchange.order_seller_id', 'orders_seller.id')
      .count('transactions_exchange.id', { as: 'count' })
      .where('transactions_exchange.type', config.SELLER)
      .where('transactions_exchange.status', '<>', config.BUYER_ACCEPT)
      .whereNotIn('transactions_exchange.id', [transactionCode])
      .where('orders_seller.order_id', order.id)
      .first();

    const countTransactionsNotAcceptRelated = Number(transactionsSellNotAcceptRelated.count)
      + Number(transactionsExchangeNotAcceptRelated.count);

    const transactionsSellNotAcceptRelatedSellers = await db('orders_seller')
      .innerJoin('transactions', 'transactions.order_seller_id', 'orders_seller.id')
      .count('transactions.id', { as: 'count' })
      .where('transactions.status', '<>', config.BUYER_ACCEPT)
      .whereNotIn('transactions.id', [transactionCode])
      .where('orders_seller.id', order.id)
      .first();

    // eslint-disable-next-line max-len
    const countTransactionsNotAcceptRelatedSellers = Number(transactionsSellNotAcceptRelatedSellers.count);

    const listDeviceIds = [];
    if (countTransactionsNotAcceptRelated === 0) {
      const listDeviceIdsTransaction = await db('transactions')
        .select('device_id')
        .where('transactions.order_id', order.id)
        .orWhere('transactions.order_seller_id', order.id);

      const listDeviceIdsTransactionExchange = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .select('transactions_exchange.device_id')
        .where('transactions.order_id', order.id)
        .orWhere('transactions_exchange.order_seller_id', order.id);

      listDeviceIdsTransaction.map((device) => {
        if (!listDeviceIds.includes(device.device_id)) {
          listDeviceIds.push(device.device_id);
        }
      });
      listDeviceIdsTransactionExchange.map((device) => {
        if (!listDeviceIds.includes(device.device_id)) {
          listDeviceIds.push(device.device_id);
        }
      });
    }

    await db.transaction(async (trx) => {
      await trx('transactions').update({
        status: config.BUYER_REJECTED,
        questions,
        updated_at: date,
      }).where('id', transactionCode);
      await trx('transactions_exchange').update({
        status: config.BUYER_REJECTED,
        questions,
        updated_at: date,
      }).where('id', transactionCode);

      const notBuyer = await trx('notifications').returning('id').insert(notificationBuyer);
      // eslint-disable-next-line prefer-destructuring
      notificationBuyer.id = notBuyer[0];
      const notSeller = await trx('notifications').returning('id').insert(notificationSeller);
      // eslint-disable-next-line prefer-destructuring
      notificationSeller.id = notSeller[0];
      if (countTransactionsNotAcceptRelated === 0) {
        await trx('orders').update({
          status: config.BUYER_REJECTED,
          updated_at: date,
        }).where('orders.id', order.id);
      }
      if (countTransactionsNotAcceptRelatedSellers === 0) {
        await trx('orders_seller').update({
          status: config.BUYER_REJECTED,
          updated_at: date,
        }).where('orders_seller.id', order.order_seller_id);
      }
    });

    if (socket.connected) {
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notificationBuyer);
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const transactionProcess = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const { step, timeout, transactionId } = req.body;

  const { userId } = req;

  try {
    const user = await db('auth_users').first('email').where('id', userId);

    const notification = {
      name: config.TRANSACTION_PROCESS_STATUS.QR_CODE,
      type: config.TRANSACTION_PROCESS,
      email: user.email,
      timeout,
      step,
      transactionId,
    };

    if (socket.connected) {
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notification);
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};
