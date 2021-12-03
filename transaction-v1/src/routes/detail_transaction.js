import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, TransactionStatus,
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/transaction/detail', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an transaction id'),
], validateRequest, async (req, res) => {
    const { id } = req.body;

    const queryTransaction = db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .leftJoin('auth_users', 'auth_users.id', 'orders.user_id')
        .leftJoin('auth_users as seller_users', 'seller_users.id', 'orders_seller.user_id')
        .innerJoin('devices', 'devices.id', 'transactions.device_id')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'available_devices.device_image_id', 'device_images.id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .innerJoin('shippings', 'shippings.user_id', 'orders_seller.user_id')
        .first(
            'transactions.*',
            'auth_users.id as buyer_id',
            'seller_users.id as seller_id',
            'orders.order_number as purchase_number',
            'orders_seller.order_number as sale_number',
            'orders.id as purchase_id',
            'orders_seller.id as sale_id',
            'rams.value as ram',
            'colors.name as color',
            'capacities.value as capacity',
            'models.name as model',
            'categories.name as category_name',
            'brands.id as brand_id',
            'brands.name as brand_name',
            'shippings.first_name as seller_first_name',
            'shippings.last_name as seller_last_name',
            'available_devices.passcode',
            'orders.ship_name as buyer_name'
        )
        .where('transactions.id', id)
        .whereNot('transactions.status', TransactionStatus.Created);

    try {
        const transaction = await queryTransaction;
        if (transaction.status === TransactionStatus.SellerScanned) {
            const existingTransactions = await db('transactions')
                .innerJoin('devices', 'devices.id', 'transactions.device_id')
                .join('imeis', 'devices.imei_id', 'imeis.id')
                .innerJoin('rams', 'devices.ram_id', 'rams.id')
                .innerJoin('colors', 'devices.color_id', 'colors.id')
                .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
                .innerJoin('models', 'imeis.model_id', 'models.id')
                .select(
                    'transactions.*',
                    'rams.value as ram',
                    'colors.name as color',
                    'capacities.value as capacity',
                    'models.name as model',
                )
                .where('transactions.order_seller_id', transaction.order_seller_id)
                .whereNot('transactions.id', id)
                .whereIn('transactions.status', [TransactionStatus.Created, TransactionStatus.SellerMustScan, TransactionStatus.SellerMustSubmitPasscode]);

            transaction.existing_transactions = existingTransactions;
        }

        res.send(transaction);
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as detailTransactionRouter };