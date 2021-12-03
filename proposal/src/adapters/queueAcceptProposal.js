import { v1 as uuidv1 } from 'uuid';
import {
  PROPOSAL_BUYER,
  PROPOSAL_SELLER, QUEUE_ACCEPT_PROPOSAL, SELLER_ACCEPT,
  SOCKET_NOTIFICATION_MESSAGE, SYSTEM_CANCEL_ACCEPT, UNREAD,
} from '../config';
import db from './db';
import socket from './socket';

const Queue = require('bull');

const queue = new Queue(QUEUE_ACCEPT_PROPOSAL, {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
  },
});

queue.process(async (job) => {
  try {
    const { proposalId } = job.data;
    if (proposalId) {
      const proposal = await db('proposals').first().where('id', proposalId);
      if (proposal.status === SELLER_ACCEPT) {
        const date = new Date();

        const device = await db('devices')
          .first(
            'devices.id',
            'devices.user_id as seller_id',
            'carts.user_id as buyer_id',
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
          .where('proposals.id', proposalId);

        const buyer = await db('auth_users').first('email').where('id', device.buyer_id);
        const seller = await db('auth_users').first('email').where('id', device.seller_id);

        const userProposalRelated = await db('carts')
          .select('auth_users.email')
          .innerJoin('devices', 'devices.id', 'carts.device_id')
          .innerJoin('auth_users', 'auth_users.id', 'carts.user_id')
          .whereNotIn('carts.user_id', [device.buyer_id])
          .where('devices.id', device.id);

        const notificationRowsRelated = [];

        // eslint-disable-next-line array-callback-return
        userProposalRelated.map((pr) => {
          notificationRowsRelated.push({
            name: `${SYSTEM_CANCEL_ACCEPT}&${device.model} - ${device.capacity} GB - ${device.color}`,
            type: PROPOSAL_SELLER,
            links: `/cart?deviceId=${device.id}`,
            email: pr.email,
            status: UNREAD,
            created_at: date,
            updated_at: date,
          });
        });

        const notification = {
          name: `${SYSTEM_CANCEL_ACCEPT}&${device.model} - ${device.capacity} GB - ${device.color}`,
          type: PROPOSAL_SELLER,
          links: `/cart?deviceId=${device.id}`,
          email: buyer.email,
          status: UNREAD,
          created_at: date,
          updated_at: date,
        };

        const notificationSeller = {
          name: `${SYSTEM_CANCEL_ACCEPT}&${device.model} - ${device.capacity} GB - ${device.color}`,
          type: PROPOSAL_BUYER,
          links: `/my-devices/offers/${proposal.cart_id}`,
          email: seller.email,
          status: UNREAD,
          created_at: date,
          updated_at: date,
        };

        await db.transaction(async (trx) => {
          await trx('available_devices').update({ proposal_id: null }).where('proposal_id', proposalId);
          await trx('proposal_snapshots').insert({
            id: uuidv1(),
            cart_id: proposal.cart_id,
            seller_id: proposal.seller_id,
            buyer_id: proposal.buyer_id,
            buyer_sale_price: 0,
            buyer_real_sale_price: 0,
            buyer_exchange_price: 0,
            buyer_real_exchange_price: 0,
            type: proposal.type,
            status: SYSTEM_CANCEL_ACCEPT,
            created_at: date,
            updated_at: date,
            proposal_id: proposalId,
            exchange_devices: '[]',
          });
          await trx('proposals').update({
            status: SYSTEM_CANCEL_ACCEPT,
            updated_at: date,
            buyer_real_sale_price: 0,
            buyer_sale_price: 0,
            buyer_exchange_price: 0,
            buyer_real_exchange_price: 0,
            exchange_devices: '[]',
          }).where('id', proposalId);
          const not = await trx('notifications').returning('id').insert(notification);
          // eslint-disable-next-line prefer-destructuring
          notification.id = not[0];

          const notSeller = await trx('notifications').returning('id').insert(notificationSeller);
          // eslint-disable-next-line prefer-destructuring
          notificationSeller.id = notSeller[0];
        });
        // eslint-disable-next-line no-plusplus
        for (let i = 0; i < notificationRowsRelated.length; i++) {
          const pr = notificationRowsRelated[i];
          // eslint-disable-next-line no-await-in-loop
          const notRelated = await db('notifications').returning('id').insert(pr);
          // eslint-disable-next-line prefer-destructuring
          pr.id = notRelated[0];
          if (socket.connected) {
            socket.emit(SOCKET_NOTIFICATION_MESSAGE, pr);
          }
        }
        if (socket.connected) {
          socket.emit(SOCKET_NOTIFICATION_MESSAGE, notificationSeller);
          socket.emit(SOCKET_NOTIFICATION_MESSAGE, notification);
        }
      }
    }
    await job.moveToCompleted();
    await job.remove();
    // eslint-disable-next-line no-empty
  } catch (error) {
  }
});

export default queue;
