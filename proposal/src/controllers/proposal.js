/* eslint-disable no-await-in-loop */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable array-callback-return */
/* eslint-disable func-names */
/* eslint-disable camelcase */
import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import socket from '../adapters/socket';
import db from '../adapters/db';
import {
  BUYER_ACCEPT,
  BUYER_CREATED, BUYER_REPLY, PROPOSAL_BUYER, PROPOSAL_SELLER, PROPOSAL_COMMON_NOTIFY,
  PROPOSAL_DELETE_NOTIFY,
  SELLER_ACCEPT, SELLER_REJECT, SELLER_REPLY,
  SOCKET_NOTIFICATION_MESSAGE,
  UNREAD,
  SELLER_CANCEL_ACCEPT,
  optionsQueueAcceptProposal,
  BUYER_REMOVED,
  sellerAcceptProposalTime,
  ERR_PROPOSAL_STILL_ACCEPTED,
  SYSTEM_CANCEL_ACCEPT,
} from '../config';
import {
  censorEmail,
  convertMoneyExchangeForBuyer,
  convertMoneyExchangeForSeller,
  convertMoneySellForBuyer,
  convertMoneySellForSeller,
  errorProposalSuccess,
  mapArrObjToArr,
} from '../functions';
import queue from '../adapters/queueAcceptProposal';

