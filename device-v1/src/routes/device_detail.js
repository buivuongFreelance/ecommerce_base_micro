import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, ProposalStatus,
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/detail', validateAuth, [
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an device id'),
], validateRequest, async (req, res) => {
    const { id } = req.body;

    const checkDevice = await db('devices').first('id').where('id', id);
    if (!checkDevice) {
        throw new BadRequestError('Device not exists');
    }

    try {
        const detailDevice = await db('devices')
            .leftJoin('available_devices', 'devices.id', 'available_devices.device_id')
            .join('imeis', 'imeis.id', 'devices.imei_id')
            .join('rams', 'rams.id', 'devices.ram_id')
            .innerJoin('colors', 'devices.color_id', 'colors.id')
            .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
            .innerJoin('models', 'imeis.model_id', 'models.id')
            .innerJoin('categories', 'models.category_id', 'categories.id')
            .innerJoin('brands', 'models.brand_id', 'brands.id')
            .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
            .leftJoin('transactions', 'transactions.device_id', 'devices.id')
            .leftJoin('transactions_exchange', 'transactions_exchange.device_id', 'devices.id')
            .leftJoin('orders_seller', 'orders_seller.id', 'transactions_exchange.order_seller_id')
            .leftJoin('orders', 'orders.id', 'orders_seller.order_id')
            .leftJoin('auth_users', 'auth_users.id', 'orders.user_id')
            .first(
                'available_devices.id as available_id',
                'available_devices.is_warranty',
                'available_devices.sale_price',
                'available_devices.real_sale_price',
                'available_devices.exchange_price',
                'available_devices.real_exchange_price',
                'available_devices.warranty_expire_date',
                'available_devices.exchange_type',
                'devices.physical_grading',
                'devices.status',
                'devices.created_at',
                'devices.id',
                'imeis.id as imei_id',
                'imeis.imei as imei',
                'imeis.other_detail',
                'imeis.original_price',
                'devices.ram_id as ram_id',
                'rams.value as ram_value',
                'colors.id as color_id',
                'colors.name as color',
                'capacities.id as capacity_id',
                'capacities.value as capacity',
                'models.id as model_id',
                'models.name as model',
                'categories.id as category_id',
                'categories.name as category_name',
                'brands.id as brand_id',
                'brands.name as brand_name',
                'device_scans.main_info',
                'transactions.id as transaction_id',
                'transactions.status as transaction_status',
                'transactions.type as transaction_type',
                'transactions_exchange.id as transaction_exchange_id',
                'orders_seller.stripe_charge as stripe_charge',
                'transactions_exchange.status as transaction_exchange_status',
                'orders_seller.id as order_seller_id',
                'orders.id as order_id',
                'auth_users.email as transaction_email_buyer',
            )
            .where('devices.id', id);

        const images = await db('devices').join('device_images', 'devices.id', 'device_images.device_id')
            .select('device_images.*')
            .where('device_id', id);

        const proposals = await db('proposals')
            .innerJoin('carts', 'carts.id', 'proposals.cart_id')
            .where('proposals.status', '<>', ProposalStatus.SystemCancelAccept)
            .where('carts.device_id', checkDevice.id);

        const accessories = await db('device_accessories')
            .innerJoin('accessories', 'accessories.id', 'device_accessories.accessory_id')
            .select('accessories.id', 'accessories.value')
            .where('device_accessories.device_id', checkDevice.id);

        const deviceExchange = await db('device_exchanges')
            .innerJoin('models', 'models.id', 'device_exchanges.model_id')
            .innerJoin('capacities', 'capacities.id', 'device_exchanges.capacity_id')
            .innerJoin('colors', 'colors.id', 'device_exchanges.color_id')
            .first('device_exchanges.*', 'models.name as model_name', 'models.image_url as model_image_url',
                'capacities.value as capacity_name', 'colors.name as color_name')
            .where('device_exchanges.device_id', checkDevice.id);

        detailDevice.images = images;
        detailDevice.proposals = proposals;
        detailDevice.accessories = accessories;
        detailDevice.device_exchange = deviceExchange;

        res.send(detailDevice);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as deviceDetailRouter };