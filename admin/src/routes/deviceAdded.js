import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device', validateAuth, [
    body('modelId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a modelId'),
    body('imei')
        .trim()
        .notEmpty()
        .withMessage('You must supply an imei'),
    body('physicalGradeId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a physical grade id'),
    body('capacityId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a capacity Id'),
    body('ramId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a ram Id'),
    body('colorId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a color Id'),
], validateRequest, async (req, res) => {
    try {
        const { userId } = req;
        const {
            modelId, imei, physicalGradeId, ramId, capacityId, colorId,
        } = req.body;
        const checkDeviceImei = await db('devices')
            .innerJoin('devices_imei_links', 'devices_imei_links.device_id', 'devices.id')
            .innerJoin('imeis', 'devices_imei_links.imei_id', 'imeis.id')
            .first('devices.id')
            .where('imeis.imei', imei);
        if (checkDeviceImei) throw new BadRequestError('DEVICE_EXISTS');
        const date = new Date();

        const checkImei = await db('imeis')
            .first('id')
            .where('imei', imei);
        let idImei = -1;
        let idDevice = -1;
        if (checkImei) {
            idImei = checkImei.id;
        }

        await db.transaction(async (trx) => {
            if (idImei === -1) {
                const idsImei = await trx('imeis').insert({
                    imei,
                    created_at: date,
                    updated_at: date,
                    published_at: date,
                    created_by_id: 1,
                    updated_by_id: 1,
                    imei,
                }, 'id');
                idImei = idsImei[0];
                await trx('imeis_model_links').insert({
                    imei_id: idImei,
                    model_id: modelId,
                });
            }
            const idsDevice = await trx('devices').insert({
                client_id: userId,
                status: DeviceStatus.Added,
                created_at: date,
                updated_at: date,
            }, 'id');
            idDevice = idsDevice[0];
            await trx('devices_capacity_links').insert({
                device_id: idDevice,
                capacity_id: capacityId,
            });
            await trx('devices_color_links').insert({
                device_id: idDevice,
                color_id: colorId,
            });
            await trx('devices_ram_links').insert({
                device_id: idDevice,
                ram_id: ramId,
            });
            await trx('devices_imei_links').insert({
                device_id: idDevice,
                imei_id: idImei,
            });
            await trx('devices_physical_grade_links').insert({
                device_id: idDevice,
                physical_grade_id: physicalGradeId,
            });
        });
        return res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as deviceAddedRouter };