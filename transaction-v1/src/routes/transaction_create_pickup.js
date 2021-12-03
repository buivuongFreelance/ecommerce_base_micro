import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, TransactionStatus,
    OrderSellerStatus, GlobalEmail, AppEmail
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';
import { shippoTransactionCreate } from '../adapters/shippo';

const router = express.Router();

router.post('/api/v1/transaction/seller/createPickup', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an order seller id'),
    body('objPickup')
        .trim()
        .notEmpty()
        .withMessage('You must supply a objPickup'),
], validateRequest, async (req, res) => {
    const { id, objPickup } = req.body;
    const date = new Date();

    const parsedPickup = JSON.parse(objPickup);
    const { buildingLocationType, buildingType, instructions } = parsedPickup;

    const orderSeller = await db('orders_seller').first('carrier', 'total_shipping').where('id', id);
    if (!orderSeller) {
        throw new BadRequestError('Order Seller not exists');
    }

    const { carrier: { object_id } } = orderSeller;

    const usersGlobal = await db('auth_users').select('id').whereIn('email', [GlobalEmail, AppEmail]);
    const idsGlobal = [];
    usersGlobal.map(us => idsGlobal.push(us.id));

    try {
        // const transaction = await shippoTransactionCreate({ objectId: object_id });
        // console.log(transaction);

        await db.transaction(async (trx) => {
            await trx('orders_seller').update({
                status: OrderSellerStatus.BuyerProcess,
                updated_at: date,
            }).where('id', id);
            await trx('auth_users_info')
                .decrement('wallet', orderSeller.total_shipping)
                .whereIn('user_id', idsGlobal);
            await trx('transactions').update({
                status: TransactionStatus.BuyerMustScan,
                updated_at: date,
            }).where('order_seller_id', id);
        });
        res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as orderSellerCreatePickupRouter };