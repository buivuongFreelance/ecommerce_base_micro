import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError,
    GlobalEmail, AppEmail, DeviceStatus, getTotalPayForStripe
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';

const router = express.Router();

router.post('/api/v1/transaction/order/paid/delete', [
    body('orderId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an order id'),
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an client id'),
], validateRequest, async (req, res) => {
    const { orderId } = req.body;

    const order = await db('orders').first('*').where('id', orderId);
    if (!order) {
        throw new BadRequestError('Order not exists');
    }
    const { total_market_fee, total_pay, total_shipping } = order;

    const totalPayForStripe = getTotalPayForStripe({
        totalMarketFee: total_market_fee,
        totalPay: total_pay,
        totalShip: total_shipping,
    });

    const idsDevice = [];
    const transactions = await db('transactions').select('*').where('order_id', orderId);
    transactions.map(tr => idsDevice.push(tr.device_id));


    const usersGlobal = await db('auth_users').select('id').whereIn('email', [GlobalEmail, AppEmail]);
    const idsGlobal = [];
    usersGlobal.map(us => idsGlobal.push(us.id));

    console.log(idsDevice);

    try {
        await db.transaction(async (trx) => {
            await trx('auth_users_info').decrement('wallet', totalPayForStripe).whereIn('user_id', idsGlobal);
            await trx('transactions').del().where('order_id', orderId);
            await trx('orders_seller').del().where('order_id', orderId);
            await trx('orders').del().where('id', orderId);
            await trx('devices').update({
                status: DeviceStatus.Posted
            }).whereIn('id', idsDevice);

        });

        res.send({});
    } catch (error) {
        console.log(error);
        throw new QueryFailedError();
    }
});

export { router as deleteOrderPaidRouter };