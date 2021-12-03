/* eslint-disable no-plusplus */
import helper from 'micro-helper';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import socket from '../adapters/socket';
import {
  SELLER_ACCEPT,
  SOCKET_NOTIFICATION_MESSAGE,
  UNREAD,
  BUYER_REMOVED,
  PROPOSAL_BUYER,
} from '../config';
import { getDingtoiFee } from '../functions';
import { serviceListCart, serviceListCartAnonymous } from '../services';

const removeCart = async (req, res) => {
  const { id } = req.body;
  if (!id) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  const { userId } = req;
  if (req.login) {
    try {
      const availableDevice = await db('available_devices')
        .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
        .first('available_devices.id', 'available_devices.proposal_id', 'proposals.id as is_proposal')
        .leftOuterJoin('proposals', 'proposals.cart_id', 'carts.id')
        .where('carts.id', id);
      if (!availableDevice) {
        return helper.showServerError(res, true);
      }
      let flag = false;
      if (availableDevice.proposal_id) {
        const proposal = await db('proposals').first('buyer_id').where('id', availableDevice.proposal_id);
        if (proposal.buyer_id === userId) {
          flag = true;
        }
      }

      let notification = null;

      if (availableDevice.is_proposal) {
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
          .innerJoin('models', 'imeis.model_id', 'models.id')
          .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
          .where('carts.id', id);

        const date = new Date();

        notification = {
          name: `${BUYER_REMOVED}&${device.model} - ${device.capacity} - ${device.color}`,
          type: PROPOSAL_BUYER,
          links: `/my-devices/offers/${device.id}/${id}`,
          email: device.email,
          status: UNREAD,
          created_at: date,
          updated_at: date,
        };
      }
      await db.transaction(async (trx) => {
        if (flag) {
          // eslint-disable-next-line func-names
          await trx.from('available_devices').whereIn('device_id', function () {
            return this.from('carts')
              .distinct('device_id')
              .where('id', id);
          })
            .update('proposal_id', null);
        }
        await trx('proposal_snapshots').where('cart_id', id).del();
        await trx('proposals').where('cart_id', id).del();
        await trx('carts').where('id', id).del();
        if (availableDevice.is_proposal) {
          const not = await trx('notifications').returning('id').insert(notification);
          // eslint-disable-next-line prefer-destructuring
          notification.id = not[0];
        }
      });

      if (availableDevice.is_proposal) {
        if (socket.connected) {
          socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
        }
      }
      return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      await db('tracing_carts').where('id', id).del();
      return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const listCart = async (req, res) => {
  let userId = null;
  if (req.login) {
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    if (!anonymous) {
      return helper.showClientBadRequest(res, helper.ERR_COMMON);
    }
    userId = anonymous;
  }

  if (req.login) {
    try {
      const list = await serviceListCart(userId);
      for (let i = 0; i < list.length; i++) {
        const l = list[i];
        l.dingtoi_fee = 0;
        // eslint-disable-next-line no-await-in-loop
        l.proposals = await db('proposal_snapshots').select('*').where('cart_id', l.id).orderBy('created_at', 'DESC')
          .limit(2);
        l.dingtoi_fee = getDingtoiFee(l.real_sale_price);
        if (l.proposals.length > 0) {
          const proposal = l.proposals[0];
          if (l.proposal_status === SELLER_ACCEPT) {
            if (proposal.exchange_devices.length === 0) {
              l.dingtoi_fee = getDingtoiFee(proposal.buyer_real_sale_price);
            } else if (proposal.buyer_exchange_price <= 0) {
              l.dingtoi_fee = getDingtoiFee(Math.abs(proposal.buyer_exchange_price));
            } else {
              l.dingtoi_fee = getDingtoiFee(0);
            }
          }
        }
      }

      return helper.showSuccessOk(res, list);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const list = await serviceListCartAnonymous(userId);
      return helper.showSuccessOk(res, list);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const addToCart = async (req, res) => {
  const { deviceId, type } = req.body;

  if (!deviceId) return helper.showClientBadRequest(res, helper.ERR_COMMON);
  if (!type) return helper.showClientBadRequest(res, helper.ERR_COMMON);

  let userId = null;
  if (req.login) {
    userId = req.userId;
  } else {
    const { anonymous } = req.body;
    userId = anonymous;
  }

  if (req.login) {
    try {
      const id = uuidv1();
      const date = new Date();

      const checkCartExists = await db('carts')
        .first()
        .where('device_id', deviceId)
        .where('user_id', userId);
      if (checkCartExists) {
        return helper.showServerError(res, helper.ERR_EXIST);
      }

      await db('carts').insert({
        id,
        user_id: userId,
        device_id: deviceId,
        type,
        created_at: date,
        updated_at: date,
      });
      return helper.showSuccessOk(res, id);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  } else {
    try {
      const id = uuidv1();
      const date = new Date();

      await db('tracing_carts').insert({
        id,
        tracing_user_id: userId,
        device_id: deviceId,
        type,
        created_at: date,
        updated_at: date,
      });
      return helper.showSuccessOk(res, id);
    } catch (error) {
      return helper.showServerError(res, error);
    }
  }
};

const syncWishlist = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  const { anonymous } = req.body;
  try {
    const tracingWishlists = await db('tracing_wishlists')
      .innerJoin('devices', 'devices.id', 'tracing_wishlists.device_id')
      .whereNotIn('devices.user_id', [userId])
      .where('tracing_user_id', anonymous);
    const wishlists = await db('wishlists').where('user_id', userId);

    const combineWishlist = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < tracingWishlists.length; i++) {
      let flag = true;
      const tracingWishlist = tracingWishlists[i];
      // eslint-disable-next-line no-plusplus
      for (let j = 0; j < wishlists.length; j++) {
        const wishlist = wishlists[j];
        if (wishlist.device_id === tracingWishlist.device_id) {
          flag = false;
          break;
        }
      }
      if (flag) {
        combineWishlist.push({
          user_id: userId,
          device_id: tracingWishlist.device_id,
          created_at: tracingWishlist.created_at,
          updated_at: tracingWishlist.updated_at,
        });
      }
    }
    if (combineWishlist.length > 0) {
      await db.transaction(async (trx) => {
        await trx('tracing_wishlists').where('tracing_user_id', anonymous).del();
        await trx.batchInsert('wishlists', combineWishlist);
      });
    }

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const syncCart = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  const { anonymous } = req.body;
  try {
    const tracingCarts = await db('tracing_carts')
      .innerJoin('devices', 'devices.id', 'tracing_carts.device_id')
      .where('tracing_user_id', anonymous)
      .whereNotIn('devices.user_id', [userId]);
    const carts = await db('carts').where('user_id', userId);

    const combineCarts = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < tracingCarts.length; i++) {
      let flag = true;
      const tracingCart = tracingCarts[i];
      // eslint-disable-next-line no-plusplus
      for (let j = 0; j < carts.length; j++) {
        const cart = carts[j];
        if (cart.device_id === tracingCart.device_id) {
          flag = false;
          break;
        }
      }
      if (flag) {
        combineCarts.push({
          id: uuidv1(),
          user_id: userId,
          device_id: tracingCart.device_id,
          created_at: tracingCart.created_at,
          updated_at: tracingCart.updated_at,
          type: tracingCart.type,
        });
      }
    }
    await db.transaction(async (trx) => {
      await trx('tracing_carts').where('tracing_user_id', anonymous).del();
      if (combineCarts.length > 0) {
        await trx.batchInsert('carts', combineCarts);
      }
    });

    return helper.showSuccessOk(res, helper.SUCCESS);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

const confirmCheckout = async (req, res) => {
  if (!req.login) return helper.showClientUnauthorized(res, true);
  const { userId } = req;

  try {
    const subquery = db('carts').select('carts.id').innerJoin('proposals', 'proposals.cart_id', 'carts.id').where('proposals.status', SELLER_ACCEPT);

    const listExchange = await db('carts')
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
      .innerJoin('proposals', 'proposals.cart_id', 'carts.id')
      .select(
        'carts.id',
        'carts.user_id',
        'carts.device_id',
        'rams.value as ram_value',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
        'categories.name as category_name',
        'brands.name as brand_name',
        'device_images.url',
        'available_devices.real_sale_price',
        'proposals.id as proposal_id',
        'proposals.type as proposal_type',
        'proposals.exchange_devices as proposal_exchange_devices',
        'proposals.buyer_real_sale_price as proposal_sale_price',
        'proposals.buyer_real_exchange_price as proposal_exchange_price',
      )
      .whereNotNull('available_devices.proposal_id')
      .whereIn('carts.id', subquery)
      .where('carts.user_id', userId)
      .where('device_images.main', 'true')
      .orderBy('carts.created_at', 'desc');

    const listSell = await db('carts')
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
      .select(
        'carts.id',
        'carts.user_id',
        'carts.device_id',
        'rams.value as ram_value',
        'colors.name as color',
        'capacities.value as capacity',
        'models.name as model',
        'categories.name as category_name',
        'brands.name as brand_name',
        'device_images.url',
        'available_devices.sale_price',
        'available_devices.real_sale_price',
      )
      .where('available_devices.sale_price', '>', 0)
      .whereNotIn('carts.id', subquery)
      .where('carts.user_id', userId)
      .where('device_images.main', 'true')
      .orderBy('carts.created_at', 'desc');

    const list = listExchange.concat(listSell);
    return helper.showSuccessOk(res, list);
  } catch (error) {
    return helper.showServerError(res, error);
  }
};

export default {
  addToCart, listCart, removeCart, syncCart, syncWishlist, confirmCheckout,
};
