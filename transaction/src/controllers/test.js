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
import socket from '../adapters/socket';
import { BUYER_ACCEPT, BUYER_REJECTED, COMPLETED, DINGTOI_USER, GLOBAL_USER, ORDER_BUYER, ORDER_SELLER, OWNER_SCANNED, SCANNED_OWNER_DEVICE, SELLER, SOCKET_NOTIFICATION_MESSAGE } from '../config';


export const testScanTransactionBuyerReject = async (req, res) => {
    if (!req.login) {
        return res.status(400).json('Bad Request');
    }

    const { transactionCode } = req.body;
    let questions = [
        { 'id': '1', 'name': 'Device Scan is not right' },
        { 'id': '2', 'name': 'Physical Device is not the same as before' }
    ];
    questions = JSON.stringify(questions);


    const { userId } = req;

    const date = new Date();

    try {
        const buyer = await db('auth_users').first('email').where('id', userId);
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
            name: `${SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
            type: 'TRANSACTION',
            links: order.transaction_id,
            email: buyer.email,
            status: 'UNREAD',
            created_at: date,
            updated_at: date,
        };

        const notificationSeller = {
            name: `${SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
            type: 'TRANSACTION',
            links: order.transaction_id,
            email: order.seller_email,
            status: 'UNREAD',
            created_at: date,
            updated_at: date,
        };

        const transactionsSellNotAcceptRelated = await db('orders')
            .innerJoin('transactions', 'transactions.order_id', 'orders.id')
            .count('transactions.id', { as: 'count' })
            .where('transactions.status', '<>', BUYER_ACCEPT)
            .whereNotIn('transactions.id', [transactionCode])
            .where('orders.id', order.id)
            .first();

        const transactionsExchangeNotAcceptRelated = await db('orders_seller')
            .innerJoin('transactions_exchange', 'transactions_exchange.order_seller_id', 'orders_seller.id')
            .count('transactions_exchange.id', { as: 'count' })
            .where('transactions_exchange.type', SELLER)
            .where('transactions_exchange.status', '<>', BUYER_ACCEPT)
            .whereNotIn('transactions_exchange.id', [transactionCode])
            .where('orders_seller.order_id', order.id)
            .first();

        const countTransactionsNotAcceptRelated = Number(transactionsSellNotAcceptRelated.count)
            + Number(transactionsExchangeNotAcceptRelated.count);

        const transactionsSellNotAcceptRelatedSellers = await db('orders_seller')
            .innerJoin('transactions', 'transactions.order_seller_id', 'orders_seller.id')
            .count('transactions.id', { as: 'count' })
            .where('transactions.status', '<>', BUYER_ACCEPT)
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
                status: BUYER_REJECTED,
                questions,
                updated_at: date,
            }).where('id', transactionCode);
            await trx('transactions_exchange').update({
                status: BUYER_REJECTED,
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
                    status: BUYER_REJECTED,
                    updated_at: date,
                }).where('orders.id', order.id);
            }
            if (countTransactionsNotAcceptRelatedSellers === 0) {
                await trx('orders_seller').update({
                    status: BUYER_REJECTED,
                    updated_at: date,
                }).where('orders_seller.id', order.order_seller_id);
            }

            const deviceScanId = uuidv1();
            await trx('device_scans').insert({
                main_info: {
                    "wifi": "y",
                    "brand": "Samsung",
                    "flash": "y",
                    "model": "Samsung Galaxy J7 Prime",
                    "camera": "y",
                    "faceID": "nothave",
                    "finger": "y",
                    "volume": "y",
                    "storage": "32GB",
                    "released": "8.1.0",
                    "bluetooth": "y",
                    "processor": "samsungexynos7870",
                    "touch_url": "https://res.cloudinary.com/deeucfdkq/image/upload/v1615880481/lu5no0qj3ndocjbd6rgu.png",
                    "microphone": "y",
                    "storageUsed": "19GB",
                    "textInbound": "y",
                    "touchscreen": "n",
                    "pointScanner": 20,
                    "scannerPoint": 20,
                    "textOutbound": "y",
                    "voiceInbound": "y",
                    "blacklistType": "not_verified",
                    "diamondRating": 3,
                    "voiceOutbound": "y",
                    "blacklistStatus": "Not Verified",
                    "physicalGrading": 50,
                    "url_summary_report": "https://res.cloudinary.com/deeucfdkq/image/upload/v1615880496/u0j8tckbbctyg0m7u1al.png"
                },
                auth_user_id: userId,
                timestamp: date,
                id: deviceScanId,
                real_device_id: device.id,
                created_at: date,
                updated_at: date,
                device_id: 'fa59bbac-1a7a-4a73-b18f-84f2a44e200c',
                main_url: 'https://res.cloudinary.com/deeucfdkq/image/upload/v1616397664/pb6mzqrqjutijdcaitnb.png',
                type: 'transactionCodeLockScan-summary'
            });

            await trx('available_devices').update({
                device_scan_id: deviceScanId
            }).where('device_id', device.id);

            await trx('open_disputes').insert({
                module_type: 'transaction',
                module_uuid: transactionCode,
                question: questions,
                created_at: date,
                updated_at: date,
                status: 'OPEN'
            });
        });

        if (socket.connected) {
            socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationBuyer);
            socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
        }

        return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
        console.log(error);
        return helper.showServerError(res, error);
    }
};

