import express from 'express';
import {
    validateRequest, BadRequestError, QueryFailedError, TransactionStatus,
    DeviceScanType
} from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';
import { v1 as uuidv1 } from 'uuid';

const router = express.Router();

router.post('/api/v1/transaction/buyer/scan', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('transactionId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a transaction id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
    body('timestamp')
        .trim()
        .notEmpty()
        .withMessage('You must supply a timestamp'),
    body('mainRating')
        .trim()
        .notEmpty()
        .withMessage('You must supply a main rating'),
    body('physicalGrading')
        .trim()
        .notEmpty()
        .withMessage('You must supply a physical grading'),
    body('touchscreen')
        .trim()
        .notEmpty()
        .withMessage('You must supply a touchscreen'),
    body('camera')
        .trim()
        .notEmpty()
        .withMessage('You must supply a camera'),
    body('flash')
        .trim()
        .notEmpty()
        .withMessage('You must supply a flash'),
    body('volume')
        .trim()
        .notEmpty()
        .withMessage('You must supply a volume'),
    body('speaker')
        .trim()
        .notEmpty()
        .withMessage('You must supply a speaker'),
    body('microphone')
        .trim()
        .notEmpty()
        .withMessage('You must supply a microphone'),
    body('fingerprint')
        .trim()
        .notEmpty()
        .withMessage('You must supply a fingerprint'),
    body('wifi')
        .trim()
        .notEmpty()
        .withMessage('You must supply a wifi'),
    body('bluetooth')
        .trim()
        .notEmpty()
        .withMessage('You must supply a bluetooth'),
    body('deviceName')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device name'),
    body('osVersion')
        .trim()
        .notEmpty()
        .withMessage('You must supply a os version'),
    body('phoneProcessor')
        .trim()
        .notEmpty()
        .withMessage('You must supply a phone processor'),
    body('totalStorage')
        .trim()
        .notEmpty()
        .withMessage('You must supply a total storage'),
    body('storageUsed')
        .trim()
        .notEmpty()
        .withMessage('You must supply a storage used'),
    body('mainUrl')
        .trim()
        .notEmpty()
        .withMessage('You must supply a main url'),
], validateRequest, async (req, res) => {
    const { deviceId, mainUrl, storageUsed, totalStorage, phoneProcessor,
        osVersion, deviceName, bluetooth, wifi, fingerprint, microphone, volume, speaker, flash,
        camera, touchscreen, physicalGrading, mainRating, timestamp, transactionId } = req.body;


    const availableDevice = await db('available_devices').first('id').where('device_id', deviceId);

    const { userId } = req;

    if (!availableDevice) {
        throw new BadRequestError('Device not exists');
    }

    const mainInfo = {
        storageUsed,
        totalStorage,
        phoneProcessor,
        osVersion,
        deviceName,
        bluetooth,
        wifi,
        fingerprint,
        microphone,
        volume,
        speaker,
        flash,
        camera,
        touchscreen,
        physicalGrading,
        mainRating
    };

    const idScan = uuidv1();
    const date = new Date();

    try {
        await db.transaction(async (trx) => {
            await trx('device_scans').insert({
                id: idScan,
                timestamp,
                auth_user_id: userId,
                main_info: mainInfo,
                type: DeviceScanType.TransactionBuyerScan,
                main_url: mainUrl,
                created_at: date,
                updated_at: date,
                device_id: deviceId,
            });
            await trx('available_devices').update({
                device_scan_id: idScan,
                updated_at: date,
            }).where({
                'available_devices.id': availableDevice.id
            });
            await trx('transactions').update({
                status: TransactionStatus.BuyerMustAcceptOrReject,
                updated_at: date,
            }).where('id', transactionId);
        });
        res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as transactionBuyerScanRouter };