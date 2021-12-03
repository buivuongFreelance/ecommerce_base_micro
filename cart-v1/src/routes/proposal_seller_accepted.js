import express from 'express';
import { validateRequest, BadRequestError, DeviceType, QueryFailedError, ProposalStatus } from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/cart/proposal/sellerAccepted', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('id')
        .trim()
        .notEmpty()
        .withMessage('You must supply a proposal id'),
], validateRequest, async (req, res) => {
    const { id } = req.body;
    const { userId } = req;
    const date = new Date();

    const proposal = await db('proposals')
        .innerJoin('carts', 'carts.id', 'proposals.cart_id')
        .first('proposals.*', 'carts.device_id').where('proposals.id', id);

    if (!proposal) {
        throw new BadRequestError('Proposal does not exist');
    }

    if (proposal.status === ProposalStatus.SellerAccept) {
        throw new BadRequestError(ProposalStatus.SellerAccept);
    }

    const acceptedProposals = await db('proposals')
        .select('proposals.*')
        .innerJoin('carts', 'carts.id', 'proposals.cart_id')
        .whereIn('proposals.status', [ProposalStatus.SellerAccept])
        .where('carts.device_id', proposal.device_id);

    if (acceptedProposals.length > 0) {
        throw new BadRequestError(ProposalStatus.SellerAccept);
    }

    const relatedProposals = await db('proposals')
        .select('proposals.*')
        .innerJoin('carts', 'carts.id', 'proposals.cart_id')
        .whereNotIn('proposals.id', [id])
        .where('carts.device_id', proposal.device_id);

    const idsRelatedProposal = [];
    relatedProposals.map(rePro => {
        idsRelatedProposal.push(rePro.id);
    });

    try {
        await db.transaction(async (trx) => {
            if (idsRelatedProposal.length > 0) {
                await trx('proposals').update({
                    status_temp: ProposalStatus.WaitingToRemove
                }).whereIn('id', idsRelatedProposal);
            }
            await trx('proposals').update({
                status: ProposalStatus.SellerAccept,
                status_temp: proposal.status,
                updated_at: date
            }).where('id', id);
            await trx('proposal_snapshots').insert({
                id: uuidv1(),
                proposal_id: id,
                cart_id: proposal.cart_id,
                seller_id: proposal.seller_id,
                buyer_id: proposal.buyer_id,
                type: proposal.type,
                created_at: date,
                updated_at: date,
                buyer_real_sale_price: proposal.buyer_real_sale_price,
                status: ProposalStatus.SellerAccept,
            });
        });
        res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as proposalSellerAcceptedRouter };