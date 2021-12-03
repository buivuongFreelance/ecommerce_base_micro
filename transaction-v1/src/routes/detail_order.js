import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, TransactionStatus,
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/transaction/order/detail', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an order id'),
], validateRequest, async (req, res) => {
    const { id } = req.body;

    const order = await db('orders')
        .innerJoin('cities', 'cities.id', 'orders.ship_city_id')
        .innerJoin('cities as bill_cities', 'bill_cities.id', 'orders.bill_city_id')
        .first('orders.*', 'cities.name as ship_city_name', 'bill_cities.name as bill_city_name')
        .where('orders.id', id);
    if (!order) {
        throw new BadRequestError('Order not exists');
    }
    try {
        const transactions = await db('transactions')
            .innerJoin('orders', 'orders.id', 'transactions.order_id')
            .innerJoin('orders_seller', 'orders_seller.id', 'transactions.order_seller_id')
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
            .innerJoin('auth_users', 'auth_users.id', 'devices.user_id')
            .innerJoin('shippings', 'auth_users.id', 'shippings.user_id')
            .innerJoin('cities', 'cities.id', 'shippings.city_id')
            .select(
                'transactions.*',
                'transactions.status as status_alt',
                'devices.physical_grading',
                'imeis.id as imei_id',
                'rams.value as ram',
                'colors.name as color',
                'capacities.value as capacity',
                'models.name as model',
                'categories.name as category_name',
                'brands.id as brand_id',
                'brands.name as brand_name',
                'shippings.first_name as device_user_first_name',
                'shippings.last_name as device_user_last_name',
                'shippings.address as device_user_address',
                'shippings.zip as device_user_zip',
                'shippings.state_code as device_user_state_code',
                'cities.name as device_user_city',
                'auth_users.email as device_user_email',
                'device_images.url',
                'orders_seller.carrier',
            )
            .where('transactions.order_id', id);

        transactions.map(tr => {
            if (tr.status !== TransactionStatus.Created) {
                tr.status = TransactionStatus.InTransaction
            }
        });

        order.transactions = transactions;

        res.send(order);
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as detailOrderRouter };