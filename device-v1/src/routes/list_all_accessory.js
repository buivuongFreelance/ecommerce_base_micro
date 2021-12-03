import express from 'express';
import { QueryFailedError } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.get('/api/v1/device/accessory/listAll', async (req, res) => {
    try {
        const accessories = await db('accessories').select();
        res.send(accessories);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as listAllAccessoryRouter };