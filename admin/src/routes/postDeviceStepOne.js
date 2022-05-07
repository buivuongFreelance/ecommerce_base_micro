import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus, ErrorType } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/post/stepOne', validateAuth, [
    // body('accessories')
    //     .notEmpty()
    //     .withMessage('You must supply accessories'),
    // body('warranty')
    //     .trim()
    //     .notEmpty()
    //     .withMessage('You must supply a warranty'),
    body('sellingPrice')
        .trim()
        .notEmpty()
        .withMessage('You must supply a selling price'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
], validateRequest, async (req, res) => {
    try {
        const { userId } = req;
        const date = new Date();
        // const {
        //     accessories, warranty, sellingPrice, warrantyDate, deviceId,
        // } = req.body;

        const {
            sellingPrice, deviceId
        } = req.body;

        // let _warrantyDate = warrantyDate;

        // if (warranty !== 'y') {
        //     _warrantyDate = null;
        // }
        const checkDevice = await db('devices')
            .first('devices.id')
            .where('id', deviceId);
        if (!checkDevice) throw new BadRequestError(ErrorType.NotExists);

        // const rowsAccesories = [];

        // accessories.map(accessory => {
        //     rowsAccesories.push(
        //         { device_id: deviceId, accessory_id: accessory }
        //     );
        // })

        await db.transaction(async (trx) => {
            await trx('devices').update({
                selling_price: sellingPrice,
                old_selling_price: sellingPrice,
                // warranty: warranty,
                // warranty_date: _warrantyDate,
                updated_at: date,
            }).where('id', deviceId);
            // await trx('devices_accessories_links').del().where('device_id', deviceId);
            // await trx.batchInsert('devices_accessories_links', rowsAccesories, 20);
        });
        return res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as postDeviceStepOneRouter };