import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError,
    OrderStatus, OrderSellerStatus, TransactionStatus, DeviceStatus
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/transaction/list', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an client id'),
], validateRequest, async (req, res) => {
    const { limit, offset, filter, sort } = req.body;
    const { userId } = req;
    const parsedFilter = JSON.parse(filter);
    const parsedSort = JSON.parse(sort);

    const queryTransactions = db('transactions')
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
        .select(
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
        )
        .where('orders.user_id', userId)
        .whereNotIn('transactions.status', [TransactionStatus.Created])
        .orWhere('orders_seller.user_id', userId)
        .whereNotIn('transactions.status', [TransactionStatus.Created])
        .orderBy('transactions.updated_at', 'desc')
        .offset(offset)
        .limit(limit);

    const queryCountTransactions = db('transactions')
        .innerJoin('orders', 'orders.id', 'transactions.order_id')
        .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
        .count('transactions.id', { as: 'count' })
        .where({
            'orders.user_id': userId
        })
        .whereNotIn('transactions.status', [TransactionStatus.Created])
        .orWhere('orders_seller.user_id', userId)
        .whereNotIn('transactions.status', [TransactionStatus.Created])

    try {
        const list = await queryTransactions;
        const count = await queryCountTransactions.first();
        res.send({
            list: list,
            count: count.count,
        });
    } catch (error) {
        console.log(error);
        throw new QueryFailedError();
    }
});

export { router as listTransactionRouter };