export const checkProposalsTimeout = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { listIds } = req.body;
  try {
    const jobs = await queue.getJobs();
    const listProposalStillAccepted = [];
    jobs.map((job) => {
      const { proposalId } = job.data;
      listProposalStillAccepted.push(proposalId);
    });
    let flag = true;
    for (let i = 0; i < listIds.length; i++) {
      const id = listIds[i];
      if (!listProposalStillAccepted.includes(id)) {
        flag = false;
        break;
      }
    }
    if (flag) { return helper.showSuccessOk(res, helper.SUCCESS); }
    return helper.showSuccessOk(res, ERR_PROPOSAL_STILL_ACCEPTED);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const listProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;
  try {
    const
      {
        deviceId, offset, limit, filter, sort,
      } = req.body;
    if (!limit) return helper.showClientEmpty(res);
    if (!filter) return helper.showClientEmpty(res);
    if (!deviceId) return helper.showClientEmpty(res);

    const { deviceName, type, status } = filter;

    const query = db('proposals')
      .join('carts', 'carts.id', 'proposals.cart_id')
      .innerJoin('auth_users', 'auth_users.id', 'carts.user_id')
      .innerJoin('devices', 'devices.id', 'carts.device_id')
      .innerJoin('available_devices', 'available_devices.device_id', 'carts.device_id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .select(
        'devices.status as device_status',
        'auth_users.email as cart_email',
        'proposals.id',
        'carts.type as cart_type',
        'carts.id as cart_id',
        'proposals.buyer_sale_price',
        'proposals.buyer_real_sale_price',
        'proposals.buyer_exchange_price',
        'proposals.buyer_real_exchange_price',
        'proposals.type as proposal_type',
        'proposals.status as proposal_status',
        'proposals.exchange_devices',
        'proposals.questions',
        'proposals.created_at',
        'proposals.updated_at',
        'imeis.imei as imei',
        'devices.physical_grading',
        'rams.value as ram',
        'colors.name as color',
        'capacities.value as capacity',
        'models.id as model_id',
        'models.name as model',
        'categories.name as category_name',
        'brands.name as brand_name',
        'device_images.url',
        'available_devices.proposal_id as is_proposal_accept',
        'available_devices.real_sale_price as price',
        'available_devices.exchange_model as exchange_model',
        'available_devices.real_exchange_price as exchange_price',
      )
      .where('models.name', 'ILIKE', `%${deviceName}%`)
      .where('proposals.status', 'like', `%${status}%`)
      .where('proposals.type', 'like', `%${type}%`)
      .where('proposals.seller_id', userId)
      .where('device_images.main', 'true')
      .where('devices.id', deviceId)
      .where('proposals.status', '<>', SELLER_REJECT)
      .where('proposals.status', '<>', SYSTEM_CANCEL_ACCEPT)
      .offset(offset)
      .limit(limit);

    const queryCount = db('proposals')
      .join('carts', 'carts.id', 'proposals.cart_id')
      .innerJoin('devices', 'devices.id', 'carts.device_id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('rams', 'devices.ram_id', 'rams.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('categories', 'models.category_id', 'categories.id')
      .innerJoin('brands', 'models.brand_id', 'brands.id')
      .count('devices.id', { as: 'count' })
      .where('models.name', 'ILIKE', `%${deviceName}%`)
      .where('devices.id', deviceId)
      .where('proposals.status', 'like', `%${status}%`)
      .where('proposals.type', 'like', `%${type}%`)
      .where('proposals.seller_id', userId)
      .where('proposals.status', '<>', SELLER_REJECT)
      .where('proposals.status', '<>', SYSTEM_CANCEL_ACCEPT)
      .first();

    if (sort) {
      if (sort.price === 'price_asc') {
        query.orderBy('proposals.buyer_real_sale_price', 'asc');
      } else if (sort.price === 'price_desc') {
        query.orderBy('proposals.buyer_real_sale_price', 'desc');
      }
    }

    query.orderBy('proposals.updated_at', 'desc');

    const list = await query;
    const countRow = await queryCount;
    list.map((l) => {
      if (l.cart_email) {
        l.cart_email = censorEmail(l.cart_email);
      }
    });

    return helper.showSuccessOk(res, {
      list,
      count: countRow.count,
    });
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const buyerDeleteProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    proposalId, cartId,
  } = req.body;

  if (!proposalId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  const date = new Date();

  const device = await db('devices')
    .first(
      'devices.id',
      'devices.user_id',
      'colors.name as color',
      'capacities.value as capacity',
      'models.name as model',
      'auth_users.email',
    )
    .innerJoin('carts', 'carts.device_id', 'devices.id')
    .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
    .innerJoin('colors', 'devices.color_id', 'colors.id')
    .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
    .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
    .innerJoin('models', 'imeis.model_id', 'models.id')
    .where('carts.id', cartId);

  const notification = {
    name: `${BUYER_REMOVED}&${device.model} - ${device.capacity} - ${device.color}`,
    type: PROPOSAL_BUYER,
    links: `/my-devices/offers/${device.id}/${cartId}`,
    email: device.email,
    status: UNREAD,
    created_at: date,
    updated_at: date,
  };

  try {
    await db.transaction(async (trx) => {
      await trx('available_devices').update({ proposal_id: null }).where('proposal_id', proposalId);
      await trx('proposal_snapshots').where('proposal_id', proposalId).del();
      await trx('proposals').where('id', proposalId).del();
      const not = await trx('notifications').returning('id').insert(notification);
      // eslint-disable-next-line prefer-destructuring
      notification.id = not[0];
    });
    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
    }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const sellerDeleteProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id,
  } = req.params;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  const date = new Date();

  try {
    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id').where('id', id);
    const buyerId = proposal.buyer_id;
    const user = await db('auth_users').first('email').where('id', buyerId);
    await db.transaction(async (trx) => {
      await trx('available_devices').update({ proposal_id: null }).where('proposal_id', id);
      await trx('proposal_snapshots').where('proposal_id', id).del();
      await trx('proposals').where('id', id).del();
    });
    const notification = {
      name: PROPOSAL_DELETE_NOTIFY,
      type: PROPOSAL_SELLER,
      links: '/cart',
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
      proposal_id: id,
    };
    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
    }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const updateBuyerReplyProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  const {
    id,
    cartId,
    buyerSalePrice,
    buyerExchangePrice,
    type,
    exchangeDevices,
  } = req.body;

  const date = new Date();

  try {
    const availableDevices = await db('available_devices')
      .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .first('available_devices.id', 'available_devices.device_id', 'available_devices.proposal_id')
      .where('proposals.id', id);

    if (availableDevices.proposal_id) {
      return errorProposalSuccess(res);
    }

    const setting = await db('settings')
      .first('value')
      .where({ key: 'ratio_price' });

    const device = await db('devices')
      .first(
        'devices.id',
        'devices.user_id',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
      )
      .innerJoin('carts', 'carts.device_id', 'devices.id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('carts.id', cartId);

    const sellerId = device.user_id;
    const ratioPrice = Number(setting.value);
    let buyerRealSalePrice = Number(buyerSalePrice);
    let buyerRealExchangePrice = Number(buyerExchangePrice);
    const user = await db('auth_users').first('email').where('id', sellerId);

    buyerRealSalePrice = convertMoneySellForBuyer(buyerRealSalePrice, ratioPrice);
    buyerRealExchangePrice = convertMoneyExchangeForBuyer(buyerRealExchangePrice, ratioPrice);
    const idSnapshot = uuidv1();
    const notification = {
      name: `${BUYER_CREATED}&${device.model} - ${device.capacity} GB - ${device.color}`,
      type: PROPOSAL_BUYER,
      links: `/my-devices/offers/${device.id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };
    await db.transaction(async (trx) => {
      await trx('proposals').update({
        cart_id: cartId,
        seller_id: sellerId,
        buyer_id: userId,
        buyer_sale_price: buyerSalePrice,
        buyer_real_sale_price: buyerRealSalePrice,
        buyer_exchange_price: buyerExchangePrice,
        buyer_real_exchange_price: buyerRealExchangePrice,
        type,
        status: BUYER_REPLY,
        updated_at: date,
        exchange_devices: exchangeDevices
          ? JSON.stringify(exchangeDevices)
          : null,
      }).where('id', id);
      await trx('proposal_snapshots').insert({
        id: idSnapshot,
        cart_id: cartId,
        seller_id: sellerId,
        buyer_id: userId,
        buyer_sale_price: buyerSalePrice,
        buyer_real_sale_price: buyerRealSalePrice,
        buyer_exchange_price: buyerExchangePrice,
        buyer_real_exchange_price: buyerRealExchangePrice,
        type,
        status: BUYER_REPLY,
        created_at: date,
        updated_at: date,
        proposal_id: id,
        exchange_devices: exchangeDevices
          ? JSON.stringify(exchangeDevices)
          : null,
      });
      const not = await trx('notifications').returning('id').insert(notification);
      // eslint-disable-next-line prefer-destructuring
      notification.id = not[0];
    });

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
    }
    return helper.showSuccessOk(res, id);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const updateSellerReplyProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  const {
    id,
    cartId,
    buyerSalePrice,
    buyerExchangePrice,
    type,
    exchangeDevices,
  } = req.body;

  const date = new Date();

  try {
    const availableDevices = await db('available_devices')
      .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .first('available_devices.id', 'available_devices.device_id', 'available_devices.proposal_id')
      .where('proposals.id', id);

    if (availableDevices.proposal_id) {
      return errorProposalSuccess(res);
    }

    const setting = await db('settings')
      .first('value')
      .where({ key: 'ratio_price' });

    const ratioPrice = Number(setting.value);
    let buyerRealSalePrice = Number(buyerSalePrice);
    let buyerRealExchangePrice = Number(buyerExchangePrice);

    buyerRealSalePrice = convertMoneySellForSeller(buyerRealSalePrice, ratioPrice);
    buyerRealExchangePrice = convertMoneyExchangeForSeller(buyerRealExchangePrice, ratioPrice);

    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id').where('id', id);
    const buyerId = proposal.buyer_id;
    const user = await db('auth_users').first('email').where('id', buyerId);

    const notification = {
      name: PROPOSAL_COMMON_NOTIFY,
      type: PROPOSAL_SELLER,
      links: `/cart?id=${id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    const idSnapshot = uuidv1();
    await db.transaction(async (trx) => {
      await trx('proposals').update({
        cart_id: cartId,
        buyer_id: buyerId,
        seller_id: userId,
        buyer_sale_price: buyerSalePrice,
        buyer_real_sale_price: buyerRealSalePrice,
        buyer_exchange_price: buyerExchangePrice === 0
          ? buyerExchangePrice : -Number(buyerExchangePrice),
        buyer_real_exchange_price: buyerRealExchangePrice,
        type,
        status: SELLER_REPLY,
        updated_at: date,
        exchange_devices: exchangeDevices
          ? JSON.stringify(exchangeDevices)
          : null,
      }).where('id', id);
      await trx('proposal_snapshots').insert({
        id: idSnapshot,
        cart_id: cartId,
        buyer_id: buyerId,
        seller_id: userId,
        buyer_sale_price: buyerSalePrice,
        buyer_real_sale_price: buyerRealSalePrice,
        buyer_exchange_price: buyerExchangePrice === 0
          ? buyerExchangePrice : -Number(buyerExchangePrice),
        buyer_real_exchange_price: buyerRealExchangePrice,
        type,
        status: SELLER_REPLY,
        created_at: date,
        updated_at: date,
        proposal_id: id,
        exchange_devices: exchangeDevices
          ? JSON.stringify(exchangeDevices)
          : null,
      });
      await trx('notifications').insert(notification);
    });

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
    }
    return helper.showSuccessOk(res, id);
  } catch (error) {
    // console.log(error);
    return helper.showServerError(res, error);
  }
};

const addBuyerCreatedProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  const {
    cartId,
    buyerSalePrice,
    buyerExchangePrice,
    type,
    exchangeDevices,
  } = req.body;

  const id = uuidv1();
  const date = new Date();

  try {
    const setting = await db('settings')
      .first('value')
      .where({ key: 'ratio_price' });

    const device = await db('devices')
      .first(
        'devices.id',
        'devices.user_id',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
      )
      .innerJoin('carts', 'carts.device_id', 'devices.id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('carts.id', cartId);

    const availableDevices = await db('available_devices')
      .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
      .first('available_devices.id', 'available_devices.device_id', 'available_devices.proposal_id')
      .where('carts.id', cartId);
    if (!availableDevices) {
      return errorProposalSuccess(res);
    }

    if (availableDevices.proposal_id) {
      return errorProposalSuccess(res);
    }

    const sellerId = device.user_id;
    const user = await db('auth_users').first('email').where('id', sellerId);
    const ratioPrice = Number(setting.value);
    let buyerRealSalePrice = Number(buyerSalePrice);
    let buyerRealExchangePrice = Number(buyerExchangePrice);
    buyerRealSalePrice = convertMoneySellForBuyer(buyerRealSalePrice, ratioPrice);
    buyerRealExchangePrice = convertMoneyExchangeForBuyer(buyerRealExchangePrice, ratioPrice);
    const notification = {
      name: `${BUYER_CREATED}&${device.model} - ${device.capacity} GB - ${device.color}`,
      type: PROPOSAL_BUYER,
      links: `/my-devices/offers/${device.id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };
    await db.transaction(async (trx) => {
      await trx('proposals').insert({
        id,
        cart_id: cartId,
        seller_id: sellerId,
        buyer_id: userId,
        buyer_sale_price: buyerSalePrice,
        buyer_real_sale_price: buyerRealSalePrice,
        buyer_exchange_price: buyerExchangePrice,
        buyer_real_exchange_price: buyerRealExchangePrice,
        type,
        status: BUYER_CREATED,
        created_at: date,
        updated_at: date,
        exchange_devices: exchangeDevices
          ? JSON.stringify(exchangeDevices)
          : null,
      });
      await trx('proposal_snapshots').insert({
        id,
        cart_id: cartId,
        seller_id: sellerId,
        buyer_id: userId,
        buyer_sale_price: buyerSalePrice,
        buyer_real_sale_price: buyerRealSalePrice,
        buyer_exchange_price: buyerExchangePrice,
        buyer_real_exchange_price: buyerRealExchangePrice,
        type,
        status: BUYER_CREATED,
        created_at: date,
        updated_at: date,
        proposal_id: id,
        exchange_devices: exchangeDevices
          ? JSON.stringify(exchangeDevices)
          : null,
      });
      const not = await trx('notifications').returning('id').insert(notification);
      // eslint-disable-next-line prefer-destructuring
      notification.id = not[0];
    });

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
    }
    return helper.showSuccessOk(res, id);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const detailProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id,
  } = req.params;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  try {
    const detail = await db('proposals')
      .innerJoin('carts', 'carts.id', 'proposals.cart_id')
      .innerJoin('available_devices', 'available_devices.device_id', 'carts.device_id')
      .innerJoin('devices', 'devices.id', 'available_devices.device_id')
      .innerJoin('imeis', 'devices.imei_id', 'imeis.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .leftJoin('device_images', 'devices.id', 'device_images.device_id')
      .select('proposals.id', 'proposals.cart_id', 'proposals.seller_id',
        'proposals.buyer_id', 'proposals.buyer_sale_price', 'proposals.buyer_real_sale_price',
        'proposals.buyer_exchange_price', 'proposals.buyer_real_exchange_price', 'proposals.type', 'proposals.status',
        'proposals.exchange_devices', 'proposals.created_at', 'proposals.updated_at', 'available_devices.real_sale_price as device_sale_price',
        'models.name as device_name', 'device_images.url', 'colors.name as color',
        'capacities.value as capacity')
      .where('proposals.id', id)
      .where(function () {
        this.where('device_images.main', 'true').orWhere('device_images.main', null);
      })
      .first();

    if (detail) {
      if (detail.exchange_devices) {
        if (detail.exchange_devices.length > 0) {
          const idsExchangeDevices = mapArrObjToArr(detail.exchange_devices, 'id');

          const listExchangeDevices = await db('devices')
            .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
            .join('imeis', 'devices.imei_id', 'imeis.id')
            .leftJoin('device_images', 'devices.id', 'device_images.device_id')
            .innerJoin('rams', 'imeis.ram_id', 'rams.id')
            .innerJoin('colors', 'imeis.color_id', 'colors.id')
            .innerJoin('capacities', 'imeis.capacity_id', 'capacities.id')
            .innerJoin('models', 'imeis.model_id', 'models.id')
            .innerJoin('categories', 'models.category_id', 'categories.id')
            .innerJoin('brands', 'models.brand_id', 'brands.id')
            .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
            .select(
              'available_devices.sale_price',
              'available_devices.real_sale_price',
              'available_devices.exchange_price',
              'available_devices.real_exchange_price',
              'available_devices.exchange_model',
              'devices.id as id',
              'devices.id as device_id',
              'devices.status',
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
              'device_images.url',
              db.raw('device_scans.main_info -> \'diamondRating\' AS diamond_rating'),
              db.raw('device_scans.main_info -> \'url_summary_report\' AS tomrot_scan_image'),
            )
            .where(function () {
              this.where('device_images.main', 'true').orWhere('device_images.main', null);
            })
            .whereIn('devices.id', idsExchangeDevices);
          detail.detail_exchange_devices = listExchangeDevices;
        }
      }
    }

    return helper.showSuccessOk(res, detail);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const sellerAcceptProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id,
  } = req.body;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  try {
    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id', 'exchange_devices').where('id', id);
    const buyerId = proposal.buyer_id;
    const user = await db('auth_users').first('email').where('id', buyerId);

    const proposalsBuyerNeedDelete = [];

    if (proposal.exchange_devices) {
      const proposalsBuyer = await db('proposals').select('id', 'exchange_devices').where('buyer_id', buyerId).whereNotIn('id', [id]);
      proposal.exchange_devices.map((pbsOri) => {
        proposalsBuyer.map((pbs) => {
          if (pbs.exchange_devices) {
            for (let i = 0; i < pbs.exchange_devices.length; i++) {
              const subPbs = pbs.exchange_devices[i];
              if (pbsOri.id === subPbs.id) {
                proposalsBuyerNeedDelete.push(pbs.id);
                break;
              }
            }
          }
        });
      });
    }

    const availableDevices = await db('available_devices')
      .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .first('available_devices.id', 'available_devices.device_id', 'available_devices.proposal_id')
      .where('proposals.id', id);
    const device = await db('devices')
      .first(
        'devices.id',
        'devices.user_id',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
      )
      .innerJoin('carts', 'carts.device_id', 'devices.id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('proposals.id', id);

    const cart = await db('carts').first('device_id').innerJoin('proposals', 'proposals.cart_id', 'carts.id').where('proposals.id', id);
    const date = new Date();

    const userProposalRelated = await db('carts')
      .select('auth_users.email')
      .innerJoin('devices', 'devices.id', 'carts.device_id')
      .innerJoin('auth_users', 'auth_users.id', 'carts.user_id')
      .whereNotIn('carts.user_id', [buyerId])
      .where('devices.id', device.id);

    const notificationRowsRelated = [];

    userProposalRelated.map((pr) => {
      notificationRowsRelated.push({
        name: `${SELLER_ACCEPT}&${device.model} - ${device.capacity} GB - ${device.color}`,
        type: PROPOSAL_SELLER,
        links: `/cart?id=${id}`,
        email: pr.email,
        status: UNREAD,
        created_at: date,
        updated_at: date,
      });
    });

    const notification = {
      name: `${SELLER_ACCEPT}&${device.model} - ${device.capacity} GB - ${device.color}`,
      type: PROPOSAL_SELLER,
      links: `/cart?id=${id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    if (!availableDevices.proposal_id) {
      const setting = await db('settings').first('value').where('key', sellerAcceptProposalTime);
      optionsQueueAcceptProposal.delay = setting.value;
      queue.add({ proposalId: id }, optionsQueueAcceptProposal);

      await db.transaction(async (trx) => {
        await trx('available_devices').update({ proposal_id: id }).where('device_id', cart.device_id);
        await trx('proposals').update({ status: SELLER_ACCEPT, updated_at: date }).where('id', id);
        if (proposalsBuyerNeedDelete.length > 0) {
          await trx('proposal_snapshots').whereIn('proposal_id', proposalsBuyerNeedDelete).del();
          await trx('proposals').whereIn('id', proposalsBuyerNeedDelete).del();
        }
        const not = await trx('notifications').returning('id').insert(notification);
        // eslint-disable-next-line prefer-destructuring
        notification.id = not[0];
      });

      for (let i = 0; i < notificationRowsRelated.length; i++) {
        const pr = notificationRowsRelated[i];
        const not = await db('notifications').returning('id').insert(pr);
        // eslint-disable-next-line prefer-destructuring
        pr.id = not[0];
        if (socket.connected) {
          socket.emit(SOCKET_NOTIFICATION_MESSAGE, pr);
        }
      }

      if (socket.connected) {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
      }

      return helper.showSuccessOk(res, helper.SUCCESS);
    }
    return errorProposalSuccess(res);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const sellerCancelAcceptProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id,
  } = req.body;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  try {
    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id').where('id', id);
    const buyerId = proposal.buyer_id;
    const user = await db('auth_users').first('email').where('id', buyerId);
    const proposalSnapshot = await db('proposal_snapshots').first('id', 'status')
      .where('proposal_id', id).orderBy('created_at', 'desc');

    const date = new Date();

    const device = await db('devices')
      .first(
        'devices.id',
        'devices.user_id',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
      )
      .innerJoin('carts', 'carts.device_id', 'devices.id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('proposals.id', id);

    const userProposalRelated = await db('carts')
      .select('auth_users.email')
      .innerJoin('devices', 'devices.id', 'carts.device_id')
      .innerJoin('auth_users', 'auth_users.id', 'carts.user_id')
      .whereNotIn('carts.user_id', [buyerId])
      .where('devices.id', device.id);

    const notificationRowsRelated = [];

    userProposalRelated.map((pr) => {
      notificationRowsRelated.push({
        name: `${SELLER_CANCEL_ACCEPT}&${device.model} - ${device.capacity} GB - ${device.color}`,
        type: PROPOSAL_SELLER,
        links: `/cart?id=${device.id}`,
        email: pr.email,
        status: UNREAD,
        created_at: date,
        updated_at: date,
      });
    });

    const notification = {
      name: `${SELLER_CANCEL_ACCEPT}&${device.model} - ${device.capacity} GB - ${device.color}`,
      type: PROPOSAL_SELLER,
      links: `/cart?id=${device.id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };
    await db.transaction(async (trx) => {
      await trx('available_devices').update({ proposal_id: null }).where('proposal_id', id);
      await trx('proposals').update({ status: proposalSnapshot.status, updated_at: date }).where('id', id);
      const not = await trx('notifications').returning('id').insert(notification);
      // eslint-disable-next-line prefer-destructuring
      notification.id = not[0];
    });

    for (let i = 0; i < notificationRowsRelated.length; i++) {
      const pr = notificationRowsRelated[i];
      const not = await db('notifications').returning('id').insert(pr);
      // eslint-disable-next-line prefer-destructuring
      pr.id = not[0];
      if (socket.connected) {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, pr);
      }
    }

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
    }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const buyerCancelAcceptProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id,
  } = req.body;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  try {
    // const availableDevices = await db('available_devices')
    //   .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
    //   .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
    //   .first('available_devices.id',
    //     'available_devices.device_id',
    //     'available_devices.proposal_id')
    //   .where('proposals.id', id);
    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id').where('id', id);
    const buyerId = proposal.buyer_id;
    const user = await db('auth_users').first('email').where('id', buyerId);
    const proposalSnapshot = await db('proposal_snapshots').first('id', 'status')
      .where('proposal_id', id).orderBy('created_at', 'desc');

    const date = new Date();
    const notification = {
      name: PROPOSAL_COMMON_NOTIFY,
      type: PROPOSAL_SELLER,
      links: `/cart?id=${id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    await db.transaction(async (trx) => {
      await trx('available_devices').update({ proposal_id: null }).where('proposal_id', id);
      await trx('proposals').update({ status: proposalSnapshot.status, updated_at: date }).where('id', id);
      await trx('notifications').insert(notification);
    });

    if (socket.connected) {
      socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
    }
    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const sellerRejectProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id, questions,
  } = req.body;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  try {
    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id').where('id', id);
    const buyerId = proposal.buyer_id;
    const user = await db('auth_users').first('email').where('id', buyerId);

    const availableDevices = await db('available_devices')
      .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .first('available_devices.id', 'available_devices.device_id', 'available_devices.proposal_id')
      .where('proposals.id', id);

    const device = await db('devices')
      .first(
        'devices.id',
        'devices.user_id',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
      )
      .innerJoin('carts', 'carts.device_id', 'devices.id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
      .innerJoin('colors', 'devices.color_id', 'colors.id')
      .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
      .innerJoin('models', 'imeis.model_id', 'models.id')
      .where('proposals.id', id);

    const date = new Date();

    const notification = {
      name: `${SELLER_REJECT}&${device.model} - ${device.capacity} GB - ${device.color}`,
      type: PROPOSAL_SELLER,
      links: `/cart?id=${id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    if (!availableDevices.proposal_id) {
      await db.transaction(async (trx) => {
        await trx('proposals').update({
          status: SELLER_REJECT,
          questions: questions.length > 0 ? JSON.stringify(questions) : null,
          updated_at: date,
        }).where('id', id);
        const not = await trx('notifications').returning('id').insert(notification);
        // eslint-disable-next-line prefer-destructuring
        notification.id = not[0];
      });
      if (socket.connected) {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
      }
      return helper.showSuccessOk(res, helper.SUCCESS);
    }
    return errorProposalSuccess(res);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const buyerAcceptProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id,
  } = req.body;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  try {
    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id').where('id', id);
    const cart = await db('carts').first('device_id').innerJoin('proposals', 'proposals.cart_id', 'carts.id').where('proposals.id', id);
    const sellerId = proposal.seller_id;
    const user = await db('auth_users').first('email').where('id', sellerId);

    const availableDevices = await db('available_devices')
      .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .first('available_devices.id', 'available_devices.device_id', 'available_devices.proposal_id')
      .where('proposals.id', id);
    const date = new Date();
    const notification = {
      name: PROPOSAL_COMMON_NOTIFY,
      type: PROPOSAL_BUYER,
      links: `/my-offers/${id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    if (!availableDevices.proposal_id) {
      await db.transaction(async (trx) => {
        await trx('proposals').update({ status: BUYER_ACCEPT, updated_at: date }).where('id', id);
        await trx('available_devices').update({ proposal_id: id }).where('device_id', cart.device_id);
        await trx('notifications').insert(notification);
      });
      if (socket.connected) {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
      }
      return helper.showSuccessOk(res, helper.SUCCESS);
    }
    return errorProposalSuccess(res);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const sellerCancelReplyProposal = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);

  const {
    id,
  } = req.body;

  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  try {
    const proposal = await db('proposals').first('cart_id', 'seller_id', 'buyer_id').where('id', id);
    const buyerId = proposal.buyer_id;
    const user = await db('auth_users').first('email').where('id', buyerId);
    const availableDevices = await db('available_devices')
      .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .first('available_devices.id', 'available_devices.device_id', 'available_devices.proposal_id')
      .where('proposals.id', id);
    const proposalSnapshots = await db('proposal_snapshots')
      .select('id', 'buyer_sale_price', 'buyer_real_sale_price', 'buyer_exchange_price', 'buyer_real_exchange_price',
        'type', 'status', 'exchange_devices', 'created_at')
      .where('proposal_id', id).orderBy('created_at', 'desc')
      .limit(2)
      .offset(0);

    const date = new Date();

    const {
      status, buyer_sale_price,
      buyer_real_sale_price, buyer_exchange_price, buyer_real_exchange_price,
      type, exchange_devices, created_at,
    } = proposalSnapshots[1];

    const notification = {
      name: PROPOSAL_COMMON_NOTIFY,
      type: PROPOSAL_SELLER,
      links: `/cart?id=${id}`,
      email: user.email,
      status: UNREAD,
      created_at: date,
      updated_at: date,
    };

    if (!availableDevices.proposal_id) {
      await db.transaction(async (trx) => {
        await trx('proposal_snapshots').where('id', proposalSnapshots[0].id).del();
        await trx('proposals').update({
          status,
          buyer_sale_price,
          buyer_real_sale_price,
          buyer_exchange_price,
          buyer_real_exchange_price,
          type,
          exchange_devices: JSON.stringify(exchange_devices),
          created_at,
          updated_at: date,
        }).where('id', id);
        await trx('notifications').insert(notification);
      });
      if (socket.connected) {
        socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
      }
      return helper.showSuccessOk(res, helper.SUCCESS);
    }
    return errorProposalSuccess(res);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export default {
  addBuyerCreatedProposal,
  detailProposal,
  buyerDeleteProposal,
  sellerDeleteProposal,
  updateBuyerReplyProposal,
  listProposal,
  updateSellerReplyProposal,
  sellerAcceptProposal,
  sellerCancelAcceptProposal,
  sellerRejectProposal,
  buyerAcceptProposal,
  buyerCancelAcceptProposal,
  sellerCancelReplyProposal,
};
