import express from 'express';
import { body } from 'express-validator';
import { validateRequest } from '@tomrot/common';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/auth/billingAddress/detail', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client Id'),
], validateRequest, async (req, res) => {
    const { userId } = req;

    const billing = await db('billings').first('*').where('user_id', userId);

    if (!billing) {
        return res.send(null);
    }

    res.send(billing);
});

export { router as billingAddressDetailRouter };