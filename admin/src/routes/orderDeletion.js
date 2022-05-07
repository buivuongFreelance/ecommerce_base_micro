import express from 'express';
import { validateRequest, BadRequestError, QueryFailedError, DeviceStatus } from '@tomrot/common';
import { body } from 'express-validator';
import db from '../adapters/db';
import { validateAuth } from '../middleware/validate';

const router = express.Router();

router.delete('/api/v1/admin/order/:id', async (req, res) => {
    try {
        const { userId } = req;
        const { id } = req.params;
        const transactions = await db('transactions').select('device_id').where('order_id', id);
        const idsDevice = [];
        transactions.map(transaction => {
            idsDevice.push(transaction.device_id);
        });

        await db.transaction(async (trx) => {
            await trx('transactions').delete().where('order_id', id);
            await trx('orders_seller').delete().where('order_id', id);
            await trx('orders').delete().where('id', id);
            await trx('devices').update({ status: 'POSTED' })
                .whereIn('id', idsDevice);
        });
        return res.send({});
    } catch (err) {
        console.log(err);
        throw new QueryFailedError();
    }
});

export { router as orderDeletion };