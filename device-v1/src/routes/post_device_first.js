import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/post/first', validateAuth, [
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an device id'),
    body('sellPrice')
        .trim()
        .notEmpty()
        .withMessage('You must supply an sell price'),
    body('availableId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an available id'),
    body('warranty')
        .trim()
        .notEmpty()
        .withMessage('You must supply a warranty'),
    body('accessories')
        .trim()
        .notEmpty()
        .withMessage('You must supply accessories'),
], validateRequest, async (req, res) => {
    const {
        id, availableId, sellPrice, warranty, warrantyExpireDate, accessories
    } = req.body;
    const { userId } = req;
    const parsedAccessories = JSON.parse(accessories);
    const date = new Date();
    let updatedSellPrice = sellPrice;

    const checkDeviceAvailable = await db('available_devices').first('id', 'sale_price').where('id', availableId);
    if (!checkDeviceAvailable) {
        throw new BadRequestError('Device not exists');
    }
    if (checkDeviceAvailable.sale_price) {
        updatedSellPrice = checkDeviceAvailable.sell_price;
    }

    const rowsAccessories = [];

    parsedAccessories.map(accessoryId => {
        rowsAccessories.push({
            accessory_id: accessoryId,
            device_id: id,
            created_at: date,
            updated_at: date,
        });
    });

    try {
        await db.transaction(async (trx) => {
            await trx('device_accessories').del().where('device_id', id);
            await trx('available_devices').update({
                sale_price: updatedSellPrice,
                real_sale_price: sellPrice,
                warranty_expire_date: warrantyExpireDate,
                is_warranty: warranty,
                updated_at: date,
            }).where({
                'available_devices.id': availableId
            });
            await trx.batchInsert('device_accessories', rowsAccessories, 30);
        });
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as postDeviceFirstRouter };