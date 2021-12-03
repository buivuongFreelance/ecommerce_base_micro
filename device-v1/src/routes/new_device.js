import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { v1 as uuidv1 } from 'uuid';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/new', validateAuth, [
    body('modelId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an model id'),
    body('imei')
        .trim()
        .notEmpty()
        .withMessage('You must supply an imei'),
    body('physicalGrading')
        .trim()
        .notEmpty()
        .withMessage('You must supply an physical grading'),
    body('capacityId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an capacity id'),
    body('colorId')
        .trim()
        .notEmpty()
        .withMessage('You must supply an color id'),
], validateRequest, async (req, res) => {
    const {
        modelId, imei, physicalGrading, ramId, capacityId, colorId,
    } = req.body;
    const { userId } = req;
    const checkDeviceExists = await db('devices')
        .innerJoin('imeis', 'imeis.id', 'devices.imei_id')
        .first('devices.id')
        .where('imeis.imei', imei);
    if (checkDeviceExists) {
        throw new BadRequestError('Device exists');
    }
    const checkImei = await db('imeis')
        .first('id')
        .where('imei', imei);
    const idImei = uuidv1();
    const idDevice = uuidv1();
    const date = new Date();
    try {
        await db.transaction(async (trx) => {
            if (!checkImei) {
                await trx('imeis').insert({
                    id: idImei,
                    imei,
                    model_id: modelId,
                    ram_id: ramId,
                    capacity_id: capacityId,
                    color_id: colorId,
                    created_at: date,
                    updated_at: date,
                });
            }
            await trx('devices').insert({
                id: idDevice,
                imei_id: checkImei ? checkImei.id : idImei,
                user_id: userId,
                physical_grading: physicalGrading,
                ram_id: ramId,
                capacity_id: capacityId,
                color_id: colorId,
                status: DeviceStatus.Created,
                created_at: date,
                updated_at: date,
            });
            await trx('available_devices').insert({
                id: uuidv1(),
                device_id: idDevice,
                sale_price: null,
                real_sale_price: null,
                exchange_price: null,
                real_exchange_price: null,
                warranty_expire_date: null,
                created_at: date,
                updated_at: date,
                device_scan_id: null,
                proposal_id: null,
                is_warranty: null,
            });
        });
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as newDeviceRouter };