export const testScanTransactionBuyerConfirm = async (req, res) => {
    if (!req.login) {
        return res.status(400).json('Bad Request');
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
            name: `${SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
            type: 'TRANSACTION',
            links: order.transaction_id,
            email: buyer.email,
            status: 'UNREAD',
            created_at: date,
            updated_at: date,
        };

        const notificationSeller = {
            name: `${SCANNED_OWNER_DEVICE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
            type: 'TRANSACTION',
            links: order.transaction_id,
            email: order.seller_email,
            status: 'UNREAD',
            created_at: date,
            updated_at: date,
        };

        const transactionsSellNotAcceptRelated = await db('orders')
            .innerJoin('transactions', 'transactions.order_id', 'orders.id')
            .count('transactions.id', { as: 'count' })
            .where('transactions.status', '<>', BUYER_ACCEPT)
            .whereNotIn('transactions.id', [transactionCode])
            .where('orders.id', order.id)
            .first();

        const transactionsExchangeNotAcceptRelated = await db('orders_seller')
            .innerJoin('transactions_exchange', 'transactions_exchange.order_seller_id', 'orders_seller.id')
            .count('transactions_exchange.id', { as: 'count' })
            .where('transactions_exchange.type', SELLER)
            .where('transactions_exchange.status', '<>', BUYER_ACCEPT)
            .whereNotIn('transactions_exchange.id', [transactionCode])
            .where('orders_seller.order_id', order.id)
            .first();

        const countTransactionsNotAcceptRelated = Number(transactionsSellNotAcceptRelated.count)
            + Number(transactionsExchangeNotAcceptRelated.count);

        const transactionsSellNotAcceptRelatedSellers = await db('orders_seller')
            .innerJoin('transactions', 'transactions.order_seller_id', 'orders_seller.id')
            .count('transactions.id', { as: 'count' })
            .where('transactions.status', '<>', BUYER_ACCEPT)
            .whereNotIn('transactions.id', [transactionCode])
            .where('orders_seller.id', order.order_seller_id)
            .first();

        const transactionsExchangelNotAcceptRelatedSellers = await db('orders_seller')
            .innerJoin('transactions_exchange', 'transactions_exchange.order_seller_id', 'orders_seller.id')
            .count('transactions_exchange.id', { as: 'count' })
            .where('transactions_exchange.status', '<>', BUYER_ACCEPT)
            .whereNotIn('transactions_exchange.id', [transactionCode])
            .where('transactions_exchange.type', SELLER)
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
            const walletsGlobal = await db('auth_users').first('email', 'wallet').where('email', GLOBAL_USER);
            const walletGlobal = Number(walletsGlobal.wallet);
            const walletsDingtoi = await db('auth_users').first('email', 'wallet').where('email', DINGTOI_USER);
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
                status: BUYER_ACCEPT,
                questions: null,
                updated_at: date,
            }).where('id', order.transaction_id);
            await trx('transactions_exchange').update({
                status: BUYER_ACCEPT,
                questions: null,
                updated_at: date,
            }).where('id', order.transaction_id);
            if (countTransactionsNotAcceptRelated === 0) {
                await trx('orders').update({ status: COMPLETED }).where('orders.id', order.id);
            }
            if (countTransactionsNotAcceptRelatedSellers === 0) {
                await trx('orders_seller').update({ status: COMPLETED }).where('orders_seller.id', order.order_seller_id);
                await trx('available_devices').update({ device_app_id: null }).whereIn('device_id', listDeviceIds);
                await trx('auth_users').update({ wallet: totalGlobal }).where('email', GLOBAL_USER);
                await trx('auth_users').update({ wallet: totalDingtoi }).where('email', DINGTOI_USER);
                await trx('auth_users').update({ wallet: totalSeller }).where('id', orderSeller.user_id);
                await trx('payment_histories').insert({
                    money: totalSellerReveice,
                    type: 'RECEIVE',
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
            socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationBuyer);
            socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
        }

        return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
        return helper.showServerError(res, error);
    }
};

