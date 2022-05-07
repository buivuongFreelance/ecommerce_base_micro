import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.get('/api/v1/admin/orders', async (req, res) => {
    try {
        const { userId } = req;
        const orders = await db('orders').select('orders.*').orderBy('orders.created_at', 'DESC');
        return res.send({ list: orders });
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as ordersRouter };