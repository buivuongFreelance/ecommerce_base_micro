import express from 'express';
import { QueryFailedError } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.get('/api/v1/device/color/listAll', async (req, res) => {
    try {
        const colors = await db('colors').select()
            .orderBy('name', 'asc');
        res.send(colors);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as listAllColorRouter };