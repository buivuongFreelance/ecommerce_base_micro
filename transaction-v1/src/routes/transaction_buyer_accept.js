import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, TransactionStatus,
    OrderSellerStatus, GlobalEmail, AppEmail, OrderStatus
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';
import { shippoTransactionCreate } from '../adapters/shippo';

const router = express.Router();

router.post('/api/v1/transaction/buyer/accept', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
    body('transactionId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a transaction id'),
], validateRequest, async (req, res) => {
    const { deviceId, transactionId } = req.body;
    const date = new Date();

    const usersGlobal = await db('auth_users').select('id').whereIn('email', [GlobalEmail, AppEmail]);
    const idsGlobal = [];
    usersGlobal.map(us => idsGlobal.push(us.id));

    const transaction = await db('transactions').first('*').where('id', transactionId);
    if (!transaction) {
        throw new BadRequestError('Transaction does not exist');
    }

    const orderSeller = await db('orders_seller')
        .innerJoin('transactions', 'transactions.order_seller_id', 'orders_seller.id')
        .first('orders_seller.user_id')
        .where('orders_seller.id', transaction.order_seller_id);

    if (!orderSeller) {
        throw new BadRequestError('Order seller does not exist');
    }

    const existingTransactions = await db('transactions')
        .select('transactions.*')
        .where('transactions.order_seller_id', transaction.order_seller_id)
        .whereNot('transactions.id', transactionId)
        .whereNotIn('status', [TransactionStatus.BuyerAccepted]);

    const existingOrderSellers = await db('orders_seller')
        .select('orders_seller.*')
        .where('orders_seller.order_id', transaction.order_id)
        .whereNot('orders_seller.id', transaction.order_seller_id)
        .whereNotIn('status', [OrderSellerStatus.Completed]);


    try {

        await db.transaction(async (trx) => {
            await trx('transactions').update({
                status: TransactionStatus.BuyerAccepted,
                updated_at: date,
            }).where('id', transactionId);

            await trx('auth_users_info').decrement('wallet', transaction.money_seller_receive).whereIn('user_id', idsGlobal);
            await trx('auth_users_info').increment('wallet', transaction.money_seller_receive).whereIn('user_id', [orderSeller.user_id]);

            if (existingTransactions) {
                if (existingTransactions.length === 0) {
                    await trx('orders_seller').update({
                        status: OrderSellerStatus.Completed,
                        updated_at: date,
                    }).where('id', transaction.order_seller_id);
                }
            }

            if (existingOrderSellers) {
                if (existingOrderSellers.length === 0) {
                    await trx('orders').update({
                        status: OrderStatus.Completed,
                        updated_at: date,
                    }).where('id', transaction.order_id);
                }
            }
        });
        res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as transactionBuyerAcceptRouter };