import express from 'express';
import { validateRequest, QueryFailedError, BadRequestError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/waitingForScan', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
], validateRequest, async (req, res) => {
    const {
        deviceId
    } = req.body;
    try {
        const device = await db('devices').first('status').where('id', deviceId);
        if (!device) {
            throw new BadRequestError('Device not found');
        }
        if (device.status === DeviceStatus.Created) {
            await db('devices').update({
                status: DeviceStatus.WaitingForScan,
            }).where('id', deviceId);
        }
        res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as postDeviceWaitingForScanRouter };