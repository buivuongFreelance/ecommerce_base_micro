import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/image/new', validateAuth, [
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an device id'),
    body('url')
        .trim()
        .notEmpty()
        .withMessage('You must supply an url'),
    body('publicId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an public id'),
], validateRequest, async (req, res) => {
    const { deviceId, url, publicId } = req.body;
    const availableDevice = await db('available_devices').select('*').where('device_id', deviceId);
    const date = new Date();
    if (!availableDevice) {
        throw new BadRequestError('Device not exists');
    }
    try {
        await db.transaction(async (trx) => {
            const deviceImageId = await trx('device_images')
                .returning('id')
                .insert({
                    device_id: deviceId,
                    url,
                    public_id: publicId,
                    created_at: date,
                    updated_at: date,
                });
            await trx('available_devices').update({
                device_image_id: deviceImageId[0],
                updated_at: date,
            }).where('device_id', deviceId);
        });
        res.send({});
    } catch (error) {
        throw new QueryFailedError();
    }
});

export { router as newDeviceImageRouter };