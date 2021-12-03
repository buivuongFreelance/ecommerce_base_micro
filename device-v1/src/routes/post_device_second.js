import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/post/second', validateAuth, [
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an device id'),
    body('exchangePrice')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exchange price'),
    body('availableId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an available id'),
    body('exchangeType')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exchange type'),
    body('exchangeModelId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exchange model id'),
    body('exchangeCapacityId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exchange capacity id'),
    body('exchangeColorId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exchange color id'),
], validateRequest, async (req, res) => {
    const {
        id, availableId, exchangePrice, exchangeType, exchangeModelId, exchangeCapacityId, exchangeColorId,
    } = req.body;
    const { userId } = req;
    const date = new Date();

    const checkDeviceAvailable = await db('available_devices').first('id', 'exchange_price').where('id', availableId);
    if (!checkDeviceAvailable) {
        throw new BadRequestError('Device not exists');
    }

    try {
        await db.transaction(async (trx) => {
            await trx('device_exchanges').del().where('device_id', id);
            await trx('available_devices').update({
                exchange_price: exchangePrice,
                real_exchange_price: exchangePrice,
                exchange_type: exchangeType,
                updated_at: date,
            }).where({
                'available_devices.id': availableId
            });
            await trx('device_exchanges').insert({
                device_id: id,
                model_id: exchangeModelId,
                color_id: exchangeColorId,
                capacity_id: exchangeCapacityId,
                created_at: date,
                updated_at: date,
            });
        });
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as postDeviceSecondRouter };