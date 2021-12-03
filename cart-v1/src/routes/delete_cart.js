import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/cart/delete', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply a id'),
], validateRequest, async (req, res) => {
    const { id } = req.body;
    const { userId } = req;

    const availableDevice = await db('available_devices')
        .innerJoin('carts', 'carts.device_id', 'available_devices.device_id')
        .first('available_devices.id', 'available_devices.proposal_id', 'proposals.id as is_proposal')
        .leftOuterJoin('proposals', 'proposals.cart_id', 'carts.id')
        .where('carts.id', id);
    if (!availableDevice) {
        throw new BadRequestError('Device not exists');
    }

    let flag = false;
    if (availableDevice.proposal_id) {
        const proposal = await db('proposals').first('buyer_id').where('id', availableDevice.proposal_id);
        if (proposal.buyer_id === userId) {
            flag = true;
        }
    }

    try {
        await db.transaction(async (trx) => {
            if (flag) {
                // eslint-disable-next-line func-names
                await trx.from('available_devices').whereIn('device_id', function () {
                    return this.from('carts')
                        .distinct('device_id')
                        .where('id', id);
                })
                    .update('proposal_id', null);
            }
            await trx('proposal_snapshots').where('cart_id', id).del();
            await trx('proposals').where('cart_id', id).del();
            await trx('carts').where('id', id).del();
        });
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as deleteCartRouter };