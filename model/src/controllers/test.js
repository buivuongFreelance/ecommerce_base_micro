/* eslint-disable import/prefer-default-export */
import helper from 'micro-helper';
import db from '../adapters/db';
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid';

export const testBasicScanCtrl = async (req, res) => {
    if (!req.login) return helper.showClientUnauthorized(res, true);

    const { deviceId } = req.body;

    const { userId } = req;

    const date = new Date();

    try {
        await db.transaction(async (trx) => {
            const deviceScanId = uuidv1();
            await trx('device_scans').insert({
                main_info: {
                    "wifi": "y",
                    "brand": "Apple",
                    "flash": "y",
                    "model": "iPhone XS",
                    "camera": "y",
                    "faceID": "y",
                    "finger": "nothave",
                    "volume": "y",
                    "storage": "64GB",
                    "released": "14.6",
                    "bluetooth": "y",
                    "processor": "A12 Bionic",
                    "touch_url": "https://res.cloudinary.com/deeucfdkq/image/upload/v1625794556/hp6nyx962zuqkwaahew3.png",
                    "microphone": "y",
                    "storageUsed": "28GB",
                    "touchscreen": "n",
                    "pointScanner": 20
                },
                auth_user_id: userId,
                timestamp: date,
                id: deviceScanId,
                real_device_id: deviceId,
                created_at: date,
                updated_at: date,
                device_id: 'fa59bbac-1a7a-4a73-b18f-84f2a44e200c',
                main_url: 'https://res.cloudinary.com/deeucfdkq/image/upload/v1617335186/ttksx4omu3lesxviaecy.png',
                type: 'basic'
            });

            await trx('available_devices').update({
                device_scan_id: deviceScanId
            }).where('device_id', deviceId);

            await trx('devices').update('status', 'POSTED').where('id', deviceId);
        });

        return helper.showSuccessOk(res, helper.SUCCESS);
    } catch (error) {
        return helper.showServerError(res, error);
    }
};