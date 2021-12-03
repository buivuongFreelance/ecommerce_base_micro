import express from 'express';
import { QueryFailedError } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.get('/api/v1/device/ram/listAll', async (req, res) => {
    try {
        const rams = await db('rams').select().orderBy('value', 'asc');
        res.send(rams);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as listAllRamRouter };