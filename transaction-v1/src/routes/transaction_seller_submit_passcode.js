import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, TransactionStatus,
    OrderSellerStatus
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/transaction/seller/submitPasscode', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an transaction id'),
    body('passcode')
        .trim()
        .notEmpty()
        .withMessage('You must supply a passcode'),
], validateRequest, async (req, res) => {
    const { id, passcode } = req.body;
    const date = new Date();

    const availableDevice = await db('available_devices')
        .first('available_devices.*', 'transactions.order_seller_id')
        .innerJoin('transactions', 'available_devices.device_id', 'transactions.device_id')
        .where('transactions.id', id);
    if (!availableDevice) {
        throw new BadRequestError('Transaction not exists');
    }

    const existingTransactions = await db('transactions')
        .select('transactions.*')
        .where('transactions.order_seller_id', availableDevice.order_seller_id)
        .whereNot('transactions.id', id)
        .whereIn('status', [TransactionStatus.Created, TransactionStatus.SellerMustScan, TransactionStatus.SellerMustSubmitPasscode]);

    try {
        await db.transaction(async (trx) => {
            await trx('available_devices').update({
                passcode,
                updated_at: date,
            }).where('id', availableDevice.id);

            await trx('transactions').update({
                status: TransactionStatus.SellerScanned,
                updated_at: date,
            }).where('id', id);

            if (existingTransactions.length === 0) {
                await trx('orders_seller').update({
                    updated_at: date,
                    status: OrderSellerStatus.SellerPickup,
                }).where('id', availableDevice.order_seller_id);
            }
        });

        res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as transactionSellerSubmitPasscodeRouter };