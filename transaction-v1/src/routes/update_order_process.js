import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError,
    OrderStatus, OrderSellerStatus, TransactionStatus, DeviceStatus
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';

const router = express.Router();

router.post('/api/v1/transaction/order/update/process', [
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

    const idsDevice = [];
    const transactions = await db('transactions').select('*').where({
        'order_id': orderId,
        'status': TransactionStatus.Created
    });
    transactions.map(tr => idsDevice.push(tr.device_id));

    const date = new Date();

    try {
        await db.transaction(async (trx) => {
            await trx('orders').update({
                status: OrderStatus.Processing,
                updated_at: date,
            }).where('id', orderId);
            await trx('orders_seller').update({
                status: OrderSellerStatus.SellerProcess,
                updated_at: date,
            }).where('order_id', orderId);
            await trx('transactions').update({
                status: TransactionStatus.SellerMustScan,
                updated_at: date,
            }).where('order_id', orderId);
            await trx('devices').update({
                status: DeviceStatus.InTransaction,
                updated_at: date,
            }).whereIn('id', idsDevice);
        });
        res.send({});
    } catch (error) {
        console.log(error);
        throw new QueryFailedError();
    }
});

export { router as updateOrderProcessRouter };