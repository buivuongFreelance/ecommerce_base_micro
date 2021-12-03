import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/image/delete', validateAuth, [
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an device id'),
], validateRequest, async (req, res) => {
    const { id, deviceId } = req.body;
    let alternateImage = null;
    const availableDevice = await db('available_devices').first('device_image_id').where('device_id', deviceId);
    if (!availableDevice) {
        throw new BadRequestError('Device not exists');
    }
    if (availableDevice.device_image_id) {
        alternateImage = await db('device_images').first('*').whereNotIn('id', [id]);
    }
    const date = new Date();
    try {
        await db.transaction(async (trx) => {
            if (alternateImage) {
                await trx('available_devices').update({
                    device_image_id: alternateImage.id,
                    updated_at: date,
                }).where('device_id', deviceId);
            }
            await trx('device_images').del().where('id', id);
        });
        res.send({});
    } catch (error) {
        throw new QueryFailedError();
    }
});

export { router as deleteDeviceImageRouter };