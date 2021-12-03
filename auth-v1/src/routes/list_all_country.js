import express from 'express';
import { QueryFailedError } from '@tomrot/common';
import db from '../adapters/db';

const router = express.Router();

router.get('/api/v1/auth/country/listAll', async (req, res) => {
    try {
        const countries = await db('countries').select('*');
        res.send(countries);
    } catch (err) {
        throw new QueryFailedError();
    }
});

export { router as listAllCountryRouter };