import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

export const queryCartByClient = (userId) => db('carts_device_links')
    .innerJoin('carts_client_links', 'carts_client_links.cart_id', 'carts_device_links.cart_id')
    .select('carts_device_links.device_id')
    .where('carts_client_links.client_id', userId);

export const queryListDevice = () => {
    const query = db('devices')
        .innerJoin('devices_imei_links', 'devices_imei_links.device_id', 'devices.id')
        .innerJoin('imeis', 'imeis.id', 'devices_imei_links.imei_id')
        .innerJoin('devices_ram_links', 'devices_ram_links.device_id', 'devices.id')
        .innerJoin('rams', 'rams.id', 'devices_ram_links.ram_id')
        .innerJoin('devices_color_links', 'devices_color_links.device_id', 'devices.id')
        .innerJoin('colors', 'colors.id', 'devices_color_links.color_id')
        .innerJoin('devices_capacity_links', 'devices_capacity_links.device_id', 'devices.id')
        .innerJoin('capacities', 'capacities.id', 'devices_capacity_links.capacity_id')
        .innerJoin('devices_client_links', 'devices_client_links.device_id', 'devices.id')
        .innerJoin('clients', 'clients.id', 'devices_client_links.client_id')
        .innerJoin('imeis_model_links', 'imeis_model_links.imei_id', 'imeis.id')
        .innerJoin('models', 'models.id', 'imeis_model_links.model_id')
        .innerJoin('models_brand_links', 'models_brand_links.model_id', 'models.id')
        .innerJoin('brands', 'brands.id', 'models_brand_links.brand_id')
        .leftJoin(
            db('files')
                .innerJoin('files_related_morphs', 'files.id', 'files_related_morphs.file_id')
                .first('files.*', 'files_related_morphs.related_id')
                .where({
                    'related_type': 'api::device.device',
                    'field': 'images'
                }).as('images'),
            'devices.id', 'images.related_id',
        )
        .select(
            'devices.physical_grading',
            'devices.status',
            'devices.created_at',
            'devices.id',
            'imeis.id as imei_id',
            'imeis.imei as imei',
            'rams.id as ram_id',
            'rams.name as ram',
            'colors.id as color_id',
            'colors.name as color',
            'capacities.id as capacity_id',
            'capacities.name as capacity',
            'models.id as model_id',
            'models.name as model',
            'brands.id as brand_id',
            'brands.name as brand_name',
            'clients.email as transaction_email_buyer',
            'images.url'
        );
    return query;
};


router.post('/api/v1/device/listNew', validateAuth, async (req, res) => {
    const { userId } = req;
    try {
        const query = queryListDevice();
        query.whereNotIn('clients.id', [userId])
            .where('devices.status', DeviceStatus.Posted)
            .limit(10).offset(0).orderBy('devices.created_at', 'desc')
            .whereNotIn('devices.id', queryCartByClient(userId));

        const list = await query;
        const count = list.length;

        return res.send({
            list, count
        });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as newDevicesRouter };