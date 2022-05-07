import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/post/step2', validateAuth, [
    body('exchangeType')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exchange type'),
    body('exchangePrice')
        .trim()
        .notEmpty()
        .withMessage('You must supply an exchange price'),
    body('modelId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a model id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
], validateRequest, async (req, res) => {
    try {
        const { userId } = req;
        const date = new Date();
        const {
            exchangeType, exchangePrice, modelId, deviceId,
        } = req.body;

        const checkDevice = await db('devices')
            .first('devices.id')
            .where('id', deviceId);
        if (!checkDevice) throw new BadRequestError('NOT_EXISTS');

        await db.transaction(async (trx) => {
            await trx('devices').update({
                exchange_price: exchangePrice,
                exchange_price_type: exchangeType,
                updated_at: date,
            }).where('id', deviceId);
            await trx('devices_models_links').del().where('device_id', deviceId);
            await trx('devices_models_links').insert({
                model_id: modelId,
                device_id: deviceId,
            });
        });
        return res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as postDeviceStepTwoRouter };