import express from 'express';
import { validateRequest, DeviceStatus, QueryFailedError, getMarketFee, ProposalStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/cart/list', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
], validateRequest, async (req, res) => {
    const { userId } = req;

    const queryCart = db('carts')
        .innerJoin('devices', 'carts.device_id', 'devices.id')
        .join('imeis', 'devices.imei_id', 'imeis.id')
        .innerJoin('rams', 'rams.id', 'devices.ram_id')
        .innerJoin('colors', 'devices.color_id', 'colors.id')
        .innerJoin('capacities', 'devices.capacity_id', 'capacities.id')
        .innerJoin('models', 'imeis.model_id', 'models.id')
        .innerJoin('categories', 'models.category_id', 'categories.id')
        .innerJoin('brands', 'models.brand_id', 'brands.id')
        .innerJoin('available_devices', 'devices.id', 'available_devices.device_id')
        .leftJoin('device_images', 'available_devices.device_image_id', 'device_images.id')
        .leftOuterJoin('proposals', 'proposals.cart_id', 'carts.id')
        .leftJoin(
            db('device_exchanges')
                .innerJoin('models', 'models.id', 'device_exchanges.model_id')
                .select('models.name', 'device_exchanges.id', 'device_exchanges.device_id')
                .as('device_exchanges'),
            'devices.id', 'device_exchanges.device_id',
        )
        .select(
            'carts.id',
            'carts.user_id',
            'carts.device_id',
            'carts.type as cart_type',
            'rams.value as ram_value',
            'colors.name as color',
            'capacities.value as capacity',
            'models.name as model',
            'categories.name as category_name',
            'brands.name as brand_name',
            'device_images.url',
            'available_devices.sale_price',
            'available_devices.real_sale_price',
            'available_devices.exchange_type',
            'available_devices.exchange_price',
            'available_devices.real_exchange_price',
            'device_exchanges.name as exchange_model',
            'available_devices.proposal_id as is_proposal_accepted',
            'proposals.id as proposal_id',
            'proposals.status as proposal_status',
            'proposals.status_temp as proposal_status_temp',
            'proposals.updated_at as proposal_updated_at',
        )
        .where('carts.user_id', userId)
        .where('devices.status', DeviceStatus.Posted)
        .orderBy('carts.created_at', 'desc')

    try {
        const list = await queryCart;
        for (let i = 0; i < list.length; i++) {
            const l = list[i];
            l.market_fee = 0;
            // eslint-disable-next-line no-await-in-loop
            l.proposals = await db('proposal_snapshots').select('*').where('cart_id', l.id).orderBy('updated_at', 'DESC')
                .limit(2);
            l.market_fee = getMarketFee(l.real_sale_price);
            // if (l.proposals.length > 0) {
            //     const proposal = l.proposals[0];
            //     if (l.proposal_status === ProposalStatus.SellerAccept) {
            //         if (proposal.exchange_devices.length === 0) {
            //             l.market_fee = getMarketFee(proposal.buyer_real_sale_price);
            //         } else if (proposal.buyer_exchange_price <= 0) {
            //             l.market_fee = getMarketFee(Math.abs(proposal.buyer_exchange_price));
            //         } else {
            //             l.market_fee = getMarketFee(0);
            //         }
            //     }
            // }
        }
        res.send(list);
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as listCartRouter };