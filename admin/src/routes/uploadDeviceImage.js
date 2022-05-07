import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/image', validateAuth, [
    body('fileId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a file id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
], validateRequest, async (req, res) => {
    try {
        const { userId } = req;
        const date = new Date();
        const {
            deviceId, fileId
        } = req.body;

        const checkDevice = await db('devices')
            .first('devices.id')
            .where('id', deviceId);
        if (!checkDevice) throw new BadRequestError('NOT_EXISTS');

        await db.transaction(async (trx) => {
            await trx('files_related_morphs').insert({
                file_id: fileId,
                related_id: deviceId,
                related_type: 'api::device.device',
                field: 'images'
            });
        });
        return res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as uploadDeviceImageRouter };