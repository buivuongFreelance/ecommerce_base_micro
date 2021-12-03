import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/device/delete', validateAuth, [
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply an device id'),
], validateRequest, async (req, res) => {
    const { id } = req.body;
    const images = await db('device_images').select('public_id').where('device_id', id);

    //  const subProposalSnapshots = db.raw(`
    //   SELECT id
    //   FROM proposal_snapshots,
    //   jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
    //   WHERE arr.item_object->>'id'='${id}'`);

    // const subProposals = db.raw(`
    //   SELECT id
    //   FROM proposals,
    //   jsonb_array_elements(exchange_devices) with ordinality arr(item_object, position)
    //   WHERE arr.item_object->>'id'='${id}'`);
    try {
        await db.transaction(async (trx) => {
            await trx('device_accessories').del().where('device_id', id);
            await trx('device_exchanges').del().where('device_id', id);
            await trx('available_devices').update({
                'device_image_id': null,
                'proposal_id': null
            }).where('device_id', id);
            const availableDevices = await trx('available_devices')
                .select('available_devices.id')
                .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
                .innerJoin('proposals', 'proposals.cart_id', 'carts.id');
            //.whereIn('proposals.id', subProposals);
            const arrAvailableDevices = [];
            availableDevices.map((av) => {
                arrAvailableDevices.push(av.id);
            });
            if (arrAvailableDevices.length > 0) {
                await trx('available_devices').update('proposal_id', null).whereIn('id', [arrAvailableDevices]);
            }
            //await trx.from('proposal_snapshots').whereIn('id', subProposalSnapshots).del();
            //await trx.from('proposals').whereIn('id', subProposals).del();

            // eslint-disable-next-line func-names
            await trx.from('proposal_snapshots').whereIn('cart_id', function () {
                return this.from('carts').distinct('id').where('device_id', id);
            }).delete();
            // eslint-disable-next-line func-names
            await trx.from('proposals').whereIn('cart_id', function () {
                return this.from('carts').distinct('id').where('device_id', id);
            }).delete();
            await trx('tracing_wishlists').where('device_id', id).del();
            await trx('wishlists').where('device_id', id).del();
            await trx('tracing_carts').where('device_id', id).del();
            await trx('carts').where('device_id', id).del();
            await trx('device_images').where('device_id', id).del();
            await trx('available_devices').where('device_id', id).del();
            await trx('device_scans').where('device_id', id).del();
            await trx('devices').where('id', id).del();
        });
        // if (images.length > 0) {
        //   let names = images[0].public_id;
        //   // eslint-disable-next-line no-plusplus
        //   for (let i = 1; i < images.length; i++) {
        //     names += `,${images[i].public_id}`;
        //   }
        //   try {
        //     await axios.post(`${DOMAIN_DRIVEN_UPLOAD}deleteMultipleImage`, {
        //       names,
        //     });
        //   } catch (errorImg) {
        //     throw new Error('image');
        //   }
        // }

        res.send({});
    } catch (error) {
        console.log(error);
        throw new QueryFailedError();
    }
});

export { router as deleteDeviceRouter };