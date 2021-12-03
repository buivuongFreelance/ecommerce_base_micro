/* eslint-disable no-loop-func */
/* eslint-disable max-len */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */
/* eslint-disable array-callback-return */
/* eslint-disable no-plusplus */
import helper from 'micro-helper';
import Stripe from 'stripe';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import socket from '../adapters/socket';
import {
  CREATED, EXCHANGE, GROUP, SELL, BUYER_ACCEPT, NOTIFY_ORDER_SELLER_PAYMENT,
  SELLER_ACCEPT, BUYER, SELLER, IN_TRANSACTION, NOTIFY_ORDER_CREATED, ORDER, UNREAD, GLOBAL_USER, SOCKET_NOTIFICATION_MESSAGE, WAITING_FOR_DEVICE_PAYMENT, DEVICE_PAYMENT, ORDER_SELLER_STATUS,
  ORDER_STATUS,
  OWNER_SCANNED,
  BUYER_REJECTED,
  TRANSACTION_STATUS,
  NOTIFY,
  TRANSACTION_SUMMARY,
  TRANSACTION_LOCK_SUMMARY,
  TIMER,
  QUEUE,
  TYPE,
} from '../config';

import {
  convertArrToSql, mapArrObjToArr, censorEmail, formatFixedPrice,
} from '../functions';
import {
  listBeforeCheckout, queryNotTransactionExchange,
  queryNotTransactionSell, serviceListDeviceTransaction,
} from '../services';

import queueSellerPayShip from '../adapters/queueSellerPayShip';
import queueSellerMustScan from '../adapters/queueSellerMustScan';

const orderNumber = require('order-id')('mysecret');

const stripe = Stripe(process.env.STRIPE_API_KEY);
const shippo = require('shippo')(process.env.SHIPPO_TOKEN);

const getListExchange = async (userId) => new Promise((resolve, reject) => {
  const subquery = db('carts').select('carts.id').innerJoin('proposals', 'proposals.cart_id', 'carts.id')
    .where('proposals.status', SELLER_ACCEPT)
    .orWhere('proposals.status', BUYER_ACCEPT);

  db('carts')
    .innerJoin('devices', 'carts.device_id', 'devices.id')
    .join('imeis', 'devices.imei_id', 'imeis.id')
    .innerJoin('rams', 'rams.id', 'devices.ram_id')
    .innerJoin('colors', 'devices.color_id', 'colors.id')
    .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
    .innerJoin('models', 'imeis.model_id', 'models.id')
    .innerJoin('categories', 'models.category_id', 'categories.id')
    .innerJoin('brands', 'models.brand_id', 'brands.id')
    .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
    .innerJoin('device_images', 'devices.id', 'device_images.device_id')
    .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
    .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
    .innerJoin('shippings', 'shippings.user_id', 'auth_users.id')
    .innerJoin('states', 'states.code', 'shippings.state_code')
    .innerJoin('cities', 'cities.id', 'shippings.city_id')
    .innerJoin('countries', 'countries.id', 'shippings.country_id')
    .select(
      'carts.id',
      'carts.user_id',
      'carts.device_id',
      'rams.value as ram_value',
      'colors.name as color',
      'capacities.value as capacity',
      'models.name as model',
      'models.physical_shipping',
      'categories.name as category_name',
      'brands.name as brand_name',
      'device_images.url',
      'available_devices.real_sale_price',
      'proposals.id as proposal_id',
      'proposals.type as proposal_type',
      'proposals.exchange_devices as proposal_exchange_devices',
      'proposals.buyer_real_sale_price as proposal_sale_price',
      'proposals.buyer_real_exchange_price as proposal_exchange_price',
      'shippings.address',
      'shippings.first_name',
      'shippings.last_name',
      'states.code as state_code',
      'states.name as state',
      'cities.state_code as city_code',
      'cities.name as city',
      'shippings.zip as zip',
      'countries.country_code_alpha2 as country_code',
      'auth_users.id as seller_id',
      'auth_users.email as seller_email',
    )
    .whereNotNull('available_devices.proposal_id')
    .whereIn('carts.id', subquery)
    .where('carts.user_id', userId)
    .where('device_images.main', 'true')
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .orderBy('carts.created_at', 'desc')
    .then(resolve)
    .catch(reject);
});

const getListSell = async (userId) => new Promise((resolve, reject) => {
  const subquery = db('carts').select('carts.id').innerJoin('proposals', 'proposals.cart_id', 'carts.id')
    .where('proposals.status', SELLER_ACCEPT)
    .orWhere('proposals.status', BUYER_ACCEPT);
  db('carts')
    .innerJoin('devices', 'carts.device_id', 'devices.id')
    .join('imeis', 'devices.imei_id', 'imeis.id')
    .innerJoin('rams', 'rams.id', 'devices.ram_id')
    .innerJoin('colors', 'devices.color_id', 'colors.id')
    .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
    .innerJoin('models', 'imeis.model_id', 'models.id')
    .innerJoin('categories', 'models.category_id', 'categories.id')
    .innerJoin('brands', 'models.brand_id', 'brands.id')
    .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
    .innerJoin('device_images', 'devices.id', 'device_images.device_id')
    .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
    .innerJoin('shippings', 'shippings.user_id', 'auth_users.id')
    .innerJoin('states', 'states.code', 'shippings.state_code')
    .innerJoin('cities', 'cities.id', 'shippings.city_id')
    .innerJoin('countries', 'countries.id', 'shippings.country_id')
    .select(
      'carts.id',
      'carts.user_id',
      'carts.device_id',
      'rams.value as ram_value',
      'colors.name as color',
      'capacities.value as capacity',
      'models.name as model',
      'models.physical_shipping',
      'categories.name as category_name',
      'brands.name as brand_name',
      'device_images.url',
      'shippings.address',
      'shippings.first_name',
      'shippings.last_name',
      'states.code as state_code',
      'states.name as state',
      'cities.state_code as city_code',
      'cities.name as city',
      'shippings.zip as zip',
      'countries.country_code_alpha2 as country_code',
      'available_devices.sale_price',
      'available_devices.real_sale_price',
      'auth_users.id as seller_id',
      'auth_users.email as seller_email',
    )
    .where('available_devices.sale_price', '>', 0)
    .where('carts.type', SELL)
    .whereNotIn('carts.id', subquery)
    .where('carts.user_id', userId)
    .where('device_images.main', 'true')
    .whereNotIn('devices.id', queryNotTransactionSell())
    .whereNotIn('devices.id', queryNotTransactionExchange())
    .orderBy('carts.created_at', 'desc')
    .then(resolve)
    .catch(reject);
});

