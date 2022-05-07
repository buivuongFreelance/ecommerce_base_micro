import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.put('/api/v1/device/posted', validateAuth, [
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
], validateRequest, async (req, res) => {
    try {
        const { userId } = req;
        const {
            id
        } = req.body;
        const checkDevice = await db('devices')
            .first('devices.id')
            .where('id', id);
        if (!checkDevice) throw new BadRequestError('NOT_EXISTS');
        const date = new Date();

        await db.transaction(async (trx) => {
            const idsDeviceScan = await trx('device_scans').insert({
                timestamp: new Date(),
                main_info: {
                    'ram': '2gb',
                    'memory': '8gb'
                },
                type: 'basic',
                created_at: date,
                updated_at: date,
                created_by_id: 1,
                updated_by_id: 1,
            }, 'id');
            const idDeviceScan = idsDeviceScan[0];
            await trx('devices_device_scans_links').insert({
                device_id: id,
                device_scan_id: idDeviceScan,
            });
            await trx('devices').update({
                status: DeviceStatus.Posted,
                updated_at: date,
            }).where('id', id);
        });
        return res.send({ detail: { id } });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as devicePostedRouter };