import express from 'express';
import { validateRequest, DeviceStatus, QueryFailedError, DeviceType } from '@tomrot/common';
import { body } from 'express-validator';
import { validateAuth } from '../middleware/validate';
import db from '../adapters/db';
import { querySelectCartsByUser } from '../config/cart';

const router = express.Router();

router.post('/api/v1/device/listNew', validateAuth, [
    body('offset')
        .trim()
        .isNumeric({ min: 0, max: 200 })
        .withMessage('You must supply an offset'),
    body('limit')
        .trim()
        .notEmpty()
        .withMessage('You must supply an limit'),
    body('filter')
        .trim()
        .notEmpty()
        .withMessage('You must supply a filter'),
], validateRequest, async (req, res) => {
    const {
        offset, limit, filter
    } = req.body;
    const { userId } = req;
    const parsedFilter = JSON.parse(filter);

    const query = db('devices')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'available_devices.device_image_id', 'device_images.id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftJoin(
            db('device_exchanges')
                .innerJoin('models', 'models.id', 'device_exchanges.model_id')
                .select('models.name', 'device_exchanges.id', 'device_exchanges.device_id')
                .as('device_exchanges'),
            'devices.id', 'device_exchanges.device_id',
        )
        .leftJoin(
            db('wishlists')
                .select('id', 'device_id', 'created_at')
                .where('user_id', userId).as('wishlists'),
            'devices.id', 'wishlists.device_id',
        )
        .leftJoin(
            db('device_tags')
                .select('id', 'model_id', 'created_at')
                .where('user_id', userId).as('device_tags'),
            'models.id', 'device_tags.model_id',
        )
        .select(
            'available_devices.sale_price',
            'available_devices.real_sale_price',
            'available_devices.exchange_price',
            'available_devices.exchange_type',
            'available_devices.real_exchange_price',
            'device_exchanges.name as exchange_model',
            'devices.id as device_id',
            'devices.status',
            'devices.physical_grading',
            'imeis.id as imei_id',
            'rams.value as ram',
            'colors.name as color',
            'capacities.value as capacity',
            'models.name as model',
            'categories.name as category_name',
            'categories.image_url as category_image_url',
            'brands.id as brand_id',
            'brands.name as brand_name',
            'brands.image_url as brand_image_url',
            'device_images.url',
            'device_tags.id as device_tag',
            'wishlists.id as wishlist_id',
        )
        .where('devices.status', DeviceStatus.Posted)
        .whereNotIn('devices.user_id', [userId])
        .whereNotIn('devices.id', querySelectCartsByUser(userId))
        .orderBy('available_devices.created_at', 'desc')
        .limit(limit)
        .offset(offset);

    const queryCount = db('devices')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'available_devices.device_image_id', 'device_images.id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('device_scans', 'available_devices.device_scan_id', 'device_scans.id')
        .leftJoin(
            db('device_exchanges')
                .innerJoin('models', 'models.id', 'device_exchanges.model_id')
                .select('models.name', 'device_exchanges.id', 'device_exchanges.device_id')
                .as('device_exchanges'),
            'devices.id', 'device_exchanges.device_id',
        )
        .count('devices.id', { as: 'count' })
        .where('devices.status', DeviceStatus.Posted)
        .whereNotIn('devices.user_id', [userId])
        .whereNotIn('devices.id', querySelectCartsByUser(userId))
        .first();


    if (parsedFilter.brands.length > 0) {
        query.whereIn('brands.id', filter.brands);
        queryCount.whereIn('brands.id', filter.brands);
    }
    if (parsedFilter.grades.length > 0) {
        query.whereIn('devices.physical_grading', filter.grades);
        queryCount.whereIn('devices.physical_grading', filter.grades);
    }
    if (parsedFilter.colors.length > 0) {
        query.whereIn('colors.id', filter.colors);
        queryCount.whereIn('colors.id', filter.colors);
    }
    if (parsedFilter.capacities.length > 0) {
        query.whereIn('capacities.id', filter.capacities);
        queryCount.whereIn('capacities.id', filter.capacities);
    }
    if (parsedFilter.rams.length > 0) {
        query.whereIn('rams.id', filter.rams);
        queryCount.whereIn('rams.id', filter.rams);
    }

    if (parsedFilter.types.length === 1) {
        if (parsedFilter.types.includes(DeviceType.Sell)) {
            query.where('available_devices.real_sale_price', '>', 0);
            queryCount.where('available_devices.real_sale_price', '>', 0);
        }
        if (parsedFilter.types.includes(DeviceType.Exchange)) {
            query.whereNotNull('available_devices.exchange_model');
            queryCount.whereNotNull('available_devices.exchange_model');
        }
    }

    try {
        const list = await query;
        const count = await queryCount;
        res.send({
            list,
            count: count.count,
        });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as listNewDeviceRouter };