export const sellerPayShipping = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const {
    orderId, selectedRate, shipping, billing, cardNumber, exp, cvc, amountInfo,
  } = req.body;

  try {
    const shipResult = await shippo.transaction.create({
      rate: selectedRate.object_id,
      label_file_type: 'PDF',
      async: false,
    });

    const orderSeller = await db('orders_seller').first().where('id', orderId);

    const expMonth = exp.toString().substring(0, 2);
    const expYear = exp.toString().substring(2, 4);
    const token = await stripe.tokens.create({
      card: {
        number: cardNumber,
        cvc,
        exp_month: expMonth,
        exp_year: expYear,
      },
    });

    const order = await db('orders_seller')
      .innerJoin('orders', 'orders.id', 'orders_seller.order_id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .first('auth_users.email', 'orders.id', 'orders.order_number')
      .where('orders_seller.id', orderId);

    const date = new Date();

    const notification = {
      name: `${NOTIFY_ORDER_SELLER_PAYMENT}&${order.id}&${order.order_number}`,
      type: ORDER,
      links: `/my-purchases/${order.id}`,
      email: order.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    let totalDingtoiFee = 0;

    const transactions = await db('transactions')
      .select('transactions.id', 'transactions.transaction_code', 'transactions.money', 'transactions.money_not_fee',
        'transactions.status', 'transactions.type', 'transactions.created_at',
        'devices.id as device_id',
        'transactions.is_pay_ship',
        'transactions.dingtoi_fee_seller',
        'transactions.shipping_rate_seller',
        'devices.physical_grading',
        'imeis.id as imei_id',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
        'models.image_url as model_url',
        'categories.name as category_name',
        'categories.image_url as category_image_url',
        'brands.id as brand_id',
        'brands.name as brand_name',
        'brands.image_url as brand_image_url',
        'orders_seller.invoice_info as invoice_info_seller',
        'auth_users.email as seller_email',
        'device_images.url')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .join('imeis', 'devices.imei_id', 'imeis.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders_seller.user_id')
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .where('orders_seller.id', orderId);

    const transactionsExchange = await db('transactions_exchange')
      .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .select('transactions_exchange.*',
        'auth_users.email as buyer_email',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model')
      .where('transactions_exchange.type', SELLER)
      .where('transactions_exchange.order_seller_id', orderId);

    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      totalDingtoiFee += formatFixedPrice(transaction.dingtoi_fee_seller);
    }

    const totalShippingFee = selectedRate.amountCad;
    const amount = Math.ceil(orderSeller.receive_money) + Number(totalShippingFee) + Number(totalDingtoiFee);
    amountInfo.totalDingtoiFee = totalDingtoiFee;
    amountInfo.stripePay = amount;
    amountInfo.selectedRate = selectedRate;
    const charge = await stripe.charges.create({
      amount: Math.ceil(amount) * 100,
      currency: 'cad',
      source: token.id,
      description: 'Payment Exchange for dingtoi',
    });

    const walletGlobalFirst = await db('auth_users').first('email', 'wallet').whereIn('email', [GLOBAL_USER]);
    const walletGlobal = walletGlobalFirst.wallet;

    const setting = await db('settings').first('value').where('key', TIMER.TRANSACTION_SELLER_PAY_CHECKOUT);
    const optionTransactionSellerMustScan = QUEUE.OPTION_DEFAULT;
    optionTransactionSellerMustScan.delay = setting.value;

    const notificationsMustScan = [];
    const notificationsBuyerMustScan = [];
    const settingTransactionSellerMustScan = await db('settings').first('value').where('key', TIMER.TRANSACTION_SELLER_MUST_SCAN);

    await db.transaction(async (trx) => {
      await trx('auth_users').update('wallet', Number(walletGlobal) + amount).where('email', GLOBAL_USER);
      await trx('orders_seller').update({
        shipping_info: shipping,
        billing_info: billing,
        invoice_info: null,
        total_shipping: totalShippingFee,
        charge_stripe: charge.id,
        amount_info: amountInfo,
        status: DEVICE_PAYMENT,
      }).where('id', orderId);
      const not = await trx('notifications').returning('id').insert(notification);
      // eslint-disable-next-line prefer-destructuring
      notification.id = not[0];
    });

    transactions.map((trs) => {
      queueSellerMustScan.add({ transactionId: trs.id }, optionTransactionSellerMustScan);
      notificationsMustScan.push({
        name: `${NOTIFY.TRANSACTION_STARTED}&${trs.model}&${trs.color}&${trs.capacity}`,
        type: TYPE.TIMER_TRANSACTION,
        links: null,
        id: trs.id,
        timer: settingTransactionSellerMustScan.value,
        email: trs.seller_email,
        status: UNREAD,
        created_at: date,
        updated_at: date,
      });
    });

    transactionsExchange.map((trs) => {
      queueSellerMustScan.add({ transactionId: trs.id }, optionTransactionSellerMustScan);
      notificationsBuyerMustScan.push({
        name: `${NOTIFY.TRANSACTION_STARTED}&${trs.model}&${trs.color}&${trs.capacity}`,
        type: TYPE.TIMER_TRANSACTION,
        links: null,
        id: trs.id,
        timer: settingTransactionSellerMustScan.value,
        email: trs.buyer_email,
        status: UNREAD,
        created_at: date,
        updated_at: date,
      });
    });

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
      notificationsMustScan.map((notify) => {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notify);
      });
      notificationsBuyerMustScan.map((notify) => {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notify);
      });
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    let message = '';
    if (error.type) {
      switch (error.type) {
        case 'StripeCardError':
          // A declined card error
          message = error.message;
          break;
        case 'StripeRateLimitError':
          // Too many requests made to the API too quickly
          break;
        case 'StripeInvalidRequestError':
          // Invalid parameters were supplied to Stripe's API
          break;
        case 'StripeAPIError':
          // An error occurred internally with Stripe's API
          break;
        case 'StripeConnectionError':
          // Some kind of error occurred during the HTTPS communication
          break;
        case 'StripeAuthenticationError':
          // You probably used an incorrect API key
          break;
        default:
          // Handle any other types of unexpected errors
          break;
      }
    }
    if (message) {
      return res.status(500).json({
        obj: message,
      });
    }
    return helper.showServerError(res, error);
  }
};

