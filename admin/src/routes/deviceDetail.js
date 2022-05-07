import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, queryDevice, ErrorType } from '@tomrot/common';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

// export const queryDetailDevice = ({
//     deviceId
// }) => {
//     const query = db('devices')
//         .innerJoin('devices_imei_links', 'devices_imei_links.device_id', 'devices.id')
//         .innerJoin('imeis', 'imeis.id', 'devices_imei_links.imei_id')
//         .innerJoin('devices_ram_links', 'devices_ram_links.device_id', 'devices.id')
//         .innerJoin('rams', 'rams.id', 'devices_ram_links.ram_id')
//         .innerJoin('devices_color_links', 'devices_color_links.device_id', 'devices.id')
//         .innerJoin('colors', 'colors.id', 'devices_color_links.color_id')
//         .innerJoin('devices_capacity_links', 'devices_capacity_links.device_id', 'devices.id')
//         .innerJoin('capacities', 'capacities.id', 'devices_capacity_links.capacity_id')
//         .innerJoin('devices_client_links', 'devices_client_links.device_id', 'devices.id')
//         .innerJoin('clients', 'clients.id', 'devices_client_links.client_id')
//         .innerJoin('imeis_model_links', 'imeis_model_links.imei_id', 'imeis.id')
//         .innerJoin('models', 'models.id', 'imeis_model_links.model_id')
//         .innerJoin('models_brand_links', 'models_brand_links.model_id', 'models.id')
//         .innerJoin('brands', 'brands.id', 'models_brand_links.brand_id')
//         .first(
//             'devices.physical_grading',
//             'devices.status',
//             'devices.created_at',
//             'devices.id',
//             'devices.selling_price',
//             'devices.warranty',
//             'devices.warranty_date',
//             'devices.exchange_price_type',
//             'devices.exchange_price',
//             'imeis.id as imei_id',
//             'imeis.imei as imei',
//             'rams.id as ram_id',
//             'rams.name as ram',
//             'colors.id as color_id',
//             'colors.name as color',
//             'capacities.id as capacity_id',
//             'capacities.name as capacity',
//             'models.id as model_id',
//             'models.name as model',
//             'brands.id as brand_id',
//             'brands.name as brand_name',
//         )
//         .where('devices.id', deviceId)
//     return query;
// };


router.get('/api/v1/device/:id', validateAuth, async (req, res) => {
    const { id } = req.params;
    const checkId = await db('devices').first('id', 'status').where('id', id);
    if (!checkId) throw new BadRequestError(ErrorType.NotExists);
    const { userId } = req;
    try {
        const queryDetail = queryDevice(db, 'first');
        queryDetail.where('devices.id', id);

        const detail = await queryDetail;

        // const accessories = await db('accessories')
        //     .innerJoin('devices_accessories_links', 'devices_accessories_links.accessory_id', 'accessories.id')
        //     .where('devices_accessories_links.device_id', id);

        // detail.accessories = accessories;

        // const exchangeModels = await db('models')
        //     .innerJoin('devices_models_links', 'devices_models_links.model_id', 'models.id')
        //     .where('devices_models_links.device_id', id);

        // detail.exchangeModel = null;

        // if (exchangeModels.length > 0) {
        //     detail.exchangeModel = {
        //         id: exchangeModels[0].id,
        //         attributes: {
        //             name: exchangeModels[0].name
        //         }
        //     }
        // }

        // const deviceImages = await db('files')
        //     .innerJoin('files_related_morphs', 'files.id', 'files_related_morphs.file_id')
        //     .where({
        //         'related_id': id,
        //         'related_type': 'api::device.device',
        //         'field': 'images'
        //     });

        // detail.images = [];
        // if (deviceImages.length > 0) {
        //     detail.images = deviceImages;
        // }

        return res.send({
            detail
        });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as deviceDetailRouter };