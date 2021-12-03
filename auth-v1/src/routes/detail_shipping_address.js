import express from 'express';
import { body } from 'express-validator';
import { BadRequestError } from '@tomrot/common';
import { validateRequest } from '@tomrot/common';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/auth/shippingAddress/detail', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client Id'),
], validateRequest, async (req, res) => {
    const { userId } = req;

    const shipping = await db('shippings')
        .innerJoin('cities', 'cities.id', 'shippings.city_id')
        .first('shippings.*', 'cities.name as city_name').where('user_id', userId);

    if (!shipping) {
        return res.send(null);
    }

    res.send(shipping);
});

export { router as shippingAddressDetailRouter };