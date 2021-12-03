import express from 'express';
import { validateRequest, BadRequestError, DeviceType, QueryFailedError, ProposalStatus } from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/cart/proposal/buyerCreated', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('cartId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a cart id'),
], validateRequest, async (req, res) => {
    const { cartId, price } = req.body;
    const { userId } = req;
    const id = uuidv1();
    const date = new Date();

    const device = await db('carts')
        .innerJoin('devices', 'devices.id', 'carts.device_id')
        .first('devices.user_id', 'devices.id').where('carts.id', cartId);

    if (!device) {
        throw new BadRequestError('Device does not exist');
    }

    const acceptedProposals = await db('proposals')
        .select('proposals.*')
        .innerJoin('carts', 'carts.id', 'proposals.cart_id')
        .whereIn('proposals.status', [ProposalStatus.SellerAccept])
        .where('carts.device_id', device.id);

    if (acceptedProposals.length > 0) {
        throw new BadRequestError(ProposalStatus.SellerAccept);
    }

    try {
        await db.transaction(async (trx) => {
            await trx('proposals').insert({
                id,
                cart_id: cartId,
                seller_id: device.user_id,
                buyer_id: userId,
                type: DeviceType.Sell,
                created_at: date,
                updated_at: date,
                buyer_real_sale_price: price,
                status: ProposalStatus.BuyerCreated,
            });
            await trx('proposal_snapshots').insert({
                id: uuidv1(),
                proposal_id: id,
                cart_id: cartId,
                seller_id: device.user_id,
                buyer_id: userId,
                type: DeviceType.Sell,
                created_at: date,
                updated_at: date,
                buyer_real_sale_price: price,
                status: ProposalStatus.BuyerCreated,
            });
        });
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as proposalBuyerCreatedRouter };