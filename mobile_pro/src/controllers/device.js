/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable array-callback-return */
/* eslint-disable no-loop-func */
/* eslint-disable no-restricted-syntax */
/* eslint-disable global-require */
import path from 'path';
import fs from 'fs';
import { v1 as uuidv1 } from 'uuid';
import helper from 'micro-helper';
import db from '../adapters/db';
import config from '../config';
import socket from '../adapters/socket';
import { calculatePhysicalGrading } from '../functions';
import { queryTransactionAvailable, queryTransactionExchangeAvailable } from '../services';

import appleList from '../../assets/apple';

export const getDeviceScan = async (req, res) => {
  try {
    const {
      id,
    } = req.params;
    if (!id) {
      return helper.showServerError(res, helper.ERR_COMMON);
    }
    const deviceScan = await db('device_scans')
      .innerJoin('devices', 'devices.id', 'device_scans.real_device_id')
      .first('device_scans.*', 'devices.physical_grading')
      .where('device_scans.id', id);
    if (!deviceScan) {
      return res.status(500).json({
        obj: config.ERR_NOT_EXISTS,
      });
    }
    return helper.showSuccessOk(res, deviceScan);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const getDeviceInfoIOS = async (req, res) => {
  const { value } = req.body;
  if (appleList[value]) {
    return helper.showSuccessOk(res, appleList[value]);
  }
  return helper.showSuccessOk(res, {
    model: value,
    processor: 'ios',
    systemFeatures: ['ios.hardware.face', 'ios.hardware.microphone'],
  });
};

const checkTransactionQrCodeBuyer = async (req, res) => {
  const { transactionCode, email } = req.body;

  try {
    const user = await db('auth_users').first('id').where('email', email);
    if (!user) {
      return helper.showServerError(res, '');
    }

    const transaction = await queryTransactionAvailable(user, transactionCode);
    const transactionExchange = await queryTransactionExchangeAvailable(user, transactionCode);

    const trc = transaction || transactionExchange;
    if (!trc) {
      const tvc = await db('transactions').first().where('id', transactionCode);
      const tvcEx = await db('transactions_exchange').first().where('id', transactionCode);

      const tv = tvc || tvcEx;
      if (!tv) {
        return helper.showSuccessOk(res, config.IS_NORMAL);
      }
      if (tv.status !== config.BUYER_RECEIVED) {
        return helper.showSuccessOk(res, config.IS_NORMAL);
      }
      return helper.showSuccessOk(res, config.IS_LOCKED);
    }
    if (trc.status !== config.BUYER_RECEIVED) {
      return helper.showSuccessOk(res, config.IS_NORMAL);
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const checkTransactionQrCode = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const { transactionCode, email } = req.body;
  const { userId } = req;

  try {
    const userWeb = await db('auth_users').first('id').where('email', email);
    if (!userWeb) {
      return res.status(500).json({
        obj: config.ERR_TRANSACTION_AUTHORIZED,
      });
    }
    if (userWeb.id !== userId) {
      return res.status(500).json({
        obj: config.ERR_TRANSACTION_AUTHORIZED,
      });
    }

    let user = await db('transactions')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .first('devices.user_id as seller_id', 'orders.user_id as buyer_id')
      .where('transactions.id', transactionCode)
      .where('devices.user_id', userId);

    if (!user) {
      user = await db('transactions_exchange')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .first('devices.user_id as seller_id', 'orders_seller.user_id as buyer_id')
        .where('transactions_exchange.id', transactionCode)
        .where('devices.user_id', userId);
    }

    if (!user) {
      return res.status(500).json({
        obj: config.ERR_TRANSACTION_AUTHORIZED,
      });
    }

    if (user.seller_id !== userWeb.id) {
      return res.status(500).json({
        obj: config.ERR_TRANSACTION_AUTHORIZED,
      });
    }

    const transaction = await db('transactions')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .first('transactions.status', 'transactions.transaction_code', 'imeis.imei', 'devices.physical_grading')
      .where('devices.user_id', user.seller_id)
      .where('transactions.id', transactionCode);

    const transactionExchange = await db('transactions_exchange')
      .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
      .first('transactions_exchange.status', 'transactions_exchange.transaction_code', 'imeis.imei', 'devices.physical_grading')
      .where('orders_seller.user_id', user.buyer_id)
      .where('transactions_exchange.id', transactionCode);

    if (!transaction && !transactionExchange) {
      return res.status(500).json({
        obj: config.ERR_TRANSACTION_AUTHORIZED,
      });
    }

    const trans = transaction || transactionExchange;
    if (trans.status === config.OWNER_SCANNED) {
      return res.status(500).json({
        obj: config.ERR_TRANSACTION_AUTHORIZED,
      });
    }

    return helper.showSuccessOk(res, trans);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const scanningHistoryDetail = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }
  try {
    const { id } = req.params;
    if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

    const detail = await db('device_scans').first('*').where('id', id);
    if (!detail) return helper.showClientBadRequest(res, 'DEVICE_NOT_EXISTS');

    return helper.showSuccessOk(res, detail);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const summaryRealDeviceReport = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }
  try {
    const {
      mainInfo, type, id,
    } = req.body;
    if (!mainInfo || !type || !id) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const { physicalGrading } = JSON.parse(mainInfo);
    if (!physicalGrading) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const device = await db('device_scans').first('real_device_id').where('id', id);
    if (!device) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    const physicalGradingStr = calculatePhysicalGrading(physicalGrading);
    const date = new Date();

    const { userId } = req;
    const deviceWeb = await db('devices')
      .first(
        'devices.id',
        'devices.user_id',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
      )
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('devices.id', device.real_device_id);
    const user = await db('auth_users').first('email').where('id', userId);

    const notification = {
      name: `${config.SCANNED_POSTED_DEVICE}&${deviceWeb.model} - ${deviceWeb.capacity} GB - ${deviceWeb.color}`,
      type: config.DINGTOI_PRO_APP_POSTED,
      links: `/my-devices/${device.real_device_id}`,
      email: user.email,
      status: config.UNREAD,
      created_at: date,
      updated_at: date,
    };

    await db.transaction(async (trx) => {
      await db('device_scans').update({
        main_info: mainInfo,
        type,
        updated_at: date,
      }).where('id', id).transacting(trx);
      await db('devices').update({
        physical_grading: physicalGradingStr,
        updated_at: date,
        // must repair POSTED
        // status: WAITING_FOR_APPROVAL,
        status: config.POSTED,
      }).where('id', device.real_device_id).transacting(trx);
      await db('available_devices').update({
        updated_at: date,
        device_scan_id: id,
      }).where('device_id', device.real_device_id).transacting(trx);

      const not = await trx('notifications').returning('id').insert(notification);
      // eslint-disable-next-line prefer-destructuring
      notification.id = not[0];
    });

    if (socket.connected) {
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notification);
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const ownerScanAccept = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }
  try {
    const {
      transactionCode,
    } = req.body;

    const { userId } = req;

    let orderType = config.ORDER.SELLER;

    const owner = await db('auth_users').first('email').where('id', userId);

    let device = await db('transactions')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .first(
        'devices.id',
        'auth_users.email',
        'devices.user_id',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
        'transactions.id as transaction_id',
        'orders.id as order_id',
        'orders_seller.id as order_seller_id',
        'transactions.type as transaction_type',
      )
      .where('transactions.id', transactionCode)
      .where('devices.user_id', userId);

    if (!device) {
      orderType = config.ORDER.BUYER;
      device = await db('transactions_exchange')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .innerJoin('auth_users', 'auth_users.id', 'orders_seller.user_id')
        .first(
          'orders_seller.id as order_seller_id',
          'devices.id',
          'auth_users.email',
          'devices.user_id',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'transactions_exchange.id as transaction_id',
          'transactions_exchange.type as transaction_type',
        )
        .where('transactions_exchange.id', transactionCode)
        .where('devices.user_id', userId);
    }

    const date = new Date();
    const notification = {
      name: `${config.SCANNED_OWNER_DEVICE}&${device.model} - ${device.capacity} GB - ${device.color}`,
      type: config.TRANSACTION,
      links: device.transaction_id,
      email: device.email,
      status: config.UNREAD,
      created_at: date,
      updated_at: date,
    };

    const notificationOwner = {
      name: `${config.SCANNED_OWNER_DEVICE}&${device.model} - ${device.capacity} GB - ${device.color}`,
      type: config.TRANSACTION,
      links: device.transaction_id,
      email: owner.email,
      status: config.UNREAD,
      created_at: date,
      updated_at: date,
    };

    // let countTransactionsSellOwnersNotScanned = 0;
    // let countTransactionsExchangeOwnersNotScanned = 0;
    // let totalNotPayShipping = 0;

    if (orderType === config.ORDER.SELLER) {
      // countTransactionsSellOwnersNotScanned = await db('transactions')
      //   .innerJoin('orders', 'orders.id', 'transactions.order_id')
      //   .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      //   .count('transactions.id', { as: 'count' })
      //   .where('transactions.order_seller_id', device.order_seller_id)
      //   .whereNotNull('orders.charge_stripe')
      //   .where('transactions.status', config.CREATED)
      //   .where('transactions.type', device.transaction_type)
      //   .whereNotIn('transactions.id', [device.transaction_id])
      //   .first();

      // totalNotPayShipping = Number(countTransactionsSellOwnersNotScanned.count);
      // const shippo = require('shippo')(process.env.SHIPPO_TOKEN);
      // if (totalNotPayShipping === 0) {
      //   const transactionsRelated = await db('transactions').select()
      //     .where('order_id', device.order_id)
      //     .where('transactions.order_seller_id', device.order_seller_id)
      //     .where('transactions.type', device.transaction_type);
      //   for (let i = 0; i < transactionsRelated.length; i++) {
      //     const transactionRelated = transactionsRelated[i];
      //     const shippingRateBuyerTemp = transactionRelated.shipping_rate_buyer;
      //     if (shippingRateBuyerTemp.selectedRate) {
      //       const shipResult = await shippo.transaction.create({
      //         rate: shippingRateBuyerTemp.selectedRate.object_id,
      //         label_file_type: 'PDF',
      //         async: false,
      //       });
      //       shippingRateBuyerTemp.selectedRatePaid = shipResult;
      //       if (device.transaction_type === config.GROUP) {
      //         await db('transactions').update({
      //           shipping_rate_seller: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       } else {
      //         await db('transactions').update({
      //           shipping_rate_buyer: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       }
      //     }
      //     if (shippingRateBuyerTemp.selectedRateExchange) {
      //       const shipResult = await shippo.transaction.create({
      //         rate: shippingRateBuyerTemp.selectedRateExchange.object_id,
      //         label_file_type: 'PDF',
      //         async: false,
      //       });
      //       shippingRateBuyerTemp.selectedRatePaidExchange = shipResult;
      //       if (device.transaction_type === config.GROUP) {
      //         await db('transactions').update({
      //           shipping_rate_seller: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       } else {
      //         await db('transactions').update({
      //           shipping_rate_buyer: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       }
      //     }
      //   }
      // }
    } else {
      // countTransactionsExchangeOwnersNotScanned = await db('transactions_exchange')
      //   .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      //   .innerJoin('orders', 'orders.id', 'transactions.order_id')
      //   .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
      //   .count('transactions_exchange.id', { as: 'count' })
      //   .where('transactions_exchange.order_seller_id', device.order_seller_id)
      //   .whereNotNull('orders.charge_stripe')
      //   .where('transactions_exchange.status', config.CREATED)
      //   .whereNotIn('transactions_exchange.id', [device.transaction_id])
      //   .where('transactions_exchange.type', config.SELLER)
      //   .first();

      // totalNotPayShipping = Number(countTransactionsExchangeOwnersNotScanned.count);
      // const shippo = require('shippo')(process.env.SHIPPO_TOKEN);
      // if (totalNotPayShipping === 0) {
      //   const transactionsRelated = await db('transactions').select()
      //     .where('order_seller_id', device.order_seller_id)
      //     .where('transactions.type', config.GROUP);
      //   for (let i = 0; i < transactionsRelated.length; i++) {
      //     const transactionRelated = transactionsRelated[i];
      //     const shippingRateBuyerTemp = transactionRelated.shipping_rate_buyer;
      //     if (shippingRateBuyerTemp.selectedRate) {
      //       const shipResult = await shippo.transaction.create({
      //         rate: shippingRateBuyerTemp.selectedRate.object_id,
      //         label_file_type: 'PDF',
      //         async: false,
      //       });
      //       shippingRateBuyerTemp.selectedRatePaid = shipResult;
      //       if (device.transaction_type === config.GROUP) {
      //         await db('transactions').update({
      //           shipping_rate_seller: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       } else {
      //         await db('transactions').update({
      //           shipping_rate_buyer: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       }
      //     }
      //     if (shippingRateBuyerTemp.selectedRateExchange) {
      //       const shipResult = await shippo.transaction.create({
      //         rate: shippingRateBuyerTemp.selectedRateExchange.object_id,
      //         label_file_type: 'PDF',
      //         async: false,
      //       });
      //       shippingRateBuyerTemp.selectedRatePaidExchange = shipResult;
      //       if (device.transaction_type === config.GROUP) {
      //         await db('transactions').update({
      //           shipping_rate_seller: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       } else {
      //         await db('transactions').update({
      //           shipping_rate_buyer: shippingRateBuyerTemp,
      //         }).where('id', transactionRelated.id);
      //       }
      //     }
      //   }
      // }
    }

    await db.transaction(async (trx) => {
      await trx('available_devices').update({
        device_app_id: transactionCode,
      }).where('device_id', device.id);
      await trx('transactions').update({
        status: config.OWNER_SCANNED,
        updated_at: date,
      }).where('id', device.transaction_id);
      await trx('transactions_exchange').update({
        status: config.OWNER_SCANNED,
        updated_at: date,
      }).where('id', device.transaction_id);
      const not = await trx('notifications').returning('id').insert(notification);
      // eslint-disable-next-line prefer-destructuring
      notification.id = not[0];

      const notOwner = await trx('notifications').returning('id').insert(notificationOwner);
      // eslint-disable-next-line prefer-destructuring
      notificationOwner.id = notOwner[0];
    });

    if (socket.connected) {
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notification);
      socket.emit(config.SOCKET_NOTIFICATION_MESSAGE, notificationOwner);
    }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const summaryTransactionWebReport = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }
  try {
    const {
      mainInfo, type, id,
    } = req.body;
    if (!mainInfo || !type || !id) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const { physicalGrading } = JSON.parse(mainInfo);
    if (!physicalGrading) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const device = await db('device_scans').first('real_device_id').where('id', id);
    if (!device) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }

    const physicalGradingStr = calculatePhysicalGrading(physicalGrading);
    const date = new Date();

    await db.transaction(async (trx) => {
      await trx('device_scans').update({
        main_info: mainInfo,
        type,
        updated_at: date,
      }).where('id', id);
      await trx('devices').update({
        physical_grading: physicalGradingStr,
        updated_at: date,
      }).where('id', device.real_device_id);
      await trx('available_devices').update({
        updated_at: date,
        device_scan_id: id,
      }).where('device_id', device.real_device_id);
    });

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const checkDevice = async (req, res) => {
  try {
    const {
      deviceId,
    } = req.body;
    if (!deviceId) {
      return helper.showServerError(res, helper.ERR_COMMON);
    }
    const device = await db('devices').first('id').where('id', deviceId);
    if (!device) {
      return res.status(500).json({
        obj: config.ERR_NOT_EXISTS,
      });
    }
    return helper.showSuccessOk(res, device);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const confirmReport = async (req, res) => {
  const { ERR_BAD_REQUEST } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }
  try {
    const {
      timestamp, email, mainInfo, type, mainUrl, deviceId, realDeviceId, transactionCode,
    } = req.body;
    if (!timestamp || !email || !mainInfo || !type || !mainUrl || !deviceId) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    const user = await db('auth_users').first('id').where('email', email);
    if (!user) return helper.showClientBadRequest(res, helper.ERR_COMMON);
    const userId = user.id;
    const id = uuidv1();
    const date = new Date();
    let rdi = realDeviceId;
    let device = '';

    if (type === config.TYPE_OWNER_SCAN || type === config.TYPE_BUYER_COMPLETE_SCAN) {
      device = await db('transactions')
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .first('devices.id')
        .where('transactions.id', transactionCode);
      if (!device) {
        device = await db('transactions_exchange')
          .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
          .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
          .first('devices.id')
          .where('transactions_exchange.id', transactionCode);
      }
      rdi = device.id;
    }

    await db.transaction(async (trx) => {
      await db('device_scans').insert({
        id,
        timestamp,
        auth_user_id: userId,
        main_info: mainInfo,
        type,
        main_url: mainUrl,
        device_id: deviceId,
        real_device_id: rdi || null,
        created_at: date,
        updated_at: date,
      }, 'id').transacting(trx);
    });
    return helper.showSuccessOk(res, id);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const uploadImage = async (req, res) => {
  try {
    return res.json({ done: true, url: req.file.path });
  } catch (error) {
    return res.status(500).json({ done: error });
  }
};

const saveComment = async (req, res) => {
  const { id, comment } = req.body;
  if (!id) {
    return res.status(422).json({ message: 'id must provided' });
  }
  if (!comment) {
    return res.status(422).json({ message: 'comment must provided' });
  }
  const { ERR_BAD_REQUEST, ERR_USAGE } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const date = new Date();
  try {
    await db('device_scans').update({
      comment,
      updated_at: date,
    }).where('id', id);

    return res.json({ done: true });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const physicalUpdate = async (req, res) => {
  // eslint-disable-next-line camelcase
  const { id, type, main_info } = req.body;
  if (!id) {
    return res.status(422).json({ message: 'id must provided' });
  }
  // eslint-disable-next-line camelcase
  if (!main_info) {
    return res.status(422).json({ message: 'main info must provided' });
  }
  if (!type) {
    return res.status(422).json({ message: 'type must provided' });
  }

  const { ERR_BAD_REQUEST, ERR_USAGE } = config;
  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const date = new Date();
  try {
    await db('device_scans').update({
      type,
      main_info,
      updated_at: date,
    }).where('id', id);

    return res.json({ done: true });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const summaryReport = async (req, res) => {
  const {
    // eslint-disable-next-line camelcase
    timestamp, main_info, type, main_url, device_id,
  } = req.body;
  const { ERR_BAD_REQUEST, ERR_USAGE } = config;
  if (!timestamp) {
    return res.status(422).json({ message: 'timestamp must provided' });
  }
  // eslint-disable-next-line camelcase
  if (!main_info) {
    return res.status(422).json({ message: 'main info must provided' });
  }
  if (!type) {
    return res.status(422).json({ message: 'type must provided' });
  }
  // eslint-disable-next-line camelcase
  if (!main_url) {
    return res.status(422).json({ message: 'main URL must provided' });
  }
  // eslint-disable-next-line camelcase
  if (!device_id) {
    return res.status(422).json({ message: 'device id must provided' });
  }

  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const { userId } = req;
  const id = uuidv1();
  const date = new Date();

  try {
    await db('device_scans').insert({
      id,
      auth_user_id: userId,
      timestamp,
      main_info,
      type,
      main_url,
      created_at: date,
      updated_at: date,
      device_id,
    });

    return res.json({ done: true, id });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const androidDevices = async (req, res) => {
  const { model } = req.body;
  const { ERR_USAGE } = config;
  if (!model) {
    return res.status(422).json({ message: 'Model must provided' });
  }

  try {
    const file = path.resolve('assets', 'samsung.json');

    let samsungList = fs.readFileSync(file, 'utf8');
    samsungList = JSON.parse(samsungList);

    const arr = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < samsungList.length; i++) {
      const item = samsungList[i];
      if (item.modelVersion.toLowerCase().includes(model.toLowerCase())) {
        arr.push(item);
      }
    }
    return res.json({ done: true, list: arr });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const historyScans = async (req, res) => {
  // eslint-disable-next-line camelcase
  const { unique_id } = req.body;
  // eslint-disable-next-line camelcase
  if (!unique_id) {
    return res.status(422).json({ message: 'unique id must provided' });
  }
  const { ERR_BAD_REQUEST, ERR_USAGE } = config;

  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  const { userId } = req;

  try {
    const rows = await db('device_scans')
      .select('id', 'timestamp', 'type')
      .where('auth_user_id', userId)
      .andWhere('device_id', unique_id)
      .orderBy('created_at', 'DESC');

    return res.json({ done: true, list: rows });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

const historyScan = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(422).json({ message: 'id must provided' });
  }
  const { ERR_BAD_REQUEST, ERR_USAGE, ERR_NOT_EXISTS } = config;

  if (!req.login) {
    return res.status(400).json(ERR_BAD_REQUEST);
  }

  try {
    const row = await db('device_scans').select('*').where('id', id).first();
    if (!row) {
      return res.status(500).json({ done: ERR_NOT_EXISTS });
    }

    return res.json({ done: true, detail: row });
  } catch (error) {
    return res.status(500).json({ done: ERR_USAGE });
  }
};

export default {
  historyScans,
  historyScan,
  androidDevices,
  uploadImage,
  summaryReport,
  physicalUpdate,
  saveComment,
  scanningHistoryDetail,
  summaryRealDeviceReport,
  confirmReport,
  checkDevice,
  checkTransactionQrCode,
  checkTransactionQrCodeBuyer,
  summaryTransactionWebReport,
  ownerScanAccept,
};