export const testScanTransactionSellerConfirm = async (req, res) => {
    if (!req.login) {
        return res.status(400).json('Bad Request');
    }
    try {
        const {
            transactionCode,
        } = req.body;

        const { userId } = req;

        let orderType = ORDER_SELLER;

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
            orderType = ORDER_BUYER;
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
            name: `${SCANNED_OWNER_DEVICE}&${device.model} - ${device.capacity} GB - ${device.color}`,
            type: 'TRANSACTION',
            links: device.transaction_id,
            email: device.email,
            status: 'UNREAD',
            created_at: date,
            updated_at: date,
        };

        const notificationOwner = {
            name: `${SCANNED_OWNER_DEVICE}&${device.model} - ${device.capacity} GB - ${device.color}`,
            type: 'TRANSACTION',
            links: device.transaction_id,
            email: owner.email,
            status: 'UNREAD',
            created_at: date,
            updated_at: date,
        };

        // let countTransactionsSellOwnersNotScanned = 0;
        // let countTransactionsExchangeOwnersNotScanned = 0;
        // let totalNotPayShipping = 0;

        if (orderType === ORDER_SELLER) {
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
                status: OWNER_SCANNED,
                updated_at: date,
            }).where('id', device.transaction_id);
            await trx('transactions_exchange').update({
                status: OWNER_SCANNED,
                updated_at: date,
            }).where('id', device.transaction_id);
            const not = await trx('notifications').returning('id').insert(notification);
            // eslint-disable-next-line prefer-destructuring
            notification.id = not[0];

            const notOwner = await trx('notifications').returning('id').insert(notificationOwner);
            // eslint-disable-next-line prefer-destructuring
            notificationOwner.id = notOwner[0];

            const deviceScanId = uuidv1();
            await trx('device_scans').insert({
                main_info: {
                    "wifi": "y",
                    "brand": "Samsung",
                    "flash": "y",
                    "model": "Samsung Galaxy J7 Prime",
                    "camera": "y",
                    "faceID": "nothave",
                    "finger": "y",
                    "volume": "y",
                    "storage": "32GB",
                    "released": "8.1.0",
                    "bluetooth": "y",
                    "processor": "samsungexynos7870",
                    "touch_url": "https://res.cloudinary.com/deeucfdkq/image/upload/v1616397644/dzd1motq6awziw63vntq.png",
                    "microphone": "y",
                    "storageUsed": "20GB",
                    "textInbound": "y",
                    "touchscreen": "n",
                    "pointScanner": 20,
                    "scannerPoint": 20,
                    "textOutbound": "y",
                    "voiceInbound": "y",
                    "blacklistType": "not_verified",
                    "diamondRating": 3,
                    "voiceOutbound": "y",
                    "blacklistStatus": "Not Verified",
                    "physicalGrading": 50,
                    "url_summary_report": "https://res.cloudinary.com/deeucfdkq/image/upload/v1616397664/pb6mzqrqjutijdcaitnb.png"
                },
                auth_user_id: userId,
                timestamp: date,
                id: deviceScanId,
                real_device_id: device.id,
                created_at: date,
                updated_at: date,
                device_id: 'fa59bbac-1a7a-4a73-b18f-84f2a44e200c',
                main_url: 'https://res.cloudinary.com/deeucfdkq/image/upload/v1616397664/pb6mzqrqjutijdcaitnb.png',
                type: 'transaction-summary'
            });

            await trx('available_devices').update({
                device_scan_id: deviceScanId
            }).where('device_id', device.id);

        });

        if (socket.connected) {
            socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
            socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationOwner);
        }
        return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
        return helper.showServerError(res, error);
    }
};