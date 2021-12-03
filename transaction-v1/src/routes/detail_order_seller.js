import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, ProposalStatus,
    TransactionType
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/transaction/orderSeller/detail', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an order seller id'),
], validateRequest, async (req, res) => {
    const { id } = req.body;

    const orderSeller = await db('orders_seller')
        .innerJoin('auth_users', 'orders_seller.user_id', 'auth_users.id')
        .innerJoin('shippings', 'shippings.user_id', 'auth_users.id')
        .innerJoin('cities', 'cities.id', 'shippings.city_id')
        .first('orders_seller.*',
            'shippings.zip',
            'shippings.first_name',
            'shippings.last_name',
            'shippings.address',
            'shippings.zip',
            'shippings.city_id',
            'cities.name as city_name',
            'shippings.state_code'
        )
        .where('orders_seller.id', id);
    if (!orderSeller) {
        throw new BadRequestError('Order seller not exists');
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
            .where('transactions.order_seller_id', id);

        const listGroupedSell = transactions.reduce(function (r, a) {
            if (a.type === TransactionType.Buyer) {
                r[a.type] = r[a.type] || [];
                r[a.type].push(a);
            } else if (a.type === TransactionType.Group) {
                if (a.invoice_info_seller !== null) {
                    r[TransactionType.Buyer] = r[TransactionType.Buyer] || [];
                    r[TransactionType.Buyer].push(a);
                }
            }
            return r;
        }, Object.create(null));

        orderSeller.transactions = { ...listGroupedSell };

        res.send(orderSeller);
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as detailOrderSellerRouter };