import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError } from '@tomrot/common';
import { body } from 'express-validator';
import { v1 as uuidv1 } from 'uuid';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.post('/api/v1/cart/new', validateAuth, [
    body('clientId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a client id'),
    body('deviceId')
        .trim()
        .notEmpty()
        .withMessage('You must supply a device id'),
    body('type')
        .trim()
        .notEmpty()
        .withMessage('You must supply a type'),
], validateRequest, async (req, res) => {
    const { deviceId, type } = req.body;

    const { userId } = req;
    const id = uuidv1();
    const date = new Date();

    const checkCartExists = await db('carts')
        .first()
        .where('device_id', deviceId)
        .where('user_id', userId);

    if (checkCartExists) {
        throw new BadRequestError('Cart exists');
    }

    try {
        await db('carts').insert({
            id,
            user_id: userId,
            device_id: deviceId,
            type,
            created_at: date,
            updated_at: date,
        });
        res.send({});
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as newCartRouter };