const confirmOrder = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const { listCart } = req.body;
    const listExchange = await getListExchange(userId);
    const listDeviceTransactions = await serviceListDeviceTransaction();

    const listSell = await getListSell(userId);

    listSell.map((l) => {
      if (l.seller_email) {
        l.seller_email = censorEmail(l.seller_email);
      }
    });

    listExchange.map((l) => {
      if (l.seller_email) {
        l.seller_email = censorEmail(l.seller_email);
      }
    });

    const {
      total,
      totalReceive,
      totalDingtoiFee,
      totalPay,
      validate,
      listReturn,
    } = listBeforeCheckout(listExchange, listSell,
      listDeviceTransactions, listCart);
    const listFailed = [];

    const listGroupedExchange = listReturn.reduce(function (r, a) {
      if (a.proposal_type === EXCHANGE) {
        r[`${a.seller_id}-exchange`] = r[`${a.seller_id}-exchange`] || [];
        r[`${a.seller_id}-exchange`].push(a);
        if (!a.validate) {
          listFailed.push(a.id);
        }
      }
      return r;
    }, Object.create(null));

    const listGroupedSell = listReturn.reduce(function (r, a) {
      if (a.proposal_type !== EXCHANGE) {
        r[a.seller_id] = r[a.seller_id] || [];
        r[a.seller_id].push(a);
        if (!a.validate) {
          listFailed.push(a.id);
        }
      }
      return r;
    }, Object.create(null));

    const listFinal = { ...listGroupedSell, ...listGroupedExchange };

    return helper.showSuccessOk(res,
      {
        total,
        totalDingtoiFee,
        totalPay,
        totalReceive,
        list: listFinal,
        validate,
        listFailed,
      });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const orderSellings = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    limit, offset, filter, sort,
  } = req.body;

  const { userId } = req;

  try {
    const query = db('orders_seller')
      .select(
        'orders_seller.id',
        'orders_seller.code',
        'orders_seller.total_shipping',
        'orders_seller.invoice_info',
        'orders_seller.charge_stripe',
        'orders_seller.money',
        'orders_seller.receive_money',
        'orders_seller.status',
        'orders_seller.created_at',
        'orders_seller.amount_info',
        'orders_seller.shipping_info as buyer_shipping_info',
        'orders_seller.billing_info',
      )
      .where('user_id', userId)
      .limit(limit)
      .offset(offset);
    if (filter) {
      if (filter.saleNumber) {
        query.where('orders_seller.code', 'ILIKE', `%${filter.saleNumber}%`);
      }
      if (filter.status) {
        if (filter.status === ORDER_SELLER_STATUS.PROCESSING) {
          query.where('orders_seller.status', ORDER_SELLER_STATUS.CREATED);
        } else if (filter.status === ORDER_SELLER_STATUS.COMPLETED) {
          query.where('orders_seller.status', ORDER_SELLER_STATUS.COMPLETED);
        } else {
          query.where('orders_seller.status', ORDER_SELLER_STATUS.WAITING_FOR_DEVICE_PAYMENT);
        }
      }
    }
    if (sort) {
      if (sort.saleNumber) {
        query.orderBy('orders_seller.code', sort.purchaseNumber);
      } else if (sort.price) {
        query.orderBy('orders_seller.money', sort.price);
      } else if (sort.status) {
        query.orderBy('orders_seller.status', sort.status);
      } else if (sort.createdAt) {
        query.orderBy('orders_seller.created_at', sort.createdAt);
      } else {
        query.orderBy('orders_seller.created_at', 'desc');
      }
    }

    const ordersSeller = await query;

    for (let i = 0; i < ordersSeller.length; i++) {
      const order = ordersSeller[i];
      const countTransactionsSellIsPaid = await db('transactions')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', order.id)
        .where('transactions.type', BUYER)
        .whereNotNull('orders.charge_stripe')
        .first();
      const countTransactionsExchangeIsPaid = await db('transactions')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', order.id)
        .whereNotNull('orders_seller.charge_stripe')
        .first();
      const countTransactionsSellOwnersNotScanned = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions.status', [CREATED, OWNER_SCANNED, TRANSACTION_STATUS.READY])
        .first();

      const countTransactionsWaitingForBuyerScanned = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('orders_seller.id', { as: 'count' })
        .where('transactions.order_seller_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .where({
          'transactions.status': TRANSACTION_STATUS.BUYER_RECEIVED,
          'transactions.type': BUYER,
        })
        // .orWhere({
        //   'transactions.status': TRANSACTION_STATUS.BUYER_RECEIVED,
        //   'transactions.type': GROUP,
        // })
        .first();

      const countTransactionsExchangeWaitingForBuyerScanned = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .count('orders_seller.id', { as: 'count' })
        .where('transactions_exchange.order_seller_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .where({
          'transactions_exchange.type': SELLER,
        })
        .whereIn('transactions_exchange.status', [TRANSACTION_STATUS.CREATED, TRANSACTION_STATUS.READY])
        .first();

      const countTransactionsExchangeOwnersScanned = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .count('transactions_exchange.id', { as: 'count' })
        .where('transactions_exchange.order_seller_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions_exchange.status', [TRANSACTION_STATUS.BUYER_RECEIVED])
        .where('transactions_exchange.type', SELLER)
        .first();

      const countTransactionsBuyerRejected = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .where('transactions.status', BUYER_REJECTED)
        .first();

      const countTransactionsSellReady = await db('transactions')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', order.id)
        .where('transactions.type', BUYER)
        .whereNotNull('orders.charge_stripe')
        .where('transactions.status', TRANSACTION_STATUS.READY)
        .first();

      const countTransactionsIsShipping = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions.status', [TRANSACTION_STATUS.TO_BE_SHIPPED, TRANSACTION_STATUS.SHIPPED, TRANSACTION_STATUS.BUYER_RECEIVED])
        .first();

      const countTransactionsTotalProcess = Number(countTransactionsSellOwnersNotScanned.count)
        + Number(countTransactionsExchangeOwnersScanned.count);

      const totalTransactionRejected = Number(countTransactionsBuyerRejected.count);
      const totalTransactionReady = Number(countTransactionsSellReady.count);
      const totalShipping = Number(countTransactionsIsShipping.count);

      order.countTransactionsExchangeIsPaid = Number(countTransactionsExchangeIsPaid.count);
      order.countTransactionsSellIsPaid = Number(countTransactionsSellIsPaid.count);
      order.countTransactionsTotalProcess = Number(countTransactionsTotalProcess);
      order.countTransactionsWaitingForBuyerScanned = Number(countTransactionsWaitingForBuyerScanned.count) + Number(countTransactionsExchangeWaitingForBuyerScanned.count);
      order.countTotalTransactionRejected = Number(totalTransactionRejected);
      order.countTotalTransactionReady = Number(totalTransactionReady);
      order.countTotalShipping = Number(totalShipping);
    }

    const countRow = await db('orders_seller')
      .countDistinct('orders_seller.id', { as: 'count' })
      .where('user_id', userId)
      .first();
    for (let i = 0; i < ordersSeller.length; i++) {
      const orderSeller = ordersSeller[i];
      const transactionsExchange = await db('transactions_exchange')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .first('transactions_exchange.id').where('orders_seller.id', orderSeller.id);
      orderSeller.has_exchange_devices = transactionsExchange || null;
    }

    return helper.showSuccessOk(res, {
      list: ordersSeller,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const listTransactionSeller = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { userId } = req;
  const { limit } = req.body;
  if (!limit) return helper.showClientEmpty(res);

  try {
    const transactions = await db('transactions')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .distinct('transactions.id', 'transactions.id as transaction_id',
        'orders_seller.code as sale_number',
        'orders_seller.id as sale_id',
        'transactions.transaction_code',
        'transactions.money',
        'transactions.money_not_fee',
        'transactions.password_machine as passcode',
        'transactions.status',
        'transactions.id',
        'transactions.type', 'transactions.created_at',
        'devices.id as device_id',
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
        'auth_users.email',
        'orders.order_number',
        'orders.id as order_id',
        'device_images.url')
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .where('orders.user_id', userId)
      .where('transactions.type', BUYER)
      .orderBy('transactions.created_at', 'desc');

    const transactionsExchange = await db('transactions')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .distinct('transactions.id', 'transactions.id as transaction_id',
        'orders_seller.code as sale_number',
        'orders_seller.id as sale_id',
        'transactions.transaction_code',
        'transactions.money',
        'transactions.money_not_fee',
        'transactions.status',
        'transactions.password_machine as passcode',
        'transactions.type', 'transactions.created_at',
        'devices.id as device_id',
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
        'auth_users.email',
        'orders.order_number',
        'orders.id as order_id',
        'device_images.url')
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .where('orders.user_id', userId)
      .where('transactions.type', GROUP)
      .whereNotIn('orders_seller.status', [CREATED, WAITING_FOR_DEVICE_PAYMENT])
      .orderBy('transactions.created_at', 'desc');

    const transactionsSeller = await db('transactions')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .distinct('transactions.id',
        'orders_seller.code as sale_number',
        'orders_seller.id as sale_id',
        'transactions.transaction_code',
        'transactions.money',
        'transactions.money_not_fee',
        'transactions.status',
        'transactions.password_machine as passcode',
        'transactions.type', 'transactions.created_at',
        'devices.id as device_id',
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
        'auth_users.email',
        'orders.order_number',
        'orders.id as order_id',
        'device_images.url')
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .where('devices.user_id', userId)
      .whereNotIn('orders.user_id', [userId])
      .where('transactions.type', BUYER)
      .orderBy('transactions.created_at', 'desc');

    const transactionsSellerExchange = await db('transactions')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .distinct('transactions.id',
        'orders_seller.code as sale_number',
        'orders_seller.id as sale_id',
        'transactions.transaction_code',
        'transactions.money',
        'transactions.money_not_fee',
        'transactions.password_machine as passcode',
        'transactions.status',
        'transactions.type', 'transactions.created_at',
        'devices.id as device_id',
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
        'auth_users.email',
        'orders.order_number',
        'orders.id as order_id',
        'device_images.url')
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .where('devices.user_id', userId)
      .whereNotIn('orders.user_id', [userId])
      .where('transactions.type', GROUP)
      .whereNotIn('orders_seller.status', [CREATED, WAITING_FOR_DEVICE_PAYMENT])
      .orderBy('transactions.created_at', 'desc');

    const transactionsSubExchange = await db('transactions_exchange')
      .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .distinct('transactions_exchange.id',
        'orders_seller.code as sale_number',
        'orders_seller.id as sale_id',
        'transactions_exchange.transaction_code',
        'transactions.money',
        'transactions.money_not_fee',
        'transactions_exchange.status',
        'transactions_exchange.password_machine as passcode',
        'transactions_exchange.type', 'transactions.created_at',
        'devices.id as device_id',
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
        'auth_users.email',
        'orders.order_number',
        'orders.id as order_id',
        'device_images.url')
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .where('orders.user_id', userId)
      .where('transactions_exchange.type', SELLER)
      .whereNotIn('orders_seller.status', [CREATED, WAITING_FOR_DEVICE_PAYMENT])
      .orderBy('transactions.created_at', 'desc');

    const transactionsSubExchangeSeller = await db('transactions_exchange')
      .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .distinct('transactions_exchange.id',
        'orders_seller.code as sale_number',
        'orders_seller.id as sale_id',
        'transactions_exchange.transaction_code',
        'transactions.money',
        'transactions.money_not_fee',
        'transactions_exchange.status',
        'transactions_exchange.type', 'transactions.created_at',
        'transactions_exchange.password_machine as passcode',
        'devices.id as device_id',
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
        'auth_users.email',
        'orders.order_number',
        'orders.id as order_id',
        'device_images.url')
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .where('orders_seller.user_id', userId)
      .where('transactions_exchange.type', SELLER)
      .whereNotIn('orders_seller.status', [CREATED, WAITING_FOR_DEVICE_PAYMENT])
      .orderBy('transactions.created_at', 'desc');

    return helper.showSuccessOk(res, {
      // list: transaction.concat(transactionsExchange),
      list: transactions.concat(transactionsExchange,
        transactionsSeller, transactionsSellerExchange, transactionsSubExchange, transactionsSubExchangeSeller),
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const listOrder = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { userId } = req;
  const {
    offset, limit, filter, sort,
  } = req.body;
  if (!limit) return helper.showClientEmpty(res);

  try {
    const queryOrders = db('orders')
      .select(
        'orders.id',
        'orders.order_number',
        'orders.total_shipping',
        'orders.total_money',
        'orders.status',
        'orders.created_at',
        'orders.amount_info',
        'orders.shipping_info',
        'orders.billing_info',
      )
      .where('orders.user_id', userId)
      .offset(offset)
      .limit(limit);

    if (filter) {
      if (filter.purchaseNumber) {
        queryOrders.where('orders.order_number', 'ILIKE', `%${filter.purchaseNumber}%`);
      }
      if (filter.status) {
        if (filter.status === ORDER_STATUS.PROCESSING || filter.status === ORDER_STATUS.CREATED) {
          queryOrders.where('orders.status', ORDER_STATUS.CREATED);
        } else if (filter.status === ORDER_STATUS.COMPLETED) {
          queryOrders.where('orders.status', ORDER_STATUS.COMPLETED);
        }
      }
    }

    if (sort) {
      if (sort.purchaseNumber) {
        queryOrders.orderBy('orders.order_number', sort.purchaseNumber);
      } else if (sort.price) {
        queryOrders.orderBy('orders.total_money', sort.price);
      } else if (sort.status) {
        queryOrders.orderBy('orders.status', sort.status);
      } else if (sort.createdAt) {
        queryOrders.orderBy('orders.created_at', sort.createdAt);
      } else {
        queryOrders.orderBy('orders.created_at', 'desc');
      }
    }

    const listOrders = await queryOrders;

    const listOrdersNew = [];
    for (let i = 0; i < listOrders.length; i++) {
      const order = listOrders[i];
      const countTransactionsSellIsPaid = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .where('transactions.type', BUYER)
        .whereNotNull('orders.charge_stripe')
        .first();
      const countTransactionsExchangeIsNotPaid = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .count('transactions_exchange.id', { as: 'count' })
        .where('transactions_exchange.type', SELLER)
        .where('transactions.order_id', order.id)
        .whereNull('orders_seller.charge_stripe')
        .first();
      const countTransactionsExchangeIsPaid = await db('transactions')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders_seller.charge_stripe')
        .first();

      const countTransactionsSellOwnersNotScanned = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions.status', [CREATED, OWNER_SCANNED, TRANSACTION_STATUS.READY])
        .first();

      const countTransactionsYouMustScan = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions_exchange.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions_exchange.status', [TRANSACTION_STATUS.CREATED, TRANSACTION_STATUS.OWNER_SCANNED, TRANSACTION_STATUS.READY])
        .where('transactions_exchange.type', SELLER)
        .first();

      const countTransactionsYouMustScanWhenOwnerScan = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions.status', [TRANSACTION_STATUS.BUYER_RECEIVED])
        .where('transactions.type', BUYER)
        .first();

      const countTransactionsGroupedYouMustScanWhenOwnerScan = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .where('transactions.status', TRANSACTION_STATUS.BUYER_RECEIVED)
        .where('transactions.type', GROUP)
        .first();

      const countTransactionsExchangeBuyerNotScan = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions_exchange.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions_exchange.status', [
          TRANSACTION_STATUS.BUYER_RECEIVED])
        .where('transactions_exchange.type', SELLER)
        .first();

      const countTransactionsBuyerRejected = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .where('transactions.status', BUYER_REJECTED)
        .first();

      const countTransactionsIsShipping = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', order.id)
        .whereNotNull('orders.charge_stripe')
        .whereIn('transactions.status', [TRANSACTION_STATUS.TO_BE_SHIPPED, TRANSACTION_STATUS.SHIPPED, TRANSACTION_STATUS.BUYER_RECEIVED])
        .first();

      const totalMustScan = Number(countTransactionsYouMustScan.count)
        + Number(countTransactionsYouMustScanWhenOwnerScan.count)
        + Number(countTransactionsGroupedYouMustScanWhenOwnerScan.count);

      const totalWaitScan = Number(countTransactionsSellOwnersNotScanned.count)
        + Number(countTransactionsExchangeBuyerNotScan.count);

      const totalRejected = Number(countTransactionsBuyerRejected.count);
      const totalShipping = Number(countTransactionsIsShipping.count);

      order.countTransactionsExchangeIsNotPaid = Number(countTransactionsExchangeIsNotPaid.count);
      order.countTransactionsExchangeIsPaid = Number(countTransactionsExchangeIsPaid.count);
      order.countTransactionsSellIsPaid = Number(countTransactionsSellIsPaid.count);
      order.countTransactionsYouMustWait = Number(totalWaitScan);
      order.countTransactionsYouMustScan = Number(totalMustScan);
      order.countTransactionsRejected = Number(totalRejected);
      order.countTransactionsShipping = Number(totalShipping);
      if (filter.status) {
        if (filter.status === ORDER_STATUS.PROCESSING) {
          if (order.countTransactionsSellIsPaid > 0 || order.countTransactionsExchangeIsPaid > 0) {
            listOrdersNew.push(order);
          }
        } else if (filter.status === ORDER_STATUS.CREATED) {
          if (order.countTransactionsSellIsPaid === 0 && order.countTransactionsExchangeIsPaid === 0) {
            listOrdersNew.push(order);
          }
        } else {
          listOrdersNew.push(order);
        }
      } else {
        listOrdersNew.push(order);
      }
    }

    const countRow = await db('orders')
      .count('orders.id', { as: 'count' })
      .where('orders.user_id', userId)
      .first();

    return helper.showSuccessOk(res, {
      list: listOrdersNew,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const detailOrder = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { id } = req.params;
  const { userId } = req;
  if (!id) return helper.showClientEmpty(res);

  try {
    const detail = await db('orders')
      .first()
      .where('orders.id', id)
      .where('orders.user_id', userId);
    if (detail) {
      const countTransactionsSellIsPaid = await db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', id)
        .where('transactions.type', BUYER)
        .whereNotNull('orders.charge_stripe')
        .first();
      const countTransactionsExchangeIsPaid = await db('transactions')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_id', id)
        .whereNotNull('orders_seller.charge_stripe')
        .first();
      detail.countTransactionsExchangeIsPaid = countTransactionsExchangeIsPaid.count;
      detail.countTransactionsSellIsPaid = countTransactionsSellIsPaid.count;
      const transactions = await db('transactions')
        .select('transactions.id', 'transactions.transaction_code', 'transactions.money',
          'transactions.status', 'transactions.type', 'transactions.created_at',
          'devices.id as device_id',
          'transactions.is_pay_ship',
          'transactions.amount_info',
          'transactions.shipping_rate_buyer',
          'transactions.shipping_rate_seller',
          'transactions.object_id',
          'transactions.money_not_fee',
          'transactions.dingtoi_fee_buyer',
          'devices.physical_grading',
          'imeis.id as imei_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'models.image_url as model_url',
          'categories.name as category_name',
          'categories.image_url as category_image_url',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'auth_users.email as device_user_email',
          'device_images.url')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
        .where(function () {
          this.where('device_images.main', 'true').orWhere('device_images.main', null);
        })
        .where('order_id', id);

      const transactionsExchange = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .select('transactions_exchange.id',
          'transactions.id as transaction_id', 'transactions_exchange.transaction_code',
          'transactions.money', 'transactions_exchange.status', 'transactions_exchange.type',
          'transactions_exchange.created_at',
          'transactions.amount_info',
          'devices.id as device_id',
          'devices.physical_grading',
          'imeis.id as imei_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'models.image_url as model_url',
          'categories.name as category_name',
          'categories.image_url as category_image_url',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'orders_seller.charge_stripe as charge_stripe_seller',
          'brands.image_url as brand_image_url',
          'auth_users.email as device_user_email',
          'device_images.url')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
        .where(function () {
          this.where('device_images.main', 'true').orWhere('device_images.main', null);
        })
        .where('transactions.order_id', id)
        .whereNot('transactions_exchange.type', BUYER);

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        transaction.items = [];
        for (let j = 0; j < transactionsExchange.length; j++) {
          const transactionExchange = transactionsExchange[j];
          if (transactionExchange.transaction_id === transaction.id) {
            transaction.items.push(transactionExchange);
            const countTransactionsExchangeIsPaidChild = await db('transactions')
              .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
              .count('transactions.id', { as: 'count' })
              .where('transactions.order_id', id)
              .whereNotNull('orders_seller.charge_stripe')
              .first()
              .where('transactions.id', transaction.id);
            transaction.countTransactionsExchangeIsPaid = countTransactionsExchangeIsPaidChild.count;
            if (!transaction.charge_stripe_seller) {
              transaction.charge_stripe_seller = transactionExchange.charge_stripe_seller;
            }
          }
        }
      }

      detail.transactions = transactions;
      if (transactions.length > 0) {
        detail.invoice_info_seller = transactions[0].invoice_info_seller;
      }
    }
    return helper.showSuccessOk(res, detail);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const detailOrderSeller = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const { id } = req.params;
  const { userId } = req;
  if (!id) return helper.showClientEmpty(res);

  let totalDingtoiFee = 0;

  try {
    const detail = await db('orders_seller')
      .first(
        'orders_seller.*',
        'orders.shipping_info as buyer_shipping_info',
        'orders_seller.code',
        'orders_seller.amount_info',
        'auth_users.email',
      )
      .innerJoin('orders', 'orders.id', 'orders_seller.order_id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .where('orders_seller.id', id)
      .where('orders_seller.user_id', userId);
    if (detail) {
      detail.email = censorEmail(detail.email);
      const countTransactionsSellIsPaid = await db('transactions')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', detail.id)
        .where('transactions.type', BUYER)
        .whereNotNull('orders.charge_stripe')
        .first();
      const countTransactionsExchangeIsPaid = await db('transactions')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where('transactions.order_seller_id', detail.id)
        .whereNotNull('orders_seller.charge_stripe')
        .first();
      detail.countTransactionsExchangeIsPaid = countTransactionsExchangeIsPaid.count;
      detail.countTransactionsSellIsPaid = countTransactionsSellIsPaid.count;
      const transactions = await db('transactions')
        .select('transactions.id', 'transactions.transaction_code', 'transactions.money', 'transactions.money_not_fee',
          'transactions.status', 'transactions.type', 'transactions.created_at',
          'devices.id as device_id',
          'transactions.is_pay_ship',
          'transactions.password_machine as passcode',
          'transactions.dingtoi_fee_seller',
          'transactions.shipping_rate_seller',
          'transactions.shipping_rate_buyer',
          'devices.physical_grading',
          'imeis.id as imei_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'models.image_url as model_url',
          'categories.name as category_name',
          'categories.image_url as category_image_url',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'brands.image_url as brand_image_url',
          'orders_seller.invoice_info as invoice_info_seller',
          'device_images.url')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .where(function () {
          this.where('device_images.main', 'true').orWhere('device_images.main', null);
        })
        .where('orders_seller.id', id);

      const transactionsExchange = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .select('transactions_exchange.id',
          'transactions.id as transaction_id', 'transactions_exchange.transaction_code',
          'transactions.money', 'transactions_exchange.status', 'transactions_exchange.type',
          'transactions_exchange.created_at',
          'transactions_exchange.password_machine as passcode',
          'devices.id as device_id',
          'devices.physical_grading',
          'imeis.id as imei_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'models.name as model',
          'models.image_url as model_url',
          'categories.name as category_name',
          'categories.image_url as category_image_url',
          'brands.id as brand_id',
          'brands.name as brand_name',
          'orders_seller.invoice_info as invoice_info_seller',
          'brands.image_url as brand_image_url',
          'device_images.url')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .where(function () {
          this.where('device_images.main', 'true').orWhere('device_images.main', null);
        })
        .where('orders_seller.id', id)
        .whereNot('transactions_exchange.type', BUYER);

      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        totalDingtoiFee += formatFixedPrice(transaction.dingtoi_fee_seller);
        transaction.items = [];
        for (let j = 0; j < transactionsExchange.length; j++) {
          const transactionExchange = transactionsExchange[j];
          if (transactionExchange.transaction_id === transaction.id) {
            transaction.items.push(transactionExchange);
            if (!transaction.invoice_info_seller) {
              transaction.invoice_info_seller = transactionExchange.invoice_info_seller;
            }
          }
        }
      }
      detail.receive_money_not_fee = detail.receive_money;
      detail.receive_money = formatFixedPrice(totalDingtoiFee + Number(detail.receive_money));

      const listGroupedExchange = transactions.reduce(function (r, a) {
        if (a.type === GROUP) {
          if (a.invoice_info_seller === null) {
            r[`${a.type}-exchange`] = r[`${a.type}-exchange`] || [];
            r[`${a.type}-exchange`].push(a);
          }
        }
        return r;
      }, Object.create(null));

      const listGroupedSell = transactions.reduce(function (r, a) {
        if (a.type === BUYER) {
          r[a.type] = r[a.type] || [];
          r[a.type].push(a);
        } else if (a.type === GROUP) {
          if (a.invoice_info_seller !== null) {
            r[BUYER] = r[BUYER] || [];
            r[BUYER].push(a);
          }
        }
        return r;
      }, Object.create(null));

      detail.transactions = { ...listGroupedSell, ...listGroupedExchange };
      detail.total_dingtoi_fee = totalDingtoiFee;
    }
    return helper.showSuccessOk(res, detail);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const orderCreation = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const {
    listCart,
    firstNameShip,
    lastNameShip,
    addressShip,
    cityShip,
    provinceShip,
    postalCodeShip,
    phoneShip,
    countryShip,
    firstNameBill,
    lastNameBill,
    addressBill,
    cityBill,
    provinceBill,
    postalCodeBill,
    phoneBill,
    countryBill,
    listConfirm,
    cardName,
    cardNumber,
    cvc,
    exp,
    totalShipping,
    amountInfo,
  } = req.body;
  const { userId } = req;
  try {
    const date = new Date();
    const checkCreditCard = await db('credit_cards').where('user_id', userId).first();
    const orderId = uuidv1();
    const orderNumberId = orderNumber.generate();
    const status = CREATED;

    const shippingInfo = {
      first_name: firstNameShip,
      last_name: lastNameShip,
      address: addressShip,
      city: cityShip,
      province: provinceShip,
      postal_code: postalCodeShip,
      phone: phoneShip,
      country: countryShip,
    };
    const billingInfo = {
      first_name: firstNameBill,
      last_name: lastNameBill,
      address: addressBill,
      city: cityBill,
      province: provinceBill,
      postal_code: postalCodeBill,
      phone: phoneBill,
      country: countryBill,
    };
    const expMonth = exp.toString().substring(0, 2);
    const expYear = exp.toString().substring(2, 4);
    const token = await stripe.tokens.create({
      card: {
        number: cardNumber,
        cvc,
        exp_month: expMonth,
        exp_year: expYear,
      },
    });

    await db.transaction(async (trx) => {
      if (checkCreditCard) {
        await trx('credit_cards')
          .update({
            number: cardNumber,
            name: cardName,
            expiry: exp,
            cvc,
            is_saved: false,
            updated_at: date,
          })
          .where({ id: checkCreditCard.id });
      } else {
        await trx('credit_cards')
          .insert({
            id: uuidv1(),
            user_id: userId,
            number: cardNumber,
            name: cardName,
            expiry: exp,
            cvc,
            is_saved: false,
            updated_at: date,
            created_at: date,
          });
      }
    });
    const listExchange = await getListExchange(userId);
    const listSell = await getListSell(userId);
    const listDeviceTransactions = await serviceListDeviceTransaction();

    const {
      total,
      totalPay,
      totalDingtoiFee,
      validate,
      listReturn,
    } = listBeforeCheckout(listExchange, listSell, listDeviceTransactions,
      listCart);
    if (!validate) {
      return helper.showSuccessOk(res, { total, list: listReturn, validate });
    }

    const transactionRows = [];
    const transactionExchangeRows = [];
    const transactionDevices = [];
    const orderSellers = [];
    const notificationSellers = [];
    const notificationTransactionSellers = [];
    const notificationOrderSellers = [];

    const settingTransactionSellerMustScan = await db('settings').first('value').where('key', TIMER.TRANSACTION_SELLER_MUST_SCAN);
    const settingTransactionSellerPayShip = await db('settings').first('value').where('key', TIMER.TRANSACTION_SELLER_PAY_CHECKOUT);

    console.log('asasas', settingTransactionSellerMustScan, settingTransactionSellerPayShip);

    for (const [key, lc] of Object.entries(listConfirm)) {
      if (lc[0].selectedRate) {
        const shipResult = await shippo.transaction.create({
          rate: lc[0].selectedRate.object_id,
          label_file_type: 'PDF',
          async: false,
        });
        listConfirm[key][0].selectedRatePaid = shipResult;
        listConfirm[key].map((lck) => {
          for (let i = 0; i < listReturn.length; i++) {
            const it = listReturn[i];
            if (lck.device_id === it.device_id) {
              it.object_id = lc[0].seller_email;
              it.shipping_rate_buyer = {
                selectedRate: lc[0].selectedRate,
                selectedRatePaid: shipResult,
                sellerAddress: lc[0].address,
                sellerCity: lc[0].city,
                sellerState: lc[0].state_code,
                sellerPostalCode: lc[0].zip,
              };
              break;
            }
          }
        });
      }
      if (lc[0].selectedRateExchange) {
        const shipResult = await shippo.transaction.create({
          rate: lc[0].selectedRateExchange.object_id,
          label_file_type: 'PDF',
          async: false,
        });
        listConfirm[key][0].selectedRatePaidExchange = shipResult;
        listConfirm[key].map((lck) => {
          for (let i = 0; i < listReturn.length; i++) {
            const it = listReturn[i];
            if (lck.device_id === it.device_id) {
              it.object_id = lc[0].seller_email;
              it.shipping_rate_buyer = {
                selectedRate: lc[0].selectedRateExchange,
                selectedRatePaid: shipResult,
                sellerAddress: lc[0].address,
                sellerCity: lc[0].city,
                sellerState: lc[0].state_code,
                sellerPostalCode: lc[0].zip,
              };
              break;
            }
          }
        });
      }
    }

    for (let i = 0; i < listReturn.length; i++) {
      const it = listReturn[i];
      transactionDevices.push(it.device_id);
      if (it.proposal_type === EXCHANGE) {
        const transactionId = uuidv1();
        let orderSellerId = uuidv1();
        let flag = true;
        for (let j = 0; j < orderSellers.length; j++) {
          const orderSeller = orderSellers[j];
          if (orderSeller.user_id === it.seller_id) {
            orderSellerId = orderSeller.id;
            flag = false;
            orderSeller.receive_money += Number(it.proposal_exchange_price) > 0 ? Number(it.proposal_exchange_price) : 0;
            orderSeller.money += Number(it.proposal_exchange_price) < 0 ? Math.abs(Number(it.proposal_exchange_price)) : 0;
            break;
          }
        }
        if (flag) {
          const codeNumber = orderNumber.generate();
          const sellerEmail = await db('auth_users').first('email').where('id', it.seller_id);
          orderSellers.push({
            id: orderSellerId,
            code: codeNumber,
            order_id: orderId,
            user_id: it.seller_id,
            receive_money: Number(it.proposal_exchange_price) > 0 ? Number(it.proposal_exchange_price) : 0,
            money: Number(it.proposal_exchange_price) < 0 ? Math.abs(Number(it.proposal_exchange_price)) : 0,
            status: WAITING_FOR_DEVICE_PAYMENT,
            created_at: date,
            updated_at: date,
          });
          notificationOrderSellers.push({
            name: `${NOTIFY.ORDER_SELLER_PAY_SHIP}&${orderSellerId}&${orderNumberId}`,
            type: TYPE.TIMER_ORDER_SELLER,
            timer: settingTransactionSellerPayShip.value,
            id: orderSellerId,
            code: codeNumber,
            order_id: orderId,
            user_id: it.seller_id,
            receive_money: Number(it.proposal_exchange_price) > 0 ? Number(it.proposal_exchange_price) : 0,
            money: Number(it.proposal_exchange_price) < 0 ? Math.abs(Number(it.proposal_exchange_price)) : 0,
            links: null,
            email: sellerEmail.email,
            status: UNREAD,
            created_at: date,
            updated_at: date,
          });
          notificationSellers.push({
            name: `${NOTIFY_ORDER_CREATED}&${orderSellerId}&${orderNumberId}`,
            type: ORDER,
            links: `/my-sales/${orderSellerId}`,
            email: sellerEmail.email,
            status: UNREAD,
            created_at: date,
            updated_at: date,
          });
        }
        transactionRows.push({
          id: transactionId,
          order_id: orderId,
          order_seller_id: orderSellerId,
          is_pay_money_exchange: it.isPayMoneyExchange,
          money: it.price,
          money_not_fee: it.default_price,
          device_id: it.device_id,
          dingtoi_fee_buyer: it.dingtoiFee,
          dingtoi_fee_seller: it.dingtoiFeeSeller,
          status: CREATED,
          transaction_code: orderNumber.generate(),
          created_at: date,
          amount_info: {
            dingtoiFee: it.dingtoiFee,
            tax: 0,
          },
          updated_at: date,
          type: GROUP,
          is_pay_ship: false,
          object_id: it.object_id,
          shipping_rate_buyer: it.shipping_rate_buyer,
        });
        transactionExchangeRows.push({
          id: uuidv1(),
          transaction_id: transactionId,
          status: CREATED,
          transaction_code: orderNumber.generate(),
          device_id: it.device_id,
          order_seller_id: orderSellerId,
          type: BUYER,
          created_at: date,
          updated_at: date,
        });
        for (let j = 0; j <= it.proposal_exchange_devices.length; j++) {
          const exchangeDevice = it.proposal_exchange_devices[j];
          if (exchangeDevice) {
            transactionDevices.push(exchangeDevice.id);
            transactionExchangeRows.push({
              id: uuidv1(),
              transaction_id: transactionId,
              status: CREATED,
              order_seller_id: orderSellerId,
              transaction_code: orderNumber.generate(),
              device_id: exchangeDevice.id,
              type: SELLER,
              created_at: date,
              updated_at: date,
            });
          }
        }
      } else {
        let flag = true;
        let orderSellerId = uuidv1();
        const transactionId = uuidv1();
        for (let j = 0; j < orderSellers.length; j++) {
          const orderSeller = orderSellers[j];
          if (orderSeller.user_id === it.seller_id) {
            orderSellerId = orderSeller.id;
            flag = false;
            orderSeller.money += Number(it.default_price);
            break;
          }
        }
        if (flag) {
          orderSellers.push({
            id: orderSellerId,
            code: orderNumber.generate(),
            order_id: orderId,
            user_id: it.seller_id,
            money: Number(it.default_price),
            receive_money: 0,
            status: CREATED,
            created_at: date,
            updated_at: date,
          });
          const sellerEmail = await db('auth_users').first('email').where('id', it.seller_id);
          const device = await db('devices')
            .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
            .innerJoin('rams', 'devices.ram_id', 'rams.id')
            .innerJoin('colors', 'devices.color_id', 'colors.id')
            .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
            .innerJoin('models', 'imeis.model_id', 'models.id')
            .innerJoin('categories', 'models.category_id', 'categories.id')
            .innerJoin('brands', 'models.brand_id', 'brands.id')
            .first(
              'devices.id as device_id',
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
            )
            .where('devices.id', it.device_id);
          notificationSellers.push({
            name: `${NOTIFY_ORDER_CREATED}&${orderSellerId}&${orderNumberId}`,
            type: TYPE.ORDER,
            links: `/my-sales/${orderSellerId}`,
            email: sellerEmail.email,
            status: UNREAD,
            created_at: date,
            updated_at: date,
          });
          notificationTransactionSellers.push({
            name: `${NOTIFY.TRANSACTION_STARTED}&${device.model}&${device.color}&${device.capacity}`,
            type: TYPE.TIMER_TRANSACTION,
            links: null,
            id: transactionId,
            timer: settingTransactionSellerMustScan.value,
            email: sellerEmail.email,
            status: UNREAD,
            created_at: date,
            updated_at: date,
          });
        }
        transactionRows.push({
          id: transactionId,
          order_seller_id: orderSellerId,
          order_id: orderId,
          money: it.price,
          money_not_fee: it.default_price,
          dingtoi_fee_buyer: it.dingtoiFee,
          dingtoi_fee_seller: it.dingtoiFeeSeller,
          device_id: it.device_id,
          status: CREATED,
          transaction_code: orderNumber.generate(),
          created_at: date,
          updated_at: date,
          type: BUYER,
          is_pay_ship: true,
          amount_info: {
            dingtoiFee: it.dingtoiFee,
            tax: 0,
          },
          object_id: it.object_id,
          shipping_rate_buyer: it.shipping_rate_buyer,
        });
      }
    }

    const deviceIdsTransaction = mapArrObjToArr(transactionRows, 'device_id');
    const deviceIdsTransactionExchange = mapArrObjToArr(transactionExchangeRows, 'device_id');

    const deviceIds = deviceIdsTransaction.concat(deviceIdsTransactionExchange);

    const deviceIdsSQL = convertArrToSql(deviceIds);

    let proposalIds = [];
    let cartIds = [];
    if (deviceIdsSQL) {
      const proposals = await db.raw(`
        SELECT DISTINCT proposals.id as proposal_id, proposals.cart_id as cart_id
        FROM proposals,
        jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
        WHERE arr.item_object->>'id' IN ${deviceIdsSQL}
      `);
      proposalIds = mapArrObjToArr(proposals.rows, 'proposal_id');
      cartIds = mapArrObjToArr(proposals.rows, 'cart_id');
    }

    const amount = Number(totalShipping) + Number(totalPay) + Number(totalDingtoiFee);
    const amountInfoNew = { ...amountInfo };
    amountInfoNew.totalRealPay = Number(totalPay);

    const walletsGlobal = await db('auth_users').first('email', 'wallet').whereIn('email', [GLOBAL_USER]);
    const walletGlobal = Number(walletsGlobal.wallet);

    const charge = await stripe.charges.create({
      amount: Math.ceil(amount) * 100,
      currency: 'cad',
      source: token.id,
      description: 'Payment for dingtoi',
    });

    const optionTransactionSellerMustScan = QUEUE.OPTION_DEFAULT;
    const optionOrderSellerPayShip = QUEUE.OPTION_DEFAULT;
    optionTransactionSellerMustScan.delay = settingTransactionSellerMustScan.value;
    optionOrderSellerPayShip.delay = settingTransactionSellerPayShip.value;

    await db.transaction(async (trx) => {
      if (proposalIds.length > 0) {
        await trx('available_devices').update('proposal_id', null).whereIn('proposal_id', proposalIds);
        await trx('proposal_snapshots').whereIn('proposal_id', proposalIds).del();
        await trx('proposals').whereIn('id', proposalIds).del();
        await trx('carts').whereIn('id', cartIds).del();
      }
      await trx('available_devices').update('proposal_id', null).whereIn('device_id', deviceIds);
      // eslint-disable-next-line func-names
      await trx.from('proposal_snapshots').whereIn('cart_id', function () {
        return this.from('carts').distinct('id').whereIn('device_id', deviceIds);
      }).delete();
      // eslint-disable-next-line func-names
      await trx.from('proposals').whereIn('cart_id', function () {
        return this.from('carts').distinct('id').whereIn('device_id', deviceIds);
      }).delete();
      await trx('wishlists').whereIn('device_id', deviceIds).del();
      await trx('tracing_wishlists').whereIn('device_id', deviceIds).del();
      await trx('carts').whereIn('device_id', deviceIds).del();
      await trx('tracing_carts').whereIn('device_id', deviceIds).del();
      await trx('orders').insert({
        id: orderId,
        order_number: orderNumberId,
        total_money: total,
        total_shipping: totalShipping,
        user_id: userId,
        status,
        shipping_info: shippingInfo,
        billing_info: billingInfo,
        charge_stripe: charge.id,
        created_at: date,
        updated_at: date,
        invoice_info: listConfirm,
        amount_info: amountInfoNew,
      });
      await trx.batchInsert('orders_seller', orderSellers, 100);
      await trx.batchInsert('notifications', notificationSellers, 100);
      await trx.batchInsert('transactions', transactionRows, 100);
      await trx.batchInsert('transactions_exchange', transactionExchangeRows, 100);
      await trx('devices').update('status', IN_TRANSACTION).whereIn('id', transactionDevices);

      await trx('auth_users').update('wallet', Number(walletGlobal) + amount).where('email', GLOBAL_USER);
    });

    transactionRows.map((trans) => {
      if (trans.is_pay_ship) {
        queueSellerMustScan.add({ transactionId: trans.id }, optionTransactionSellerMustScan);
      }
    });

    orderSellers.map((os) => {
      queueSellerPayShip.add({ orderSellerId: os.id }, optionOrderSellerPayShip);
    });

    if (socket.connected) {
      notificationTransactionSellers.map((notiTrSel) => {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notiTrSel);
      });
      notificationSellers.map((notification) => {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
      });
      notificationOrderSellers.map((notification) => {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
      });
    }

    return helper.showSuccessOk(res, {
      total, list: listReturn, validate, id: orderId,
    });
  } catch (error) {
    console.log('error', error);
    let message = '';
    if (error.type) {
      switch (error.type) {
        case 'StripeCardError':
          // A declined card error
          message = error.message;
          break;
        case 'StripeRateLimitError':
          // Too many requests made to the API too quickly
          break;
        case 'StripeInvalidRequestError':
          // Invalid parameters were supplied to Stripe's API
          break;
        case 'StripeAPIError':
          // An error occurred internally with Stripe's API
          break;
        case 'StripeConnectionError':
          // Some kind of error occurred during the HTTPS communication
          break;
        case 'StripeAuthenticationError':
          // You probably used an incorrect API key
          break;
        default:
          // Handle any other types of unexpected errors
          break;
      }
    }
    if (message) {
      return res.status(500).json({
        obj: message,
      });
    }
    return helper.showServerError(res, error);
  }
};

export const transactionDetail = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  const { id } = req.params;
  try {
    let transaction = await db('transactions')
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .first(
        'transactions.id',
        'transactions.questions',
        'transactions.transaction_code',
        'transactions.updated_at',
        'transactions.created_at',
        'transactions.status',
        'transactions.shipping_rate_buyer',
        'transactions.shipping_rate_seller',
        'transactions.password_machine as passcode',
        'orders.user_id',
        'orders.id as order_id',
        'orders.order_number',
        'orders_seller.code as order_seller_number',
        'orders_seller.id as order_seller_id',
        'orders.shipping_info',
        'orders.billing_info',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'device_images.url',
        'devices.id as device_id',
        'models.name as model',
        'brands.name as brand_name',
        'auth_users.email',
        'transactions.type',
        'imeis.id as imei_id',
      )
      .where('transactions.id', id)
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      });
    if (!transaction) {
      transaction = await db('transactions_exchange')
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .first(
          'transactions_exchange.transaction_code',
          'transactions_exchange.updated_at',
          'transactions_exchange.questions',
          'transactions_exchange.created_at',
          'transactions_exchange.password_machine as passcode',
          'transactions_exchange.status',
          'transactions.shipping_rate_buyer',
          'transactions_exchange.shipping_rate_buyer as shipping_rate_seller',
          'transactions_exchange.id',
          'orders.user_id',
          'orders.id as order_id',
          'orders.order_number',
          'orders.shipping_info',
          'orders.billing_info',
          'orders_seller.code as order_seller_number',
          'orders_seller.id as order_seller_id',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'device_images.url',
          'devices.id as device_id',
          'models.name as model',
          'brands.name as brand_name',
          'auth_users.email',
          'transactions_exchange.type',
        )
        .where('transactions_exchange.id', id)
        .where(function () {
          this.where('device_images.main', 'true').orWhere('device_images.main', null);
        });
    }

    if (transaction) {
      const sellerInfo = await db('auth_users')
        .innerJoin('devices', 'devices.user_id', 'auth_users.id')
        .first('auth_users.*')
        .where('devices.id', transaction.device_id);

      const transactionsNotReady = await db('transactions')
        .select(
          'transactions.*',
          'rams.value as ram',
          'colors.name as color',
          'capacities.value as capacity',
          'devices.id as device_id',
          'models.name as model',
          'auth_users.email as device_email',
          'orders_seller.charge_stripe',
        )
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
        .whereIn('transactions.status', [TRANSACTION_STATUS.CREATED, TRANSACTION_STATUS.OWNER_SCANNED])
        .whereNotIn('transactions.id', [transaction.id])
        .where('transactions.order_seller_id', transaction.order_seller_id);
      transaction.seller_email = censorEmail(sellerInfo.email);
      transaction.is_buyer = userId === transaction.user_id;
      transaction.transactionsNotReady = transactionsNotReady;
      if (!transaction.is_buyer) {
        transaction.shipping_info = null;
        transaction.billing_info = null;
      }

      let deviceLastScan = null;
      let deviceCompareScan = null;

      if (transaction.status !== TRANSACTION_STATUS.BUYER_ACCEPT
        && transaction.status !== TRANSACTION_STATUS.BUYER_REJECTED) {
        deviceLastScan = await db('device_scans')
          .innerJoin('devices', 'devices.id', 'device_scans.real_device_id')
          .first('device_scans.*', 'devices.physical_grading')
          .where('devices.id', transaction.device_id)
          .where('device_scans.type', TRANSACTION_SUMMARY)
          .orderBy('device_scans.updated_at', 'DESC');
      } else {
        deviceLastScan = await db('device_scans')
          .innerJoin('devices', 'devices.id', 'device_scans.real_device_id')
          .first('device_scans.*', 'devices.physical_grading')
          .where('devices.id', transaction.device_id)
          .where('device_scans.type', TRANSACTION_SUMMARY)
          .orderBy('device_scans.updated_at', 'DESC');
        deviceCompareScan = await db('device_scans')
          .innerJoin('available_devices', 'available_devices.device_scan_id', 'device_scans.id')
          .innerJoin('devices', 'devices.id', 'device_scans.real_device_id')
          .first('device_scans.*', 'devices.physical_grading')
          .where('available_devices.device_id', transaction.device_id)
          .where('device_scans.type', TRANSACTION_LOCK_SUMMARY)
          .orderBy('device_scans.updated_at', 'DESC');
      }

      transaction.device_last_scan = deviceLastScan;
      transaction.device_compare_scan = deviceCompareScan;
    }
    return helper.showSuccessOk(res, transaction);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const getPaymentHistory = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const histories = await db('payment_histories').select().where('user_id', userId);
    return helper.showSuccessOk(res, histories);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const transactionSubmitPasscode = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { passcode, id } = req.body;
  const date = new Date();
  try {
    let order = await db('transactions')
      .first(
        'orders.id',
        'transactions.money',
        'transactions.type as transaction_type',
        'transactions.order_seller_id',
        'transactions.id as transaction_id',
        'auth_users.email as buyer_email',
        'auth_users.id as buyer_id',
        'models.name as device_name',
        'capacities.value as capacity_name',
        'colors.name as color_name',
        'devices.id as device_id',
      )
      .innerJoin('orders', 'orders.id', 'transactions.order_id')
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
      .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('available_devices.device_app_id', id)
      .orderBy('transactions.created_at', 'desc');

    if (!order) {
      order = await db('transactions_exchange')
        .first(
          'orders.id',
          'transactions_exchange.order_seller_id',
          'transactions_exchange.id as transaction_id',
          'transactions_exchange.type as transaction_type',
          'auth_users.email as buyer_email',
          'auth_users.id as buyer_id',
          'models.name as device_name',
          'capacities.value as capacity_name',
          'colors.name as color_name',
          'devices.id as device_id',
        )
        .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
        .innerJoin('available_devices', 'available_devices.device_id', 'devices.id')
        .innerJoin('auth_users', 'auth_users.id', 'orders.user_id')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .leftJoin('device_images', 'devices.id', 'device_images.device_id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .where('available_devices.device_app_id', id)
        .orderBy('transactions_exchange.created_at', 'desc');
    }

    const notificationBuyer = {
      name: `${NOTIFY.TRANSACTION_SUBMIT_PASSCODE}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
      type: TYPE.TRANSACTION,
      links: order.transaction_id,
      email: order.buyer_email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    // const transactionsSell = await db('orders_seller')
    //   .innerJoin('transactions', 'transactions.order_seller_id', 'orders_seller.id')
    //   .select('transactions.*')
    //   .where('orders_seller.id', order.order_seller_id);

    // const totalIdsSubmittedPasscode = [];
    // let changeStatusShipped = false;

    // transactionsSell.map((trs) => {
    //   if (trs.status === OWNER_SCANNED && trs.password_machine !== null) {
    //     totalIdsSubmittedPasscode.push(trs.id);
    //   }
    // });

    // if (totalIdsSubmittedPasscode.length === transactionsSell.length - 1) {
    //   changeStatusShipped = true;
    //   totalIdsSubmittedPasscode.push(id);
    // }

    await db.transaction(async (trx) => {
      await trx('transactions').update({
        password_machine: passcode,
        updated_at: date,
      }).where('id', id);
      await trx('transactions_exchange').update({
        password_machine: passcode,
        updated_at: date,
      }).where('id', id);

      await trx('transactions').update({
        status: TRANSACTION_STATUS.READY,
        updated_at: date,
      }).where('id', id);

      await trx('transactions_exchange').update({
        status: TRANSACTION_STATUS.READY,
        updated_at: date,
      }).where('id', id);

      // if (changeStatusShipped) {
      //   await trx('transactions').update({
      //     status: TRANSACTION_STATUS.BUYER_RECEIVED,
      //   }).whereIn('id', totalIdsSubmittedPasscode);

      //   await trx('transactions_exchange').update({
      //     status: TRANSACTION_STATUS.BUYER_RECEIVED,
      //   }).whereIn('id', totalIdsSubmittedPasscode);
      // }

      const notBuyer = await trx('notifications').returning('id').insert(notificationBuyer);
      // eslint-disable-next-line prefer-destructuring
      notificationBuyer.id = notBuyer[0];
    });

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationBuyer);
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const transactionBuyerReceived = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { id } = req.body;
  const date = new Date();
  try {
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
      .where('available_devices.device_app_id', id)
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
        .where('available_devices.device_app_id', id)
        .orderBy('transactions_exchange.created_at', 'desc');
    }

    const notificationSeller = {
      name: `${NOTIFY.TRANSACTION_BUYER_RECEIVED}&${order.device_name} - ${order.capacity_name} GB - ${order.color_name}`,
      type: TYPE.TRANSACTION,
      links: order.transaction_id,
      email: order.seller_email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    await db.transaction(async (trx) => {
      await trx('transactions').update({
        status: TRANSACTION_STATUS.BUYER_RECEIVED,
      }).where('id', id);
      await trx('transactions_exchange').update({
        status: TRANSACTION_STATUS.BUYER_RECEIVED,
      }).where('id', id);

      const notSeller = await trx('notifications').returning('id').insert(notificationSeller);
      // eslint-disable-next-line prefer-destructuring
      notificationSeller.id = notSeller[0];
    });

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const listTransactionsReadyToPickup = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { id } = req.body;
  try {
    const transactions = await db('transactions')
      .select(
        'transactions.*',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'devices.id as device_id',
        'models.name as model',
      )
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .whereIn('transactions.status', [TRANSACTION_STATUS.READY])
      .where('transactions.order_seller_id', id);

    return helper.showSuccessOk(res, transactions);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const listTransactionsPurchaseReadyToPickup = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { id } = req.body;
  try {
    const transactions = await db('transactions_exchange')
      .select(
        'transactions_exchange.*',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'devices.id as device_id',
        'models.name as model',
        'transactions.order_id as order_id',
      )
      .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .whereIn('transactions_exchange.status', [TRANSACTION_STATUS.READY])
      .where('transactions.order_id', id);

    return helper.showSuccessOk(res, transactions);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const createTransactionPickup = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { id, objPickup } = req.body;
  try {
    const transactions = await db('transactions')
      .select(
        'transactions.*',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'devices.id as device_id',
        'models.name as model',
      )
      .innerJoin('devices', 'devices.id', 'transactions.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .whereIn('transactions.status', [TRANSACTION_STATUS.READY])
      .where('transactions.order_seller_id', id);

    if (transactions.length > 0) {
      const transaction = transactions[0];
      const transactionIds = [];

      transactions.map((trs) => {
        transactionIds.push(trs.id);
      });

      if (transaction.shipping_rate_seller) {
        transaction.shipping_rate_seller.selectedPickup = objPickup;
      } else {
        transaction.shipping_rate_seller = {
          selectedPickup: objPickup,
        };
      }

      const date = new Date();
      await db.transaction(async (trx) => {
        await trx('transactions').update({
          status: TRANSACTION_STATUS.TO_BE_SHIPPED,
          shipping_rate_seller: transaction.shipping_rate_seller,
          updated_at: date,
        }).whereIn('id', transactionIds);
        // await trx('transactions_exchange').update({
        //   status: TRANSACTION_STATUS.TO_BE_SHIPPED,
        //   shipping_rate_seller: transaction.shipping_rate_seller,
        // }).where('id', id);
      });
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export const createTransactionPurchasePickup = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { id, objPickup } = req.body;
  try {
    const transactions = await db('transactions_exchange')
      .select(
        'transactions_exchange.*',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'devices.id as device_id',
        'models.name as model',
      )
      .innerJoin('transactions', 'transactions.id', 'transactions_exchange.transaction_id')
      .innerJoin('devices', 'devices.id', 'transactions_exchange.device_id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .whereIn('transactions_exchange.status', [TRANSACTION_STATUS.READY])
      .where('transactions.order_id', id);

    if (transactions.length > 0) {
      const transaction = transactions[0];
      const transactionIds = [];

      transactions.map((trs) => {
        transactionIds.push(trs.id);
      });

      transaction.shipping_rate_buyer = {
        selectedPickup: objPickup,
      };

      await db.transaction(async (trx) => {
        await trx('transactions_exchange').update({
          status: TRANSACTION_STATUS.TO_BE_SHIPPED,
          shipping_rate_buyer: transaction.shipping_rate_buyer,
        }).whereIn('id', transactionIds);
        // await trx('transactions_exchange').update({
        //   status: TRANSACTION_STATUS.TO_BE_SHIPPED,
        //   shipping_rate_seller: transaction.shipping_rate_seller,
        // }).where('id', id);
      });
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export default {
  confirmOrder,
  listOrder,
  detailOrder,
  listTransactionSeller,
};
