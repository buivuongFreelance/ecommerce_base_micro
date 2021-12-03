import express from 'express';
import { validateRequest, DeviceStatus, QueryFailedError, getMarketFee, ProposalStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/cart/proposal/list', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
], validateRequest, async (req, res) => {
    const { userId } = req;

    const { deviceId } = req.body;

    const queryList = db('proposals')
        .select(
            'proposals.*',
            'device_images.url',
            'devices.physical_grading',
            'imeis.id as imei_id',
            'rams.value as ram',
            'colors.name as color',
            'capacities.value as capacity',
            'models.name as model',
            'categories.name as category_name',
            'devices.status as device_status',
            'shippings.first_name as buyer_first_name',
            'shippings.last_name as buyer_last_name'
        )
        .innerJoin('carts', 'carts.id', 'proposals.cart_id')
        .innerJoin('devices', 'devices.id', 'carts.device_id')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .leftJoin('device_images', 'available_devices.device_image_id', 'device_images.id')
        .innerJoin('rams', 'devices.ram_id', 'rams.id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .leftJoin('shippings', 'proposals.buyer_id', 'shippings.user_id')
        .orderBy('proposals.updated_at', 'desc')
        .where('carts.device_id', deviceId);

    try {
        const list = await queryList;
        res.send({
            list,
            count: list.length,
        });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as listProposalRouter };