import express from 'express';
import { QueryFailedError } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.get('/api/v1/device/wishlist/list', async (req, res) => {
    try {
        const brands = await db('brands')
            .select('id', 'name')
            .where('is_popular', true);
        res.send(brands);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as listBrandPopularRouter };