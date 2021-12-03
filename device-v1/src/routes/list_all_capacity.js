import express from 'express';
import { QueryFailedError } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.get('/api/v1/device/capacity/listAll', async (req, res) => {
    try {
        const capacities = await db('capacities').select().orderBy('value', 'asc')
        res.send(capacities);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as listAllCapacityRouter };