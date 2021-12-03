import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, ProposalStatus } from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/cart/proposal/delete', validateAuth, [
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

    const proposal = await db('proposals').first('*').where('id', id);

    if (!proposal) {
        throw new BadRequestError('Proposal does not exist');
    }

    if (proposal.status === ProposalStatus.SellerAccept) {
        throw new BadRequestError(ProposalStatus.SellerAccept);
    }

    try {
        await db.transaction(async (trx) => {
            await trx('proposal_snapshots').del().where({
                proposal_id: id,
            });
            await trx('proposals').del().where({
                id,
            });
        });
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as deleteProposalRouter };